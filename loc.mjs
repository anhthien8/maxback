import handler, { config } from "./api/reg.mjs";
for (const u of ["http://x/api/reg?slug=bitget", "http://x/api/reg?slug=binance", "http://x/api/reg?slug=zzz", "http://x/api/reg"]) {
  try {
    const res = await handler(new Request(u));
    const body = res.status === 302 ? "" : (await res.text()).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 90);
    console.log(u, "->", res.status, res.headers.get("location") || body);
  } catch (e) {
    console.log(u, "-> THREW:", e.constructor.name, e.message);
  }
}
console.log("config:", JSON.stringify(config));
