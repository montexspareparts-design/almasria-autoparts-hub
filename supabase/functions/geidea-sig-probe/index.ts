// TEMPORARY diagnostic. Deleted after use.
const enc = new TextEncoder();

const hmac = async (data: string, key: CryptoKey) => {
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
};

const importKey = (secret: string) =>
  crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

Deno.serve(async (req) => {
  const body = await req.json();
  const order = body.order ?? {};
  const target: string = body.signature;

  const pubs = [
    ["live_pub", Deno.env.get("GEIDEA_MERCHANT_PUBLIC_KEY_LIVE") ?? ""],
    ["pub", Deno.env.get("GEIDEA_MERCHANT_PUBLIC_KEY") ?? ""],
    ["payload_pub", order.merchantPublicKey ?? ""],
    ["none", ""],
  ].filter(([n, v]) => n === "none" || v);
  const secrets = [
    ["live_pw", Deno.env.get("GEIDEA_API_PASSWORD_LIVE") ?? ""],
    ["pw", Deno.env.get("GEIDEA_API_PASSWORD") ?? ""],
  ].filter(([, v]) => v) as [string, string][];

  const amt = Number(order.amount ?? 0);
  const T: Record<string, string> = {
    orderId: order.orderId ?? "",
    amount: amt.toFixed(2),
    amountRaw: String(amt),
    currency: order.currency ?? "",
    ref: order.merchantReferenceId ?? "",
    ts: body.timeStamp ?? body.timestamp ?? "",
    code: order.detailedResponseCode ?? "000",
    status: order.status ?? "",
    session: body.sessionId ?? order.sessionId ?? "",
  };

  const names = ["orderId", "amount", "currency", "ref", "ts", "code", "status", "session"];
  // all ordered sequences of length 3..6 without repetition
  const seqs: string[][] = [];
  const build = (cur: string[]) => {
    if (cur.length >= 3) seqs.push([...cur]);
    if (cur.length === 6) return;
    for (const n of names) {
      if (cur.includes(n)) continue;
      build([...cur, n]);
    }
  };
  build([]);

  const keyCache = new Map<string, CryptoKey>();
  for (const [sn, sv] of secrets) keyCache.set(sn, await importKey(sv));

  let tried = 0;
  for (const [pn, pv] of pubs) {
    for (const [sn] of secrets) {
      const key = keyCache.get(sn)!;
      for (const seq of seqs) {
        let data = pv;
        for (const n of seq) data += T[n];
        tried++;
        if ((await hmac(data, key)) === target) {
          return Response.json({ match: { pub: pn, secret: sn, seq }, tried });
        }
        // amount variant
        if (seq.includes("amount")) {
          const d2 = pv + seq.map((n) => (n === "amount" ? T.amountRaw : T[n])).join("");
          tried++;
          if ((await hmac(d2, key)) === target) {
            return Response.json({ match: { pub: pn, secret: sn, seq, amount: "raw" }, tried });
          }
        }
      }
    }
  }
  return Response.json({ match: null, tried });
});
