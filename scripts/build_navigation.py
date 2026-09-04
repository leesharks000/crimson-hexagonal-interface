#!/usr/bin/env python3
"""build_navigation.py — seat the four navigation nodes, in two temporal strata.

THE ARCHITECTURE THIS IMPLEMENTS. Four navigation objects were deliberately
NON-COLLAPSIBLE:

    Registry            anchors
    Central Map         routes
    Fractal Map         resolves traversal — depth, operator, scent, next path
    Space Ark           executes and governs runtime

Each depends on the others and none replaces another. The Hexagon Interface
Constitution is explicit that the visual surface is a RENDERER over H_core, that
topology organises but does not replace the texts, and that no map or mode becomes
the whole Archive.

THE PROBLEM. All four principal navigation documents describe an EARLIER state.
The DOI Registry v7.0 is a 16 March 2026 snapshot of 387 DOI-anchored records and
2,851 edges. The archive now holds 1,488.

THE MISTAKE TO AVOID: rewriting those documents to contain the current state. They
are historical canonical artifacts and their March states are evidence. What has
to be built is a CURRENT PROJECTION of their functions, seated beside them and
clearly marked as derived.

So every navigation page carries two strata:

    CURRENT PROJECTION      generated, dated, sourced, disposable
    HISTORICAL SPECIFICATION the ratified document, untouched

Nothing here is a v8.0. Calling a build product a new version would destroy the
distinction the whole architecture rests on.
"""
import json
import pathlib
import datetime
import html
import re

REPO = pathlib.Path(__file__).resolve().parents[1]
# vite copies ONLY public/ into dist/. Pages generated at repo root never ship —
# they were pushed, committed, and 404ed on every request.
ROOT = REPO / "public"
ROOT.mkdir(exist_ok=True)
CANON = json.loads((REPO / "hexagon_canonical.json").read_text())
TODAY = datetime.date.today().isoformat()
CSS = (REPO / "scripts" / "build_rooms.py").read_text().split('CSS = """')[1].split('"""')[0]


def esc(s):
    return html.escape(str(s or ""))


