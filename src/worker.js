// MaxBack on Cloudflare Workers + D1.
//   GET  /reg/:slug   -> 302 to home_url (homepage carrying the ref code) if set, else the referral URL (logs a click)
//   GET  /api/links   -> list links (public)
//   PATCH /api/links?slug=x -> update a link (needs x-admin-pass header)
// Everything else is served from static assets.
const SLUG = /^[a-z0-9-]{2,40}$/;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

function page(status, title, body) {
  return new Response(`<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#121620;color:#e8ecf4;font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.c{text-align:center;padding:40px;max-width:440px}h1{font-size:25px;margin:0 0 10px}p{color:#8a94a8;margin:0 0 24px}
a{display:inline-block;padding:13px 26px;border-radius:99px;background:#b9b5f5;color:#1a1533;font-weight:600;text-decoration:none}</style>
</head><body><div class="c">${body}</div></body></html>`, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
}

async function sha256(v) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}

async function reg(slug, req, env, ctx) {
  slug = slug.toLowerCase();
  if (!SLUG.test(slug)) return page(400, "Link không hợp lệ", "<h1>Thiếu mã sàn</h1><p>Đường dẫn cần có dạng <b>/reg/ten-san</b>.</p><a href='/'>Về trang chủ</a>");
  const ex = await env.DB.prepare("SELECT name,COALESCE(NULLIF(home_url,''),url) AS url,status FROM exchange_links WHERE slug=?").bind(slug).first();
  if (!ex) return page(404, "Sàn không tồn tại", `<h1>Không tìm thấy “${esc(slug)}”</h1><p>Sàn này chưa có trong danh sách đối tác.</p><a href='/#exchanges'>Xem các sàn đối tác</a>`);
  if (ex.status !== "active") return page(503, "Sàn tạm dừng", `<h1>${esc(ex.name)} tạm dừng nhận đăng ký</h1><p>Vui lòng chọn sàn khác.</p><a href='/#exchanges'>Xem các sàn đối tác</a>`);
  ctx.waitUntil(env.DB.prepare("INSERT INTO clicks (slug,country) VALUES (?,?)").bind(slug, req.cf?.country || null).run().catch(() => {}));
  return new Response(null, { status: 302, headers: { location: ex.url, "cache-control": "no-store", "referrer-policy": "strict-origin-when-cross-origin" } });
}

async function links(req, env, url) {
  if (req.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT l.slug,l.name,l.rate,l.pop,l.url,l.home_url,l.status,l.type,(SELECT count(*) FROM clicks c WHERE c.slug=l.slug) AS clicks FROM exchange_links l ORDER BY l.pop DESC"
    ).all();
    return json({ exchanges: results, source: "d1" });
  }
  if (req.method !== "PATCH" && req.method !== "PUT") return json({ error: "Method not allowed" }, 405);
  if (!env.ADMIN_HASH || (await sha256(req.headers.get("x-admin-pass") || "")) !== env.ADMIN_HASH) return json({ error: "Unauthorized" }, 401);
  const slug = url.searchParams.get("slug") || "";
  const b = await req.json().catch(() => ({}));
  const rate = Number(b.rate);
  const ok = SLUG.test(slug) && typeof b.name === "string" && b.name.length > 0 && b.name.length <= 100
    && Number.isInteger(rate) && rate >= 0 && rate <= 100 && /^https?:\/\//i.test(b.url || "") && (!b.home_url || /^https?:\/\//i.test(b.home_url)) && ["active", "paused"].includes(b.status);
  if (!ok) return json({ error: "Invalid link fields" }, 400);
  const row = await env.DB.prepare(
    "UPDATE exchange_links SET name=?,rate=?,url=?,home_url=?,status=?,type=?,updated_at=datetime('now') WHERE slug=? RETURNING *"
  ).bind(b.name, rate, b.url, b.home_url || null, b.status, b.type || "Crypto", slug).first();
  return row ? json(row) : json({ error: "Link not found" }, 404);
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const p = url.pathname.replace(/\/+$/, "");
    try {
      if (p.startsWith("/reg/")) return await reg(decodeURIComponent(p.slice(5)), req, env, ctx);
      if (p === "/reg") return await reg("", req, env, ctx);
      if (p === "/api/links") return await links(req, env, url);
    } catch (e) {
      return json({ error: "Database unavailable" }, 503);
    }
    return env.ASSETS.fetch(req);
  },
};
