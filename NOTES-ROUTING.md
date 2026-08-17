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
