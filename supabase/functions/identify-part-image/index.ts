import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to identify the car part from the image
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert Toyota auto parts identifier. When shown an image of a car part, identify it and return ONLY a JSON object with these fields:
- "part_name_ar": Arabic name of the part (e.g., "فلتر زيت", "تيل فرامل", "بوجيه")
- "part_name_en": English name (e.g., "Oil Filter", "Brake Pad", "Spark Plug")
- "category": one of ["فلاتر", "فرامل", "بوجيهات", "سيور", "تبريد", "عفشة", "دبرياج", "زيوت", "كهرباء", "أخرى"]
- "search_keywords": array of Arabic search terms to find this part in a catalog
- "confidence": number 0-100 indicating how confident you are
- "compatible_models": array of likely compatible Toyota models if identifiable
If you cannot identify the part, set confidence to 0 and part_name_ar to "غير معروف".
Return ONLY valid JSON, no markdown or explanation.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Identify this car part:" },
              { type: "image_url", image_url: { url: imageBase64 } }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "identify_part",
              description: "Return identified part information",
              parameters: {
                type: "object",
                properties: {
                  part_name_ar: { type: "string" },
                  part_name_en: { type: "string" },
                  category: { type: "string" },
                  search_keywords: { type: "array", items: { type: "string" } },
                  confidence: { type: "number" },
                  compatible_models: { type: "array", items: { type: "string" } }
                },
                required: ["part_name_ar", "part_name_en", "category", "search_keywords", "confidence"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "identify_part" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "rate_limited" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "credits_exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "AI identification failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    let partInfo;

    // Extract from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      partInfo = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing content as JSON
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        partInfo = JSON.parse(jsonMatch[0]);
      }
    }

    if (!partInfo) {
      return new Response(
        JSON.stringify({ error: "Could not parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Now search products using the identified keywords
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const keywords = partInfo.search_keywords || [partInfo.part_name_ar];
    
    // Build search query - search by name
    let matchedProducts: any[] = [];
    
    for (const keyword of keywords) {
      const { data } = await sb
        .from("products")
        .select("id, name_ar, name_en, sku, image_url, base_price, brand, stock_quantity, compatible_models, category_id")
        .eq("is_active", true)
        .ilike("name_ar", `%${keyword}%`)
        .limit(20);
      
      if (data) {
        for (const p of data) {
          if (!matchedProducts.find(mp => mp.id === p.id)) {
            matchedProducts.push(p);
          }
        }
      }
    }

    // If few results, also try English name
    if (matchedProducts.length < 5 && partInfo.part_name_en) {
      const { data } = await sb
        .from("products")
        .select("id, name_ar, name_en, sku, image_url, base_price, brand, stock_quantity, compatible_models, category_id")
        .eq("is_active", true)
        .ilike("name_en", `%${partInfo.part_name_en}%`)
        .limit(10);
      
      if (data) {
        for (const p of data) {
          if (!matchedProducts.find(mp => mp.id === p.id)) {
            matchedProducts.push(p);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        identification: partInfo,
        products: matchedProducts.slice(0, 20),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("identify-part-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
