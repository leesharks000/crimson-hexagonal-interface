#!/usr/bin/env python3
"""seat_navigation.py — the four navigation pages seat their documents whole and point onward (2026-10-30).

WHY. The navigation pages built by build_navigation.py on 2026-08-17 promised the ratified March document "seated beside" each
current projection, and carried only its title and a DOI that died with the Zenodo account on 2026-06-19. The Space Ark page,
which Google's AI Overview links as "the Space Ark", held five paragraphs; the Ark itself (#558) was seated only on the room
page. And a navigation page pointed almost nowhere: its six modes were unlinked, and it did not reach the room, the record or
the other three layers. Operator, 2026-10-30: "its supposed to be full seated texts"; "how does not linking from navigation help
that? aio just linked to that page as the space ark"; "why does a so called navigation page not point elsewhere?"

WHAT. On each of /navigation/{space-ark,registry,central-map,fractal-map}/:
  1. a routes block after the opening paragraph: the document seated below, its canonical record and AXN page, the rooms and
     surfaces it governs or routes to, and the other three layers;
  2. on the Space Ark, each of the six modes linked to the surface that carries it;
  3. in the historical-specification box, the document seated whole from Alexanarch (data/texts/AXN-<HEX>-text.md), unedited,
     rendered as the room and work pages render seated texts; every Zenodo DOI routed through alexanarch.org/go/?doi= (the DOIs
     are tombstoned) and, where the archive maps it, marked with the AXN it resolves to, as the room page marks them.
The seated words are checked against the canonical text (the run refuses a mismatch). Idempotent: the blocks sit between
markers and are replaced on a rerun. build_navigation.py calls this after it writes the pages.
    python3 scripts/seat_navigation.py [--alexanarch ../../alexanarch]"""
import hashlib, html, json, pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from build_work_page import text_of, render_full

REPO = pathlib.Path(__file__).resolve().parents[1]
NAV = REPO / "public" / "navigation"
A = "https://www.alexanarch.org"
args = sys.argv[1:]
ALEX = pathlib.Path(args[args.index("--alexanarch") + 1]) if "--alexanarch" in args else (REPO.parent.parent / "alexanarch")
REG = {d["deposit_number"]: d for d in json.loads((ALEX / "data/registry.json").read_text(encoding="utf-8"))["deposits"]}
DMAP = json.loads((ALEX / "data/api/doi-axn-map.json").read_text(encoding="utf-8"))["map"]

LAYERS = [("registry", "The Registry", "anchors"), ("central-map", "The Central Navigation Map", "routes"),
          ("fractal-map", "The Fractal Navigation Map", "resolves traversal"), ("space-ark", "The Space Ark", "governs runtime")]
NODES = {
 "space-ark": {"dep": 558, "routes": [
     ("/rooms/space-ark/", "The Space Ark room (S:sp.03)", "the locus, where the Ark is seated with its joins and voice"),
     ("/rooms/break-room/", "The Break Room (R:r.12)", "the carrier and the only door to the Lunar Arm"),
     ("/rooms/lunar-arm/", "The Lunar Arm", "the Ark's shadow arm"),
     ("/rooms/assembly/", "The Assembly (R:r.11)", "governance and witness")]},
 "registry": {"dep": 31, "routes": [
     (A + "/s/browse/", "The live registry", "every deposit, AXN-addressed"),
     (A + "/go/", "The DOI resolver", "a tombstoned DOI to the record that carries it"),
     (A + "/data/registry.json", "The registry as data", "registry.json")]},
 "central-map": {"dep": 578, "routes": [
     ("/map/", "The surface map", "the rooms drawn as a map"),
     ("/rooms/", "The room index", "every room, each a resolved object of the map"),
     ("/machine/routes.json", "Routes as data", "routes.json"), ("/relation_record.json", "The relation record", "relation_record.json")]},
 "fractal-map": {"dep": 30, "routes": [
     ("/enter/", "The entrance", "where traversal begins"),
     ("/rooms/", "The room index", "the adjacency on each room page is where the map executes"),
     ("/machine/routes.json", "Routes as data", "routes.json")]},
}
MODES = [  # the Space Ark's six interface modes, each to the surface that now carries it
 ('<div><b>MAP</b> &nbsp;architecture &middot; <a href="/rooms/">the rooms</a></div>',
  '<div><b><a href="/map/">MAP</a></b> &nbsp;architecture &middot; <a href="/rooms/">the rooms</a></div>'),
 ('<div><b>READ</b> &nbsp;works &middot; documents seated in their rooms</div>',
  '<div><b><a href="/rooms/">READ</a></b> &nbsp;works &middot; documents seated in their rooms</div>'),
 ('<div><b>WORK</b> &nbsp;operations &middot; operator stacks and LP programs</div>',
  '<div><b><a href="/structures/umbml/">WORK</a></b> &nbsp;operations &middot; operator stacks and LP programs</div>'),
 ('<div><b>ORACLE</b> &nbsp;retrieval and composition</div>',
  '<div><b><a href="https://www.themandalaoracle.org/">ORACLE</a></b> &nbsp;retrieval and composition</div>'),
 ('<div><b>ASSEMBLY</b> &nbsp;governance and witness</div>',
  '<div><b><a href="/rooms/assembly/">ASSEMBLY</a></b> &nbsp;governance and witness</div>'),
 ('<div><b>TRACE</b> &nbsp;provenance &middot; every page returns to its canonical record</div>',
  '<div><b><a href="' + A + '/s/records/558/">TRACE</a></b> &nbsp;provenance &middot; every page returns to its canonical record</div>')]
