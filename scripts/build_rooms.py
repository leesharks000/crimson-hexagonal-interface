#!/usr/bin/env python3
"""build_rooms.py — make every room a document again.

THE CONDITION THIS REPAIRS. On 2026-08-17 crimsonhexagonal.org served exactly ONE
indexable document: a 9.8 KB homepage, plus hexagon_canonical.json at ~30,000
lines. /rooms/marx returned 404. The Marx Room's physics existed — 06.ROOM.MARX,
T.1|material, "Language is a material condition, not a description of one" — but
only inside a machine object no reader and no composition layer would open.

That is why a query for "marx room crimson" composed from OpenAlex metadata
instead: a bounded external object was easier to consume than the architecture.

The room used to be the missing scale between WHOLE ARCHIVE and SINGLE DEPOSIT.
This restores it as an address.

Generates, from hexagon_canonical.json alone:

    /rooms/                     the index
    /rooms/<slug>/              a bounded, server-rendered room document
    /rooms/<slug>/index.json    the same object, machine-shaped and small

Nothing here is hand-maintained. Rerun after any canonical change.
"""
import json
import pathlib
import re
import html
import datetime

ROOT = pathlib.Path(__file__).resolve().parents[1]
CANON = json.loads((ROOT / "hexagon_canonical.json").read_text())
TODAY = datetime.date.today().isoformat()

ROOMS = CANON["rooms"]
DOCS = CANON["documents"]
BY_ID = {r["id"]: r for r in ROOMS}
CAT_LABEL = {"core": "core room", "ext": "extension room", "special": "special space",
             "new": "new room", "field": "field"}


def slug(name):
    s = re.sub(r"^(the|r\.\d+|f\.\d+)\s+", "", name.strip(), flags=re.I)
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s or name.lower()


def docs_for(rid):
    out = [d for d in DOCS if rid in (d.get("rooms") or [])]
    # room-defining documents first: those naming the room in their title
    r = BY_ID[rid]
    key = slug(r["name"]).split("-")[0]
    out.sort(key=lambda d: (key not in str(d.get("title", "")).lower(),
                            -len(str(d.get("excerpt") or ""))))
    return out


def edge_sentence(a, b):
    """Prose for an adjacency, composed from what each room actually says.

    The canonical file gives adjacency as ["r01","r02",...] — machine-perfect and
    semantically empty. A composition layer told only that r06 borders r05 learns
    nothing; told what the border MEANS it can carry the relation into an answer.
    """
    return (f"{a['name']} opens onto {b['name']}. "
            f"Here: {a.get('desc', '').rstrip('.')}. "
            f"There: {b.get('desc', '').rstrip('.')}.")


def esc(s):
    return html.escape(str(s or ""))


CSS = """*{box-sizing:border-box}
body{margin:0;background:#0c0e12;color:#d8d4cc;font:16px/1.65 Georgia,serif}
.w{max-width:46rem;margin:0 auto;padding:2.2rem 1.4rem 5rem}
a{color:#c8a868}
h1{font-size:1.75rem;line-height:1.2;margin:0 0 .2rem}
h2{font:500 .62rem/1 ui-monospace,'JetBrains Mono',monospace;letter-spacing:.16em;
text-transform:uppercase;color:#8a8478;margin:2.4rem 0 .7rem;padding-bottom:.4rem;
border-bottom:1px solid rgba(200,168,104,.18)}
.hex{font:.62rem/1 ui-monospace,monospace;letter-spacing:.14em;color:#8a8478;margin:0 0 1.4rem}
.phys{border-left:2px solid #c8a868;padding:.2rem 0 .2rem 1rem;margin:1.2rem 0}
.phys b{color:#c8a868;font-family:ui-monospace,monospace;font-size:.8rem}
.q{font-style:italic;color:#c8a868}
.op{display:inline-block;font:.66rem/1 ui-monospace,monospace;letter-spacing:.06em;
border:1px solid rgba(200,168,104,.3);border-radius:2px;padding:.28rem .5rem;margin:0 .3rem .3rem 0}
.doc{padding:.8rem 0;border-bottom:1px solid rgba(200,168,104,.12)}
.doc .t{font-weight:600}
.doc .m{font:.62rem/1.5 ui-monospace,monospace;letter-spacing:.06em;color:#8a8478;margin:.2rem 0}
.doc .x{font-size:.9rem;color:#b8b3a8;margin:.4rem 0 0}
.adj{padding:.7rem 0;border-bottom:1px solid rgba(200,168,104,.12)}
.lp{font:.7rem/1.9 ui-monospace,monospace;color:#b8b3a8;background:rgba(255,255,255,.02);
border:1px solid rgba(200,168,104,.14);border-radius:3px;padding:.8rem 1rem;overflow-x:auto}
.lp b{color:#c8a868}
.prov{margin-top:3rem;padding-top:1.2rem;border-top:1px solid rgba(200,168,104,.18);
font:.62rem/1.9 ui-monospace,monospace;letter-spacing:.06em;color:#8a8478}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));gap:.9rem}
.card{border:1px solid rgba(200,168,104,.16);border-radius:3px;padding:.8rem .9rem}
.card a{text-decoration:none;font-weight:600}
.card p{margin:.3rem 0 0;font-size:.85rem;color:#b8b3a8}
"""


