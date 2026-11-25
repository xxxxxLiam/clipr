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
  check(`${n}: report route is Help > Report a problem`, /Help(?:\s|&nbsp;)*(?:→|&rarr;)(?:\s)*Report a problem/.test(t) || /\*\*Help\*\*[^.]*\*\*Report a problem\*\*/.test(t));
  check(`${n}: Apple Silicon / M1 named`, /Apple Silicon/.test(t) && /M1/.test(t));
}
const alts = [...html.matchAll(/<img[^>]*alt="([^"]*)"/g)].map((m) => m[1]);
check("page hero alt describes the capture", alts.some((a) => /Clip button/.test(a) && /42-second range/.test(a)), alts.join(" | "));
check("README says Send report", /Send report/.test(readme));
check("README screenshot alts describe the new captures", /alt="[^"]*Clip button/.test(readme) && /alt="[^"]*Hook Question/.test(readme));
check("screenshots are real captures at 1440 wide @2x", png("docs/screenshot.png").w === 2880 && png("docs/screenshot.png").h === 1800 && png("docs/segments.png").w === 2880);
check("page has no 1080p section (G-7: the app and Help cover it)", !/Getting 1080p|status chip/.test(html));
check("README 1080p copy points at the footer pill", /Sign in for 1080p/.test(readme) && /bottom of the window/.test(readme));
check("no mock-up leftovers (Decided here tag, dashed outline)", !/Decided here|decided|dashed/.test(html));
check("Inter is self-hosted (no Google Fonts)", !/fonts\.(googleapis|gstatic)/.test(html) && fs.existsSync(path.join(ROOT, "fonts/inter-latin-wght.woff2")));
check("only Clean Cut colours in the page CSS", [...html.matchAll(/#[0-9a-f]{6}\b/gi)].every((m) => ["0a0d0f","121619","181d21","232a2f","f2f5f6","94a0a5","8b979c","5fd8ca","b8e4ea","ff6363","141f22","2a4247","6f959b","121a1d","22363a","3f5b60"].includes(m[0].slice(1).toLowerCase())), [...new Set([...html.matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => m[0]))].join(" "));
check("editors named as plain text, four of them", ["Final Cut Pro", "Premiere Pro", "DaVinci Resolve", "CapCut"].every((e) => new RegExp(`<b>${e}</b>`).test(html)));
check("ticker is decoration only (aria-hidden) and stops under reduced motion", /class="ticker" aria-hidden="true"/.test(html) && /prefers-reduced-motion[^}]*\.track \{ animation: none/.test(html));

// ---- static: colours are the Clean Cut tokens (the app design tokens)
const tok = { bg: "#0a0d0f", panel: "#121619", raised: "#181d21", hover: "#232a2f", fg: "#f2f5f6", "fg-dim": "#94a0a5", disabled: "#8b979c", ice: "#5fd8ca", frost: "#b8e4ea", error: "#ff6363" };
check("page colour tokens are the Clean Cut values", Object.entries(tok).every(([k, v]) => new RegExp(`--${k}: ${v};`).test(html)));
check("no old red accent: error red is not used as a fill or accent", !/--accent/.test(html) && !/--error\)/.test(html.replace(/\.vis \.s\.bad \{[^}]*\}/,"").replace(/<svg[^>]*class="bad"[\s\S]*?<\/svg>/g,"")) && !/FF6363/i.test(readme + read("logo.svg")));
check("theme-color matches --bg", meta(/name="theme-color" content="([^"]+)"/) === tok.bg);

check("footer credit links to idksolutions.co.za (not .org)", /Proudly developed by <a[^>]+href="https:\/\/idksolutions\.co\.za"/.test(html) && !/idksolutions\.org/i.test(html));

check("message match: title, description and share text carry the hero promise, not the transcript feature", /forty seconds/.test((html.match(/name="description" content="([^"]*)"/)||[])[1]||"") && /forty seconds/.test((html.match(/og:description" content="([^"]*)"/)||[])[1]||"") && /only the seconds you need/i.test((html.match(/<title>([^<]*)/)||[])[1]||"") && !/transcript/.test((html.match(/og:description" content="([^"]*)"/)||[])[1]||""));
check("install copy is plain language: no 'certificate' or '&&' explainer", !/paid (Windows )?certificate/.test(html) && !/<code>&amp;&amp;<\/code> means/.test(html));
check("lockup C in header and footer: five outlined paths each (mark Frost + Ice, Clip, r stem, Ice r-cut), no old block-stem r", (html.match(/<svg class="lockup"[^>]*viewBox="0 0 436.92 144.29">(?:<path fill="#(?:B8E4EA|5FD8CA|F2F5F6)" d="[^"]+"\/>){5}<\/svg>/gi) || []).length === 2 && !/class="cutr"/.test(html));
check("run 2 G2-1: the page states the 10-minute clip cap", /up to 10 minutes/i.test(html));
check("run 2 G2-3: the page says sign-in gets 1080p and unsigned is 360p", /Sign in to YouTube once for 1080p/.test(html) && /360p/.test(html));
check("run 2 G2-2: comparison claims are qualified (Many downloaders, ads on many sites)", /Many downloaders take the whole video/.test(html) && /Ads on many free sites/.test(html) && !/Ads before every download/.test(html) && !/Other downloaders take/.test(html));
check("run 2 G2-7: hero image served as WebP under 300 KB with PNG fallback", /<picture><source type="image\/webp" srcset="docs\/screenshot\.webp"/.test(html) && fs.statSync(path.join(ROOT, "docs/screenshot.webp")).size < 300 * 1024 && fs.existsSync(path.join(ROOT, "docs/screenshot.png")));
check("install notes are cards, not loose paragraphs", (html.match(/class="(note|tile)[ "]/g) || []).length >= 4 && !/<div class="notes">\s*<p>/.test(html));
check("version line sits below the tabs, centred", /role="tablist"[\s\S]*?<\/div>\s*<p class="ver" id="ver"/.test(html) && /\.ver \{ text-align: center/.test(html));

check("closing card is an inset Ice gradient with a Frost sunrise and dark text", /grain-ice/.test(html) && /#b8e4ea 0%[^;]*\),\s*linear-gradient[^;]*#5fd8ca/.test(html) && /\.final-card\.grain-ice \.big[^}]*color: var\(--bg\)/.test(html));

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
    const body = await page.locator("#panel-mac").innerText();
    check("Mac card says Apple Silicon, M1 and newer, and how to check", /Apple Silicon/.test(body) && /M1/.test(body) && /Intel/.test(body) && /About This Mac/.test(body), body.slice(0, 200));
    check("phone note hidden on desktop", !(await page.locator("#desktop-note").isVisible()));
    check("Mac UA: hero and nav buttons serve the dmg, mac tab selected, others hidden",
      (await page.locator("#dl-hero").getAttribute("href")).endsWith("Clipr-macOS-AppleSilicon.dmg") &&
      (await page.locator("#dl-nav").getAttribute("href")).endsWith("Clipr-macOS-AppleSilicon.dmg") &&
      (await page.locator("#tab-mac").getAttribute("aria-selected")) === "true" &&
      !(await page.locator("#panel-win").isVisible()) && !(await page.locator("#panel-linux").isVisible()));
    await page.locator("#tab-win").click();
    check("tabs switch panels", (await page.locator("#panel-win").isVisible()) && !(await page.locator("#panel-mac").isVisible()));
    await page.locator("#tab-win").press("ArrowRight");
    check("arrow key moves to the Linux tab", (await page.locator("#tab-linux").getAttribute("aria-selected")) === "true");
    await ctx.close();
  }
  {
    const { page, ctx } = await open(PHONE, 375);
    const note = page.locator("#desktop-note");
    check("phone UA shows the desktop note", (await note.isVisible()) && /Clipr is a desktop app\. Open this page on your computer/.test(await note.innerText()));
    const tg = await page.evaluate(() => ({ lock: document.querySelector(".lockup-link").offsetHeight, tabs: [...document.querySelectorAll(".tab")].map((e) => e.offsetHeight), noteFirst: !!(document.querySelector("#desktop-note").compareDocumentPosition(document.querySelector(".hero-copy .also")) & Node.DOCUMENT_POSITION_FOLLOWING) }));
    check("run 2 G2-5: phone note comes before the installer links, lockup and tabs are at least 44px", tg.noteFirst && tg.lock >= 44 && tg.tabs.every((h) => h >= 44), JSON.stringify(tg));
    check("phone keeps the download links (all three) and drops the big button", (await page.locator(".also a").count()) >= 6 && !(await page.locator(".cta-row").first().isVisible()));
    await ctx.close();
  }
  {
    const { page, ctx } = await open(WIN, 1440);
    check("Windows UA: exe link and Windows tab open", (await page.locator("#dl-hero").getAttribute("href")).endsWith("Clipr-Windows-x64-Setup.exe") && (await page.locator("#panel-win").isVisible()));
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ userAgent: WIN, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(url);
    const all = await Promise.all(["mac", "win", "linux"].map((k) => page.locator("#panel-" + k).isVisible()));
    check("run 2 G2-4: JavaScript off hides the dead tab buttons", !(await page.locator(".tabs").isVisible()));
    check("JavaScript off: all three install panels show, download goes to the releases page", all.every(Boolean) && (await page.locator("#dl-hero").getAttribute("href")).endsWith("/releases/latest"));
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ userAgent: WIN, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(url);
    check("reduced motion: ticker animation is off", (await page.locator(".track").evaluate((e) => getComputedStyle(e).animationName)) === "none");
    check("reduced motion: no scroll-in motion, everything visible without scrolling", (await page.evaluate(() => !document.documentElement.classList.contains("anim") && [...document.querySelectorAll(".tile, .final-card, .sec-head")].every((e) => getComputedStyle(e).opacity === "1"))));
    await ctx.close();
  }
  {
    const { page, ctx } = await open("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36", 1440);
    check("Linux UA: AppImage link and Linux tab open", (await page.locator("#dl-hero").getAttribute("href")).endsWith("Clipr-Linux-x64.AppImage") && (await page.locator("#panel-linux").isVisible()));
    await ctx.close();
  }
  {
    const { page, ctx } = await open(WIN, 1440);
    await page.waitForTimeout(2600);
    const heroIn = await page.evaluate(() => [".hero-copy > h1", ".stage", ".stage .pin"].every((s) => getComputedStyle(document.querySelector(s)).opacity === "1"));
    check("scroll-in motion: hero copy, window and pin animate in on load", heroIn);
    const before = await page.evaluate(() => getComputedStyle(document.querySelector(".final-card")).opacity);
    check("scroll-in motion: closing card waits until scrolled to", before === "0");
    await page.evaluate(() => document.querySelector(".final-card").scrollIntoView());
    await page.waitForTimeout(2800);
    check("scroll-in motion: closing card appears once scrolled to", (await page.evaluate(() => getComputedStyle(document.querySelector(".final-card")).opacity)) === "1");
    const tk = await page.evaluate(() => { const tr = document.querySelector(".final-card .track"), g = tr.querySelectorAll(".grp"), tw = document.querySelector(".final-card .ticker").clientWidth; return { n: g.length, tr: tr.getBoundingClientRect().width, g0: g[0] && g[0].getBoundingClientRect().width, g1: g[1] && g[1].getBoundingClientRect().width, tw }; });
    check("ticker loops seamlessly: two identical groups, each wider than the strip, so -50% lands exactly on the start", tk.n === 2 && Math.abs(tk.g0 - tk.g1) < 0.5 && Math.abs(tk.tr - 2 * tk.g0) < 0.5 && tk.g0 >= tk.tw);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(300);
    await page.mouse.move(700, 400);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(60);
    const y1 = await page.evaluate(() => scrollY);
    await page.waitForTimeout(900);
    const y2 = await page.evaluate(() => scrollY);
    check("momentum scrolling: after the wheel stops the page keeps gliding, and covers the flick", y1 > 0 && y2 > y1 + 100 && y2 >= 600);
    check("parallax: hero window moves with scroll", (await page.evaluate(() => document.documentElement.style.getPropertyValue("--p"))) !== "0.000");
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
