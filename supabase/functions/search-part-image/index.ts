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
    // ── Auth: Admin only ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden: admin only" }), { status: 403, headers: corsHeaders });
    }

    // ── Business logic ──
    const { partNumber, productId } = await req.json();

    if (!partNumber || !productId) {
      return new Response(
        JSON.stringify({ success: false, error: "partNumber and productId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Searching images for part:", partNumber);

    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${partNumber} toyota genuine part image`,
        limit: 5,
        scrapeOptions: { formats: ["links", "markdown"] },
      }),
    });

    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      console.error("Firecrawl search error:", searchData);
      return new Response(
        JSON.stringify({ success: false, error: searchData.error || "Search failed" }),
        { status: searchResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageUrls: string[] = [];
    const results = searchData.data || searchData.results || [];

    for (const result of results) {
      const markdown = result.markdown || "";
      const imgRegex = /!\[.*?\]\((https?:\/\/[^\s)]+\.(jpg|jpeg|png|webp|gif)[^\s)]*)\)/gi;
      let match;
      while ((match = imgRegex.exec(markdown)) !== null) {
        if (!imageUrls.includes(match[1])) imageUrls.push(match[1]);
      }

      const urlRegex = /(https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp)(\?[^\s"'<>]*)?)/gi;
      while ((match = urlRegex.exec(markdown)) !== null) {
        if (!imageUrls.includes(match[1]) && !match[1].includes("logo") && !match[1].includes("icon")) {
          imageUrls.push(match[1]);
        }
      }
    }

    try {
      const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: `https://www.amayama.com/en/part/toyota/${partNumber.replace(/\s/g, "")}`,
          formats: ["markdown"],
          onlyMainContent: true,
        }),
      });

      if (scrapeResponse.ok) {
        const scrapeData = await scrapeResponse.json();
        const md = scrapeData?.data?.markdown || scrapeData?.markdown || "";
        const urlRegex = /(https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp)(\?[^\s"'<>]*)?)/gi;
        let match;
        while ((match = urlRegex.exec(md)) !== null) {
          if (!imageUrls.includes(match[1])) imageUrls.push(match[1]);
        }
      }
    } catch (e) {
      console.log("Amayama scrape failed (non-critical):", e);
    }

    console.log(`Found ${imageUrls.length} images for ${partNumber}`);

    return new Response(
      JSON.stringify({ success: true, images: imageUrls.slice(0, 10) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("search-part-image error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
