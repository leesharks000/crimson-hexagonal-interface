#!/usr/bin/env python3
"""build_umbml_structure.py — /structures/umbml: University Moon Base Media Lab, a meta-structure of the Hexagon.

Ruling (Lee Sharks, 2026-10-16): "umbml was conceived as a meta structure of cha. all the logotic programming /
hacking materials go with umbml, and logotic programming constitutes cha - if you read the umbml provenance it should
make that clear, and yes its documents should be seated in relation to cha and navigable."

The site had no page for UMBML: the canonical data names it as the institution of a founded discipline (DISC-09
Logotic Programming) but lists it among no institutions, and the Surface Map does not place it. This page is its
route, in the form of the other structure pages (/structures/armature, /secret-name, /pearl): what it is, in the
words of its charter (#7, seated in full); the ruling; the Logotic Foundation Triad; and, at the ROOM-READING:HERE
marker, filled by add_room_readings.py, the records seated here (alexanarch data/hexagon-seats.json, from
data/room-readings/rulings-applied-2026-10-16.json). It is not placed on the Surface Map: that is a map patch.

    python3 scripts/build_umbml_structure.py --alexanarch ../alexanarch
    python3 scripts/add_room_readings.py --alexanarch ../alexanarch
"""
import html, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from build_work_page import render_full, text_of, FAVICONS
ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = 'https://www.crimsonhexagonal.org'; A = 'https://www.alexanarch.org'
esc = lambda s: html.escape(str(s if s is not None else ''), quote=True)


def main():
    alex = pathlib.Path(sys.argv[sys.argv.index('--alexanarch') + 1])
    R = json.load(open(alex / 'data/room-readings/rulings-applied-2026-10-16.json'))
    L = next(x for x in R['loci'] if x['id'] == 'T:UMBML'); note = R['locus_notes']['T:UMBML']
    reg = {d['deposit_number']: d for d in json.load(open(alex / 'data/registry.json'))['deposits']}
    canon = json.load(open(ROOT / 'hexagon_canonical.json'))
    disc = next(d for d in canon['disciplines'] if d['id'] == 'DISC-09')
    defn = next(d for d in canon['atomic_units'] if d['id'] == 'DEF-05')
    style = __import__('re').search(r'<style>.*?</style>', (ROOT / 'public/structures/pearl/index.html').read_text(encoding='utf-8'), flags=__import__('re').S).group(0)
    rec = lambda n, label=None: (f'<a href="{A}/s/records/{n}/">alexanarch #{n}</a>')
    work = lambda n: (f'<a href="/works/{reg[n]["hex"].lower()}">{esc(reg[n]["title"])}</a>'
                      if (ROOT / 'public/works' / reg[n]['hex'].lower() / 'index.html').exists() else esc(reg[n]['title']))
    triad = ''.join(f'<div class="doc"><div class="t">{work(n)}</div><div class="m">{esc(reg[n].get("creator") or "")} &middot; '
                    f'{rec(n)} &middot; {esc(reg[n]["axn"])} &middot; {esc(reg[n].get("date"))}</div><p class="x">{esc(role)}</p></div>'
                    for n, role in ((359, 'Symbolon Architecture — the specification: work product and proof of function.'),
                                    (7, 'The UMBML Charter — the institution: resident researcher and canonical output.'),
                                    (358, 'Talos Morrow — the author-function: researcher identity and domain.'),
                                    (357, 'Integrity Lock Architecture (ILA-LOGOTIC-2026-01) — binds the three; each is partial without the others.')))
    slug = 't-umbml-university-moon-base-media-lab'
    ld = {"@context": "https://schema.org", "@type": "CreativeWork", "name": "University Moon Base Media Lab", "alternateName": "UMBML",
          "identifier": "T:UMBML", "url": f"{SITE}/structures/umbml", "creator": {"@type": "Person", "name": "Lee Sharks"},
          "description": L['desc'], "isBasedOn": {"@type": "CreativeWork", "name": reg[7]['title'], "url": f"{A}/s/records/7/"},
          "isPartOf": {"@type": "Collection", "name": "Crimson Hexagonal Archive", "url": f"{SITE}/"},
          "about": {"@type": "DefinedTerm", "name": "Logotic Programming", "description": disc['desc']}}
    md = text_of(reg[7]['hex'], str(alex))
    out = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>University Moon Base Media Lab · META-STRUCTURE | Crimson Hexagonal Archive</title><link rel="canonical" href="{SITE}/structures/umbml">