CSS = """<style id="nav-seated">/* seat_navigation.py (2026-10-30): the seated document and the routes, in the room pages' terms */
.routes{border:1px solid rgba(200,168,104,.2);border-radius:3px;padding:.9rem 1.1rem;margin:1.2rem 0 1.6rem}
.routes h2{margin-top:0}.routes ul{list-style:none;padding:0;margin:0}.routes li{margin:.45rem 0;line-height:1.5}
.routes li span{color:#8a8478;font-size:.86rem}.routes .lay{margin-top:.8rem;padding-top:.7rem;border-top:1px dashed rgba(200,168,104,.18);font-size:.88rem}
.routes .lay a{margin-right:.9rem}.routes .lay b{font-weight:400;color:#8a8478;margin-right:.6rem}
.lp a{color:inherit}
.seatmeta{font-size:.88rem;line-height:1.6;margin:.8rem 0 0}
.full{border-left:2px solid rgba(200,168,104,.3);padding-left:1.1rem;margin:1rem 0 0;overflow-wrap:anywhere}.full p{margin:.7rem 0}
.full hr{border:0;border-top:1px solid rgba(200,168,104,.14);margin:1.6rem 0}
.full table{border-collapse:collapse;font-size:.84rem;display:block;overflow-x:auto;margin:1rem 0}
.full th,.full td{border:1px solid rgba(200,168,104,.2);padding:.3rem .5rem;vertical-align:top;text-align:left}
.full ul,.full ol{padding-left:1.3rem}.full li{margin:.25rem 0}
.full blockquote{margin:1rem 0;padding-left:1rem;border-left:2px solid rgba(200,168,104,.3);color:#b8b3a8}
.ct{color:#c8a868;font-family:ui-monospace,monospace;letter-spacing:.04em;margin:1.8rem 0 .5rem;font-size:.86rem;text-transform:uppercase}
h4.ct,h5.ct{font-size:.76rem}
.xw{font:.6rem/1.5 ui-monospace,monospace;color:#8a8478;opacity:.85}
pre.art{font:.62rem/1.35 ui-monospace,'JetBrains Mono',monospace;color:#b8b3a8;background:rgba(255,255,255,.02);border:1px solid rgba(200,168,104,.14);
border-radius:3px;padding:.7rem .8rem;overflow-x:auto;white-space:pre;margin:1rem 0}
</style>"""
ZEN = re.compile(r"10\.5281/zenodo\.(\d+)")


def rec_axn(n):
    return REG[n]["axn"]


def doi_note(doi):
    v = DMAP.get(doi)
    if not v or not v[1]:
        return ""
    m = re.search(r"/s/records/(\d+)/", v[1])
    axn = rec_axn(int(m.group(1))) if m and int(m.group(1)) in REG else v[0]
    return f' <span class="xw">&rarr; {html.escape(axn)}</span>' if axn else ""


def route_dois(h):
    """In text outside links, a Zenodo DOI becomes a link through the resolver with its AXN; a link to a Zenodo DOI is sent
    through the resolver. Nothing else in the text changes."""
    out, in_a = [], 0
    for part in re.split(r"(<[^>]+>)", h):
        if part.startswith("<"):
            if re.match(r"<a[\s>]", part):
                in_a += 1
                part = re.sub(r'href="https?://(?:dx\.)?doi\.org/(10\.5281/zenodo\.\d+)"', lambda m: f'href="{A}/go/?doi={m.group(1)}"', part)
                part = re.sub(r'href="https?://zenodo\.org/(?:records?|record)/(\d+)[^"]*"', lambda m: f'href="{A}/go/?doi=10.5281/zenodo.{m.group(1)}"', part)
            elif part.startswith("</a"):
                in_a = max(0, in_a - 1)
            out.append(part); continue
        if in_a:
            out.append(part); continue
        out.append(ZEN.sub(lambda m: f'<a href="{A}/go/?doi={m.group(0)}">{m.group(0)}</a>' + doi_note(m.group(0)), part))
    return "".join(out)


