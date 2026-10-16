#!/usr/bin/env python3
"""add_room_readings.py — on each room page, the records the room reading of 2026-10-16 seated there.

Lee Sharks, 2026-10-16: "the deposits need to be all related to the respective rooms they develop in crimson hexagon
… much of this requires creating new edges. this is an interpretive read". Every ACTIVE alexanarch record was read
(16 readers with provenance; alexanarch data/room-readings/) and seated in the loci it develops, each seat with its
relation (constitutes / develops / applies / documents / belongs), a confidence, and a sentence of the record's own
text as the ground. High and medium seats are shown; low (family resemblance only) are held as proposals.

The section lists the records seated by the reading that the page does not already carry, between markers
(<!-- ROOM-READING:BEGIN --> … END), so a rerun replaces it. A targeted edit: build_rooms.py is stale and is not
rerun (NOTES-ROUTING.md).

    python3 scripts/add_room_readings.py --alexanarch ../alexanarch [--check]
"""
import html, json, pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
A = 'https://www.alexanarch.org'
B, E = '<!-- ROOM-READING:BEGIN -->', '<!-- ROOM-READING:END -->'
esc = lambda s: html.escape(str(s if s is not None else ''), quote=True)


def main():
    alex = pathlib.Path(sys.argv[sys.argv.index('--alexanarch') + 1]); check = '--check' in sys.argv
    S = json.load(open(alex / 'data/hexagon-seats.json')); reg = json.load(open(alex / 'data/registry.json'))
    D = {str(d['deposit_number']): d for d in reg['deposits']}
    canon = json.load(open(ROOT / 'hexagon_canonical.json'))
    slug_of = {r['id']: (r.get('page_url') or '').rstrip('/').split('/')[-1] for r in canon['rooms']}
    paths = {rid: ROOT / 'public/rooms' / slug / 'index.html' for rid, slug in slug_of.items() if slug}
    for rid, r in S['rooms'].items():                       # 2026-10-16 rulings: the structure loci (Armature, Secret Name, Pearl, UMBML)
        if rid.startswith('T:') and r.get('url'):
            paths[rid] = ROOT / 'public' / r['url'].split('crimsonhexagonal.org/')[1] / 'index.html'
    order = {'constitutes': 0, 'develops': 1, 'applies': 2, 'belongs': 3, 'documents': 4}
    total = 0; pages = 0
    for rid, p in paths.items():
        if not p.exists():
            continue
        s = p.read_text(encoding='utf-8')
        HERE = '<!-- ROOM-READING:HERE -->'                  # a page that names its own place for the section (/structures/umbml)
        inplace = HERE in s
        base = re.sub(re.escape(B) + '.*?' + re.escape(E), '', s, flags=re.S)
        have = set(re.findall(r'alexanarch\.org/s/records/(\d+)/', base))
        rows = []
        for n, e in S['seats'].items():
            rd = (e.get('read') or {}).get(rid)
            if not rd or n in have or n not in D:
                continue
            rows.append((order.get(rd['relation'], 9), not rd.get('primary'), D[n].get('date') or '', n, e, rd))
        rows.sort(key=lambda t: (t[0], t[1], t[2]))
        if not rows:
            new = base
        else:
            items = []
            for _, _, _, n, e, rd in rows:
                d = D[n]; q = (rd.get('basis') or {}).get('quote') or ''
                t = f'<a href="/works/{esc(e["hex"].lower())}">{esc(d["title"])}</a>' if e.get('works_url') else esc(d['title'])
                items.append(f'<div class="doc"><div class="t">{t}</div><div class="m">{esc(d.get("creator") or "")} &middot; '
                             f'<a href="{A}/s/records/{n}/">alexanarch #{n} · {esc(d["axn"])}</a> &middot; {esc(d.get("date"))}</div>'
                             f'<p class="x" style="font-size:.9rem;color:#b8b3a8;margin:.4rem 0 0;font-family:Georgia,serif;line-height:1.55"><b>{esc(rd["relation"])}</b>' + (' (primary)' if rd.get('primary') else '')
                             + (f' — “{esc(q)}”' if q else '')
                             + (f' — ruled 2026-10-16: {esc(rd["basis"]["group"])}' if (rd.get('basis') or {}).get('ruling') else '') + '</p></div>')
            nt = (S['rooms'].get(rid) or {}).get('note')
            ruled = (f'<p class="x" style="font-size:.9rem;color:#b8b3a8;margin:.4rem 0 .8rem;font-family:Georgia,serif;line-height:1.55"><b>Ruled 2026-10-16.</b> {esc(nt["note"])}'
                     + (f' <a href="{esc(nt["link"][1])}">{esc(nt["link"][0])}</a>.' if nt.get('link') else '') + (f' {esc(nt["later"])}' if nt.get('later') else '')
                     + f' <span style="font-style:italic">Lee Sharks: “{esc(nt["clause"])}”</span></p>') if nt else ''
            kind = 'structure' if rid.startswith('T:') else 'room'
            sec = (f'{B}<h2>Read into this {kind} ({len(rows)})</h2><p class="x" style="font-size:.9rem;color:#b8b3a8;margin:.4rem 0 .8rem;font-family:Georgia,serif;line-height:1.55">Records of the archive seated here by the room reading of '
                   f'2026-10-16 and Lee Sharks\'s rulings on it: each with the relation it bears to the {kind} and, from the reading, a sentence of its own text as the ground. The full index of '
                   f'the {kind}\'s records is at <a href="{A}/s/rooms/">alexanarch — Rooms of the Crimson Hexagon</a>.</p>' + ruled + ''.join(items) + E)
            m = re.search(r'<h2>(Adjacent rooms|Surface Map)', base)
            if inplace:
                new = base.replace(HERE, HERE + sec)
            elif m and not rid.startswith('T:'):              # structure pages put the Surface Map first: the section goes last there
                new = base[:m.start()] + sec + base[m.start():]
            else:                                            # pages whose wrapper closes on its own line: inside the last </div>
                k = base.rfind('</body>'); j = base.rfind('</div>', 0, k)
                new = base[:j] + sec + base[j:]
            total += len(rows); pages += 1
        if new != s and not check:
            p.write_text(new, encoding='utf-8')
    print(f'{total} records read into {pages} room pages' + (' (check only)' if check else ''))


if __name__ == '__main__':
    main()
