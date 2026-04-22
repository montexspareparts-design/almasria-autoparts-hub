// Extract SKUs from a price list PDF using Lovable AI (Gemini multimodal)
// then match them to existing products and link to the price list.
// Supports a `min_confidence` threshold (0-100) for fuzzy matching.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { price_list_id } = body;
    // Confidence threshold: 0-100. 100 = exact match only.
    // Back-compat: `min_confidence` applies to both SKU & ERP unless overridden.
    const clamp = (v: number) => Math.max(0, Math.min(100, v));
    const min_confidence = clamp(Number(body.min_confidence ?? 100));
    // Per-field thresholds — fall back to the global one when not provided.
    const min_confidence_sku = clamp(
      Number(body.min_confidence_sku ?? body.min_confidence ?? 100)
    );
    const min_confidence_erp = clamp(
      Number(body.min_confidence_erp ?? body.min_confidence ?? 100)
    );
    // The "gate" for the exact-vs-fuzzy branch is the *lowest* of the two
    // (if either side allows fuzzy matching we must run the fuzzy path).
    const effective_min_confidence = Math.min(min_confidence_sku, min_confidence_erp);
    // dry_run: do NOT delete/insert price_list_products — only return diagnostics.
    const dry_run: boolean = Boolean(body.dry_run ?? false);
    // include_diagnostics: return top candidates per extracted code so the admin
    // can review match decisions before committing.
    const include_diagnostics: boolean = Boolean(
      body.include_diagnostics ?? dry_run
    );

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
        min_confidence,
        message: "لم يتم استخراج أي أكواد من الـ PDF",
      });
    }

    // 4) Match to products
    // - At 100% confidence → exact (case-insensitive) match against sku OR erp_item_code.
    // - Below 100% → allow fuzzy match using normalized Levenshtein similarity.
    const matchedProducts = new Map<
      string,
      { id: string; sku: string; score: number; matchedField: "sku" | "erp" }
    >();

    // Per-extracted-code diagnostics: top candidates + chosen-match reason.
    type Candidate = {
      product_id: string;
      sku: string;
      erp_item_code: string | null;
      score: number;
      matchedField: "sku" | "erp";
    };
    const diagnostics: Array<{
      code: string;
      chosen: { product_id: string; sku: string; score: number; matchedField: "sku" | "erp" } | null;
      reason: string;
      candidates: Candidate[];
    }> = [];

    if (min_confidence >= 100) {
      // Exact match path (fast, batched OR queries)
      const chunkSize = 200;
      const exactByCode = new Map<string, Candidate[]>();
      for (let i = 0; i < cleaned.length; i += chunkSize) {
        const chunk = cleaned.slice(i, i + chunkSize);
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
          for (const code of chunk) {
            if (sk === code) {
              const arr = exactByCode.get(code) || [];
              arr.push({ product_id: p.id, sku: p.sku, erp_item_code: p.erp_item_code, score: 100, matchedField: "sku" });
              exactByCode.set(code, arr);
            } else if (er === code) {
              const arr = exactByCode.get(code) || [];
              arr.push({ product_id: p.id, sku: p.sku, erp_item_code: p.erp_item_code, score: 100, matchedField: "erp" });
              exactByCode.set(code, arr);
            }
          }
        });
      }
      for (const code of cleaned) {
        const cands = exactByCode.get(code) || [];
        // Tie-break: SKU match wins over ERP match.
        const sorted = [...cands].sort((a, b) =>
          a.matchedField === b.matchedField ? 0 : a.matchedField === "sku" ? -1 : 1
        );
        const chosen = sorted[0] || null;
        if (chosen) {
          matchedProducts.set(code, {
            id: chosen.product_id,
            sku: chosen.sku,
            score: 100,
            matchedField: chosen.matchedField,
          });
        }
        if (include_diagnostics) {
          diagnostics.push({
            code,
            chosen: chosen
              ? { product_id: chosen.product_id, sku: chosen.sku, score: 100, matchedField: chosen.matchedField }
              : null,
            reason: !chosen
              ? "لا يوجد تطابق تام (exact) على sku أو erp_item_code"
              : sorted.length === 1
                ? `تطابق تام وحيد على ${chosen.matchedField === "sku" ? "SKU" : "ERP code"}`
                : `${sorted.length} مرشحين بنفس الـ score — تم تفضيل التطابق على ${chosen.matchedField === "sku" ? "SKU" : "ERP code"}`,
            candidates: sorted.slice(0, 5),
          });
        }
      }
    } else {
      // Fuzzy path
      const { data: allProds } = await admin
        .from("products")
        .select("id, sku, erp_item_code")
        .eq("is_active", true);
      const candidates = (allProds || []).map((p: any) => ({
        id: p.id,
        sku: p.sku,
        erp_item_code: p.erp_item_code,
        nSku: norm(p.sku),
        nErp: norm(p.erp_item_code || ""),
      }));
      for (const code of cleaned) {
        const scored: Candidate[] = [];
        for (const c of candidates) {
          const s1 = c.nSku ? similarity(code, c.nSku) : 0;
          const s2 = c.nErp ? similarity(code, c.nErp) : 0;
          const candScore = Math.max(s1, s2);
          if (candScore <= 0) continue;
          const candField: "sku" | "erp" = s1 >= s2 ? "sku" : "erp";
          scored.push({
            product_id: c.id,
            sku: c.sku,
            erp_item_code: c.erp_item_code,
            score: candScore,
            matchedField: candField,
          });
        }
        // Sort: highest score first, then SKU before ERP on ties.
        scored.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (a.matchedField !== b.matchedField) return a.matchedField === "sku" ? -1 : 1;
          return 0;
        });
        const top = scored.slice(0, 5);
        const best = scored[0] || null;
        const passes = !!(best && best.score >= min_confidence);
        if (passes && best) {
          matchedProducts.set(code, {
            id: best.product_id,
            sku: best.sku,
            score: best.score,
            matchedField: best.matchedField,
          });
        }
        if (include_diagnostics) {
          let reason: string;
          if (!best) reason = "لا يوجد مرشحين";
          else if (!passes) reason = `أعلى score (${best.score}) أقل من الحد الأدنى (${min_confidence})`;
          else {
            const tied = scored.filter((s) => s.score === best.score);
            reason = tied.length > 1
              ? `${tied.length} مرشحين بنفس الـ score (${best.score}) — تم تفضيل التطابق على ${best.matchedField === "sku" ? "SKU" : "ERP code"}`
              : `أفضل مرشح بـ score ${best.score} على ${best.matchedField === "sku" ? "SKU" : "ERP code"}`;
          }
          diagnostics.push({
            code,
            chosen: passes && best
              ? { product_id: best.product_id, sku: best.sku, score: best.score, matchedField: best.matchedField }
              : null,
            reason,
            candidates: top,
          });
        }
      }
    }

    const unmatched = cleaned.filter((c) => !matchedProducts.has(c));
    const productIds = Array.from(new Set(Array.from(matchedProducts.values()).map((p) => p.id)));

    let linked = 0;
    if (!dry_run) {
      // Replace existing links: clear old, insert new
      await admin.from("price_list_products").delete().eq("price_list_id", price_list_id);
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
    }

    // Compute average match score for transparency
    const scores = Array.from(matchedProducts.values()).map((m) => m.score);
    const avg_score = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    return json({
      success: true,
      dry_run,
      extracted_count: cleaned.length,
      matched_count: productIds.length,
      linked_count: linked,
      unmatched,
      min_confidence,
      avg_score,
      sample_extracted: cleaned.slice(0, 20),
      ...(include_diagnostics ? { diagnostics } : {}),
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

// Levenshtein-based similarity score (0-100). 100 = identical.
function similarity(a: string, b: string): number {
  if (a === b) return 100;
  if (!a.length || !b.length) return 0;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return Math.round(((maxLen - dist) / maxLen) * 100);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}
