import http from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DraftStore } from "./store.js";
import { formatForPlatform, generateContent, generateIllustration, normalizeReferenceLinks } from "./agent.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv(path.join(root, ".env"));
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, "data");
const store = new DraftStore(path.join(dataDir, "drafts.json"));
const publicDir = path.join(root, "public");
const port = Number(process.env.PORT || 3210);
const host = process.env.HOST || "127.0.0.1";
const sessions = new Map();
const attempts = new Map();

function loadEnv(file) {
  try {
    const text = readFileSync(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
    }
  } catch {}
}
function json(res, status, body) { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(body)); }
function cookies(req) { return Object.fromEntries(String(req.headers.cookie || "").split(";").map(x => x.trim().split("=")).filter(x => x.length === 2)); }
function authenticated(req) { if (!process.env.APP_PASSWORD) return true; const token = cookies(req).studio_session; const expiry = sessions.get(token); if (!expiry || expiry < Date.now()) { if (token) sessions.delete(token); return false; } return true; }
function rateLimited(req) { const key = req.socket.remoteAddress || "unknown"; const now = Date.now(); const recent = (attempts.get(key) || []).filter(x => now - x < 60_000); recent.push(now); attempts.set(key, recent); return recent.length > 30; }
async function body(req) {
  let raw = ""; for await (const chunk of req) { raw += chunk; if (raw.length > 1_000_000) throw new Error("请求过大"); }
  return raw ? JSON.parse(raw) : {};
}
async function staticFile(res, pathname) {
  const names = { "/": "suixinglu.html", "/inspiration": "index.html", "/login": "login.html", "/suixinglu-login.html": "suixinglu-login.html", "/app.js": "app.js", "/mobile.js": "mobile.js", "/styles.css": "styles.css", "/features.css": "features.css", "/mobile.css": "mobile.css", "/suixinglu.html": "suixinglu.html", "/suixinglu.css": "suixinglu.css", "/suixinglu.js": "suixinglu.js", "/manifest.webmanifest": "manifest.webmanifest", "/sw.js": "sw.js", "/icons/icon.svg": "icons/icon.svg" };
  let name = names[pathname]; if (!name && pathname.startsWith("/generated/")) name = pathname.slice(1); if (!name || name.includes("..")) return false;
  const data = await readFile(path.join(publicDir, name));
  const type = name.endsWith(".html") ? "text/html" : name.endsWith(".css") ? "text/css" : name.endsWith(".webmanifest") ? "application/manifest+json" : name.endsWith(".svg") ? "image/svg+xml" : "text/javascript";
  res.writeHead(200, { "Content-Type": `${type}; charset=utf-8` }); res.end(data); return true;
}

export const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "GET" && url.pathname === "/api/health") return json(res, 200, { ok: true, mode: process.env.OPENAI_API_KEY ? "live" : "demo", auth: Boolean(process.env.APP_PASSWORD) });
    if (req.method === "POST" && url.pathname === "/api/login") { if (rateLimited(req)) return json(res, 429, { error: "尝试次数过多，请稍后再试" }); const input = await body(req); if (!process.env.APP_PASSWORD || input.password !== process.env.APP_PASSWORD) return json(res, 401, { error: "访问密码不正确" }); const token = crypto.randomBytes(32).toString("hex"); sessions.set(token, Date.now() + 7 * 86400_000); res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Set-Cookie": `studio_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${process.env.NODE_ENV === "production" ? "; Secure" : ""}` }); return res.end('{"ok":true}'); }
    if (req.method === "POST" && url.pathname === "/api/logout") { const token = cookies(req).studio_session; if (token) sessions.delete(token); res.writeHead(200, { "Content-Type": "application/json", "Set-Cookie": "studio_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" }); return res.end('{"ok":true}'); }
    if (url.pathname === "/login") return staticFile(res, "/login");
    if (!authenticated(req) && (url.pathname === "/" || url.pathname.startsWith("/api/"))) { if (url.pathname === "/") { res.writeHead(302, { Location: "/login" }); return res.end(); } return json(res, 401, { error: "请先登录" }); }
    if (req.method === "GET" && url.pathname === "/api/drafts") return json(res, 200, await store.list());
    if (req.method === "POST" && url.pathname === "/api/drafts") {
      const input = await body(req); if (!input.title?.trim() || !input.content?.trim()) return json(res, 400, { error: "标题和正文不能为空" });
      return json(res, 200, await store.save(input));
    }
    if (req.method === "DELETE" && url.pathname.startsWith("/api/drafts/")) return json(res, (await store.remove(decodeURIComponent(url.pathname.slice(12)))) ? 200 : 404, { ok: true });
    if (req.method === "POST" && url.pathname === "/api/generate") {
      const input = await body(req); if (!input.topic?.trim()) return json(res, 400, { error: "请输入创作主题" });
      const submitted = String(input.referenceLinks || "").split(/[\n,，]+/).map(x => x.trim()).filter(Boolean);
      const valid = normalizeReferenceLinks(input.referenceLinks);
      if (submitted.length > 5) return json(res, 400, { error: "参考链接最多 5 条" });
      if (submitted.length && !valid.length) return json(res, 400, { error: "参考链接必须是完整的 http/https 公开网址" });
      input.referenceLinks = valid;
      return json(res, 200, await generateContent(input));
    }
    if (req.method === "POST" && url.pathname === "/api/format") { const input = await body(req); if (!input.content?.trim()) return json(res, 400, { error: "正文不能为空" }); return json(res, 200, formatForPlatform(input)); }
    if (req.method === "POST" && url.pathname === "/api/illustrations") { const input = await body(req); if (!input.title?.trim() || !input.content?.trim()) return json(res, 400, { error: "请先选择或编辑一篇内容" }); const result = await generateIllustration(input); if (result.base64) { await mkdir(path.join(publicDir, "generated"), { recursive: true }); const name = `${crypto.randomUUID()}.webp`; await writeFile(path.join(publicDir, "generated", name), Buffer.from(result.base64, "base64")); delete result.base64; result.imageUrl = `/generated/${name}`; } return json(res, 200, result); }
    if (await staticFile(res, url.pathname)) return;
    json(res, 404, { error: "Not found" });
  } catch (error) { json(res, 500, { error: error.message || "服务器错误" }); }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) server.listen(port, host, () => console.log(`灵感工坊已启动：http://${host}:${port} · ${process.env.HTTPS_PROXY ? "代理模式" : "直连模式"}`));


