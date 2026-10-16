#!/usr/bin/env python3
"""sync_counts.py — the interface's stated counts are written from source, never by hand (2026-10-16).

Lee Sharks, 2026-10-16: "lets get documents numbers and various counts up to date on crimson hexagonal first, it lists
300 some in various places." The figures were typed into each page: "355 works" (the interface's seated corpus of
August), "220 typed relations" (relation_record.json carries 234), "the 38 rooms" (50 room pages are served). The
archive's counts file (alexanarch.org/api/counts.json, scripts/build_counts.py) is the fleet's one source, and since the
room reading of 2026-10-16 it derives the seats from data/hexagon-seats.json.

What this writes, and from where:
  deposits   counts.json deposits.total                          — the archive's deposits
  seated     counts.json hexagon.seated_records                  — records seated in the Hexagon's rooms
  active     counts.json hexagon.seated_records_active / active_records
  relations  public/relation_record.json _record.relations       — typed relations between loci
  pages      public/rooms/*/index.html                           — room pages served
The taxonomy ("47 loci — 40 rooms, 4 specials, 2 hosted cosmologies, 1 shadow space — with 4 fields and 3
transversals") is DECLARED in counts.json and is not touched here.

Visible figures are also wrapped in <span data-count="…"> so assets/counts.js refreshes them live; meta descriptions
and llms.txt cannot fetch, so they carry the figures of the run. Seated texts (public/works/, room-page seated text) and
labelled historical figures (the Central Navigation Map v7.0 snapshot) are never touched: a deposit's count is its own.

USAGE  python3 scripts/sync_counts.py [--counts <path or URL to counts.json>] [--check]
"""
import json, re, sys, glob, pathlib, urllib.request
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = 'https://www.alexanarch.org/api/counts.json'

def load_counts():
    a = sys.argv
    src = a[a.index('--counts') + 1] if '--counts' in a else SRC
    if src.startswith('http'):
        with urllib.request.urlopen(src, timeout=30) as r:
            return json.load(r)
    return json.load(open(src))

def figures():
    c = load_counts(); h = c.get('hexagon', {})
    rr = json.load(open(ROOT / 'public/relation_record.json'))['_record']
    return {'deposits': c['deposits']['total'], 'seated': h['seated_records'], 'seated_active': h['seated_records_active'],
            'active': h['active_records'], 'relations': rr['relations'],
            'pages': len(glob.glob(str(ROOT / 'public/rooms/*/index.html')))}

def span(key, v):
    return f'<span data-count="{key}">{v:,}</span>'

def rules(f):
    D, S, SA, A, R, P = f['deposits'], f['seated'], f['seated_active'], f['active'], f['relations'], f['pages']
    meta = f'47 loci, {R} typed relations, {S:,} records seated in its rooms.'
    vis = (f'{span("hexagon.typed_relations", R)} typed relations; {span("hexagon.seated_records", S)} records of the '
           f'archive’s {span("deposits.total", D)} seated in its rooms ({span("hexagon.seated_records_active", SA)} of '
           f'{span("hexagon.active_records", A)} active).')
    txt = f'{R} typed relations, {S:,} records seated in its rooms (of {D:,} deposits).'
    plain = (f'{R} typed relations; {S:,} records of the archive’s {D:,} seated in its rooms '
             f'({SA:,} of {A:,} active).')
    N = r'[0-9][0-9,]*'
    return [
        # meta / og descriptions (and their earlier forms)
        (re.compile(rf'47 loci, {N} typed relations, (?:{N} works|{N} records seated in its rooms)\.'), meta),
        # the visible line on the home page and the rooms index (earlier and current forms)
        (re.compile(rf'(?:<span data-count="hexagon\.typed_relations">)?{N}(?:</span>)? typed relations(?: between loci)?; '
                    rf'(?:{N} works seated\.|(?:<span[^>]*>)?{N}(?:</span>)? records of the archive’s .*? active\)\.)'), ('VIS', vis, plain)),
        # llms.txt headline
        (re.compile(rf'{N} typed relations, (?:{N} works\.|{N} records seated in its rooms \(of {N} deposits\)\.)'), txt),
        # llms.txt relation_record line
        (re.compile(rf'(/relation_record\.json\s+){N} typed relations across {N} pages'), rf'\g<1>{R} typed relations across {rr_entries()} pages'),
        # the home page's link to the rooms index
        (re.compile(rf'<a href="/rooms/">the (?:{N} rooms|{N} room pages)</a>'), f'<a href="/rooms/">the {P} room pages</a>'),
        # the map's fleet node descriptions
        (re.compile(rf'the sovereign archive — {N} deposits, AXN-addressed'), f'the sovereign archive — {D:,} deposits, AXN-addressed'),
        (re.compile(rf'the governed operating surface — {N} rooms, each a document'), f'the governed operating surface — {P} room pages, {S:,} records seated'),
        (re.compile(rf'the governed operating surface — {N} room pages, {N} records seated'), f'the governed operating surface — {P} room pages, {S:,} records seated'),
    ]

def rr_entries():
    return json.load(open(ROOT / 'public/relation_record.json'))['_record']['entries']

TARGETS = ['index.html', 'llms.txt', 'public/llms.txt', 'public/rooms/index.html', 'public/map/legacy.html',
           'public/map/topology-source.json'] + sorted(glob.glob(str(ROOT / 'public/navigation/**/index.html'), recursive=True))

def main():
    check = '--check' in sys.argv
    f = figures(); R = rules(f); changed = []
    for t in TARGETS:
        p = ROOT / t if not str(t).startswith('/') else pathlib.Path(t)
        if not p.exists(): continue
        s0 = s = p.read_text(encoding='utf-8')
        for rx, rep in R:
            if isinstance(rep, tuple):
                # Machine-readable blocks (JSON-LD) take the plain form: HTML never enters a JSON string.
                _, vis_rep, plain_rep = rep
                parts = re.split(r'(<script type="application/ld\+json">.*?</script>)', s, flags=re.S)
                s = ''.join(rx.sub(plain_rep if pt.startswith('<script type="application/ld+json">') else vis_rep, pt)
                            for pt in parts)
            else:
                s = rx.sub(rep, s)
        if s != s0:
            changed.append(str(p.relative_to(ROOT)))
            if not check: p.write_text(s, encoding='utf-8')
    print(('sync_counts --check: ' + ('DRIFT ' + ', '.join(changed) if changed else 'ok')) if check else
          f"sync_counts: {f} — {len(changed)} file(s) written: {', '.join(changed)}")
    return 1 if (check and changed) else 0

if __name__ == '__main__':
    sys.exit(main())