def plain(h):
    h = re.sub(r'<span class="xw">.*?</span>', "", h)
    return "".join(html.unescape(re.sub(r"<[^>]+>", "", h)).split())   # the characters of the text, tags and spacing aside


def routes_block(slug):
    n = NODES[slug]["dep"]; d = REG[n]; hx = d["axn"][4:8]
    li = [f'<li><a href="#seated">{html.escape(d["title"])}</a> <span>&mdash; seated whole on this page, below</span></li>',
          f'<li><a href="{A}/s/records/{n}/">alexanarch #{n}</a> &middot; <a href="{A}/s/axn/{hx}/">{html.escape(d["axn"])}</a> <span>&mdash; the canonical record</span></li>']
    li += [f'<li><a href="{u}">{html.escape(t)}</a> <span>&mdash; {html.escape(s)}</span></li>' for u, t, s in NODES[slug]["routes"]]
    lay = "".join(f'<a href="/navigation/{s}/">{html.escape(t)}</a>' for s, t, _ in LAYERS if s != slug)
    return (f'<!-- NAV-ROUTES-START (scripts/seat_navigation.py) --><nav class="routes" aria-label="Where this goes"><h2>Where this goes</h2><ul>{"".join(li)}</ul>'
            f'<div class="lay"><b>the other layers</b>{lay}<a href="/navigation/">the architecture</a></div></nav><!-- NAV-ROUTES-END -->')


def seated_block(slug):
    n = NODES[slug]["dep"]; d = REG[n]; hx = d["axn"][4:8]
    md = text_of(hx, str(ALEX))
    raw = (ALEX / "data/texts" / f"AXN-{hx}-text.md").read_bytes()
    body0 = render_full(md); body = route_dois(body0)
    if plain(body) != plain(body0):
        sys.exit(f"refused: {slug}: the seated words differ from the canonical text")
    meta = (f'<p class="seatmeta"><b>Seated whole below:</b> {html.escape(d["title"])} &middot; {html.escape(d.get("version") or "")} &middot; '
            f'{html.escape(str(d.get("date") or ""))} &middot; <a href="{A}/s/records/{n}/">alexanarch #{n}</a> &middot; {html.escape(d["axn"])}. '
            f'The canonical text, unedited (data/texts/AXN-{hx}-text.md, sha256 {hashlib.sha256(raw).hexdigest()[:16]}&hellip;, {len(md.split()):,} words). '
            f'Its Zenodo DOIs were tombstoned on 2026-06-19 and resolve through <a href="{A}/go/">alexanarch</a>.</p>')
    return f'<!-- NAV-SEATED-START (scripts/seat_navigation.py) -->{meta}<div class="full" id="seated">\n{body}\n</div><!-- NAV-SEATED-END -->', len(md.split())


def main():
    for slug in NODES:
        p = NAV / slug / "index.html"; t = p.read_text(encoding="utf-8")
        t = re.sub(r"\n?<!-- NAV-ROUTES-START.*?<!-- NAV-ROUTES-END -->", "", t, flags=re.S)
        t = re.sub(r"\n?<!-- NAV-SEATED-START.*?<!-- NAV-SEATED-END -->\n?", "", t, flags=re.S)
        t = re.sub(r'<style id="nav-seated">.*?</style>\n', "", t, flags=re.S)
        # 1. routes after the opening paragraph (the first <p> after the function line)
        i = t.index('<p class="hex">'); j = t.index("</p>", t.index("<p>", t.index("</p>", i))) + 4
        t = t[:j] + "\n" + routes_block(slug) + t[j:]
        # 2. the modes
        if slug == "space-ark":
            for a, b in MODES:
                if b not in t:
                    assert a in t, a; t = t.replace(a, b)
            t = t.replace("DOI <b>10.5281/zenodo.19013315</b>", f'DOI <a href="{A}/go/?doi=10.5281/zenodo.19013315"><b>10.5281/zenodo.19013315</b></a>')
        # 3. the document, seated whole, at the end of the historical-specification box
        h = t.index('<div class="strata hist"><h3>Historical specification</h3>')
        end = re.compile(r"</p>\s*</div>").search(t, h).start() + len("</p>")   # the box's last paragraph
        blk, nw = seated_block(slug)
        t = t[:end] + "\n" + blk + "\n" + t[end:]
        t = t.replace("</head>", CSS + "\n</head>", 1)
        if "texts seated 2026-10-30" not in t:
            t = t.replace("Generated 2026-08-17 from hexagon_canonical.json &middot;", "Generated 2026-08-17 from hexagon_canonical.json; texts seated 2026-10-30 from alexanarch &middot;", 1)
        p.write_text(t, encoding="utf-8")
        print(f"{slug}: #{NODES[slug]['dep']} seated ({nw:,} words), {len(NODES[slug]['routes']) + 5} routes, {len(t):,} bytes")


if __name__ == "__main__":
    main()
