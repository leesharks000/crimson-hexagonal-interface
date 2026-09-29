#!/usr/bin/env python3
"""build_work_page.py — project one Alexanarch deposit as a /works/<hex> page.

WHY THIS EXISTS (2026-09-29). The /works pages were written in the August passes and no
generator for them was committed, so a new version of a seated work had no path onto the site.
This script renders a deposit's canonical text into the same template the existing pages use
(breadcrumb, the symbolon block, the address block, seat and projection, relations, full text,
provenance) and, for a new version, records the version relation in both directions.

The seat is Alexanarch. The text is read from a local alexanarch checkout
(data/texts/AXN-<HEX>-text.md) or fetched from www.alexanarch.org; the page says so, and any
divergence is a defect of the projection.

    python3 scripts/build_work_page.py spec.json [--alexanarch ../alexanarch]

spec.json is a list of pages:
  {"hex": "06D9", "deposit": 1651, "axn": "...", "title": "...", "date": "2026-09-29",
   "voice": "Lee Sharks / Claude", "room": ["assembly", "The Assembly Room", "R:r.11"],
   "role": "GOVERNING-MANTLE", "multiplicity": "SERIES", "gloss": "...",
   "symbolon": "<p>…</p>", "relations": [["governs_in", "/rooms/assembly", "R:r.11 …"], …],
   "version": "v1.1", "supersedes": {"hex": "0088", "deposit": 332, "version": "v1.0"}}
and, for an older version, the page at its hex receives a superseded banner and a relation
pointing forward (the page keeps its own canonical: every version stays addressable).
"""
import json, re, sys, html, pathlib, urllib.request
import markdown

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
SITE = "https://www.crimsonhexagonal.org"
A = "https://www.alexanarch.org"

TEMPLATE_CSS = None


def css():
    """The stylesheet of an existing work page, so every page reads the same."""
    s = (PUB / "works" / "0088" / "index.html").read_text(encoding="utf-8")
    m = re.search(r"<style>.*?</style>", s, flags=re.S)
    extra = ("<style>.full table{border-collapse:collapse;font-size:.84rem;display:block;overflow-x:auto;margin:1rem 0}"
             ".full th,.full td{border:1px solid rgba(200,168,104,.2);padding:.3rem .5rem;vertical-align:top;text-align:left}"
             ".full ul,.full ol{padding-left:1.3rem}.full li{margin:.25rem 0}"
             ".full blockquote{margin:1rem 0;padding-left:1rem;border-left:2px solid rgba(200,168,104,.3);color:#b8b3a8}"
             ".vers{border-left:2px solid #b45309;padding:.35rem 0 .35rem 1rem;margin:1rem 0;font-size:.92rem}"
             ".vers b{color:#e0a458;font-family:ui-monospace,monospace;font-size:.78rem;letter-spacing:.06em}</style>")
    return m.group(0) + extra


def symcss():
    s = (PUB / "works" / "0088" / "index.html").read_text(encoding="utf-8")
    return re.search(r'<style id="symcss">.*?</style>', s, flags=re.S).group(0)


FAVICONS = """<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">"""


def text_of(hexid, alexanarch):
    p = pathlib.Path(alexanarch) / "data" / "texts" / f"AXN-{hexid}-text.md" if alexanarch else None
    if p and p.exists():
        t = p.read_text(encoding="utf-8")
    else:
        t = urllib.request.urlopen(f"{A}/data/texts/AXN-{hexid}-text.md").read().decode("utf-8")
    if t.startswith("---\n"):
        t = t[t.index("\n---\n", 4) + 5:]
    return t.strip()


def render_full(md):
    h = markdown.markdown(md, extensions=["tables", "fenced_code", "sane_lists"])
    h = re.sub(r"<h[123]>", '<h3 class="ct">', h); h = re.sub(r"</h[123]>", "</h3>", h)
    h = re.sub(r"<h4>", '<h4 class="ct">', h)
    h = re.sub(r"<h[56]>", '<h5 class="ct">', h); h = re.sub(r"</h[56]>", "</h5>", h)
    h = re.sub(r"<pre><code[^>]*>", '<pre class="art">', h); h = h.replace("</code></pre>", "</pre>")
    return h


