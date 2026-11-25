// Checks for the landing page and README. Run: node tests/site.cjs
// Serves the repo on a local port and drives it with Playwright chromium.
// Not a GitHub Action: checks run locally (Liam's rule).
const fs = require("fs");
const path = require("path");
const http = require("http");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const html = read("index.html");
const readme = read("README.md");
let failed = 0;
const check = (name, ok, extra) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && extra ? "  -> " + extra : ""}`);
  if (!ok) failed++;
};
const png = (f) => {
  const b = fs.readFileSync(path.join(ROOT, f));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};
const meta = (re) => (html.match(re) || [])[1];

// ---- static: sharing and discovery (G-2)
const icon = meta(/<link[^>]+rel="icon"[^>]+href="([^"]+)"/);
check("favicon link present and file exists", !!icon && fs.existsSync(path.join(ROOT, icon)), icon);
check("apple-touch-icon file exists", fs.existsSync(path.join(ROOT, meta(/rel="apple-touch-icon"[^>]+href="([^"]+)"/) || "missing")));
check("og:title", !!meta(/property="og:title" content="([^"]+)"/));
check("og:description", !!meta(/property="og:description" content="([^"]+)"/));
const og = meta(/property="og:image" content="([^"]+)"/);
check("og:image is absolute and the file exists", !!og && /^https:\/\//.test(og) && fs.existsSync(path.join(ROOT, og.replace(/^https:\/\/xxxxxliam\.github\.io\/clipr\//i, ""))), og);
check("twitter:card", meta(/name="twitter:card" content="([^"]+)"/) === "summary_large_image");
check("canonical", /^https:\/\/xxxxxliam\.github\.io\/clipr\/$/i.test(meta(/rel="canonical" href="([^"]+)"/) || ""));
check("theme-color", /^#[0-9a-f]{6}$/i.test(meta(/name="theme-color" content="([^"]+)"/) || ""));

// ---- static: out-of-date product depiction (G-1, G-5, G-7)
for (const [n, t] of [["index.html", html], ["README.md", readme]]) {
  check(`${n}: no "(coming)" or "is coming"`, !/\(coming\)|is coming/i.test(t));
  check(`${n}: names DaVinci Resolve and Premiere Pro`, /DaVinci Resolve/.test(t) && /Premiere Pro/.test(t));
  check(`${n}: no pre-rebuild UI names`, !/Add segment|Cut as one file|Cut clip|Channel data|status chip|Copy diagnostics/i.test(t));
  check(`${n}: no public issue route`, !/issues\/new/.test(t) && !/free GitHub account/i.test(t));
  check(`${n}: report route is Help > Report a problem`, /Report a problem/.test(t) && /Send report/.test(t));
  check(`${n}: Apple Silicon / M1 named`, /Apple Silicon/.test(t) && /M1/.test(t));
}
const alts = [...html.matchAll(/<img[^>]*alt="([^"]*)"/g)].map((m) => m[1]);
check("page screenshot alts describe the new captures", alts.some((a) => /Clip button/.test(a)) && alts.some((a) => /Hook Question/.test(a)), alts.join(" | "));
check("README screenshot alts describe the new captures", /alt="[^"]*Clip button/.test(readme) && /alt="[^"]*Hook Question/.test(readme));
check("screenshots are real captures at 1440 wide @2x", png("docs/screenshot.png").w === 2880 && png("docs/screenshot.png").h === 1800 && png("docs/segments.png").w === 2880);
check("1080p copy points at the footer pill", /Sign in for 1080p/.test(html) && /footer/i.test(html.slice(html.indexOf("Getting 1080p"))));

// ---- static: download guidance (G-9)
check("PowerShell line does not hard-code the filename", !/Unblock-File[^<]*Setup\.exe"/.test(html) && /Clipr-Windows-x64-Setup\*\.exe/.test(html));

// ---- browser
(async () => {
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200); res.end(fs.readFileSync(p));
  });
  await new Promise((r) => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15";
  const PHONE = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36";
  const WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";

  const open = async (ua, width, extra = {}) => {
    const ctx = await browser.newContext({ userAgent: ua, viewport: { width, height: 900 }, ...extra });
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("requestfailed", (r) => errors.push("failed " + r.url()));
    page.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
    await page.goto(url);
    return { page, errors, ctx };
  };

  for (const w of [375, 768, 1440, 2560]) {
    const { page, errors, ctx } = await open(WIN, w);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`${w}px: no horizontal overflow, no console errors`, over <= 0 && errors.length === 0, `overflow ${over}, ${errors.join("; ")}`);
    await ctx.close();
  }
  { // 200% zoom at 720 wide = 360 CSS px
    const { page, ctx } = await open(WIN, 360, { deviceScaleFactor: 2 });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check("200% zoom: no horizontal overflow", over <= 0, String(over));
    await ctx.close();
  }
  {
    const { page, ctx } = await open(MAC, 1440);
    const body = await page.locator("#card-mac").innerText();
    check("Mac card says Apple Silicon, M1 and newer, and how to check", /Apple Silicon/.test(body) && /M1/.test(body) && /Intel/.test(body) && /About This Mac/.test(body), body.slice(0, 200));
    check("phone note hidden on desktop", !(await page.locator("#desktop-note").isVisible()));
    await ctx.close();
  }
  {
    const { page, ctx } = await open(PHONE, 375);
    const note = page.locator("#desktop-note");
    check("phone UA shows the desktop note", (await note.isVisible()) && /Clipr is a desktop app\. Open this page on your computer/.test(await note.innerText()));
    check("phone keeps the download links", (await page.locator("a.ghost").count()) === 3);
    await ctx.close();
  }
  {
    const { page, ctx } = await open(WIN, 1440);
    const r = await page.request.get(url + icon);
    check("favicon served 200", r.status() === 200);
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
  process.exit(failed ? 1 : 0);
})();
