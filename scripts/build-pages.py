#!/usr/bin/env python3
"""Builds the Clipr site's own pages from index.html (so the style, nav, footer and
closing section never drift) and the text sources in src/.

Run from the repo root:  python3 scripts/build-pages.py   (add --out <dir> to write elsewhere)
Writes: download/ whats-new/ licence/ notices/ privacy/  (each an index.html)
Re-run it after any change to index.html's <style>, nav, footer or closing section.
"""
import html, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
index = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

style = re.search(r"<style>(.*?)</style>", index, re.S).group(1)
svgdefs = re.search(r'<svg width="0" height="0".*?</svg>', index, re.S).group(0)
nav = re.search(r'<header class="nav">.*?</header>', index, re.S).group(0)
final = re.search(r'<section class="final">.*?</section>', index, re.S).group(0)
foot = re.search(r'<footer class="big-foot">.*?</footer>', index, re.S).group(0)
scripts = re.findall(r"<script>(.*?)</script>", index, re.S)
dl_script = [s for s in scripts if "var BASE" in s][0]
motion_script = [s for s in scripts if "IntersectionObserver(function" in s][0]

# the download/OS script without the install tabs and copy buttons (those only exist on the landing page)
dl_script = dl_script[: dl_script.index("// Install tabs")] + "})();\n"
_a = 'document.querySelectorAll(".dl").forEach(function (a) {'
_b = '        });\n        document.querySelectorAll(".also")'
assert _a in dl_script and _b in dl_script
dl_script = dl_script.replace(_a, 'window.cliprDl = function (root) { (root || document).querySelectorAll(".dl").forEach(function (a) {')
dl_script = dl_script.replace(_b, '        }); }; window.cliprDl();\n        document.querySelectorAll(".also")')
dl_script = dl_script.replace('var ver = document.getElementById("ver");', 'var ver = document.getElementById("ver"); if (!ver) return;')
dl_script = dl_script.replace('var f = document.getElementById("ver-foot");', 'var f = document.getElementById("ver-foot"); if (!f) return;')


def up(markup):
    """Re-point a landing-page fragment's own links for a page one folder down."""
    markup = markup.replace('href="#top"', 'href="../"')
    markup = re.sub(r'href="#(how|install)"', r'href="../#\1"', markup)
    markup = re.sub(r'href="(download|whats-new|licence|notices|privacy)/"', r'href="../\1/"', markup)
    return markup


FONT = 'url("../fonts/'
page_style = style.replace('url("fonts/', FONT)

