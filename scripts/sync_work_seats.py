#!/usr/bin/env python3
"""sync_work_seats.py — a work page's seat is written from the seat map, never left as the August formula (2026-10-17).

WHY. Twenty-two /works pages written in the August passes said "It is held in the archive without a locus seat — it
belongs to the corpus, not to a room. The Hexagon is its address of record." and, in their meta description, "Held in the
Crimson Hexagonal Archive without a locus seat." The room reading of 2026-10-16 (alexanarch data/hexagon-seats.json)
seats every one of them: KADEEZY on the Porch (#1520) constitutes R:r.09, The Secret Book of Walt (#683) is at R:r.09.
The stale line was read back by the composition layer the next morning: an AI Overview gave KADEEZY on the Porch as
"officially cataloged as being 'Held… without a locus seat'" and "tied conceptually to 09.ROOM.WHITMAN", and another
held The Secret Book of Walt "without a locus seat" to keep it "un-indexable by corporate platform scrapers" (Capture
Registry v12.225, v12.222). Lee Sharks, 2026-10-17: "sure, lets repair that."

What this writes, on a work page that carries the formula, from the seat map's seats[<deposit>]:
  the symbolon line   "It is seated in <primary>, and also in <rest>." — the form the other work pages use; the primary
                      seat is the reading's primary flag, else the first assigned; proposed seats are not seats
  meta description    "Seated in the Crimson Hexagonal Archive at <primary name> (<locus>)." in place of the formula; the
                      title in the description is the page's own <h1> where the description had cut it (the cut is how
                      "For KADEEZY MUSIC, Detroit." became the "dedication" "For KADEEZY MU — Lee Sharks")
A page whose deposit has no seat in the map keeps its formula and is listed: the formula is then true.

USAGE  python3 scripts/sync_work_seats.py --seats <alexanarch>/data/hexagon-seats.json [--check]
"""
import json, re, sys, glob, html, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = 'https://www.crimsonhexagonal.org'
FORMULA_P = re.compile(r'<p>It is held in the archive without a locus seat &mdash; it belongs to the corpus, not to a room\. '
                       r'The <a href="/">Hexagon</a> is its address of record\.')
FORMULA_META = 'Held in the Crimson Hexagonal Archive without a locus seat.'


def seats():
    a = sys.argv
    return json.load(open(a[a.index('--seats') + 1]))


def ordered(v):
    rooms = list(v.get('rooms') or [])
    read = v.get('read') or {}
    prim = [r for r in rooms if (read.get(r) or {}).get('primary')]
    return prim[:1] + [r for r in rooms if r not in prim[:1]]


def anchor(R, rid):
    r = R.get(rid) or {}
    label = f"{r.get('locus') or rid} {r.get('name') or ''}".strip()
    url = r.get('url') or ''
    path = url[len(SITE):] if url.startswith(SITE) else ''
    if path and (ROOT / 'public' / path.strip('/') / 'index.html').exists():
        return f'<a href="{path}">{html.escape(label)}</a>'
    return html.escape(label)


def main():
    check = '--check' in sys.argv
    hs = seats(); S, R = hs['seats'], hs.get('rooms') or {}
    changed, unseated = [], []
    for f in sorted(glob.glob(str(ROOT / 'public/works/*/index.html'))):
        p = pathlib.Path(f); s0 = s = p.read_text(encoding='utf-8')
        if 'without a locus seat' not in s:
            continue
        m = re.search(r'alexanarch #(\d+)\.</p>', s)
        v = S.get(m.group(1)) if m else None
        rooms = ordered(v) if v else []
        if not rooms:
            unseated.append(p.parent.name); continue
        first, rest = rooms[0], rooms[1:]
        line = f'<p>It <b>is seated in</b> {anchor(R, first)}'
        if rest:
            line += ', and also in ' + ', '.join(anchor(R, r) for r in rest)
        line += '.'
        s = FORMULA_P.sub(line, s)
        r0 = R.get(first) or {}
        meta = f"Seated in the Crimson Hexagonal Archive at {r0.get('name') or first} ({r0.get('locus') or first})."
        md = re.search(r'(<meta name="description" content=")([^"]*)(")', s)
        h1 = re.search(r'<h1>(.*?)</h1>', s, re.S)
        if md and FORMULA_META in md.group(2):
            before, _, after = md.group(2).partition(FORMULA_META)
            # the description is "<title> — <voice>. "; where the title was cut short, it is the page's own h1
            head, sep, voice = before.rpartition(' — ')
            full = html.unescape(re.sub(r'<[^>]+>', '', h1.group(1))).strip() if h1 else ''
            if sep and full and html.unescape(head) != full and full.startswith(html.unescape(head).rstrip('.… ')):
                head = html.escape(full, quote=True)
            desc = (head + sep + voice if sep else before) + html.escape(meta, quote=True) + after
            s = s[:md.start(2)] + desc + s[md.end(2):]
        if s != s0:
            changed.append(p.parent.name)
            if not check:
                p.write_text(s, encoding='utf-8')
    print(('sync_work_seats --check: ' + ('DRIFT ' + ' '.join(changed) if changed else 'ok')) if check else
          f'sync_work_seats: {len(changed)} page(s) written: {" ".join(changed)}')
    if unseated:
        print('  no seat in the map (formula kept): ' + ' '.join(unseated))
    return 1 if (check and changed) else 0


if __name__ == '__main__':
    sys.exit(main())
