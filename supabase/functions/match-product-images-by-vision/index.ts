// Edge Function: match-product-images-by-vision
// Scans all images in `product-images` storage bucket, uses Lovable AI Vision
// (Gemini) to read part numbers printed on each image, then matches them with
// products' SKU or erp_item_code. Only assigns image_url when 100% text match.
//
// Endpoint: POST /functions/v1/match-product-images-by-vision
// Body (optional): { dryRun?: boolean, limit?: number, offset?: number, onlyUnassigned?: boolean }
// Auth: requires admin (verified via service role on caller's user_id from JWT).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const BUCKET = "product-images";
const MODEL = "google/gemini-2.5-flash"; // strong vision + cheap

interface VisionResult {
  partNumbers: string[]; // raw strings detected
  confident: boolean;
  notes?: string;
}

const normalize = (s: string): string =>
  s.toUpperCase().replace(/[\s\-_./\\]/g, "").trim();

async function readPartNumberWithAI(imageUrl: string): Promise<VisionResult> {
  const prompt = `You are inspecting a Toyota / automotive spare-part product photo.
Your task: extract ANY printed part number, OEM code, SKU, or barcode-text visible on the part itself or its packaging label.

Rules:
- Return ONLY codes that are CLEARLY printed/embossed on the part or its label.
- Ignore brand names ("TOYOTA", "DENSO", "AISIN") unless attached to a number.
- A part number typically looks like: "90915-YZZE1", "04465-0K090", "23300-21010", "SF-2013", "FC-13041" etc.
- If the image is generic/stock with no readable code, return an empty list and confident=false.
- DO NOT GUESS. Return only what you can clearly read.`;

  const body = {
    model: MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "report_part_numbers",
          description: "Report part numbers visibly printed on the product image.",
          parameters: {
            type: "object",
            properties: {
              partNumbers: {
                type: "array",
                items: { type: "string" },
                description: "Exact codes as printed (preserve dashes).",
              },
              confident: {
                type: "boolean",
                description: "True only if codes are clearly readable.",
              },
              notes: { type: "string" },
            },
            required: ["partNumbers", "confident"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "report_part_numbers" } },
  };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${t.slice(0, 200)}`);
  }

  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    return { partNumbers: [], confident: false, notes: "no tool_call" };
  }
  try {
    const args = JSON.parse(toolCall.function.arguments);
    return {
      partNumbers: Array.isArray(args.partNumbers) ? args.partNumbers : [],
      confident: !!args.confident,
      notes: args.notes,
    };
  } catch {
    return { partNumbers: [], confident: false, notes: "parse error" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ---- Auth: must be admin ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden — admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // default true
    const limit = Math.min(Number(body.limit) || 50, 200);
    const offset = Number(body.offset) || 0;
    const onlyUnassigned = body.onlyUnassigned !== false;

    // ---- 1) List storage files ----
    const { data: files, error: listErr } = await admin.storage
      .from(BUCKET)
      .list("", { limit: 2000, offset: 0, sortBy: { column: "name", order: "asc" } });

    if (listErr) throw listErr;
    const allFiles = (files || []).filter((f) => f.name && !f.name.endsWith("/"));

    // ---- 2) Load all products to match against ----
    const { data: products, error: prodErr } = await admin
      .from("products")
      .select("id, sku, erp_item_code, name_ar, image_url, brand")
      .eq("is_active", true);

    if (prodErr) throw prodErr;

    // Build lookup maps (normalized -> product id)
    const skuMap = new Map<string, string>();
    const erpMap = new Map<string, string>();
    for (const p of products || []) {
      if (p.sku) skuMap.set(normalize(p.sku), p.id);
      if (p.erp_item_code) erpMap.set(normalize(p.erp_item_code), p.id);
    }

    // ---- 3) Process the slice ----
    const slice = allFiles.slice(offset, offset + limit);
    const results: any[] = [];
    const matchesToApply: { product_id: string; image_url: string; matched: string }[] = [];

    for (const file of slice) {
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(file.name)}`;
      let vision: VisionResult;
      try {
        vision = await readPartNumberWithAI(publicUrl);
      } catch (e) {
        results.push({ file: file.name, error: String(e), matched: null });
        continue;
      }

      let matchedProductId: string | null = null;
      let matchedCode: string | null = null;
      for (const raw of vision.partNumbers) {
        const norm = normalize(raw);
        if (!norm) continue;
        if (skuMap.has(norm)) {
          matchedProductId = skuMap.get(norm)!;
          matchedCode = raw;
          break;
        }
        if (erpMap.has(norm)) {
          matchedProductId = erpMap.get(norm)!;
          matchedCode = raw;
          break;
        }
      }

      const product = matchedProductId ? products!.find((p) => p.id === matchedProductId) : null;
      const skip = onlyUnassigned && product && product.image_url;

      results.push({
        file: file.name,
        url: publicUrl,
        detected: vision.partNumbers,
        confident: vision.confident,
        matched: matchedProductId,
        matchedCode,
        productSku: product?.sku ?? null,
        productName: product?.name_ar ?? null,
        skipped: !!skip,
      });

      if (matchedProductId && vision.confident && !skip) {
        matchesToApply.push({
          product_id: matchedProductId,
          image_url: publicUrl,
          matched: matchedCode!,
        });
      }
    }

    // ---- 4) Apply (or dry-run) ----
    let applied = 0;
    if (!dryRun) {
      for (const m of matchesToApply) {
        const { error: upErr } = await admin
          .from("products")
          .update({ image_url: m.image_url })
          .eq("id", m.product_id);
        if (!upErr) applied++;
      }
    }

    return new Response(
      JSON.stringify({
        dryRun,
        totalFilesInBucket: allFiles.length,
        scanned: slice.length,
        offset,
        limit,
        nextOffset: offset + slice.length,
        candidateMatches: matchesToApply.length,
        applied,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("match-product-images-by-vision error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