EXTRA_CSS = """
      /* inner pages (run 3): same tokens, no new values */
      .p-hero { padding: 72px 48px 96px; text-align: center; background-color: var(--panel); }
      /* Readability: the bright Frost band sits below the text, never behind it (WCAG AA is checked in tests/site.cjs). */
      .p-hero.grain-frost { background: linear-gradient(180deg, #121a1d 0, #22363a 200px, #3f5b60 320px, #b8e4ea 100%); }
      .p-hero > * { position: relative; z-index: 2; }
      .p-hero .crumb { font-size: 13px; color: var(--fg); margin-bottom: 16px; }
      .p-hero .crumb a { text-decoration: underline; text-underline-offset: 3px; }
      .p-hero h1 { font-size: 48px; line-height: 1.15; font-weight: 500; letter-spacing: -0.02em; text-wrap: balance; }
      .p-hero .lead { font-size: 18px; color: var(--fg); max-width: 620px; margin: 16px auto 0; text-wrap: balance; }
      .p-hero .facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 40px auto 0; max-width: 1000px; text-align: left; }
      .p-hero .facts > * { background: var(--panel); border: 1px solid var(--hairline-strong); border-radius: var(--r-panel); padding: 20px; color: var(--fg); display: block; }
      .p-hero .facts h2 { font-size: 15px; font-weight: 500; }
      .p-hero .facts p { font-size: 13px; color: var(--fg-dim); margin-top: 4px; }
      .p-hero .facts a.os { min-height: 44px; }
      .p-hero .facts a.os:hover { background: var(--hover); }
      .p-hero .facts a.os h2 { display: flex; align-items: center; gap: 8px; }
      .p-hero .facts a.os svg { width: 16px; height: 16px; flex: none; }
      .p-body { max-width: 792px; margin: 0 auto; padding: 16px 48px 96px; }
      .prose h2 { font-size: 20px; font-weight: 500; margin: 40px 0 8px; text-wrap: balance; }
      .prose h3 { font-size: 15px; font-weight: 500; margin: 24px 0 8px; }
      .prose p, .prose li { color: var(--fg-dim); font-size: 15px; line-height: 1.7; }
      .prose p { margin: 0 0 12px; }
      .prose b, .prose strong { color: var(--fg); font-weight: 500; }
      .prose a { color: var(--fg); text-decoration: underline; text-underline-offset: 3px; overflow-wrap: anywhere; }
      .prose ol, .prose ul { margin: 0 0 12px; padding-left: 24px; }
      .prose li { margin-bottom: 8px; }
      .prose code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; color: var(--fg); background: var(--raised); border: 1px solid var(--hairline); border-radius: var(--r-chip); padding: 1px 6px; overflow-wrap: anywhere; }
      .prose pre { background: var(--panel); border: 1px solid var(--hairline); border-radius: var(--r-control); padding: 16px; overflow-x: auto; margin: 0 0 12px; }
      .prose pre code { background: none; border: 0; padding: 0; }
      .prose blockquote { margin: 0 0 12px; padding: 4px 0 4px 16px; border-left: 1px solid var(--hairline-strong); }
      .prose hr { border: 0; border-top: 1px solid var(--hairline); margin: 40px 0 0; }
      .prose .legal-caps { font-size: 13px; }
      .tbl { overflow-x: auto; margin: 0 0 16px; border: 1px solid var(--hairline); border-radius: var(--r-control); }
      .tbl table { border-collapse: collapse; width: 100%; min-width: 560px; font-size: 13px; }
      .tbl th, .tbl td { text-align: left; padding: 12px 16px; border-bottom: 1px solid var(--hairline); color: var(--fg-dim); vertical-align: top; }
      .tbl th { color: var(--fg); font-weight: 500; }
      .tbl tr:last-child td { border-bottom: 0; }
      .rel { border: 1px solid var(--hairline); border-radius: var(--r-panel); background: var(--panel); padding: 24px; margin: 0 0 16px; }
      .rel header { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
      .rel h2 { margin: 0; font-size: 20px; }
      .rel time { color: var(--fg-dim); font-size: 13px; }
      .rel ul { margin: 16px 0 0; padding-left: 24px; }
      .rel li { color: var(--fg-dim); font-size: 15px; line-height: 1.6; margin-bottom: 8px; }
      .rel details { margin-top: 8px; }
      .rel summary { cursor: pointer; min-height: 44px; display: flex; align-items: center; color: var(--fg); font-size: 13px; }
      .rel .dls { display: flex; gap: 8px 16px; flex-wrap: wrap; margin-top: 16px; font-size: 13px; }
      .rel .dls a { color: var(--fg); text-decoration: underline; text-underline-offset: 3px; display: inline-flex; min-height: 44px; align-items: center; }
      .p-body.wide { max-width: 1104px; padding-top: 48px; }
      .chip { display: inline-flex; align-items: center; height: 24px; padding: 0 8px; border-radius: var(--r-chip); font-size: 12px; border: 1px solid var(--hairline-strong); color: var(--fg); }
      .chip.ice { border-color: var(--ice); color: var(--ice); }
      .prose a.dl-mini { color: var(--bg); text-decoration: none; }
      .dl-mini { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 16px; border-radius: var(--r-control); background: var(--ice); color: var(--bg); font-size: 15px; font-weight: 500; }
      .dl-mini .glyph { display: inline-flex; align-items: center; }
      .dl-mini .glyph svg { width: 16px; height: 16px; }
      .wn-latest { background: none; border: 0; padding: 0; }
      .wn-date { display: inline-flex; align-items: center; gap: 8px; color: var(--fg-dim); font-size: 13px; margin-bottom: 16px; }
      .wn-date svg { width: 14px; height: 14px; flex: none; }
      .wn-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
      .wn-title { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
      .wn-patches { color: var(--fg-dim); font-size: 13px; }
      .wn-title h2 { margin: 0; font-size: 32px; font-weight: 500; letter-spacing: -0.01em; }
      .wn-row time { color: var(--fg-dim); font-size: 13px; }
      .wn-intro { margin: 16px 0 0; font-size: 16px; line-height: 1.7; color: var(--fg-dim); max-width: 640px; }
      .wn-jump { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
      .prose a.wn-pill { display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px; border: 1px solid var(--hairline-strong); border-radius: var(--r-control); font-size: 13px; color: var(--fg); text-decoration: none; }
      .prose a.wn-pill:hover { background: var(--hover); }
      .wn-num { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--hairline-strong); font-size: 12px; color: var(--fg); }
      .wn-sections { margin-top: 32px; border-top: 1px solid var(--hairline); }
      .wn-sec { padding: 48px 0; border-bottom: 1px solid var(--hairline); scroll-margin-top: 96px; }
      .wn-sec-head { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
      .wn-sec .wn-num { width: 32px; height: 32px; font-size: 13px; flex: none; }
      .wn-sec h3 { margin: 0; font-size: 28px; font-weight: 500; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
      .wn-sec p { margin: 16px 0 0; font-size: 15px; line-height: 1.7; color: var(--fg-dim); max-width: 640px; }
      .wn-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
      .sk, .wn-win.is-loading { background: var(--raised); position: relative; overflow: hidden; }
      .sk { display: block; border-radius: var(--r-chip); }
      .sk::after, .wn-win.is-loading::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.06) 50%, rgba(255, 255, 255, 0) 100%); animation: sk-shimmer 1.4s ease-in-out infinite; }
      @keyframes sk-shimmer { to { transform: translateX(100%); } }
      @media (prefers-reduced-motion: reduce) { .sk::after, .wn-win.is-loading::after { animation: none; } }
      .wn-win.is-loading img { opacity: 0; }
      .wn-skel { display: block; }
      .wn-skel .sk-row { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
      .wn-skel .sk-between { justify-content: space-between; }
      .wn-skel .sk-pills { margin-top: 16px; gap: 8px; }
      .wn-skel .sk-sec { padding: 48px 0; border-bottom: 1px solid var(--hairline); }
      .wn-skel .sk-frame { margin-top: 32px; border: 1px solid var(--hairline-strong); border-radius: var(--r-panel); aspect-ratio: 1360 / 860; }
      .wn-skel .sk-list { border-top: 1px solid var(--hairline); margin-top: 48px; }
      .wn-skel .sk-item { height: 64px; border-bottom: 1px solid var(--hairline); display: flex; align-items: center; padding: 0 24px; gap: 16px; }
      .wn-eyebrow { display: block; margin: 0 0 12px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--fg-dim); }
      .wn-win { margin: 0; border: 1px solid var(--hairline-strong); border-radius: var(--r-panel); background: var(--panel); overflow: hidden; position: relative; z-index: 1; }
      .wn-win-bar { display: flex; align-items: center; gap: 8px; height: 32px; padding: 0 16px; border-bottom: 1px solid var(--hairline); background: var(--raised); }
      .wn-win-bar i { width: 8px; height: 8px; border-radius: 50%; border: 1px solid var(--hairline-strong); }
      .wn-win img { display: block; width: 100%; height: auto; }
      .wn-cap { margin: 16px 0 0; font-size: 12px; line-height: 1.5; color: var(--fg-dim); }
      .wn-stage { position: relative; margin-top: 32px; }
      .wn-stage::before { content: ""; position: absolute; inset: -64px -48px; z-index: 0; pointer-events: none; background: radial-gradient(55% 55% at 50% 50%, rgba(95, 216, 202, 0.24), rgba(184, 228, 234, 0.08) 60%, rgba(184, 228, 234, 0) 100%); }
      .wn-split { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 48px; align-items: center; }
      .wn-split.flip { grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); }
      .wn-split .wn-win { width: 100%; justify-self: end; }
      .wn-stage-split { margin-top: 0; width: 100%; justify-self: end; }
      .wn-stage-split .wn-win { justify-self: auto; }
      .wn-split.flip .wn-win { justify-self: start; }
      .wn-split.flip .wn-copy { order: 2; }
      .wn-split .wn-sec-head { margin-bottom: 0; }
      .wn-split .wn-sec h3, .wn-split h3 { font-size: 24px; }
      .wn-cards { margin-top: 48px; }
      .wn-cards-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
      .wn-card { border: 1px solid var(--hairline); border-radius: var(--r-panel); background: var(--panel); padding: 24px; min-width: 0; display: flex; flex-direction: column; }
      .wn-card .wn-win { border-radius: var(--r-control); background: var(--bg); margin-bottom: 24px; }
      .wn-card .chip { align-self: flex-start; }
      .wn-card h4 { margin: 12px 0 0; font-size: 20px; font-weight: 500; }
      .wn-card p { margin: 8px 0 0; font-size: 15px; line-height: 1.7; color: var(--fg-dim); }
      .wn-card .wn-cap { margin-top: auto; padding-top: 16px; }
      .wn-all > summary, .wn-row > summary { cursor: pointer; list-style: none; display: flex; align-items: center; min-height: 44px; color: var(--fg); font-size: 13px; }
      .wn-all > summary::-webkit-details-marker, .wn-row > summary::-webkit-details-marker { display: none; }
      .wn-all { margin-top: 32px; }
      .wn-all > summary { font-size: 15px; font-weight: 500; }
      .wn-groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 8px 32px; margin-top: 8px; }
      .wn-group { min-width: 0; }
      .wn-group h4 { margin: 8px 0; font-size: 12px; font-weight: 400; color: var(--fg-dim); }
      .wn-group ul { list-style: none; margin: 0; padding: 0; }
      .wn-group li { padding: 8px 0; border-top: 1px solid var(--hairline); font-size: 15px; line-height: 1.6; color: var(--fg-dim); }
      .wn-group li:first-child { border-top: 0; }
      .wn-group li b { color: var(--fg); font-weight: 500; }
      .wn-earlier { font-size: 20px; font-weight: 500; margin: 48px 0 16px; }
      .wn-list { background: none; border-top: 1px solid var(--hairline); }
      .wn-row { border-bottom: 1px solid var(--hairline); }
      .wn-row > summary { min-height: 64px; padding: 8px 24px; gap: 16px; display: grid; grid-template-columns: 160px 200px 1fr auto; font-size: 15px; }
      .wn-row > summary b { font-weight: 500; }
      .wn-row > summary .count { color: var(--fg-dim); font-size: 13px; }
      .wn-row > summary:hover .more { text-decoration: underline; text-underline-offset: 3px; }
      .wn-row > summary .more { font-size: 13px; }
      .wn-row .less, .wn-row[open] .more { display: none; }
      .wn-row[open] .less { display: inline; }
      .wn-row .body { padding: 0 24px 24px; }
      .wn-row .wn-groups { grid-template-columns: 1fr; }
      .wn-dls { display: flex; gap: 8px 16px; flex-wrap: wrap; margin-top: 8px; font-size: 13px; }
      .wn-dls a { color: var(--fg); text-decoration: underline; text-underline-offset: 3px; display: inline-flex; min-height: 44px; align-items: center; }
      @media (max-width: 760px) { .wn-sec { padding: 32px 0; } .wn-sec h3 { font-size: 24px; } .wn-split, .wn-split.flip { grid-template-columns: minmax(0, 1fr); gap: 24px; } .wn-split.flip .wn-copy { order: 0; } .wn-split .wn-win, .wn-split.flip .wn-win { justify-self: start; } .wn-cards-grid { grid-template-columns: minmax(0, 1fr); } .wn-stage::before { inset: -32px -16px; } .wn-title h2 { font-size: 28px; } .wn-row > summary { padding: 8px 16px; gap: 4px 16px; grid-template-columns: 1fr auto; } .wn-row > summary b { grid-column: 1 / -1; } .wn-row .body { padding: 0 16px 16px; } }
      .status { color: var(--fg-dim); font-size: 15px; padding: 24px 0; }
      .rail-note { color: var(--fg-dim); font-size: 13px; margin-top: 16px; }
      @media (max-width: 1040px) { .p-hero { padding: 64px 24px 80px; } .p-body { padding: 16px 24px 64px; } }
      @media (max-width: 760px) { .p-hero .facts { grid-template-columns: 1fr; } .p-hero h1 { font-size: 36px; } .p-hero .lead { font-size: 16px; } }
      @media (max-width: 560px) { .p-hero { padding: 48px 16px 64px; } .p-body { padding: 8px 16px 48px; } .rel { padding: 16px; } }
"""


