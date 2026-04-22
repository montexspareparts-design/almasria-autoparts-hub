// Extract SKUs from a price list PDF using Lovable AI (Gemini multimodal)
// then match them to existing products and link to the price list.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { price_list_id } = await req.json();
    if (!price_list_id) {
      return json({ error: "price_list_id is required" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1) Get price list row
    const { data: list, error: listErr } = await admin
      .from("price_lists")
      .select("id, title, file_url")
      .eq("id", price_list_id)
      .single();
    if (listErr || !list?.file_url) {
      return json({ error: "Price list not found or has no file" }, 404);
    }

    // 2) Download the PDF (file_url is the storage object name in `price-lists` bucket)
    const fileName = list.file_url;
    const { data: pdfBlob, error: dlErr } = await admin.storage
      .from("price-lists")
      .download(fileName);
    if (dlErr || !pdfBlob) {
      return json({ error: `Failed to download PDF: ${dlErr?.message}` }, 500);
    }
    const arrayBuf = await pdfBlob.arrayBuffer();
    const base64 = bytesToBase64(new Uint8Array(arrayBuf));

    // 3) Ask Gemini to extract item codes (SKUs) from the PDF
    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "system",
              content:
                "You extract Toyota part numbers / item codes from Arabic price list PDFs. Return only codes that look like real part numbers (alphanumeric with possible dashes/spaces). Ignore page numbers, prices, totals, and headers.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    "استخرج كل أكواد الأصناف (Item Code / Part Number / SKU) من كشف الأسعار ده. أرجع النتيجة عبر استدعاء الأداة فقط.",
                },
                {
                  type: "file",
                  file: {
                    filename: "pricelist.pdf",
                    file_data: `data:application/pdf;base64,${base64}`,
                  },
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_skus",
                description: "Return the list of part numbers / SKUs found in the PDF",
                parameters: {
                  type: "object",
                  properties: {
                    skus: {
                      type: "array",
                      items: { type: "string" },
                      description: "Cleaned part numbers, one per item",
                    },
                  },
                  required: ["skus"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_skus" } },
        }),
      }
    );

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      if (aiResp.status === 429) return json({ error: "تم تجاوز حد الاستخدام، حاول بعد قليل" }, 429);
      if (aiResp.status === 402) return json({ error: "الرصيد منتهي، يرجى إضافة رصيد لاستخدام الذكاء الصناعي" }, 402);
      console.error("AI error", aiResp.status, txt);
      return json({ error: `AI gateway error: ${aiResp.status}` }, 500);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let extracted: string[] = [];
    try {
      const args = JSON.parse(toolCall?.function?.arguments ?? "{}");
      extracted = Array.isArray(args.skus) ? args.skus : [];
    } catch (e) {
      console.error("Failed to parse tool args", e);
    }

    // Normalize: trim, uppercase, dedupe, drop short/empty
    const norm = (s: string) => String(s || "").trim().toUpperCase().replace(/\s+/g, "");
    const cleaned = Array.from(
      new Set(extracted.map(norm).filter((s) => s.length >= 4))
    );

    if (cleaned.length === 0) {
      return json({
        success: true,
        extracted_count: 0,
        matched_count: 0,
        linked_count: 0,
        unmatched: [],
        message: "لم يتم استخراج أي أكواد من الـ PDF",
      });
    }

    // 4) Match to products by sku OR erp_item_code (case-insensitive)
    // Pull all candidate products in chunks
    const matchedProducts = new Map<string, { id: string; sku: string }>(); // key: normalized code
    const chunkSize = 200;
    for (let i = 0; i < cleaned.length; i += chunkSize) {
      const chunk = cleaned.slice(i, i + chunkSize);
      // Build OR filter for sku and erp_item_code
      const orParts = chunk
        .flatMap((c) => [`sku.ilike.${c}`, `erp_item_code.ilike.${c}`])
        .join(",");
      const { data: prods } = await admin
        .from("products")
        .select("id, sku, erp_item_code")
        .or(orParts);
      (prods || []).forEach((p: any) => {
        const sk = norm(p.sku);
        const er = norm(p.erp_item_code || "");
        if (chunk.includes(sk)) matchedProducts.set(sk, { id: p.id, sku: p.sku });
        if (chunk.includes(er)) matchedProducts.set(er, { id: p.id, sku: p.sku });
      });
    }

    const unmatched = cleaned.filter((c) => !matchedProducts.has(c));
    const productIds = Array.from(new Set(Array.from(matchedProducts.values()).map((p) => p.id)));

    // 5) Replace existing links: clear old, insert new
    await admin.from("price_list_products").delete().eq("price_list_id", price_list_id);

    let linked = 0;
    if (productIds.length > 0) {
      const rows = productIds.map((pid) => ({
        price_list_id,
        product_id: pid,
      }));
      const { error: insErr, count } = await admin
        .from("price_list_products")
        .insert(rows, { count: "exact" });
      if (insErr) {
        console.error("Insert error", insErr);
        return json({ error: `Failed to link: ${insErr.message}` }, 500);
      }
      linked = count ?? rows.length;
    }

    return json({
      success: true,
      extracted_count: cleaned.length,
      matched_count: productIds.length,
      linked_count: linked,
      unmatched,
      sample_extracted: cleaned.slice(0, 20),
    });
  } catch (e) {
    console.error("extract-pricelist-skus error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk) as unknown as number[]
    );
  }
  return btoa(binary);
}
