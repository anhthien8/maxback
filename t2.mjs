import handler from "./api/reg.mjs";
// mimic the Vercel Node launcher: url may be relative
const res = await handler(new Request("http://localhost/api/reg?slug=bitget"));
console.log("A:", res.status, res.headers.get("location"));
const res2 = await handler(new Request("/api/reg?slug=bybit", { headers: { host: "localhost" } }));
console.log("B:", res2.status, res2.headers.get("location"));