def esc(s):
    return html.escape(s, quote=True)


def inline_md(s):
    s = esc(s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![*\w])\*([^*\n]+)\*(?!\*)", r"<em>\1</em>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", lambda m: '<a href="%s">%s</a>' % (fix_href(m.group(2)), m.group(1)), s)
    s = re.sub(r"&lt;(https?://[^&\s]+)&gt;", r'<a href="\1">\1</a>', s)
    return s


def fix_href(h):
    h = h.replace("&amp;", "&")
    if h == "LICENSE":
        return "../licence/"
    return h


def md_to_html(md):
    out, lines, i = [], md.split("\n"), 0
    while i < len(lines):
        ln = lines[i]
        if ln.strip().startswith('<div align="center">') or ln.strip() == "</div>":
            i += 1; continue
        if ln.startswith("```"):
            j = i + 1
            while not lines[j].startswith("```"): j += 1
            out.append("<pre><code>%s</code></pre>" % esc("\n".join(lines[i + 1:j]))); i = j + 1; continue
        m = re.match(r"(#{1,3}) (.*)", ln)
        if m:
            if len(m.group(1)) == 1: i += 1; continue  # the page title is the hero
            heading = m.group(2)
            hid = re.sub(r"[^a-z0-9]+", "-", heading.lower()).strip("-")
            out.append('<h%d id="%s">%s</h%d>' % (len(m.group(1)), hid, inline_md(heading), len(m.group(1)))); i += 1; continue
        if ln.strip() == "---":
            out.append("<hr>"); i += 1; continue
        if ln.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")]); i += 1
            head, body = rows[0], rows[2:]
            t = "<div class=\"tbl\" tabindex=\"0\" role=\"region\" aria-label=\"Table\"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>"
            out.append(t % ("".join("<th>%s</th>" % inline_md(c) for c in head),
                            "".join("<tr>%s</tr>" % "".join("<td>%s</td>" % inline_md(c) for c in r) for r in body)))
            continue
        if ln.startswith(">"):
            buf = []
            while i < len(lines) and lines[i].startswith(">"):
                buf.append(lines[i].lstrip("> ")); i += 1
            out.append("<blockquote><p>%s</p></blockquote>" % inline_md(" ".join(buf))); continue
        if ln.strip() == "" or ln.strip().startswith("<sub>") and False:
            i += 1; continue
        buf = []
        while i < len(lines) and lines[i].strip() != "" and not lines[i].startswith(("#", "|", ">", "```")) and lines[i].strip() != "---":
            buf.append(lines[i].strip()); i += 1
        text = " ".join(buf)
        text = re.sub(r"</?sub>", "", text)
        out.append("<p>%s</p>" % inline_md(text))
    return "\n".join(out)