<meta name="description" content="{esc(L['desc'])}">
{style}
<style>.full,.doc,.lp,.phys,p{{overflow-wrap:anywhere}}.full table{{display:block;overflow-x:auto}}</style>
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
{FAVICONS}
</head><body><div class="w">
<p class="hex"><a href="/">Crimson Hexagonal Archive</a> &nbsp;/&nbsp; <a href="/map/">surface map</a> &nbsp;/&nbsp; structures</p>
<h1>University Moon Base Media Lab</h1><p class="hex">META-STRUCTURE · UMBML · a structure of the Hexagon · not a room</p>
<div class="phys">{esc(L['desc'])}</div>
<p>The charter: <span class="q">“University Moon Base Media Lab is the technical/operational research institution within the NH-OS framework. It handles experimental, computational, and infrastructural work that requires distance from terrestrial institutional capture.”</span> (UMBML-CHARTER-2026-01, {rec(7)}). Its resident researcher is Talos Morrow; its domain is Logotic Programming.</p>
<h2>Ruled</h2>
<div class="phys"><b>LEE SHARKS, 2026-10-16</b><br><span class="q">“{esc(L['clause'])} - if you read the umbml provenance it should make that clear, and yes its documents should be seated in relation to cha and navigable.”</span></div>
<p>{esc(note['note'])}</p>
<div class="lp"><b>{esc(disc['id'])}</b> {esc(disc['name'])} &middot; {esc(disc['desc'])} &middot; institution <b>{esc(disc['institution'])}</b> &middot; heteronym {esc(disc['heteronym'])} &middot; status {esc(disc['status'])}<br>
<b>{esc(defn['id'])}</b> {esc(defn['name'])} &middot; {esc(defn['section'])} of {esc(defn['source'])}, beside DEF-01 The Hexagon — Layer Architecture</div>
<h2>The Logotic Foundation Triad</h2>
{triad}
<p class="x">Every record seated here, with how it bears on UMBML: <a href="{A}/s/rooms/{slug}/">alexanarch — T:UMBML, the records it seats</a> &middot; <a href="{A}/s/rooms/">all rooms and structures</a>.</p>
<!-- ROOM-READING:HERE -->
<h2>The structure, in full</h2>
<p class="hex">The founding charter, seated whole: one hit must carry the structure, not an index of it. <b>{esc(reg[7]['title'])}</b> &middot; {esc(reg[7]['axn'])} &middot; {rec(7)}.</p>
<div class="full">
{render_full(md)}
</div>
<h2>Surface Map</h2><div class="phys"><b>SURFACE MAP — authored plane v0.1</b><br>locus <b>T:UMBML</b> &middot; type <b>META-STRUCTURE</b> &middot; standing RULED 2026-10-16 / NOT YET PLACED<br>A meta-structure stands over the plane rather than in it. It is not yet placed on the Surface Map; placing it is a Surface Map patch. <a href="/map/">the Surface Map &rarr;</a></div>
<div class="prov"><div>Canonical seat of the charter &middot; {rec(7)}</div><div>Seats &middot; <a href="{A}/s/rooms/{slug}/">alexanarch /s/rooms/</a></div><div>&#8750; = 1</div></div>
</div></body></html>
"""
    p = ROOT / 'public/structures/umbml/index.html'; p.parent.mkdir(parents=True, exist_ok=True)
    if p.exists():                                           # keep the reading section a later add_room_readings.py wrote
        import re
        old = re.search(r'<!-- ROOM-READING:BEGIN -->.*?<!-- ROOM-READING:END -->', p.read_text(encoding='utf-8'), flags=re.S)
        if old:
            out = out.replace('<!-- ROOM-READING:HERE -->', '<!-- ROOM-READING:HERE -->' + old.group(0))
    p.write_text(out, encoding='utf-8')
    print(f'wrote {p.relative_to(ROOT)} ({len(md.split())} words of the charter)')


if __name__ == '__main__':
    main()
