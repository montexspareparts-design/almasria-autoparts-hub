import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { image_base64 } = await req.json();

    if (!image_base64 || typeof image_base64 !== "string") {
      return new Response(
        JSON.stringify({ error: "image_base64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Gemini to extract VIN from image
    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a VIN (Vehicle Identification Number) OCR expert. Extract the 17-character VIN from the image. 
VINs contain only uppercase letters (A-Z excluding I, O, Q) and digits (0-9).
Return ONLY the VIN as a JSON object: {"vin": "THE17CHARVIN12345"}
If no VIN is found, return: {"vin": null, "error": "لم يتم العثور على رقم شاسيه في الصورة"}
If the image is unclear, try your best to read it. Common confusions: 0/O, 1/I, 8/B, 5/S.`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image_base64}`,
                },
              },
              {
                type: "text",
                text: "Extract the VIN number from this image. Return only JSON.",
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", errText);
      throw new Error("Failed to process image");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    let result: { vin: string | null; error?: string };
    try {
      // Try to parse directly
      const jsonMatch = content.match(/\{[^}]+\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        // Try to find a 17-char VIN pattern in the text
        const vinMatch = content.match(/[A-HJ-NPR-Z0-9]{17}/i);
        if (vinMatch) {
          result = { vin: vinMatch[0].toUpperCase() };
        } else {
          result = { vin: null, error: "لم يتم العثور على رقم شاسيه في الصورة" };
        }
      }
    } catch {
      const vinMatch = content.match(/[A-HJ-NPR-Z0-9]{17}/i);
      result = vinMatch
        ? { vin: vinMatch[0].toUpperCase() }
        : { vin: null, error: "فشل في قراءة رقم الشاسيه" };
    }

    // Clean up VIN if found
    if (result.vin) {
      result.vin = result.vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
      if (result.vin.length !== 17) {
        result = { vin: null, error: "الرقم المقروء غير مكتمل — حاول التقاط صورة أوضح" };
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ocr-vin error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
