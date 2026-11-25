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

check("closing card is an Ice gradient with a Frost sunrise and dark text", /grain-ice/.test(html) && /#b8e4ea 0%[^;]*\),\s*linear-gradient[^;]*#5fd8ca/.test(html) && /\.final-card\.grain-ice \.big[^}]*color: var\(--bg\)/.test(html));

// ---- static: download guidance (G-9)
check("PowerShell line does not hard-code the filename", !/Unblock-File[^<]*Setup\.exe"/.test(html) && /Clipr-Windows-x64-Setup\*\.exe/.test(html));

// ---- run 3: the site's own pages (no trip to GitHub for pages), shared design, full-bleed closing section
const PAGES = ["", "download/", "whats-new/", "licence/", "notices/", "privacy/"];
const pageHtml = Object.fromEntries(PAGES.map((p) => [p, read(p + "index.html")]));
const NAMES = { download: "download/", "whats-new": "whats-new/", licence: "licence/", notices: "notices/", privacy: "privacy/" };
for (const [n, p] of Object.entries(NAMES)) check(`run 3: ${n} page exists`, !!pageHtml[p] && /<h1>/.test(pageHtml[p]));
{
  const bad = [];
  for (const [p, t] of Object.entries(pageHtml)) {
    for (const m of t.matchAll(/<a [^>]*href="(https?:\/\/[^"]+)"/g)) {
      const h = m[1];
      if (/github\.com\/xxxxxLiam\/clipr\//i.test(h) && !/\/releases\/(latest\/)?download\//.test(h) && !/\/issues$/.test(h)) bad.push((p || "index") + " -> " + h);
    }
  }
  check("run 3: no page link goes to GitHub except installer downloads (and the licence's own issues line)", bad.length === 0, bad.join("; "));
}
{
  const bad = [];
  for (const [p, tt] of Object.entries(pageHtml)) {
    const t = tt.replace(/<script[\s\S]*?<\/script>/g, "");
    for (const m of t.matchAll(/<a [^>]*href="([^"#:]*)(#[^"]*)?"/g)) {
      if (!m[1]) continue;
      let target = path.normalize(path.join(p, m[1]));
      if (m[1].endsWith("/") || m[1] === "") target = path.join(target, "index.html");
      if (!fs.existsSync(path.join(ROOT, target))) bad.push((p || "index") + " -> " + m[1]);
    }
  }
  check("run 3: every site-internal link resolves to a file", bad.length === 0, bad.join("; "));
}
{
  const need = ["How it works", "What&rsquo;s new", "Install help"];
  check("run 3: every page has the same nav (How it works, What's new, Install help) and the IDK Solutions credit", Object.values(pageHtml).every((t) => need.every((n) => t.includes(n)) && /Proudly developed by <a[^>]+href="https:\/\/idksolutions\.co\.za"/.test(t)));
  check("run 8: footer links to the site's own Licence, Notices, Privacy and What's new, and there is no separate All versions link (it is the same list as What's new)", ["licence/", "notices/", "privacy/", "whats-new/"].every((h) => html.includes(`href="${h}"`)) && !/All versions/.test(html));
  const ok = Object.entries(pageHtml).filter(([p]) => p).every(([p, t]) => /<link rel="canonical" href="https:\/\/xxxxxliam\.github\.io\/clipr\/[a-z-]+\/"/.test(t) && /<title>[^<]+ · Clipr<\/title>/.test(t) && /name="description"/.test(t) && /<h1>[^<]+<\/h1>/.test(t));
  check("run 3: inner pages have title, description, canonical and one h1", ok);
  const tokens = Object.entries(pageHtml).every(([p, t]) => [...t.matchAll(/--([a-z-]+): (#[0-9a-f]{6});/gi)].every((m) => tok[m[1]] === m[2].toLowerCase()));
  check("run 3: inner pages use only the Clean Cut token values", tokens);
}
{
  const norm = (x) => x.replace(/<[^>]+>/g, " ").replace(/&rsquo;/g, "\u2019").replace(/&ldquo;/g, "\u201c").replace(/&rdquo;/g, "\u201d").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
  const lic = fs.readFileSync(path.join(ROOT, "src/LICENSE.txt"), "utf8");
  const pageText = norm(pageHtml["licence/"]);
  const paras = lic.split(/\n\s*\n/).map((p) => p.replace(/^\s*[a-f]\.\s+/, "").replace(/^\d\. [A-Z0-9 ,'-]+\n/, "").replace(/\s+/g, " ").trim()).filter((p) => p.length > 30);
  const missing = paras.filter((p) => !pageText.includes(p));
  check("run 3: the Licence page carries every paragraph of the licence text word for word", paras.length >= 15 && missing.length === 0, paras.length + " paragraphs; missing: " + missing.map((m) => m.slice(0, 50)).join(" | "));
  const rootLic = fs.existsSync(path.join(ROOT, "LICENSE")) ? fs.readFileSync(path.join(ROOT, "LICENSE"), "utf8").replace(/\s+/g, " ").trim() : null;
  check("run 3: src/LICENSE.txt is the same text as LICENSE", rootLic === null || rootLic === lic.replace(/\s+/g, " ").trim());
  const notices = norm(pageHtml["notices/"]);
  check("run 3: Notices page names ffmpeg (GPL v3), yt-dlp, Deno, Electron and Inter, with the corresponding-source link", ["ffmpeg", "yt-dlp", "Deno", "Electron", "Inter", "GNU General Public License v3.0 or later", "eugeneware/ffmpeg-static/releases/tag/b6.0"].every((w) => notices.includes(w) || pageHtml["notices/"].includes(w)));
  check("run 3: Privacy page says nothing is uploaded and reports only go when Send report is pressed", /Nothing you watch, mark or make is uploaded/.test(norm(pageHtml["privacy/"])) && /Nothing is sent unless you press Send report/.test(norm(pageHtml["privacy/"])));
  const { execFileSync } = require("child_process");
  let fresh = false, why = "";
  try {
    const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "clipr-pages-"));
    execFileSync("python3", [path.join(ROOT, "scripts/build-pages.py"), "--out", tmp], { stdio: "pipe" });
    const stale = PAGES.slice(1).filter((p) => fs.readFileSync(path.join(tmp, p, "index.html"), "utf8") !== read(p + "index.html"));
    fresh = stale.length === 0;
    if (!fresh) why = "out of step: " + stale.join(", ") + "; run python3 scripts/build-pages.py and commit the result";
  } catch (e) { why = String(e.message).slice(0, 120); }
  check("run 3: inner pages are in step with index.html (python3 scripts/build-pages.py changes nothing)", fresh, why);
}

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
    check("JavaScript off: all three install panels show, download goes to the site's own download page", all.every(Boolean) && (await page.locator("#dl-hero").getAttribute("href")) === "download/");
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
  // ---- run 3 browser checks
  const FEED = [
    { tag_name: "v15.0.0", published_at: "2026-11-25T06:46:23Z", draft: false, prerelease: false, body: "- Release v15.0.0\n- Help answers as numbered steps [skip release]\n- refactor(main): split things [skip release]\n- chore: tidy [skip release]\n- One\n- Two\n- Three\n- Four\n- Five\n- Six\n- Seven" },
    { tag_name: "v14.0.0", published_at: "2026-11-23T10:37:27Z", draft: false, prerelease: false, body: "- Enforce two-word names for clips" },
    { tag_name: "v13.0.0", published_at: "2026-11-20T10:00:00Z", draft: true, prerelease: false, body: "- hidden draft" }
  ];
  const openPage = async (rel, ua, width, opts = {}) => {
    const ctx = await browser.newContext({ userAgent: ua, viewport: { width, height: 900 }, reducedMotion: "reduce", ...opts });
    await ctx.route("https://api.github.com/**", (r) => r.fulfill({ json: r.request().url().includes("per_page") ? FEED : FEED[0] }));
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
    await page.goto(url + rel);
    return { page, errors, ctx };
  };
  for (const rel of PAGES) {
    for (const w of [375, 768, 1440, 2560]) {
      const { page, errors, ctx } = await openPage(rel, WIN, w);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`run 3: /${rel || "(home)"} at ${w}px: no horizontal overflow, no console errors`, over <= 0 && errors.length === 0, `overflow ${over}, ${errors.join("; ")}`);
      await ctx.close();
    }
  }
  for (const rel of PAGES) {
    for (const w of [375, 1440, 2560]) {
      const { page, ctx } = await openPage(rel, WIN, w);
      const g = await page.evaluate(() => {
        const sec = document.querySelector(".final"), card = document.querySelector(".final-card"), r = card.getBoundingClientRect();
        const top = document.querySelector(".hero-c, .p-hero").getBoundingClientRect(), fr = document.querySelector(".frame").getBoundingClientRect();
        return { left: r.left, right: r.right, heroLeft: top.left, heroRight: top.right, radius: getComputedStyle(card).borderTopLeftRadius, padL: getComputedStyle(sec).paddingLeft, padT: getComputedStyle(sec).paddingTop, inFrame: !!sec.closest(".frame"), frameW: fr.width };
      });
      check(`run 3: /${rel || "(home)"} at ${w}px: closing section is as wide as the hero, flush with the column (no inset, no rounded corners)`, Math.abs(g.left - g.heroLeft) < 0.5 && Math.abs(g.right - g.heroRight) < 0.5 && g.radius === "0px" && g.padL === "0px" && g.padT === "0px" && g.inFrame, JSON.stringify(g));
      await ctx.close();
    }
  }
  for (const rel of PAGES) {
    for (const [w, ua] of [[375, PHONE], [1440, WIN]]) {
      const { page, ctx } = await openPage(rel, ua, w);
      await page.evaluate(() => window.scrollTo({ top: 1800, behavior: "instant" }));
      await page.waitForTimeout(150);
      const n = await page.evaluate(() => { const el = document.querySelector(".nav"), r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.left + 40, r.top + r.height / 2); return { y: scrollY, top: r.top, h: r.height, hit: !!hit && !!hit.closest(".nav"), pad: parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) }; });
      check(`run 3: /${rel || "(home)"} at ${w}px: header stays at the top of the screen after scrolling and is not covered`, n.y > 500 && Math.abs(n.top) < 0.5 && n.hit && n.pad >= n.h, JSON.stringify(n));
      await ctx.close();
    }
  }
  for (const rel of PAGES) {
    for (const [w, want] of [[375, 48], [768, 48], [1440, 96], [2560, 96]]) {
      const { page, ctx } = await openPage(rel, WIN, w);
      const g = await page.evaluate(() => { const a = document.querySelector(".final-card .also").getBoundingClientRect(), tk = document.querySelector(".final-card .ticker").getBoundingClientRect(); return Math.round(tk.top - a.bottom); });
      check(`run 3: /${rel || "(home)"} at ${w}px: gap between the download links and the ticker is ${want}px (a step of the 4px scale, not more)`, g === want, String(g));
      await ctx.close();
    }
  }
  // WCAG AA (4.5:1) for every line of text in the grain header, measured on the rendered pixels behind the text
  for (const rel of PAGES.slice(1)) {
    for (const w of [375, 1440]) {
      const { page, ctx } = await openPage(rel, WIN, w);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(300);
      const sel = ".p-hero .crumb, .p-hero h1, .p-hero .lead, .p-hero .facts h2, .p-hero .facts p, .nav nav a";
      const boxes = await page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent !== null).map((e) => { const r = document.createRange(); r.selectNodeContents(e); return [...r.getClientRects()].filter((q) => q.width > 2 && q.height > 2).map((q) => ({ x: q.left + scrollX, y: q.top + scrollY, w: q.width, h: q.height, color: getComputedStyle(e).color, name: e.className || e.tagName })); }).flat(), sel);
      await page.addStyleTag({ content: "* { color: transparent !important; text-shadow: none !important; } svg, img { visibility: hidden !important; }" });
      let worst = { ratio: 99 };
      for (const b of boxes) {
        const buf = await page.screenshot({ clip: { x: b.x, y: b.y, width: Math.ceil(b.w), height: Math.ceil(b.h) }, fullPage: true });
        const ratio = await page.evaluate(async ({ data, color }) => {
          const img = await createImageBitmap(await (await fetch("data:image/png;base64," + data)).blob());
          const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
          const px = g.getImageData(0, 0, c.width, c.height).data;
          const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
          const L = (r, gg, b2) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b2);
          const t = color.match(/[\d.]+/g).map(Number), lt = L(t[0], t[1], t[2]);
          let worstR = 99;
          for (let i = 0; i < px.length; i += 4) { const lb = L(px[i], px[i + 1], px[i + 2]); const r = (Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05); if (r < worstR) worstR = r; }
          return worstR;
        }, { data: buf.toString("base64"), color: b.color });
        if (ratio < worst.ratio) worst = { ratio, name: b.name };
      }
      check(`run 3: /${rel} at ${w}px: every line of header text has at least 4.5:1 contrast on its background (worst ${worst.ratio.toFixed(2)})`, boxes.length > 3 && worst.ratio >= 4.5, JSON.stringify(worst));
      await ctx.close();
    }
  }
  for (const rel of PAGES.slice(1)) {
    const { page, ctx } = await openPage(rel, WIN, 1440);
    const m = await page.evaluate(() => { const h = document.querySelector(".p-hero h1"), lh = parseFloat(getComputedStyle(h).lineHeight), n = [...document.querySelectorAll(".nav nav a, .nav .pill")]; return { lines: Math.round(h.getBoundingClientRect().height / lh), nav: n.every((a) => a.getBoundingClientRect().height < 48), credit: (() => { const [x, y] = [...document.querySelectorAll(".foot-bottom > span")].map((e) => e.getBoundingClientRect()); return Math.abs(x.top + x.height / 2 - (y.top + y.height / 2)) < 6 && y.height < 48; })() }; });
    check(`run 3: /${rel} at 1440px: title on one line, nav and credit not wrapped`, m.lines === 1 && m.nav && m.credit, JSON.stringify(m));
    await ctx.close();
    const p2 = await openPage(rel, PHONE, 375);
    const m2 = await p2.page.evaluate(() => { const h = document.querySelector(".p-hero h1"), lh = parseFloat(getComputedStyle(h).lineHeight); const words = h.textContent.trim().split(/\s+/).length; return { lines: Math.round(h.getBoundingClientRect().height / lh), words, facts: [...document.querySelectorAll(".p-hero .facts > *")].every((f) => f.getBoundingClientRect().width > 250) }; });
    check(`run 3: /${rel} at 375px: title is at most two lines, key facts stack full width`, m2.lines <= 2 && m2.facts, JSON.stringify(m2));
    await p2.ctx.close();
  }
  {
    const feed = FEED.concat([{ tag_name: "v12.0.0", published_at: "2026-11-17T10:00:00Z", draft: false, prerelease: false, body: "- Release v12.0.0\n- Plain thing one [skip release]\n- Renderer: Fit keeps the ruler centred (A2-6, A2-1) (#146) [skip release]\n- refactor(main): split things [skip release]\n- chore: tidy\n- Plain thing two" }, { tag_name: "v11.0.0", published_at: "2026-11-16T10:00:00Z", draft: false, prerelease: false, body: "- Release v11.0.0\n- chore: tidy [skip release]" }]);
    const ctx = await browser.newContext({ userAgent: MAC, viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await ctx.route("https://api.github.com/**", (r) => r.fulfill({ json: feed }));
    const page = await ctx.newPage();
    await page.goto(url + "whats-new/");
    await page.waitForSelector(".wn-latest");
    const body = await page.locator("#releases").innerText();
    check("run 4: What's new puts the newest version first, in its own card, with Latest, and lists older ones after it; drafts are hidden", (await page.locator(".wn-latest h2").innerText()) === "Version 15.0.0" && (await page.locator(".wn-latest .chip.ice").innerText()) === "Latest" && (await page.locator(".wn-row > summary b").allInnerTexts()).join() === "Version 14.0.0,Version 12.0.0" && !/13\.0\.0|hidden draft/.test(body));
    check("run 4: the latest card has a one-line intro, three numbered highlight tiles, jump pills that land on them, and 'Smaller updates' underneath", (await page.locator(".wn-intro").count()) === 1 && (await page.locator(".wn-sec").count()) === 3 && (await page.locator(".wn-pill").evaluateAll((a) => a.every((x, i) => x.getAttribute("href") === "#wn-h" + (i + 1) && x.getBoundingClientRect().height >= 44 && !!document.getElementById("wn-h" + (i + 1))))) && (await page.locator(".wn-num").allInnerTexts()).join() === "1,2,3" && (await page.locator(".wn-all > summary").innerText()) === "Smaller updates" && (await page.locator(".wn-all .wn-group").count()) === 3);
    check("run 4: What's new is flat: no grey container behind the latest version, the numbered sections or the earlier-versions list", await page.evaluate(() => [".wn-latest", ".wn-sec", ".wn-list"].every((s) => { const c = getComputedStyle(document.querySelector(s)); return c.backgroundColor === "rgba(0, 0, 0, 0)" && parseFloat(c.borderTopLeftRadius) === 0 && (s === ".wn-latest" ? c.borderTopWidth === "0px" : true); })));
    check("run 4: each version leads with a date chip above its title, as in the reference", (await page.locator(".wn-latest > time.wn-date svg").count()) === 1 && /25 November 2026/.test(await page.locator(".wn-latest > time.wn-date").innerText()));
    check("run 4: the latest card's button downloads the installer for this computer", (await page.locator(".wn-latest a.dl").getAttribute("href")).endsWith("Clipr-macOS-AppleSilicon.dmg") && /Download for macOS/.test(await page.locator(".wn-latest a.dl").innerText()));
    check("run 4: earlier versions are folded rows (closed by default, 44px or taller) that open from the keyboard", (await page.locator(".wn-row[open]").count()) === 0 && (await page.locator(".wn-row > summary").evaluateAll((s) => s.every((x) => x.getBoundingClientRect().height >= 44))));
    await page.locator(".wn-row").nth(1).locator("summary").focus();
    await page.keyboard.press("Enter");
    const open = await page.locator(".wn-row").nth(1).innerText();
    check("run 5 G3-1: an earlier version without hand-written notes shows one plain line, never raw commit lines", /Smaller improvements and fixes/.test(open) && !/Plain thing|Fit keeps|MarkBar|skip release|refactor|chore|Release v12|Renderer:|A2-6|#146/.test(open), open);
    check("run 5 G3-1: an earlier version with nothing to say (empty after cleaning) is hidden, not shown as '0 changes'", !/11\.0\.0/.test(body) && !/\b0 changes\b/.test(body));
    check("run 4: each earlier version offers its three installers", (await page.locator(".wn-row").nth(1).locator(".wn-dls a").count()) === 3 && (await page.locator(".wn-row").nth(1).locator(".wn-dls a").first().getAttribute("href")).includes("/releases/download/v12.0.0/Clipr-macOS-AppleSilicon.dmg"));
    await ctx.close();
    for (const [vt, w] of [["v19.0.0", 1440], ["v19.0.0", 375], ["v19.1.0", 1440], ["v19.1.0", 375], ["v19.2.1", 1440], ["v19.2.1", 375]]) {
      const cv = await browser.newContext({ userAgent: MAC, viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
      await cv.route("https://api.github.com/**", (r) => r.fulfill({ json: (vt === "v19.2.1" ? ["v19.2.1", "v19.2.0"] : [vt]).map((tag) => ({ tag_name: tag, published_at: "2026-11-25T11:04:56Z", draft: false, prerelease: false, body: "- x" })) }));
      const pv = await cv.newPage();
      await pv.goto(url + "whats-new/");
      await pv.waitForSelector(".wn-latest");
      await pv.evaluate(() => document.querySelectorAll("img[loading=lazy]").forEach((i) => { i.loading = "eager"; }));
      await pv.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 8000 }).catch(() => {});
      const info = await pv.evaluate(() => {
        const secs = [...document.querySelectorAll(".wn-sec")], cards = [...document.querySelectorAll(".wn-card")];
        const imgsOk = [...document.querySelectorAll(".wn-sec img, .wn-card img")].every((i) => i.naturalWidth > 0 && i.alt.length > 10);
        const split = [...document.querySelectorAll(".wn-split")].map((x) => { const c = x.querySelector(".wn-copy").getBoundingClientRect(), v = x.querySelector(".wn-win").getBoundingClientRect(); return { sideBySide: Math.abs(c.top + c.height / 2 - (v.top + v.height / 2)) < 120 && c.right <= v.left + 1 || v.right <= c.left + 1, flip: x.classList.contains("flip") }; });
        return { n: secs.length, nums: secs.every((x) => x.querySelector(".wn-num") && x.querySelector("h3") && x.querySelector(".wn-copy p")), hero: !!document.querySelector(".wn-sec:not(.wn-split) .wn-stage .wn-win img"), splits: split, cards: cards.length, cardsOk: cards.every((c) => c.querySelector("img") && c.querySelector("h4") && c.querySelector(".chip")), imgsOk, eyebrows: document.querySelectorAll(".wn-eyebrow").length };
      });
      check("run 6 reference: " + vt + " at " + w + "px the newest release has a hero with a framed app screenshot and glow stage, two split sections (one flipped), a two-card grid, eyebrow labels, and every image loads with alt text", info.n === 3 && info.nums && info.hero && info.splits.length === 2 && info.splits.filter((x) => x.flip).length === 1 && info.cards === 2 && info.cardsOk && info.imgsOk && info.eyebrows >= 4, JSON.stringify(info));
      if (w >= 1000) check("run 6 reference: " + vt + " at " + w + "px the split sections put the copy beside the screenshot", info.splits.every((x) => x.sideBySide), JSON.stringify(info.splits));
      else check("run 6 reference: " + vt + " at " + w + "px the split sections stack with the copy above the screenshot", await pv.evaluate(() => [...document.querySelectorAll(".wn-split")].every((x) => x.querySelector(".wn-copy").getBoundingClientRect().bottom <= x.querySelector(".wn-win").getBoundingClientRect().top + 1 || x.classList.contains("flip"))));
      check("run 6 reference: " + vt + " screenshots add no sideways scroll at " + w + "px", (await pv.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
      // Liam, 25 Nov: glows are never cut off, are not behind every block, and are not all the same colour.
      const gl = await pv.evaluate(() => {
        const st = [...document.querySelectorAll(".wn-stage")];
        const bg = st.map((s) => getComputedStyle(s, "::before").backgroundImage);
        // The framed page column clips what overflows it, so a glow is not cut as long as its whole box sits inside that frame.
        const fr = document.querySelector(".frame").getBoundingClientRect();
        const clipped = st.some((s) => {
          for (let e = s.parentElement; e && !e.classList.contains("frame") && e !== document.documentElement; e = e.parentElement) { const c = getComputedStyle(e); if (/hidden|clip|auto|scroll/.test(c.overflowX + c.overflowY)) return true; }
          const r = s.getBoundingClientRect(), b = getComputedStyle(s, "::before"), px = (v) => parseFloat(v) || 0;
          return r.left + px(b.left) < fr.left || r.right - px(b.right) > fr.right;
        });
        return { n: st.length, secs: document.querySelectorAll(".wn-sec").length, fades: bg.every((b) => /radial-gradient\(closest-side/.test(b)), ice: bg.every((b) => /rgba\(95, 216, 202, 0\.4\)/.test(b)), clipped };
      });
      if (vt === "v19.2.1") check("run 11 glow: at " + w + "px every glow fades out inside its box and no parent clips it, and glow is behind only some blocks (it is always the turquoise Ice glow)", gl.fades && gl.ice && !gl.clipped && gl.n >= 2 && gl.n < gl.secs, JSON.stringify(gl));
      if (vt === "v19.2.1" && w === 1440) { await pv.screenshot({ path: "/tmp/claude-0/wn-v19.png", fullPage: true }); }
      await cv.close();
    }
    {
      // Liam, 25 Nov: patches fold into their minor. 19.2.0 and 19.2.1 are one "19.2" section; the next minor pushes it into the list.
      const rel = (tag, d) => ({ tag_name: tag, published_at: d + "T10:00:00Z", draft: false, prerelease: false, body: "- x" });
      for (const [label, feed] of [["with a patch", [rel("v19.2.1", "2026-11-26"), rel("v19.2.0", "2026-11-25"), rel("v19.1.0", "2026-11-25"), rel("v18.0.0", "2026-11-24")]], ["after the next minor", [rel("v19.3.0", "2026-11-27"), rel("v19.2.1", "2026-11-26"), rel("v19.2.0", "2026-11-25"), rel("v19.1.0", "2026-11-25")]]]) {
        const fc = await browser.newContext({ userAgent: MAC, viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
        await fc.route("https://api.github.com/**", (r) => r.fulfill({ json: feed }));
        const fp = await fc.newPage();
        await fp.goto(url + "whats-new/");
        await fp.waitForSelector(".wn-latest");
        const head = await fp.locator(".wn-latest h2").innerText();
        const rows = await fp.locator(".wn-row > summary b").allInnerTexts();
        const dl = await fp.locator(".wn-latest a.dl").getAttribute("href");
        if (label === "with a patch") {
          check("run 10 fold: 19.2.0 and 19.2.1 are one section headed with the newest version, Version 19.2.1, with no patch list (the button downloads the newest release), and 19.2.0 is not a row of its own", head === "Version 19.2.1" && !/Includes|19\.2\.0/.test(await fp.locator(".wn-latest > .wn-head").innerText()) && dl.includes("/releases/latest/download/") && rows.join() === "Version 19.1.0,Version 18.0.0", head + " | " + rows.join());
        } else {
          check("run 10 fold: once 19.3 ships it is the main section and 19.2 (with its patch) folds into the list as one row", head === "Version 19.3.0" && rows.join() === "Version 19.2.1,Version 19.1.0" && (await fp.locator(".wn-row").first().locator("summary").click(), !/Includes/.test(await fp.locator(".wn-row").first().innerText())), head + " | " + rows.join());
        }
        await fc.close();
      }
    }
    {
      for (const w of [1440, 375]) {
        let openFeed, openImgs;
        const feedGate = new Promise((r) => (openFeed = r)), imgGate = new Promise((r) => (openImgs = r));
        const cs = await browser.newContext({ userAgent: MAC, viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
        await cs.route("https://api.github.com/**", async (r) => { await feedGate; r.fulfill({ json: [{ tag_name: "v19.0.0", published_at: "2026-11-25T11:04:56Z", draft: false, prerelease: false, body: "- x" }] }); });
        await cs.route("**/docs/whats-new/**", async (r) => { await imgGate; r.continue(); });
        const ps = await cs.newPage();
        await ps.goto(url + "whats-new/", { waitUntil: "domcontentloaded" });
        await ps.waitForSelector(".wn-skel");
        const sk = await ps.evaluate(() => { const k = document.querySelector(".wn-skel"); return { role: k.getAttribute("role"), bars: k.querySelectorAll(".sk").length, label: /Loading the list of versions/.test(k.querySelector(".wn-sr").textContent), frame: k.querySelector(".sk-frame").getBoundingClientRect().height, over: document.documentElement.scrollWidth - document.documentElement.clientWidth, head: !!k.querySelector(".sk-between"), pills: k.querySelectorAll(".sk-pills .sk").length, rows: k.querySelectorAll(".sk-item").length }; });
        check("run 7 skeleton: while the version list loads, What's new shows a layout-shaped skeleton at " + w + "px (header, button, intro, three chips, a framed image, earlier rows), announced as a status, with no sideways scroll", sk.role === "status" && sk.bars >= 14 && sk.label && sk.frame > 100 && sk.over <= 0 && sk.head && sk.pills === 3 && sk.rows === 3, JSON.stringify(sk));
        if (w === 1440) {
          await ps.screenshot({ path: "/tmp/claude-0/wn-skeleton.png" });
          openFeed();
          await ps.waitForSelector(".wn-latest");
          await ps.waitForSelector(".wn-win.is-loading");
          const img = await ps.evaluate(() => { const f = [...document.querySelectorAll(".wn-win")]; return { n: f.length, loading: f.filter((x) => x.classList.contains("is-loading")).length, hidden: f.every((x) => getComputedStyle(x.querySelector("img")).opacity === "0"), reserved: f.every((x) => x.getBoundingClientRect().height > 100), skGone: !document.querySelector(".wn-skel") }; });
          check("run 7 skeleton: the skeleton goes when the list arrives, and every screenshot is a shimmering placeholder of its final size until its image loads", img.n === 5 && img.loading === 5 && img.hidden && img.reserved && img.skGone, JSON.stringify(img));
          await ps.screenshot({ path: "/tmp/claude-0/wn-img-skeleton.png" });
          openImgs();
          await ps.evaluate(() => document.querySelectorAll("img[loading=lazy]").forEach((i) => { i.loading = "eager"; }));
          await ps.waitForFunction(() => document.querySelectorAll(".wn-win.is-loading").length === 0, null, { timeout: 8000 }).catch(() => {});
          check("run 7 skeleton: each screenshot shows once its image has loaded, and none is left as a placeholder", (await ps.locator(".wn-win.is-loading").count()) === 0 && (await ps.evaluate(() => [...document.querySelectorAll(".wn-win img")].every((i) => i.naturalWidth > 0 && getComputedStyle(i).opacity === "1"))));
        }
        await cs.close();
      }
    }
    const c2 = await browser.newContext({ userAgent: WIN, viewport: { width: 375, height: 900 }, reducedMotion: "reduce" });
    await c2.route("https://api.github.com/**", (r) => r.fulfill({ json: [{ tag_name: "v99.0.0", published_at: "2026-12-01T10:00:00Z", draft: false, prerelease: false, body: "- A new thing [skip release]\n- Another thing" }] }));
    const p2 = await c2.newPage();
    await p2.goto(url + "whats-new/");
    await p2.waitForSelector(".wn-latest");
    check("run 4: a newest version with no hand-written notes still renders (no tiles, cleaned list, no earlier-versions block)", (await p2.locator(".wn-sec").count()) === 0 && /A new thing/.test(await p2.locator(".wn-latest").innerText()) && !/skip release/.test(await p2.locator(".wn-latest").innerText()) && (await p2.locator(".wn-row").count()) === 0 && (await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
    await c2.close();
    const notes = JSON.parse(fs.readFileSync(path.join(ROOT, "src/whats-new.json"), "utf8"));
    const jargon = /skip release|refactor|chore|\bIPC\b|\bPR\b|parity|fixture|tsc|hook|lint/i;
    const probs = [];
    for (const [v, n] of Object.entries(notes)) {
      if (!/^\d+\.\d+(\.\d+)?$/.test(v)) probs.push(v + ": version key");
      if (n.highlights.length > 3) probs.push(v + ": more than three highlights");
      if (n.intro && (n.intro.length > 120 || jargon.test(n.intro))) probs.push(v + ": intro");
      for (const x of n.highlights) if (!["New", "Improved", "Fixed"].includes(x.tag) || !x.title || !x.text) probs.push(v + ": bad highlight " + x.title);
      for (const x of n.changes) if (!["New", "Improved", "Fixed"].includes(x.group) || !x.title || !x.text || x.text.length > 140) probs.push(v + ": bad change " + x.title);
      for (const x of [].concat(n.highlights, n.changes)) if (jargon.test(x.title + " " + x.text)) probs.push(v + ": jargon in " + x.title);
    }
    check("run 4: the hand-written notes are plain: groups are New/Improved/Fixed, at most three highlights, no developer words", Object.keys(notes).length >= 2 && probs.length === 0, probs.join("; "));
    // Liam, 25 Nov: every What's new entry from 19.0.0 matches design/whats-new-reference.png. This is the written spec, checked on the data.
    const refSpec = (n) => {
      const bad = [];
      const hl = n.highlights || [], cd = n.cards || [];
      if (hl.map((x) => x.layout).join() !== "hero,split,split-flip") bad.push("highlights must be hero, split, split-flip");
      if (cd.length !== 2) bad.push("two cards");
      for (const x of hl) {
        if (!x.eyebrow || !x.caption || !x.alt || x.alt.length < 20) bad.push("eyebrow, caption and alt on " + x.title);
        if (!x.shot || !fs.existsSync(path.join(ROOT, "docs/whats-new", x.shot || "none"))) bad.push("shot file for " + x.title);
      }
      if (hl[0] && hl[0].glow === false) bad.push("hero has glow");
      if (hl[1] && !hl[2]) bad.push("third highlight");
      if (hl[2] && !hl[2].glow) bad.push("flipped split has glow");
      if (hl[1] && hl[1].glow) bad.push("the middle split has no glow (glow is here and there)");
      for (const x of cd) {
        if (!x.caption || !x.alt || x.alt.length < 20 || !x.title) bad.push("card parts on " + x.title);
        if (!x.shot || !fs.existsSync(path.join(ROOT, "docs/whats-new", x.shot || "none"))) bad.push("shot file for card " + x.title);
      }
      return bad;
    };
    const refProbs = [];
    for (const [v, n] of Object.entries(notes)) if (parseInt(v, 10) >= 19 && !(v === "19.0.0")) refProbs.push(...refSpec(n).map((m) => v + ": " + m));
    check("run 9 reference spec: every entry from 19.1.0 has a hero, a plain split and a flipped split with glow, two cards, eyebrows, captions, alt text and real screenshot files", refProbs.length === 0, refProbs.join("; "));
    const broken = JSON.parse(JSON.stringify(notes["19.2"]));
    broken.highlights[1].layout = "split-flip"; broken.cards.pop();
    check("run 9 negative control: an entry that drops the hero/split/flip order or a card fails the reference spec", refSpec(broken).length >= 2);
  }
  {
    const { page, ctx } = await openPage("download/", MAC, 1440);
    await page.waitForSelector("#ver:not([hidden])");
    check("run 8: Download page shows the latest version line and no version list of its own; older versions are one link to What's new", /Version 15\.0\.0/.test(await page.locator("#ver").innerText()) && (await page.locator(".rel").count()) === 0 && (await page.locator("#releases").count()) === 0 && (await page.locator('#older + p a[href="../whats-new/"]').count()) === 1);
    check("run 3: Download page tiles point at the three installers", (await page.locator(".facts a.os").evaluateAll((a) => a.map((x) => x.getAttribute("href").split("/").pop()))).join() === "Clipr-macOS-AppleSilicon.dmg,Clipr-Windows-x64-Setup.exe,Clipr-Linux-x64.AppImage");
    await ctx.close();
    const off = await browser.newContext({ userAgent: WIN, javaScriptEnabled: false });
    const pg = await off.newPage();
    await pg.goto(url + "download/");
    check("run 8: Download page without JavaScript still shows the three installers and the link to What's new for older versions", (await pg.locator(".facts a.os").count()) === 3 && (await pg.locator('#older + p a[href="../whats-new/"]').count()) === 1);
    await off.close();
    {
      const rc = await browser.newContext({ userAgent: MAC, viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
      await rc.route("https://api.github.com/**", (r) => r.fulfill({ json: FEED }));
      const rp = await rc.newPage();
      await rp.goto(url + "download/#older");
      await rp.waitForURL(/\/whats-new\/$/, { timeout: 8000 }).catch(() => {});
      check("run 8: the old All versions address (download/#older) lands on What's new", /\/whats-new\/$/.test(rp.url()), rp.url());
      await rc.close();
    }
  }
  {
    const { page, ctx } = await openPage("download/", WIN, 1440);
    await page.route("https://api.github.com/**", (r) => r.abort());
    await page.reload();
    await page.waitForLoadState("networkidle");
    check("run 8: when the release feed cannot load, the Download page still shows the three installers", (await page.locator(".facts a.os").count()) === 3);
    await page.goto(url + "whats-new/");
    await page.waitForSelector(".status:has-text('could not load')");
    check("run 3: when the version list cannot load, What's new says so and points to the download page", /download page always has the newest version/.test(await page.locator(".status").first().innerText()));
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
  process.exit(failed ? 1 : 0);
})();
