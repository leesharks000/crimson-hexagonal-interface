#!/usr/bin/env python3
"""link_room_works.py — on room pages, link each listed document's title to its /works page when it has one.

WHY (2026-10-16). Room pages list their documents as a title and an off-site link to the alexanarch record. When a
document gets a /works page (scripts/build_work_specs.py → build_work_page.py), the room that seats it should link
to it on this site: the room is how a crawler and a reader reach the work. build_rooms.py is NOT the way to do this —
it is stale against the hand-repaired room pages (a rerun on 2026-10-16 would have removed 58,523 lines).

A targeted edit: in each <div class="doc"> whose record link is alexanarch #N, the unlinked title
<div class="t">TITLE</div> becomes <div class="t"><a href="/works/<hex>">TITLE</a></div>. Idempotent; --check
reports what would change.

    python3 scripts/link_room_works.py scripts/pages/seated-works-2026-10-16.json [--check]
"""
import json, re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent


def main():
    specs = json.load(open(sys.argv[1]))
    by_n = {s['deposit']: s['hex'].lower() for s in specs}
    check = '--check' in sys.argv; total = 0
    for p in sorted((ROOT / 'public/rooms').glob('*/index.html')):
        s = p.read_text(encoding='utf-8'); n_here = 0
        def sub(m):
            nonlocal n_here
            n = int(m.group(3))
            if n not in by_n:
                return m.group(0)
            n_here += 1
            return f'{m.group(1)}<a href="/works/{by_n[n]}">{m.group(2)}</a>{m.group(4)}'
        new = re.sub(r'(<div class="doc"><div class="t">)([^<]+)(?=</div><div class="m">(?:(?!<div class="doc">)[^\n])*?alexanarch\.org/s/records/(\d+)/)'
                     r'()', lambda m: sub(m), s)
        if n_here:
            total += n_here
            print(f'{p.parent.name}: {n_here}')
            if not check:
                p.write_text(new, encoding='utf-8')
    print(f'{total} titles linked' + (' (check only)' if check else ''))


if __name__ == '__main__':
    main()
