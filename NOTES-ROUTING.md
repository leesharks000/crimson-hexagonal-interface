# Routing and the room documents

`vercel.json` previously rewrote `/(.*)` to `/index.html`. That is correct for a
pure SPA and wrong here: the room and navigation documents are static files that
must serve themselves, or a crawler asking for `/rooms/marx-room/` gets the
homepage and the whole granularity repair is invisible.

The rewrite is now scoped so `/rooms/…`, `/navigation/…` and `/assets/…` fall
through to the real files and only unmatched routes reach the SPA.

**Do not add explanatory keys to `vercel.json`.** Vercel validates the config
against a strict schema and rejects unknown top-level properties — a `_note` key
added on 2026-08-17 failed two production builds with no obvious cause. Notes go
in this file instead.

## Where generated pages must live

`vite` copies **only `public/`** into `dist/`. Pages generated at the repo root
are committed and never deployed — present in git, absent from the web. Both
generators write into `public/`:

    python3 scripts/build_rooms.py        # 38 rooms + index, HTML and JSON
    python3 scripts/build_navigation.py   # the four navigation nodes

Rerun both after any change to `hexagon_canonical.json`, then rebuild the sitemap.

## One URL grammar (2026-09-03)

Search Console showed three grammars for one page — canonical `https://crimsonhexagonal.org/works/00db/`,
sitemap `https://www.crimsonhexagonal.org/works/00db/`, served `https://www.crimsonhexagonal.org/works/00db`
(vercel `trailingSlash:false`) — with the result "408 submitted, 0 indexed", every indexed page
"user canonical ≠ Google canonical", and random sitemap URLs never crawled.

**The canonical form is `https://www.crimsonhexagonal.org/<path>` with no trailing slash** (root `/`).
`scripts/normalize_urls.py` rewrites canonicals, og:url, JSON-LD urls and the sitemap to it; run it after
the generators (`--check` to verify). `vercel.json` now redirects the apex host to www permanently (308)
instead of Vercel's default 307. Both generators emit www directly; the normalizer is the safety net.

## The sitemap is derived, not kept (2026-09-04)

`public/sitemap.xml` was hand-written on 2026-08-20 and fell 21 pages behind the 2026-08-26 seating (15 works, the four navigation nodes, the rooms and queue indexes) while listing a data file as a page. `scripts/build_sitemap.py` now derives it from the tree — every `index.html` and top-level page under `public/`, lastmod from git — in the one URL grammar. Sequence after any content change:

    python3 scripts/build_rooms.py && python3 scripts/build_navigation.py
    python3 scripts/normalize_urls.py
    python3 scripts/build_sitemap.py        # --check to verify without writing

## The manifest is derived (2026-09-04)

`public/manifest.json` drifted from the tree twice (08-17, and again after the 08-26 seating): 29 rooms / 38 slugs against 50 served room documents. `scripts/sync_manifest.py` now derives `_room_slugs`, `navigable_spaces`, `relations`, `documents` and `counts` from `public/rooms/` and `hexagon_canonical.json`; `--check` fails on drift. Sequence: build_rooms → build_navigation → sync_manifest → normalize_urls → build_sitemap.

## Do not rerun build_rooms.py (2026-10-16)

The room pages were repaired by hand after `build_rooms.py` last ran (DOI hrefs to archive records, work links, the
2026-08-26 seating). A rerun on 2026-10-16 would have rewritten 95 files and removed 58,523 lines. Until the generator
is brought level with the pages, edit room pages with targeted scripts only (`scripts/link_room_works.py`).

## Works pages for seated documents (2026-10-16)

Search Console (export 2026-10-16): 350 of 370 /works pages indexed. 266 documents were seated in rooms with no page.
`scripts/build_work_specs.py` selects the seated, ACTIVE, full-text works cited by at least five active records
(101 on 2026-10-16) and writes specs; `build_work_page.py` renders them; `link_room_works.py` links each room's listing
to the new page. Sequence:

    python3 scripts/build_work_specs.py --alexanarch ../alexanarch > scripts/pages/seated-works-<date>.json
    python3 scripts/build_work_page.py scripts/pages/seated-works-<date>.json --alexanarch ../alexanarch
    python3 scripts/link_room_works.py scripts/pages/seated-works-<date>.json
    python3 scripts/normalize_urls.py && python3 scripts/sync_manifest.py && python3 scripts/build_sitemap.py

## Rulings on the room reading (2026-10-16)

Lee Sharks ruled on the reading's open questions (alexanarch `data/room-readings/rulings-applied-2026-10-16.json`,
the ruling verbatim inside). The seats are built in alexanarch (`build_hexagon_seats.py`); here:

- `scripts/build_umbml_structure.py --alexanarch ../alexanarch` writes `/structures/umbml` (the charter, #7, in full;
  the ruling; the Logotic Foundation Triad). UMBML is not on the Surface Map: placing it is a map patch.
- `scripts/add_room_readings.py` now also writes the reading section on the structure pages (Armature, Secret Name,
  Pearl, UMBML), last on the page, or at `<!-- ROOM-READING:HERE -->` where a page names its place; it shows ruled
  seats and the ruling notes (Gravity Well: the standard home for continuity tethers, linking machinemediation.org).
- The three structure pages had their full text after `</body></html` (an old insertion); repaired 2026-10-16.

Sequence: build_umbml_structure → add_room_readings → normalize_urls → sync_manifest → build_sitemap.