def room_page(r):
    rid = r["id"]
    ds = docs_for(rid)
    adj = [BY_ID[a] for a in (r.get("adjacent") or []) if a in BY_ID]
    ops = "".join(f'<span class="op">{esc(o)}</span>' for o in (r.get("ops") or []))
    lp = "".join(f'<div><b>{esc(s.get("step"))}</b> &nbsp;{esc(s.get("value"))}</div>'
                 for s in (r.get("lp_program") or []))
    defining, core, assoc = ds[:1], ds[1:6], ds[6:]

    def doc_html(d, n):
        ex = str(d.get("excerpt") or "")
        cut = {0: 900, 1: 420}.get(n, 0)
        body = f'<p class="x">{esc(ex[:cut])}{"…" if len(ex) > cut > 0 else ""}</p>' if cut else ""
        doi = d.get("doi")
        link = (f' &middot; <a href="https://doi.org/{esc(doi)}">{esc(doi)}</a>' if doi else "")
        who = ", ".join(d.get("creators") or [])
        return (f'<div class="doc"><div class="t">{esc(d.get("title"))}</div>'
                f'<div class="m">{esc(who)}{link}</div>{body}</div>')

    adj_html = "".join(
        f'<div class="adj"><a href="/rooms/{slug(a["name"])}/">{esc(a["name"])}</a>'
        f'<div class="m" style="font:.8rem/1.5 Georgia,serif;color:#b8b3a8;margin-top:.2rem">'
        f'{esc(edge_sentence(r, a))}</div></div>' for a in adj)

    ld = {
        "@context": "https://schema.org", "@type": "CollectionPage",
        "name": r["name"], "identifier": r.get("hex_address"),
        "url": f"https://crimsonhexagonal.org/rooms/{slug(r['name'])}/",
        "description": r.get("desc"),
        "isPartOf": {"@type": "Collection", "name": "Crimson Hexagonal Archive",
                     "url": "https://crimsonhexagonal.org/"},
        "hasPart": [{"@type": "CreativeWork", "name": d.get("title"),
                     "identifier": d.get("doi")} for d in ds[:20]],
        "significantLink": [f"https://crimsonhexagonal.org/rooms/{slug(a['name'])}/" for a in adj],
    }
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(r['name'])} &middot; {esc(r.get('hex_address'))} | Crimson Hexagonal Archive</title>
<meta name="description" content="{esc(r['name'])} — {esc(r.get('desc'))} Physics: {esc(r.get('physics'))}. {len(ds)} documents. Room {esc(r.get('hex_address'))} of the Crimson Hexagonal Archive.">
<link rel="canonical" href="https://crimsonhexagonal.org/rooms/{slug(r['name'])}/">
<style>{CSS}</style>
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head><body><div class="w">
<p class="hex"><a href="/">Crimson Hexagonal Archive</a> &nbsp;/&nbsp; <a href="/rooms/">rooms</a></p>
<h1>{esc(r['name'])}</h1>
<p class="hex">{esc(r.get('hex_address'))} &middot; {CAT_LABEL.get(r.get('cat'), r.get('cat'))}
&middot; axial ({r.get('q')}, {r.get('r')}) &middot; {len(ds)} documents</p>

<h2>Physics</h2>
<div class="phys"><b>{esc(r.get('physics'))}</b><br>{esc(r.get('desc'))}</div>
<p>The primary question this room puts to any text entering it:<br>
<span class="q">{esc(r.get('prompt'))}</span></p>
{f"<p>Mantle: <b>{esc(r.get('mantle'))}</b>. Preferred rendering mode: {esc(r.get('preferred_mode'))}.</p>" if r.get('mantle') and r.get('mantle') != '—' else ""}

<h2>Operators</h2><p>{ops or "&mdash;"}</p>

{f'<h2>LP program</h2><div class="lp">{lp}</div>' if lp else ""}