def slug(name):
    s = re.sub(r"^(the|r\.\d+|f\.\d+)\s+", "", str(name).strip(), flags=re.I)
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def page(title, desc, path, body):
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)} | Crimson Hexagonal Archive</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="https://www.crimsonhexagonal.org{path}">
<style>{CSS}
.strata{{border:1px solid rgba(200,168,104,.2);border-radius:3px;padding:1rem 1.2rem;margin:1rem 0}}
.strata.hist{{border-style:dashed;opacity:.9}}
.strata h3{{font:500 .6rem/1 ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase;
color:#c8a868;margin:0 0 .7rem}}
.strata.hist h3{{color:#8a8478}}
.kv{{font:.68rem/1.9 ui-monospace,monospace;color:#b8b3a8}}
.kv b{{color:#d8d4cc}}</style>
</head><body><div class="w">
<p class="hex"><a href="/">Crimson Hexagonal Archive</a> &nbsp;/&nbsp; <a href="/navigation/">navigation</a></p>
{body}
<div class="prov">Generated {TODAY} from hexagon_canonical.json &middot;
<a href="/rooms/">rooms</a> &middot; <a href="https://www.alexanarch.org/">alexanarch</a> &middot; &#8750; = 1</div>
</div></body></html>"""


ROOMS = CANON["rooms"]
DOCS = CANON["documents"]
RELS = CANON["relations"]
RT = CANON["relation_types"]
CORE = [r for r in ROOMS if r.get("cat") == "core"]


def main():
    nav = ROOT / "navigation"
    nav.mkdir(exist_ok=True)

    # ─── /navigation/ ───────────────────────────────────────────────
    (nav / "index.html").write_text(page(
        "The navigation architecture",
        "Four non-collapsible navigation layers: the Registry anchors, the Central Map routes, "
        "the Fractal Map resolves traversal, the Space Ark governs runtime. This interface renders them.",
        "/navigation/", f"""
<h1>The navigation architecture</h1>
<p>The Crimson Hexagonal Archive uses <b>four non-collapsible navigation layers</b>.
The <a href="/navigation/registry/">Registry</a> anchors records and provenance.
The <a href="/navigation/central-map/">Central Navigation Map</a> routes relations among them.
The <a href="/navigation/fractal-map/">Fractal Navigation Map</a> resolves depth, operator, scent,
companion object and next path. The <a href="/navigation/space-ark/">Space Ark</a> governs runtime
traversal. This site renders those layers as a public operating surface &mdash; <b>it is where the
navigation architecture becomes traversable, and it is not itself the navigation authority</b>.</p>

<h2>The order of operations</h2>
<div class="lp">
<div><b>REGISTRY</b> &nbsp;stores. Does not route.</div>
<div><b>CENTRAL MAP</b> &nbsp;routes. Does not execute.</div>
<div><b>FRACTAL MAP</b> &nbsp;resolves entry depth and next traversal. Does not govern.</div>
<div><b>SPACE ARK</b> &nbsp;executes and governs. Does not anchor.</div>
</div>
<p>Each depends on the others and <b>none replaces another</b>. The Hexagon Interface Constitution
holds that this surface is a renderer and operator over H_core, that topology organises but does not
replace the texts, and that no map, dashboard or mode becomes the whole Archive.</p>

<h2>Two temporal strata</h2>
<p>Every node below is shown twice. <b>The current projection is generated, dated and disposable.
The historical specification is a ratified document and is not edited.</b></p>
<p>The four principal navigation documents describe the state of 16 March 2026 &mdash; 387
DOI-anchored records, 2,851 typed edges. The archive now holds 1,488 deposits. <b>Those documents
are not stale; they are evidence.</b> Rewriting them to contain the present would destroy the record
of what the architecture was when it was ratified, and would make the DOI-era loss undocumentable.
So their functions are re-executed here instead, and nothing generated is called a new version.</p>
"""))

    # ─── /navigation/registry/ ─────────────────────────────────────
    (nav / "registry").mkdir(exist_ok=True)
    (nav / "registry" / "index.html").write_text(page(
        "The Registry",
        "Anchors records and provenance. Current projection over the Alexanarch registry, "
        "seated beside the DOI Registry v7.0 of March 2026.",
        "/navigation/registry/", f"""
<h1>The Registry</h1>
<p class="hex">function &middot; anchors. does not route.</p>
<p>The Registry is the canonical address and provenance inventory. It <b>stores</b>; it does not
traverse. The v7.0 document says exactly that of itself.</p>

<div class="strata"><h3>Current projection</h3>
<div class="kv">
source &middot; <b>alexanarch registry</b><br>
addressing &middot; <b>AXN</b>, content-derived<br>
deposits &middot; <b>1,488</b><br>
built &middot; <b>{TODAY}</b>
</div>
<p style="margin-top:.8rem"><b>The name no longer fits the object.</b> After the infrastructure
transition the live registry is not a DOI registry &mdash; it is AXN-addressed, and the DOIs it once
anchored are tombstoned. The DOI Registry is now the <i>historical substrate</i> of the Alexanarch
Registry Projection, and that succession is itself part of what the archive documents.</p>
<p><a href="https://www.alexanarch.org/">Open the live registry &rarr;</a></p></div>

<div class="strata hist"><h3>Historical specification</h3>
<div class="kv">
DOI Registry v7.0<br>
snapshot &middot; <b>2026-03-16</b><br>
DOI-anchored documents &middot; <b>387</b><br>
relation edges &middot; <b>2,851</b>
</div>
<p style="margin-top:.8rem">Not edited. Its March state is evidence, and 862 of the deposits it
anchored were deleted on 2026-06-19 with 1,817 DOIs tombstoned. <b>A registry that had been quietly
rewritten to the present could not have testified to that.</b></p></div>
"""))

    # ─── /navigation/central-map/ ──────────────────────────────────
    rows = "".join(
        f'<div class="adj"><a href="/rooms/{slug(r["name"])}/">{esc(r["name"])}</a> '
        f'<span class="kv">&middot; {esc(r.get("hex_address"))} &middot; {esc(r.get("physics"))}</span></div>'
        for r in sorted(ROOMS, key=lambda x: x["id"]))
    types = RT.get("types") or []
    tlist = "".join(f'<div class="adj"><b>{esc(t.get("name"))}</b> '
                    f'<span class="kv">{esc(t.get("hex_address"))} &middot; {esc(t.get("domain"))}</span>'
                    f'<div style="font-size:.85rem;color:#b8b3a8">{esc(t.get("desc"))}</div></div>'
                    for t in types)
    (nav / "central-map").mkdir(exist_ok=True)
    (nav / "central-map" / "index.html").write_text(page(
        "The Central Navigation Map",
        f"Routes relations among records. {len(ROOMS)} navigable spaces, {len(types)} typed relations. "
        "Current projection seated beside the CNM v7.0 of March 2026.",
        "/navigation/central-map/", f"""
<h1>The Central Navigation Map</h1>
<p class="hex">function &middot; routes. does not execute.</p>
<p>The Central Map is the semantic routing layer through which documents resolve to one another.
Its function is now executed by this site: <b>every room below is a resolved object of the map,
at its own address</b>.</p>

<div class="strata"><h3>Current projection</h3>
<div class="kv">
navigable spaces &middot; <b>{len(ROOMS)}</b>
({len(CORE)} core, {len([r for r in ROOMS if r.get('cat') == 'ext'])} extension,
{len([r for r in ROOMS if r.get('cat') == 'special'])} special,
{len([r for r in ROOMS if r.get('cat') == 'new'])} new,
{len([r for r in ROOMS if r.get('cat') == 'field'])} field)<br>
relation types defined &middot; <b>{len(types)}</b><br>
relation rows &middot; <b>{len(RELS):,}</b><br>
documents routed &middot; <b>{len(DOCS)}</b><br>
built &middot; <b>{TODAY}</b>
</div>
<p style="margin-top:.8rem"><b>The graph is declared typed and rendered untyped.</b> Seventeen
relation types are defined; the edge layer currently instantiates one of them &mdash; adjacency.
The canonical file states it plainly: <i>2,851 typed edges from CNM 7.0 await import; current edges
are topological only</i>. That import is the single largest outstanding piece of this architecture,
and until it lands the map routes by borders rather than by meaning.</p></div>

<h2>Relation types &mdash; defined</h2>{tlist}

<h2>Room directory</h2>{rows}

<div class="strata hist"><h3>Historical specification</h3>
<div class="kv">Central Navigation Map v7.0 &middot; snapshot <b>2026-03-16</b> &middot;
387 documents &middot; 2,851 relations</div>
<p style="margin-top:.8rem">Not edited, and not superseded &mdash; nothing generated here is a
v8.0. A build product that took a version number would be claiming ratification it does not have.</p>
</div>
"""))

    # ─── /navigation/fractal-map/ ──────────────────────────────────
    (nav / "fractal-map").mkdir(exist_ok=True)
    (nav / "fractal-map" / "index.html").write_text(page(
        "The Fractal Navigation Map",
        "Resolves traversal: entry depth, operator, scent, companion object and next path. "
        "Its function appears on every room page as a continue-traversal route.",
        "/navigation/fractal-map/", f"""
<h1>The Fractal Navigation Map</h1>
<p class="hex">function &middot; resolves traversal. does not govern.</p>
<p><b>The Fractal Map is not another directory.</b> It is the decision layer: given where you are,
it resolves the appropriate operator, the scent to follow, the companion object and the next path.
Its symbolon is completed by <i>actual traversal</i> rather than by summary &mdash; which means a
page that merely describes it has not implemented it.</p>

<h2>Where it actually executes</h2>
<p>On every room page, as the adjacency section. Each border carries a sentence saying <b>what the
border means</b> rather than an identifier pair, because a composition layer told that r06 borders
r05 learns nothing, while one told that the Marx Room's material analysis extends into the Semantic
Economy Room's account of extraction can carry the relation into an answer.</p>
<div class="lp">
<div><b>FOLLOW THE OPERATOR</b> &nbsp;the room's operator stack, listed on each room page</div>
<div><b>FOLLOW THE PROBLEM</b> &nbsp;the room's governing question</div>
<div><b>FOLLOW THE HOMOLOGY</b> &nbsp;adjacency, rendered as prose</div>
<div><b>FOLLOW THE SOURCE</b> &nbsp;the document, to its canonical record at alexanarch</div>
</div>
<p><a href="/rooms/">Enter at the room index &rarr;</a></p>

<div class="strata hist"><h3>Historical specification</h3>
<div class="kv">Fractal Navigation Map v7.0 &middot; snapshot <b>2026-03-16</b></div>
<p style="margin-top:.8rem">Not edited. The document specifies the decision procedure; this
interface is one execution of it and does not exhaust it.</p></div>
"""))

    # ─── /navigation/space-ark/ ────────────────────────────────────
    (nav / "space-ark").mkdir(exist_ok=True)
    (nav / "space-ark" / "index.html").write_text(page(
        "The Space Ark",
        "Runtime and governance. EA-ARK-01 v4.2.7, a mobile ontological operating system with "
        "OPERATIVE, ANALYTIC and AUDIT modes.",
        "/navigation/space-ark/", f"""
<h1>The Space Ark</h1>
<p class="hex">function &middot; executes and governs. does not anchor.</p>
<p>The Space Ark is the runtime layer &mdash; a mobile ontological operating system with distinct
<b>OPERATIVE</b>, <b>ANALYTIC</b> and <b>AUDIT</b> modes and explicit governance boundaries. It is
not an about-page for the project and not another directory.</p>

<div class="strata"><h3>Current projection &mdash; interface modes</h3>
<div class="lp">
<div><b>MAP</b> &nbsp;architecture &middot; <a href="/rooms/">the rooms</a></div>
<div><b>READ</b> &nbsp;works &middot; documents seated in their rooms</div>
<div><b>WORK</b> &nbsp;operations &middot; operator stacks and LP programs</div>
<div><b>ORACLE</b> &nbsp;retrieval and composition</div>
<div><b>ASSEMBLY</b> &nbsp;governance and witness</div>
<div><b>TRACE</b> &nbsp;provenance &middot; every page returns to its canonical record</div>
</div>
<p style="margin-top:.8rem">These are interface-level implementations <i>downstream</i> of Ark
governance. The March Ark did not specify a later UI, and pretending otherwise would falsify the
chronology &mdash; the modes are constitutionally persistent epistemic behaviours, and the surfaces
that render them are replaceable.</p></div>

<div class="strata hist"><h3>Historical specification</h3>
<div class="kv">EA-ARK-01 v4.2.7 &middot; DOI <b>10.5281/zenodo.19013315</b></div>
<p style="margin-top:.8rem">Not edited.</p></div>
"""))
    print("navigation: /navigation/ + registry, central-map, fractal-map, space-ark")


if __name__ == "__main__":
    main()