def licence_body():
    raw = open(os.path.join(SRC, "LICENSE.txt"), encoding="utf-8").read().strip("\n")
    parts = re.split(r"\n\n\n+", raw)
    out = []
    for n, part in enumerate(parts):
        paras = part.split("\n\n")
        first = paras[0]
        m = re.match(r"(\d)\. ([A-Z0-9 ,'-]+)\n?(.*)", first, re.S)
        if m:
            title = m.group(2).title().replace("Not Granted", "Not Granted")
            out.append('<h2 id="s%s">%s. %s</h2>' % (m.group(1), m.group(1), esc(title)))
            paras[0] = m.group(3)
        elif n == 0:
            out.append("<p><strong>%s</strong></p>" % esc(first.split("\n")[0]))
            paras[0] = "\n".join(first.split("\n")[1:])
        i = 0
        listbuf = []
        def flush():
            nonlocal listbuf
            if listbuf:
                out.append('<ol type="a">%s</ol>' % "".join("<li>%s</li>" % lic_inline(x) for x in listbuf)); listbuf = []
        for p in paras:
            p = p.strip("\n")
            if not p.strip(): continue
            if re.match(r"\s+[a-f]\. ", p):
                listbuf.append(re.sub(r"\s+", " ", re.sub(r"^\s+[a-f]\. ", "", p)).strip()); continue
            flush()
            cls = ' class="legal-caps"' if p.isupper() or p.startswith("THE SOFTWARE") else ""
            out.append("<p%s>%s</p>" % (cls, lic_inline(re.sub(r"\s*\n\s*", " ", p))))
        flush()
    return "\n".join(out)


