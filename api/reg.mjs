// Link cloaker: /reg/:slug -> 302 to the exchange affiliate URL.
// Written as a classic Node (req, res) handler: no Web API, no runtime override.
// The link table is inlined so the bundle never depends on how extra files are laid out.
// The admin page at /admin reads data/links.json and exports a copy to paste here.

const FALLBACK_LINKS = [
  { slug: "bitget",    name: "Bitget",    rate: 90, url: "https://www.bitget.com/",    status: "active" },
  { slug: "woox",      name: "WOO X",     rate: 90, url: "https://woo.org/",           status: "active" },
  { slug: "toobit",    name: "Toobit",    rate: 85, url: "https://www.toobit.com/",    status: "active" },
  { slug: "bitunix",   name: "Bitunix",   rate: 85, url: "https://www.bitunix.com/",   status: "active" },
  { slug: "weex",      name: "WEEX",      rate: 82, url: "https://www.weex.com/en/register?vipCode=kolglobal", status: "active" },
  { slug: "bybit",     name: "Bybit",     rate: 80, url: "https://www.bybit.com/",     status: "active" },
  { slug: "mexc",      name: "MEXC",      rate: 80, url: "https://www.mexc.com/",      status: "active" },
  { slug: "gate",      name: "Gate",      rate: 80, url: "https://www.gate.io/",       status: "active" },
  { slug: "coinw",     name: "CoinW",     rate: 80, url: "https://www.coinw.com/",     status: "active" },
  { slug: "xt",        name: "XT.com",    rate: 80, url: "https://www.xt.com/",        status: "active" },
  { slug: "ueex",      name: "UEEx",      rate: 80, url: "https://www.ueex.com/",      status: "active" },
  { slug: "bingx",     name: "BingX",     rate: 78, url: "https://bingx.com/",         status: "active" },
  { slug: "lbank",     name: "LBank",     rate: 78, url: "https://www.lbank.com/",     status: "active" },
  { slug: "okx",       name: "OKX",       rate: 75, url: "https://www.okx.com/",       status: "active" },
  { slug: "phemex",    name: "Phemex",    rate: 75, url: "https://phemex.com/",        status: "active" },
  { slug: "bitrue",    name: "Bitrue",    rate: 75, url: "https://www.bitrue.com/",    status: "active" },
  { slug: "digifinex", name: "DigiFinex", rate: 75, url: "https://www.digifinex.com/", status: "active" },
  { slug: "kucoin",    name: "KuCoin",    rate: 72, url: "https://www.kucoin.com/",    status: "active" },
  { slug: "htx",       name: "HTX",       rate: 70, url: "https://www.htx.com/",       status: "active" },
  { slug: "blofin",    name: "BloFin",    rate: 70, url: "https://blofin.com/",        status: "active" },
  { slug: "binance",   name: "Binance",   rate: 70, url: "https://www.binance.com/",   status: "active" },
  { slug: "puprime",   name: "PU Prime",   rate: 60, url: "https://www.puprime.com/",       status: "active", type: "Forex" },
  { slug: "vantage",   name: "Vantage",    rate: 55, url: "https://www.vantagemarkets.com/", status: "active", type: "Forex" },
];

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function sendPage(res, status, title, body) {
  const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#121620;color:#e8ecf4;
font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.c{text-align:center;padding:40px;max-width:440px}h1{font-size:25px;margin:0 0 10px;letter-spacing:-.02em}
p{color:#8a94a8;margin:0 0 24px}a{display:inline-block;padding:13px 26px;border-radius:99px;
background:#b9b5f5;color:#1a1533;font-weight:600;text-decoration:none}a:hover{background:#cfcbfb}</style>
</head><body><div class="c">${body}</div></body></html>`;
  res.statusCode = status;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-robots-tag", "noindex, nofollow");
  res.end(html);
}

export default async function handler(req, res) {
  // Vercel rewrites /reg/:slug to /api/reg?slug=:slug
  const q = (req.url || "").split("?")[1] || "";
  const slug = (new URLSearchParams(q).get("slug") || "").toLowerCase().trim();

  if (!slug) return sendPage(res, 400, "Link không hợp lệ", "<h1>Thiếu mã sàn</h1><p>Đường dẫn cần có dạng <b>/reg/ten-san</b>.</p><a href='/'>Về trang chủ</a>");

  let links = FALLBACK_LINKS;
  try {
    const base = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (base && key) {
      const r = await fetch(`${base}/rest/v1/exchange_links?slug=eq.${encodeURIComponent(slug)}&select=*`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
      if (r.ok) links = await r.json();
    }
  } catch {}
  const ex = links.find(e => e.slug === slug);
  if (!ex) return sendPage(res, 404, "Sàn không tồn tại", `<h1>Không tìm thấy “${esc(slug)}”</h1><p>Sàn này chưa có trong danh sách đối tác.</p><a href='/#exchanges'>Xem các sàn đối tác</a>`);
  if (ex.status !== "active") return sendPage(res, 503, "Sàn tạm dừng", `<h1>${esc(ex.name)} tạm dừng nhận đăng ký</h1><p>Chúng tôi đang hoàn tất hợp tác với sàn này. Vui lòng chọn sàn khác.</p><a href='/#exchanges'>Xem các sàn đối tác</a>`);

  res.statusCode = 302;
  res.setHeader("location", ex.url);
  res.setHeader("cache-control", "no-store");
  res.setHeader("referrer-policy", "strict-origin-when-cross-origin");
  res.end();
}
