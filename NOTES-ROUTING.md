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