def page(spec, alexanarch):
    hx = spec["hex"].lower(); HX = spec["hex"].upper(); n = spec["deposit"]
    md = text_of(HX, alexanarch)
    words = len(re.findall(r"\S+", md))
    slug, room_name, locus = spec["room"]
    url = f"{SITE}/works/{hx}"
    title = spec["title"]
    short = title if len(title) <= 90 else title[:87].rstrip() + "…"
    desc = spec.get("description") or spec["gloss"]
    ld = {"@context": "https://schema.org", "@type": "CreativeWork", "name": title,
          "identifier": spec["axn"], "url": url, "sameAs": f"{A}/s/records/{n}/",
          "author": {"@type": "Person", "name": spec.get("author", "Lee Sharks")},
          "datePublished": spec["date"], "version": spec.get("version"),
          "isPartOf": {"@type": "CollectionPage", "name": room_name, "url": f"{SITE}/rooms/{slug}"},
          "additionalType": spec["role"]}
    if spec.get("supersedes"):
        s = spec["supersedes"]
        ld["isBasedOn"] = {"@type": "CreativeWork", "url": f"{SITE}/works/{s['hex'].lower()}",
                           "sameAs": f"{A}/s/records/{s['deposit']}/", "version": s["version"]}
    rel = "".join(f'<div><b>{html.escape(k)}</b> &middot; <a href="{h}">{t}</a></div>'
                  for k, h, t in spec["relations"])
    vers = ""
    if spec.get("supersedes"):
        s = spec["supersedes"]
        vers = (f'<div class="vers"><b>VERSION {html.escape(spec.get("version",""))}</b><br>This is the current version. '
                f'It supersedes <a href="/works/{s["hex"].lower()}">{s["version"]} (alexanarch #{s["deposit"]})</a>, '
                f'which stays addressable as a version of this work.</div>')
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(short)} &middot; AXN:{HX} | Crimson Hexagonal Archive</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{url}">
{css()}
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
{FAVICONS}
</head>
<body><div class="w">
<p class="hex"><a href="/">Crimson Hexagonal Archive</a> &nbsp;/&nbsp; <a href="/rooms/">rooms</a> &nbsp;/&nbsp; <a href="/rooms/{slug}">{html.escape(room_name)}</a> &nbsp;/&nbsp; works</p>
<h1>{html.escape(title)}</h1>{symcss()}<div class="symbolon"><p><b>This half.</b> Voice: {html.escape(spec["voice"])}. Address: {spec["axn"]} &middot; alexanarch #{n}.</p>{spec["symbolon"]}<p class="sc">Completion condition: voice, address, typed relation. <a href="/llms.txt">The condition</a> &middot; <a href="/relation_record.json">the record</a>.</p></div>
{vers}
<p class="hex"><b>{spec["axn"]}</b><br>role <b>{spec["role"]}</b> &middot; multiplicity <b>{spec.get("multiplicity","SINGLETON")}</b> &middot; {html.escape(spec["gloss"])} &middot; standing <b>SEATED</b><br>
locus <b>{locus}</b> &middot; {spec["date"]} &middot; {words} words &middot; body <b>full</b></p>
<div class="phys"><b>Seat and projection</b><br>Owned by <a href="{A}/s/records/{n}/">Alexanarch record #{n}</a>, the canonical seat. This page projects the work in full. Divergence is a defect of this projection, never of the seat.</div>
<h2>Relations</h2><div class="lp">{rel}</div>
<h2>Full text</h2><div class="full">
{render_full(md)}
</div>
<p class="hex">&mdash; end of work &middot; {spec["axn"]} &middot; alexanarch #{n} &middot; locus {locus}</p>
<div class="prov"><div>Canonical seat &middot; <a href="{A}/s/records/{n}/">alexanarch #{n}</a></div>
<div>Locus &middot; <a href="/rooms/{slug}">{html.escape(room_name)}</a> &middot; <a href="/map/#{locus}">Surface Map</a></div>
<div>&#8750; = 1</div></div></div></body></html>
"""


def mark_superseded(spec):
    """The older version's page: a banner under the title and a relation forward. Idempotent."""
    s = spec["supersedes"]; old = PUB / "works" / s["hex"].lower() / "index.html"
    t = old.read_text(encoding="utf-8")
    if 'class="superseded"' in t:
        return
    new = spec["hex"].lower()
    banner = (f'<div class="phys superseded" style="border-left-color:#b45309"><b>Superseded</b><br>'
              f'This is version {s["version"]} (alexanarch #{s["deposit"]}). The current version is '
              f'<a href="/works/{new}">{spec.get("version","")} &mdash; alexanarch #{spec["deposit"]}</a>.'
              + (f' {spec["superseded_note"]}' if spec.get("superseded_note") else "") + "</div>")
    t = re.sub(r"(</h1>)", r"\1" + banner.replace("\\", "\\\\"), t, count=1)
    t = t.replace('<h2>Relations</h2><div class="lp">',
                  f'<h2>Relations</h2><div class="lp"><div><b>superseded_by</b> &middot; '
                  f'<a href="/works/{new}">{spec.get("version","")} &middot; alexanarch #{spec["deposit"]}</a></div>', 1)
    old.write_text(t, encoding="utf-8")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    alex = None
    if "--alexanarch" in sys.argv:
        alex = sys.argv[sys.argv.index("--alexanarch") + 1]
        args = [a for a in args if a != alex]
    specs = json.loads(pathlib.Path(args[0]).read_text(encoding="utf-8"))
    for spec in specs:
        out = PUB / "works" / spec["hex"].lower() / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page(spec, alex), encoding="utf-8")
        print("wrote", out.relative_to(ROOT))
        if spec.get("supersedes"):
            mark_superseded(spec)
            print("  marked superseded:", spec["supersedes"]["hex"].lower())


if __name__ == "__main__":
    main()
