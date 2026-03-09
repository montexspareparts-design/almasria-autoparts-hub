import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { productIds } = await req.json();

    // Fetch products with images
    let query = supabase
      .from("products")
      .select("id, sku, name_ar, image_url, brand")
      .eq("is_active", true)
      .not("image_url", "is", null);

    if (productIds && productIds.length > 0) {
      query = query.in("id", productIds);
    }

    const { data: products, error } = await query.limit(20);
    if (error) throw error;

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ results: [], message: "لا توجد منتجات للمراجعة" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const product of products) {
      try {
        const prompt = `You are an automotive parts expert. Analyze this product image and verify if it matches the given product information.

Product Name (Arabic): ${product.name_ar}
Part Number (SKU): ${product.sku}
Brand: ${product.brand}

Tasks:
1. Describe what you see in the image briefly
2. Check if the image shows an automotive part that matches the product name
3. Check if any visible part number on the image matches the SKU "${product.sku}"
4. Rate confidence: "match" (image clearly matches), "mismatch" (image clearly wrong), or "uncertain" (can't determine)

Respond in JSON format:
{
  "imageDescription": "brief description of what's in the image",
  "partNumberVisible": true/false,
  "partNumberMatch": true/false/null,
  "nameMatch": true/false,
  "confidence": "match" | "mismatch" | "uncertain",
  "reason": "brief explanation in Arabic"
}`;

        const aiResponse = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: product.image_url } },
                  ],
                },
              ],
            }),
          }
        );

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error(`AI error for ${product.sku}:`, aiResponse.status, errText);
          
          if (aiResponse.status === 429) {
            results.push({
              productId: product.id,
              sku: product.sku,
              name: product.name_ar,
              imageUrl: product.image_url,
              confidence: "error",
              reason: "تم تجاوز الحد المسموح — حاول لاحقاً",
            });
            // Wait before continuing
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          
          results.push({
            productId: product.id,
            sku: product.sku,
            name: product.name_ar,
            imageUrl: product.image_url,
            confidence: "error",
            reason: "خطأ في التحليل",
          });
          continue;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";

        // Parse JSON from response
        let parsed;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch {
          parsed = null;
        }

        results.push({
          productId: product.id,
          sku: product.sku,
          name: product.name_ar,
          imageUrl: product.image_url,
          brand: product.brand,
          confidence: parsed?.confidence || "uncertain",
          reason: parsed?.reason || "لم يتمكن من التحليل",
          imageDescription: parsed?.imageDescription || "",
          partNumberVisible: parsed?.partNumberVisible || false,
          partNumberMatch: parsed?.partNumberMatch || null,
          nameMatch: parsed?.nameMatch || false,
        });

        // Small delay between requests to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error(`Error processing ${product.sku}:`, e);
        results.push({
          productId: product.id,
          sku: product.sku,
          name: product.name_ar,
          imageUrl: product.image_url,
          confidence: "error",
          reason: "خطأ غير متوقع",
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-product-images error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