def lic_inline(s):
    s = esc(s)
    s = s.replace("THIRD-PARTY-NOTICES.md", '<a href="../notices/">THIRD-PARTY-NOTICES.md</a>')
    s = re.sub(r"(https://github\.com/[^\s<]+)", r'<a href="\1">\1</a>', s)
    return s


PRIVACY = """
<h2 id="runs-here">Everything runs on your computer</h2>
<p>Clipr is a desktop app. Cutting, downloading and joining all happen on your machine, and the clips go straight to the folder you chose. <strong>Nothing you watch, mark or make is uploaded to us.</strong></p>
<h2 id="no-account">No account, no ads, no tracking</h2>
<p>You do not make an account to use Clipr. There are no ads in the app or on this site.</p>
<h2 id="youtube-sign-in">Signing in to YouTube</h2>
<p>YouTube serves 360p to anyone who is not signed in. For 1080p, Clipr asks once for a <code>cookies.txt</code> exported from your own browser, and walks you through it. That file stays on your computer and is never uploaded. You can skip it and work at 360p.</p>
<h2 id="reports">Problem reports</h2>
<p>If something goes wrong, you can choose <strong>Help</strong> then <strong>Report a problem</strong>, write what you were doing in plain words and press <strong>Send report</strong>. Clipr adds the error, the version numbers and a cleaned-up log. <strong>Nothing is sent unless you press Send report</strong>, and you do not need an account of any kind. A crash screen has the same button.</p>
<h2 id="updates">Updates and this site</h2>
<p>Clipr checks for new versions of itself, and the download and what's new pages on this site read the public list of releases to show the latest version number and date. Neither sends anything about you or your clips.</p>
<h2 id="third-parties">Other services</h2>
<p>To get a video, Clipr talks to the video service you pasted a link from, from your own computer, like a browser would. That service's own terms and privacy policy apply to that part.</p>
"""

