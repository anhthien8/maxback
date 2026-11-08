const base = "https://maxback-two.vercel.app";
for (const s of ["bitget","bybit","okx","kucoin","khongtontai","binance"]) {
  try {
    const r = await fetch(base + "/reg/" + s, { redirect: "manual" });
    console.log(s.padEnd(12), "->", r.status, r.headers.get("location") || "");
  } catch (e) { console.log(s, "-> ERR", e.message); }
}
const h = await fetch(base + "/admin"); console.log("admin ->", h.status);
const j = await fetch(base + "/data/links.json"); console.log("links.json ->", j.status);
