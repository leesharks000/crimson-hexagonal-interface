#!/usr/bin/env python3
"""normalize_urls.py — one URL grammar for crimsonhexagonal.org (2026-09-03).

Search Console (URL Inspection, 2026-09-03) showed three grammars for one page:
  page canonical   https://crimsonhexagonal.org/works/00db/      (apex, slash)
  sitemap          https://www.crimsonhexagonal.org/works/00db/  (www, slash)
  served/selected  https://www.crimsonhexagonal.org/works/00db   (www, no slash — vercel trailingSlash:false)
Result: sitemap "408 submitted, 0 indexed", every indexed page "user canonical ≠ Google canonical",
random sitemap URLs "Discovered – currently not indexed" never crawled.

Rule: the canonical form is  https://www.crimsonhexagonal.org/<path>  with NO trailing slash
(root stays "/"), matching vercel.json trailingSlash:false and Google's own selection.
This script rewrites <link rel=canonical>, og:url, JSON-LD url/@id/mainEntityOfPage and the
sitemap to that form. Run after the generators; idempotent.
"""
import re, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
APEX = "https://crimsonhexagonal.org"; WWW = "https://www.crimsonhexagonal.org"

def canon(url):
    u = url.replace(APEX, WWW)
    if u.startswith(WWW) and u != WWW + "/" and u.endswith("/"): u = u[:-1]
    if u == WWW: u = WWW + "/"
    return u

def fix_html(p):
    s = p.read_text(encoding="utf-8", errors="replace"); o = s
    s = re.sub(r'(<link rel="canonical" href=")([^"]+)(")', lambda m: m.group(1)+canon(m.group(2))+m.group(3), s)
    s = re.sub(r'(property="og:url" content=")([^"]+)(")', lambda m: m.group(1)+canon(m.group(2))+m.group(3), s)
    s = re.sub(r'("(?:url|@id|mainEntityOfPage)"\s*:\s*")(https://(?:www\.)?crimsonhexagonal\.org[^"]*)(")', lambda m: m.group(1)+canon(m.group(2))+m.group(3), s)
    if s != o: p.write_text(s, encoding="utf-8"); return 1
    return 0

def fix_sitemap(p):
    s = p.read_text(encoding="utf-8"); o = s
    s = re.sub(r'<loc>([^<]+)</loc>', lambda m: "<loc>"+canon(m.group(1))+"</loc>", s)
    if s != o: p.write_text(s, encoding="utf-8"); return 1
    return 0

def main():
    n = 0
    for p in list((ROOT/"public").rglob("*.html")) + [ROOT/"index.html"]:
        if p.exists(): n += fix_html(p)
    m = sum(fix_sitemap(p) for p in [ROOT/"public/sitemap.xml", ROOT/"sitemap.xml"] if p.exists())
    print(f"normalize_urls: {n} html files rewritten, {m} sitemaps rewritten → {WWW}/<path>, no trailing slash")
    if "--check" in sys.argv:
        bad = []
        for p in list((ROOT/"public").rglob("*.html")) + [ROOT/"index.html"]:
            for c in re.findall(r'<link rel="canonical" href="([^"]+)"', p.read_text(encoding="utf-8", errors="replace")):
                if c != canon(c): bad.append((str(p), c))
        for c in re.findall(r'<loc>([^<]+)</loc>', (ROOT/"public/sitemap.xml").read_text()):
            if c != canon(c): bad.append(("sitemap", c))
        print("check:", "ok" if not bad else f"{len(bad)} nonconforming"); return 0 if not bad else 1

if __name__ == "__main__": sys.exit(main() or 0)