JS_WHATS_NEW = r"""
      (function () {
        var NOTES = __NOTES__;
        var API = "https://api.github.com/repos/xxxxxLiam/clipr/releases?per_page=30";
        var ASSETS = [["macOS", "Clipr-macOS-AppleSilicon.dmg"], ["Windows", "Clipr-Windows-x64-Setup.exe"], ["Linux", "Clipr-Linux-x64.AppImage"]];
        var DEV = /^(refactor|chore|test|docs|ci|build)\b|^fix\(ci\)/i;
        var GROUPS = ["New", "Improved", "Fixed"];
        var box = document.getElementById("releases");
        function el(tag, attrs, text) { var e = document.createElement(tag); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); }); if (text) e.textContent = text; return e; }
        function clean(body) {
          return String(body || "").split("\n").map(function (l) { return l.replace(/^\s*[-*]\s*/, "").replace(/\s*\[skip release\]\s*/gi, "").replace(/\s*\((?:#\d+|[A-Z]\d?-\d+(?:, [A-Z]\d?-\d+)*)\)/g, "").replace(/^Renderer:\s*/i, "").trim(); })
            .filter(function (l) { return l && !/^Release v?\d/i.test(l) && !DEV.test(l); });
        }
        // One entry per minor (Liam, 25 Nov): 19.2.0 and 19.2.1 are one "19.2" section; downloads come from its newest patch.
        function parts(r) { var m = String(r.tag_name).replace(/^v/, "").split("."); return [+m[0] || 0, +m[1] || 0, +m[2] || 0]; }
        function newer(a, b) { var x = parts(a), y = parts(b); return (y[0] - x[0]) || (y[1] - x[1]) || (y[2] - x[2]); }
        function grouped(list) {
          var by = {}, order = [];
          list.forEach(function (r) { var p = parts(r), k = p[0] + "." + p[1]; if (!by[k]) { by[k] = []; order.push(k); } by[k].push(r); });
          return order.map(function (k) {
            var rels = by[k].slice().sort(newer), top = rels[0];
            return Object.assign({}, top, { minor: k, rels: rels });
          });
        }
        function notesFor(g) {
          if (NOTES[g.minor]) return NOTES[g.minor];
          for (var i = 0; i < g.rels.length; i++) { var v = String(g.rels[i].tag_name).replace(/^v/, ""); if (NOTES[v]) return NOTES[v]; }
          return null;
        }
        function entry(g) {
          var n = notesFor(g);
          if (n) return { v: g.minor, intro: n.intro || "", highlights: n.highlights || [], cards: n.cards || [], changes: n.changes || [] };
          var seen = {}, rows = [];
          g.rels.forEach(function (x) { clean(x.body).forEach(function (t) { if (!seen[t]) { seen[t] = 1; rows.push({ group: "Changes", text: t }); } }); });
          return { v: g.minor, highlights: [], changes: rows };
        }
        function patches(g) { return g.rels.slice().reverse().map(function (x) { return String(x.tag_name).replace(/^v/, ""); }); }
        function when(r) { return r.published_at ? new Date(r.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""; }
        function groups(changes) {
          var wrap = el("div", { "class": "wn-groups" });
          var names = GROUPS.concat(["Changes"]);
          names.forEach(function (g) {
            var items = changes.filter(function (c) { return c.group === g; });
            if (!items.length) return;
            var d = el("div", { "class": "wn-group" });
            d.appendChild(el("h4", {}, g));
            var ul = el("ul");
            items.forEach(function (c) { var li = el("li"); if (c.title) { li.appendChild(el("b", {}, c.title + ". ")); } li.appendChild(document.createTextNode(c.text)); ul.appendChild(li); });
            d.appendChild(ul); wrap.appendChild(d);
          });
          return wrap;
        }
        function installers(r) {
          var d = el("div", { "class": "wn-dls" });
          ASSETS.forEach(function (a) { d.appendChild(el("a", { href: "https://github.com/xxxxxLiam/clipr/releases/download/" + r.tag_name + "/" + a[1] }, a[0])); });
          return d;
        }
        function win(file, alt, w, h) {
          var f = el("figure", { "class": "wn-win" }); if (w) f.style.maxWidth = w + "px";
          var bar = el("div", { "class": "wn-win-bar", "aria-hidden": "true" }); bar.appendChild(el("i")); bar.appendChild(el("i")); bar.appendChild(el("i"));
          f.appendChild(bar);
          var at = { src: "../docs/whats-new/" + file, alt: alt || "", loading: "lazy", decoding: "async" };
          if (w && h) { at.width = String(w); at.height = String(h); }
          var im = el("img", at);
          f.classList.add("is-loading");
          function done() { f.classList.remove("is-loading"); }
          im.addEventListener("load", done); im.addEventListener("error", done);
          f.appendChild(im); if (im.complete && im.naturalWidth) done(); return f;
        }
        function cards(list) {
          var wrap = el("section", { "class": "wn-cards", id: "wn-also" });
          wrap.appendChild(el("span", { "class": "wn-eyebrow" }, "Also in this release"));
          var g = el("div", { "class": "wn-cards-grid" });
          list.slice(0, 2).forEach(function (x) {
            var c = el("article", { "class": "wn-card" });
            c.appendChild(win(x.shot, x.alt, x.w, x.h));
            c.appendChild(el("span", { "class": "chip" }, x.tag));
            c.appendChild(el("h4", {}, x.title)); c.appendChild(el("p", {}, x.text));
            if (x.caption) c.appendChild(el("p", { "class": "wn-cap" }, x.caption));
            g.appendChild(c);
          });
          wrap.appendChild(g); return wrap;
        }
        function latest(r) {
          var e = entry(r), c = el("article", { "class": "wn-latest" });
          var dt = el("time", { "class": "wn-date", datetime: r.published_at || "" });
          dt.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/></svg>';
          dt.appendChild(document.createTextNode(when(r)));
          c.appendChild(dt);
          var h = el("div", { "class": "wn-head" }), t = el("div", { "class": "wn-title" });
          t.appendChild(el("h2", {}, "Version " + e.v)); t.appendChild(el("span", { "class": "chip ice" }, "Latest"));
          if (r.rels.length > 1) t.appendChild(el("span", { "class": "wn-patches" }, "Includes " + patches(r).join(" and ")));
          h.appendChild(t);
          var a = el("a", { "class": "dl-mini dl", href: "../download/" }); a.appendChild(el("span", { "class": "glyph", "aria-hidden": "true" })); a.appendChild(el("span", { "class": "dl-what" }, "Download Clipr"));
          h.appendChild(a); c.appendChild(h);
          if (e.intro) c.appendChild(el("p", { "class": "wn-intro" }, e.intro));
          if (e.highlights.length) {
            var jump = el("nav", { "class": "wn-jump", "aria-label": "In this version" });
            e.highlights.slice(0, 3).forEach(function (x, i) { jump.appendChild(el("a", { "class": "wn-pill", href: "#wn-h" + (i + 1) }, x.title)); });
            c.appendChild(jump);
            var secs = el("div", { "class": "wn-sections" });
            e.highlights.slice(0, 3).forEach(function (x, i) {
              var split = x.layout === "split" || x.layout === "split-flip";
              var d = el("section", { "class": "wn-sec" + (split ? " wn-split" + (x.layout === "split-flip" ? " flip" : "") : ""), id: "wn-h" + (i + 1) });
              var copy = el("div", { "class": "wn-copy" });
              if (x.eyebrow) copy.appendChild(el("span", { "class": "wn-eyebrow" }, x.eyebrow));
              var hd = el("div", { "class": "wn-sec-head" }), h3 = el("h3", {}, x.title);
              hd.appendChild(el("span", { "class": "wn-num" }, String(i + 1))); hd.appendChild(h3); hd.appendChild(el("span", { "class": "chip" }, x.tag));
              copy.appendChild(hd); copy.appendChild(el("p", {}, x.text));
              if (split) { if (x.caption) copy.appendChild(el("p", { "class": "wn-cap" }, x.caption)); d.appendChild(copy); var vw = win(x.shot, x.alt, x.w, x.h); if (x.glow) { var gs = el("div", { "class": "wn-stage wn-stage-split" }); gs.appendChild(vw); vw = gs; } d.appendChild(vw); }
              else {
                d.appendChild(copy);
                if (x.shot) { var st = el("div", { "class": "wn-stage" }); st.appendChild(win(x.shot, x.alt, x.w, x.h)); d.appendChild(st); if (x.caption) d.appendChild(el("p", { "class": "wn-cap" }, x.caption)); }
              }
              secs.appendChild(d);
            });
            c.appendChild(secs);
          }
          if (e.cards && e.cards.length) c.appendChild(cards(e.cards));
          if (e.changes.length) {
            var all = el("details", { "class": "wn-all", open: "" });
            all.appendChild(el("summary", {}, e.highlights.length ? "Smaller updates" : "What changed"));
            all.appendChild(groups(e.changes)); c.appendChild(all);
          }
          return c;
        }
        function noted(r) { return !!notesFor(r); }
        function row(r) {
          var e = entry(r), plain = !noted(r), d = el("details", { "class": "wn-row" });
          if (plain) e.changes = [{ group: "Improved", text: "Smaller improvements and fixes. See the installers below to get this version." }];
          else e.changes = e.highlights.map(function (h) { return { group: h.tag, title: h.title, text: h.text }; }).concat((e.cards || []).map(function (h) { return { group: h.tag, title: h.title, text: h.text }; })).concat(e.changes);
          var s = el("summary"); s.appendChild(el("b", {}, "Version " + e.v)); s.appendChild(el("time", { datetime: r.published_at || "" }, when(r)));
          s.appendChild(el("span", { "class": "count" }, plain ? "Improvements and fixes" : e.changes.length + (e.changes.length === 1 ? " change" : " changes")));
          s.appendChild(el("span", { "class": "more" }, "Show changes")); s.appendChild(el("span", { "class": "more less" }, "Hide changes")); d.appendChild(s);
          var b = el("div", { "class": "body" }); if (r.rels.length > 1) b.appendChild(el("p", { "class": "wn-patches" }, "Includes " + patches(r).join(" and "))); if (e.changes.length) b.appendChild(groups(e.changes)); b.appendChild(installers(r)); d.appendChild(b);
          return d;
        }
        fetch(API, { headers: { Accept: "application/vnd.github+json" } })
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
          .then(function (list) {
            list = list.filter(function (r) { return !r.draft && !r.prerelease && r.published_at; });
            box.textContent = "";
            if (!list.length) { box.appendChild(el("p", { "class": "status" }, "No versions to list yet.")); return; }
            list = grouped(list);
            box.appendChild(latest(list[0]));
            if (window.cliprDl) window.cliprDl(box);
            if (list.length > 1) {
              box.appendChild(el("h2", { "class": "wn-earlier" }, "Earlier versions"));
              var l = el("div", { "class": "wn-list" }); list.slice(1).filter(function (r) { return noted(r) || clean(r.body).length; }).forEach(function (r) { l.appendChild(row(r)); }); box.appendChild(l);
            }
          })
          .catch(function () { box.textContent = ""; box.appendChild(el("p", { "class": "status" }, "The version list could not load. Check your connection and reload; the download page always has the newest version.")); });
      })();
""".replace("__NOTES__", open(os.path.join(SRC, "whats-new.json"), encoding="utf-8").read())


