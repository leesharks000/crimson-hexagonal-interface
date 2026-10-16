#!/usr/bin/env python3
"""build_work_specs.py — specs for build_work_page.py, for works already seated in rooms that have no /works page.

WHY (2026-10-16, Lee Sharks: "the standalone pages @ crimsonhexagonal greatly outperform the rest, for indexing … a
targeted expansion — not overwhelming, maybe ~100 highest leverage standalone that fit into the architecture").
Search Console's export of 2026-10-16 shows 350 of the 370 /works pages indexed, against room pages that list their
documents only as titles linking off-site. 266 documents are seated in rooms (hexagon_canonical.json) with no page.

SELECTION. Seated in a room; ACTIVE in the alexanarch registry; full body (body_status class full) of at least 3,000
characters; ranked by the number of distinct ACTIVE records that cite it (data/citation-graph.json in alexanarch),
then concepts defined, then length. The cut is every work cited by at least MIN_CITED active records.

EACH SPEC is data, not prose written for the page: the registry's own title, creator, date and description (the
gloss); the room seats from hexagon_canonical.json (room assignment as recorded there: heuristic / reviewed /
declared); relations typed seated_in, cites, cited_by, linking only to pages that exist on this site.

    python3 scripts/build_work_specs.py --alexanarch ../alexanarch > scripts/pages/seated-works-2026-10-16.json
    python3 scripts/build_work_page.py scripts/pages/seated-works-2026-10-16.json --alexanarch ../alexanarch
"""
import json, os, re, sys, pathlib, html
ROOT = pathlib.Path(__file__).resolve().parent.parent
MIN_CITED = 5


def main():
    alex = pathlib.Path(sys.argv[sys.argv.index('--alexanarch') + 1])
    reg = json.load(open(alex / 'data/registry.json')); D = {d['deposit_number']: d for d in reg['deposits']}
    H = {d['hex']: d for d in reg['deposits']}
    g = json.load(open(alex / 'data/citation-graph.json'))
    cited_by = {int(k): set(v) for k, v in g['cited_by'].items()}
    cites = {}
    for e in g['edges']:
        cites.setdefault(e['source_deposit'], set()).add(e['target_deposit'])
    canon = json.load(open(ROOT / 'hexagon_canonical.json'))
    rooms = {}
    for r in canon['rooms']:
        slug = (r.get('page_url') or '').rstrip('/').split('/')[-1]
        p = ROOT / 'public/rooms' / slug / 'index.html'
        if not slug or not p.exists():
            continue
        s = p.read_text(encoding='utf-8')
        name = html.unescape(re.sub(r'<[^>]+>', '', re.search(r'<h1>(.*?)</h1>', s, re.S).group(1))).strip()
        m = re.search(r'Address: ([A-Z]:[a-z]+\.[0-9A-Za-z.-]+)', s)
        rooms[r['id']] = [slug, name, m.group(1) if m else r.get('hex_address', r['id'])]
    works = {x.upper() for x in os.listdir(ROOT / 'public/works')}
    act = lambda ns, me: [n for n in ns if n != me and D.get(n, {}).get('status') == 'ACTIVE']
    cand = []; seen = {}
    for x in canon['documents']:                              # one page per record: versions mapped to one AXN merge
        a = x.get('axn') or ''
        if a.startswith('AXN:'):
            m = seen.setdefault(a[4:8], dict(x, rooms=[]))
            m['rooms'] += [r for r in (x.get('rooms') or []) if r not in m['rooms']]
    for x in seen.values():
        a = x.get('axn') or ''
        if not a.startswith('AXN:'):
            continue
        hx = a[4:8]; d = H.get(hx)
        if hx in works or not d or d.get('status') != 'ACTIVE':
            continue
        bs = d.get('body_status') if isinstance(d.get('body_status'), dict) else {}
        if bs.get('class') not in ('full', None):
            continue
        tp = alex / d['full_text_path'].lstrip('/')
        if not tp.exists() or len(tp.read_text(encoding='utf-8')) < 3000:
            continue
        seats = [rooms[r] for r in (x.get('rooms') or []) if r in rooms]
        if not seats:
            continue
        n = d['deposit_number']
        cand.append((len(act(cited_by.get(n, ()), n)), len(d.get('defines_concepts') or []), tp.stat().st_size, d, x, seats))
    cand.sort(key=lambda c: (-c[0], -c[1], -c[2]))
    chosen = [c for c in cand if c[0] >= MIN_CITED]
    paged = works | {c[3]['hex'] for c in chosen}
    link = lambda n: (f"/works/{D[n]['hex'].lower()}", f"{D[n]['title'][:70]} · #{n}") if D.get(n) and D[n]['hex'] in paged else None
    specs = []
    for k, (nc, nd, _, d, x, seats) in enumerate(chosen, 1):
        n = d['deposit_number']
        desc = re.sub(r'\s+', ' ', (d.get('description') or '').strip())
        gloss = re.split(r'(?<=[.!?])\s', desc)[0] if desc else d['title']
        if len(gloss) > 240:                                     # cut at a word, and say so
            gloss = gloss[:240].rsplit(' ', 1)[0].rstrip(',;:—-') + '…'
        rels = [['seated_in', f'/rooms/{s[0]}', f'{s[2]} {s[1]}'] for s in seats]
        out = [link(m) for m in sorted(act(cites.get(n, ()), n))]
        inn = [link(m) for m in sorted(act(cited_by.get(n, ()), n))]
        rels += [['cites', *l] for l in out if l][:6] + [['cited_by', *l] for l in inn if l][:6]
        others = ', '.join(f'<a href="/rooms/{s[0]}">{s[2]} {html.escape(s[1])}</a>' for s in seats[1:])
        sym = (f'<p>It <b>is seated in</b> <a href="/rooms/{seats[0][0]}">{seats[0][2]} {html.escape(seats[0][1])}</a>'
               + (f', and also in {others}' if others else '') + f'. {nc} records of the archive cite it.</p>')
        specs.append({
            'hex': d['hex'], 'deposit': n, 'axn': d['axn'], 'title': d['title'], 'date': d['date'],
            'voice': d.get('creator') or 'Lee Sharks', 'author': d.get('creator') or 'Lee Sharks',
            'room': seats[0], 'role': re.sub(r'[^A-Z0-9]+', '-', (d.get('content_type') or 'work').upper()).strip('-')[:40],
            'multiplicity': 'SINGLETON', 'gloss': gloss,
            'description': gloss if gloss.startswith(d['title'][:40]) else f"{d['title']} — {gloss}",
            'symbolon': sym, 'relations': rels,
            '_selection': {'rank': k, 'cited_by_active': nc, 'defines': nd, 'assignment': x.get('assignment')}})
    json.dump(specs, sys.stdout, ensure_ascii=False, indent=1)
    print(f'{len(specs)} specs (cited by >= {MIN_CITED} active records; {len(cand)} eligible)', file=sys.stderr)


if __name__ == '__main__':
    main()
