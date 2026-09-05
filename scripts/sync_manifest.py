#!/usr/bin/env python3
"""sync_manifest.py — the manifest's traversal facts are derived from the deployed tree, never hand-kept (2026-09-04).

public/manifest.json told machines 29 rooms / 20 relations / 38 slugs while the interface said 40 rooms in 47 loci
and the tree served 50 room documents. The manifest's own _rooms_note records that this had happened once before
(fixed 2026-08-17) — and it drifted again with the 2026-08-26 seating, because the file was written by hand.

Rule: `_room_slugs` and `architecture.navigable_spaces` are the room documents actually under public/rooms/;
`architecture.relations` is the canonical edge count; `counts` are stamped with their source and date.
`--check` fails when the manifest disagrees with the tree. Run after build_rooms.py.
"""
import json, glob, sys, pathlib, datetime, subprocess
ROOT = pathlib.Path(__file__).resolve().parent.parent
def tree_slugs(): return sorted(p.split('/')[-2] for p in glob.glob(str(ROOT/'public/rooms/*/index.json')))
def main():
    check = '--check' in sys.argv
    m = json.load(open(ROOT/'public/manifest.json'))
    slugs = tree_slugs(); c = json.load(open(ROOT/'hexagon_canonical.json'))
    want = {'_room_slugs': slugs, 'navigable_spaces': len(slugs), 'relations': len(c.get('edges', [])), 'documents': len(c.get('documents', []))}
    have = {'_room_slugs': m.get('_room_slugs'), 'navigable_spaces': m.get('architecture', {}).get('navigable_spaces'), 'relations': m.get('architecture', {}).get('relations'), 'documents': m.get('architecture', {}).get('documents')}
    drift = {k: (have[k], want[k]) for k in want if have[k] != want[k]}
    if check:
        print('manifest --check:', 'ok' if not drift else 'DRIFT ' + json.dumps({k: (v[0] if not isinstance(v[0], list) else len(v[0] or []), v[1] if not isinstance(v[1], list) else len(v[1])) for k, v in drift.items()}))
        return 1 if drift else 0
    m['_room_slugs'] = slugs
    a = m.setdefault('architecture', {}); a['navigable_spaces'] = len(slugs); a['relations'] = len(c.get('edges', [])); a['documents'] = len(c.get('documents', []))
    a['_rooms_note'] = ("`navigable_spaces` and `_room_slugs` are DERIVED from the room documents served under /rooms/ (scripts/sync_manifest.py); "
                        "`rooms` is the constitutional CORE count. The interface's headline breakdown (rooms / specials / hosted cosmologies / shadow space / fields / transversals) is the "
                        "constitutional taxonomy; the traversable set is `_room_slugs`. This file disagreed with the tree on 2026-08-17 and again after the 2026-08-26 seating; it is now generated and gated.")
    m.setdefault('counts', {})['rooms'] = len(slugs); m['counts']['typed_relations'] = len(c.get('edges', [])); m['counts']['as_of'] = datetime.date.today().isoformat(); m['counts']['source'] = 'public/rooms/*/index.json + hexagon_canonical.json (sync_manifest.py)'
    try: sha = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    except Exception: sha = None
    m['_generated'] = {'date': datetime.date.today().isoformat(), 'source_commit': sha, 'source': 'public/rooms tree + hexagon_canonical.json', 'schema_version': 'manifest/v2', 'generator': 'scripts/sync_manifest.py'}
    json.dump(m, open(ROOT/'public/manifest.json', 'w'), indent=2, ensure_ascii=False); (ROOT/'public/manifest.json').write_text((ROOT/'public/manifest.json').read_text()+'\n')
    print(f"manifest synced: {len(slugs)} navigable spaces, {len(c.get('edges',[]))} edges, {len(c.get('documents',[]))} documents")
if __name__ == '__main__': sys.exit(main())