def page(slug, title, desc, crumb, h1, lead, facts_html, body_html, extra_script="", noscript="", wide=False):
    canon = "https://xxxxxliam.github.io/clipr/%s/" % slug
    facts = '<div class="facts">%s</div>' % facts_html if facts_html else ""
    n = up(nav).replace("</header>", "</header>")
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script>if (window.IntersectionObserver && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.className += " anim";</script>
    <title>{esc(title)} · Clipr</title>
    <meta name="description" content="{esc(desc)}" />
    <link rel="canonical" href="{canon}" />
    <meta name="theme-color" content="#0a0d0f" />
    <link rel="icon" type="image/png" sizes="32x32" href="../favicon-32.png" />
    <link rel="apple-touch-icon" href="../apple-touch-icon.png" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Clipr" />
    <meta property="og:title" content="{esc(title)} · Clipr" />
    <meta property="og:description" content="{esc(desc)}" />
    <meta property="og:url" content="{canon}" />
    <meta property="og:image" content="https://xxxxxliam.github.io/clipr/docs/og.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="preload" href="../fonts/inter-latin-wght.woff2" as="font" type="font/woff2" crossorigin />
    <style>{page_style}{EXTRA_CSS}    </style>
  </head>
  <body>
    {svgdefs}
    <div class="frame">
      {n}
      <main id="top">
        <section class="p-hero grain grain-frost">
          <p class="crumb"><a href="../">Clipr</a> &rsaquo; {esc(crumb)}</p>
          <h1>{h1}</h1>
          <p class="lead">{lead}</p>
          {facts}
        </section>
        <div class="p-body prose{" wide" if wide else ""}">
{body_html}
{noscript}
        </div>
        {up(final)}
      </main>
      {up(foot)}
    </div>
    <script>
{dl_script}
{extra_script}
    </script>
    <script>
{motion_script}
    </script>
  </body>
</html>
"""


OS_TILES = """
<a class="os" href="https://github.com/xxxxxLiam/clipr/releases/latest/download/Clipr-macOS-AppleSilicon.dmg"><h2>macOS</h2><p>Apple Silicon (M1 and newer)</p></a>
<a class="os" href="https://github.com/xxxxxLiam/clipr/releases/latest/download/Clipr-Windows-x64-Setup.exe"><h2>Windows</h2><p>64-bit Windows</p></a>
<a class="os" href="https://github.com/xxxxxLiam/clipr/releases/latest/download/Clipr-Linux-x64.AppImage"><h2>Linux</h2><p>64-bit Linux</p></a>
"""

WN_SKELETON = (
    '<div class="wn-skel" role="status"><span class="wn-sr">Loading the list of versions&hellip;</span>'
    '<span class="sk" style="width:120px;height:16px"></span>'
    '<div class="sk-row sk-between" style="margin-top:16px"><span class="sk" style="width:min(320px,70%);height:36px"></span><span class="sk" style="width:180px;height:44px;border-radius:var(--r-control)"></span></div>'
    '<span class="sk" style="width:min(560px,90%);height:16px;margin-top:20px"></span><span class="sk" style="width:min(420px,70%);height:16px;margin-top:8px"></span>'
    '<div class="sk-row sk-pills"><span class="sk" style="width:110px;height:44px;border-radius:var(--r-control)"></span><span class="sk" style="width:170px;height:44px;border-radius:var(--r-control)"></span><span class="sk" style="width:96px;height:44px;border-radius:var(--r-control)"></span></div>'
    '<div class="sk-sec"><div class="sk-row"><span class="sk" style="width:32px;height:32px;border-radius:50%"></span><span class="sk" style="width:min(260px,60%);height:28px"></span></div>'
    '<span class="sk" style="width:min(520px,90%);height:16px;margin-top:20px"></span><span class="sk" style="width:min(380px,70%);height:16px;margin-top:8px"></span>'
    '<span class="sk sk-frame"></span></div>'
    '<div class="sk-list"><div class="sk-item"><span class="sk" style="width:120px;height:16px"></span><span class="sk" style="width:140px;height:14px"></span></div><div class="sk-item"><span class="sk" style="width:120px;height:16px"></span><span class="sk" style="width:140px;height:14px"></span></div><div class="sk-item"><span class="sk" style="width:120px;height:16px"></span><span class="sk" style="width:140px;height:14px"></span></div></div>'
    '</div>'
)

pages = {
    "download": page(
        "download", "Download Clipr", "Download Clipr for macOS, Windows or Linux. Free, including for paid client work. No ads, no account.",
        "Download", "Download Clipr", 'Free for macOS, Windows and Linux. <span id="ver" hidden></span>', OS_TILES,
        '<h2 id="first-launch">First time opening it?</h2>\n<p>Your computer asks once because Clipr is not signed with a paid certificate yet. It means &ldquo;unknown publisher&rdquo;, not &ldquo;unsafe&rdquo;. The <a href="../#install">install steps</a> take under a minute.</p>\n'
        '<h2 id="older">Older versions</h2>\n<p>Every version, with what changed in it and its installers, is on <a href="../whats-new/">What&rsquo;s new</a>.</p>',
        'if (location.hash === "#older") location.replace("../whats-new/");', ''),
    "whats-new": page(
        "whats-new", "What's new", "What changed in each version of Clipr, newest first.",
        "What's new", "What&rsquo;s new", "Every version of Clipr, newest first.", "",
        '<div id="releases">' + WN_SKELETON + '</div>',
        JS_WHATS_NEW, '<noscript><p class="status">Turn on JavaScript to see what changed in each version.</p></noscript>', wide=True),
    "licence": page(
        "licence", "Licence", "Clipr is free to use, including for paid client work. It is not open source: copying, forking, reselling or sharing it is not permitted.",
        "Legal", "Licence", "Free for client work. Not for sharing. Here is the short version, then the full text.",
        '<div><h2>Free to use</h2><p>Including for paid client work. The clips you make are yours.</p></div><div><h2>Not for redistribution</h2><p>No copying, forking, reselling or sharing the application.</p></div><div><h2>Built with ffmpeg</h2><p>ffmpeg carries its own GPL v3 terms.</p></div>',
        licence_body()),
    "notices": page(
        "notices", "Third-party notices", "The programs and fonts that ship alongside Clipr, and the licences they carry.",
        "Legal", "Third-party notices", "The programs and fonts that ship alongside Clipr, and the licences they carry.", "",
        md_to_html("\n".join(open(os.path.join(SRC, "notices.md"), encoding="utf-8").read().split("\n")[7:]))),
    "privacy": page(
        "privacy", "Privacy", "Clipr runs on your computer and nothing you watch, mark or make is uploaded. No account, no ads.",
        "Legal", "Privacy", "Nothing is uploaded. Here is exactly what Clipr does and does not send.",
        '<div><h2>Nothing uploaded</h2><p>Your clips and videos stay on your computer.</p></div><div><h2>No account</h2><p>Nothing to sign up for, and no ads.</p></div><div><h2>Reports only if you send one</h2><p>Nothing goes out unless you press Send report.</p></div>',
        PRIVACY),
}

OUT = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else ROOT
for slug, content in pages.items():
    d = os.path.join(OUT, slug)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(content)
    print("wrote", slug + "/index.html", len(content) // 1024, "KB")
