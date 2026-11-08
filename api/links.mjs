const FALLBACK = [
  {slug:"puprime",name:"PU Prime",rate:60,pop:3,url:"https://www.puprime.com/",status:"active",type:"Forex"},
  {slug:"vantage",name:"Vantage",rate:55,pop:3,url:"https://www.vantagemarkets.com/",status:"active",type:"Forex"}
];
const valid = x => x && /^[a-z0-9-]{2,40}$/.test(x.slug) && typeof x.name === "string" && x.name.length <= 100 && Number.isInteger(+x.rate) && +x.rate >= 0 && +x.rate <= 100 && /^https?:\/\//i.test(x.url) && ["active","paused"].includes(x.status);
async function db(method = "GET", slug = null, body = null) {
  const base=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;
  const url = new URL(`${base}/rest/v1/exchange_links`);
  url.searchParams.set("select","*");
  if (method === "GET") url.searchParams.set("order","pop.desc");
  else if (slug) url.searchParams.set("slug",`eq.${slug}`);
  const r=await fetch(url,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:method==="GET"?"":"return=representation"},body:body?JSON.stringify(body):undefined});
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  return method === "GET" ? r.json() : (r.status===204?[]:r.json());
}
export default async function handler(req,res) {
  if (req.method === "GET") {
    try { const rows=await db(); if(rows) return res.status(200).json({exchanges:rows,source:"supabase"}); } catch {}
    try {
      const host=req.headers.host;
      if(host){const r=await fetch(`https://${host}/data/links.json`);if(r.ok)return res.status(200).json({...await r.json(),source:"json-fallback"});}
    } catch {}
    return res.status(200).json({exchanges:FALLBACK,source:"fallback"});
  }
  if (!["PATCH","PUT"].includes(req.method)) { res.setHeader("Allow","GET, PATCH, PUT"); return res.status(405).json({error:"Method not allowed"}); }
  const slug=String(req.query?.slug || "");
  const input=req.body || {};
  if (!/^[a-z0-9-]{2,40}$/.test(slug) || !valid({...input,slug})) return res.status(400).json({error:"Invalid link fields"});
  try {
    const rows=await db("PATCH",slug,{name:input.name,rate:+input.rate,url:input.url,status:input.status,type:input.type || "Crypto"});
    return res.status(rows?.length?200:404).json(rows?.[0] || {error:"Link not found"});
  } catch (e) { return res.status(503).json({error:"Database unavailable"}); }
}
