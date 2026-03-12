import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { price_list_id, file_path } = await req.json();
    if (!price_list_id || !file_path) {
      return new Response(JSON.stringify({ error: "Missing price_list_id or file_path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the PDF from storage
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from("price-lists")
      .download(file_path);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: "Failed to download PDF", details: downloadError?.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert to base64 for Gemini
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Use Gemini to extract SKUs from the PDF
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiResponse = await fetch(
      `https://ai-gateway.lovable.dev/google/gemini-2.5-flash/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: base64,
                  },
                },
                {
                  text: `Extract ALL product part numbers (SKU/OEM numbers) from this PDF price list.
The PDF contains a structured table of auto parts with part numbers.
Return ONLY a JSON array of strings, each being a part number/SKU exactly as written in the document.
Do not include any other text, explanations, or formatting - just the raw JSON array.
Example: ["90915-YZZD2", "04152-YZZA1", "17801-21050"]
If you cannot find any part numbers, return an empty array: []`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI parsing failed", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    // Parse the SKU array from AI response
    let skus: string[] = [];
    try {
      const cleanedText = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      skus = JSON.parse(cleanedText);
      if (!Array.isArray(skus)) skus = [];
    } catch {
      console.error("Failed to parse AI response:", rawText);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: rawText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (skus.length === 0) {
      return new Response(
        JSON.stringify({ matched: 0, total_skus: 0, message: "No SKUs found in PDF" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Match SKUs with products in the database
    // Query in batches since there could be many SKUs
    const batchSize = 50;
    const allMatchedProductIds: string[] = [];

    for (let i = 0; i < skus.length; i += batchSize) {
      const batch = skus.slice(i, i + batchSize);
      const { data: products } = await adminClient
        .from("products")
        .select("id, sku")
        .in("sku", batch);

      if (products) {
        allMatchedProductIds.push(...products.map((p) => p.id));
      }
    }

    // Also try partial matching for SKUs that might have slight differences
    // e.g., "90915-YZZD2" vs "90915YZZD2"
    const normalizedSkus = skus.map((s) => s.replace(/[-\s]/g, "").toUpperCase());
    const { data: allProducts } = await adminClient
      .from("products")
      .select("id, sku")
      .eq("is_active", true);

    if (allProducts) {
      for (const product of allProducts) {
        const normalizedProductSku = product.sku.replace(/[-\s]/g, "").toUpperCase();
        if (
          normalizedSkus.includes(normalizedProductSku) &&
          !allMatchedProductIds.includes(product.id)
        ) {
          allMatchedProductIds.push(product.id);
        }
      }
    }

    // Remove duplicates
    const uniqueProductIds = [...new Set(allMatchedProductIds)];

    if (uniqueProductIds.length === 0) {
      return new Response(
        JSON.stringify({
          matched: 0,
          total_skus: skus.length,
          skus_found: skus.slice(0, 20),
          message: "SKUs found but none matched products in database",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert links into price_list_products (ignore duplicates)
    const insertRows = uniqueProductIds.map((productId) => ({
      price_list_id,
      product_id: productId,
    }));

    // Insert in batches
    let insertedCount = 0;
    for (let i = 0; i < insertRows.length; i += batchSize) {
      const batch = insertRows.slice(i, i + batchSize);
      const { error: insertError, data: inserted } = await adminClient
        .from("price_list_products")
        .upsert(batch, { onConflict: "price_list_id,product_id", ignoreDuplicates: true })
        .select();

      if (!insertError && inserted) {
        insertedCount += inserted.length;
      }
    }

    return new Response(
      JSON.stringify({
        matched: uniqueProductIds.length,
        total_skus: skus.length,
        inserted: insertedCount,
        message: `تم ربط ${uniqueProductIds.length} صنف من أصل ${skus.length} رقم قطعة في الملف`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
