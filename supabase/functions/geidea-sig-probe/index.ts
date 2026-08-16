// TEMPORARY diagnostic. Deleted after use.
const enc = new TextEncoder();

const hmac = async (data: string, key: string) => {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
};

Deno.serve(async (req) => {
  const body = await req.json();
  const order = body.order ?? {};
  const target: string = body.signature;

  const keys = [
    ["live_pub", Deno.env.get("GEIDEA_MERCHANT_PUBLIC_KEY_LIVE") ?? ""],
    ["pub", Deno.env.get("GEIDEA_MERCHANT_PUBLIC_KEY") ?? ""],
    ["payload_pub", order.merchantPublicKey ?? ""],
  ].filter(([, v]) => v);
  const secrets = [
    ["live_pw", Deno.env.get("GEIDEA_API_PASSWORD_LIVE") ?? ""],
    ["pw", Deno.env.get("GEIDEA_API_PASSWORD") ?? ""],
  ].filter(([, v]) => v);

  const amt5 = Number(order.amount ?? 0);
  const tokens: Record<string, string> = {
    orderId: order.orderId ?? "",
    amount2: amt5.toFixed(2),
    amount0: String(amt5),
    currency: order.currency ?? "",
    ref: order.merchantReferenceId ?? "",
    ts: body.timeStamp ?? body.timestamp ?? "",
    code: order.detailedResponseCode ?? "000",
    status: order.status ?? "",
  };

  const base = ["orderId", "amount2", "currency", "ref", "ts"];
  const perms: string[][] = [];
  const permute = (arr: string[], cur: string[] = []) => {
    if (!arr.length) { perms.push([...cur]); return; }
    arr.forEach((x, i) => permute([...arr.slice(0, i), ...arr.slice(i + 1)], [...cur, x]));
  };
  permute(base);

  const variants: string[][] = [];
  for (const p of perms) {
    variants.push(p);
    variants.push(p.map((t) => (t === "amount2" ? "amount0" : t)));
    variants.push([...p, "code"]);
    variants.push([...p, "status"]);
  }

  for (const [kn, pub] of keys) {
    for (const [sn, pw] of secrets) {
      for (const v of variants) {
        const data = pub + v.map((t) => tokens[t]).join("");
        if ((await hmac(data, pw)) === target) {
          return new Response(JSON.stringify({ match: { key: kn, secret: sn, order: v } }), {
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    }
  }
  return new Response(JSON.stringify({ match: null, keysTried: keys.length, secretsTried: secrets.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