{f'<h2>Room-defining document</h2>{"".join(doc_html(d, 0) for d in defining)}' if defining else ""}
{f'<h2>Core documents</h2>{"".join(doc_html(d, 1) for d in core)}' if core else ""}
{f'<h2>Also in this room ({len(assoc)})</h2>{"".join(doc_html(d, 2) for d in assoc)}' if assoc else ""}

{f'<h2>Adjacent rooms</h2>{adj_html}' if adj_html else ""}

<div class="prov">
NAVIGATION PROVENANCE<br>
Registry anchors &middot; <a href="/navigation/registry/">registry</a><br>
Central Map routes &middot; <a href="/navigation/central-map/">central map</a><br>
Fractal Map resolves traversal &middot; <a href="/navigation/fractal-map/">fractal map</a><br>
Runtime and governance &middot; <a href="/navigation/space-ark/">space ark</a><br>
Machine representation of this room &middot; <a href="/rooms/{slug(r['name'])}/index.json">index.json</a><br>
Canonical record bodies &middot; <a href="https://www.alexanarch.org/">alexanarch</a><br>
Generated {TODAY} from hexagon_canonical.json &middot; &#8750; = 1
</div>
</div></body></html>"""


def main():
    out = ROOT
    made = []
    for r in ROOMS:
        s = slug(r["name"])
        d = out / "rooms" / s
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(room_page(r))
        ds = docs_for(r["id"])
        (d / "index.json").write_text(json.dumps({
            "hex_address": r.get("hex_address"), "id": r["id"], "name": r["name"],
            "category": r.get("cat"), "axial": [r.get("q"), r.get("r")],
            "physics": r.get("physics"), "description": r.get("desc"),
            "prompt": r.get("prompt"), "mantle": r.get("mantle"),
            "preferred_mode": r.get("preferred_mode"),
            "operators": r.get("ops"), "lp_program": r.get("lp_program"),
            "documents": [{"title": x.get("title"), "doi": x.get("doi"),
                           "creators": x.get("creators"),
                           "excerpt": (x.get("excerpt") or "")[:400]} for x in ds],
            "adjacent": [{"id": a, "name": BY_ID[a]["name"],
                          "url": f"https://crimsonhexagonal.org/rooms/{slug(BY_ID[a]['name'])}/",
                          "relation": edge_sentence(r, BY_ID[a])}
                         for a in (r.get("adjacent") or []) if a in BY_ID],
            "canonical": f"https://crimsonhexagonal.org/rooms/{slug(r['name'])}/",
            "generated": TODAY, "source": "hexagon_canonical.json",
        }, ensure_ascii=False, indent=1))
        made.append((s, r, len(ds)))

    cards = "".join(
        f'<div class="card"><a href="/rooms/{s}/">{esc(r["name"])}</a>'
        f'<p>{esc(r.get("desc"))}</p>'
        f'<p class="m" style="font:.6rem/1.6 ui-monospace,monospace;color:#8a8478">'
        f'{esc(r.get("hex_address"))} &middot; {esc(r.get("physics"))} &middot; {n} docs</p></div>'
        for s, r, n in sorted(made, key=lambda x: x[1]["id"]))
    (out / "rooms").mkdir(exist_ok=True)
    (out / "rooms" / "index.html").write_text(f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>The rooms | Crimson Hexagonal Archive</title>
<meta name="description" content="All {len(made)} navigable spaces of the Crimson Hexagonal Archive — {len([1 for _, r, _ in made if r.get('cat') == 'core'])} core rooms and the extension, special, new and field spaces. Each carries its own physics, operators and documents.">
<link rel="canonical" href="https://crimsonhexagonal.org/rooms/">
<style>{CSS}</style></head><body><div class="w">
<p class="hex"><a href="/">Crimson Hexagonal Archive</a></p>
<h1>The rooms</h1>
<p>{len(made)} navigable spaces. <b>A room is not a category.</b> It is a set of
operators and a governing physics: a text entering a room is asked that room's
question and rendered under that room's constraint. The same document read in the
Marx Room and in the Sappho Room is not the same reading.</p>
<h2>All spaces</h2>
<div class="grid">{cards}</div>
<div class="prov">Generated {TODAY} from hexagon_canonical.json &middot;
<a href="/navigation/">navigation architecture</a> &middot; &#8750; = 1</div>
</div></body></html>""")
    print(f"generated {len(made)} room pages + index")
    for s, r, n in sorted(made, key=lambda x: -x[2])[:6]:
        print(f"  /rooms/{s:<26}{r.get('hex_address'):<22}{n} docs")
    return made


if __name__ == "__main__":
    main()
