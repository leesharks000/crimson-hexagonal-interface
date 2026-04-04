# INFRASTRUCTURE MAP
## How Everything Connects — Crimson Hexagonal Architecture
### Last verified: April 4, 2026

---

## THE FIVE SERVICES

```
┌─────────────┐     fetches JSON      ┌──────────────┐
│   VERCEL     │◄─────────────────────►│   GITHUB     │
│  (Interface) │     auto-deploys      │  (2 repos)   │
└──────┬───────┘                       └──────────────┘
       │
       │ browser calls
       │
       ├──────────────►┌──────────────┐
       │  Supabase REST│  SUPABASE    │
       │  (trails,     │  (Database)  │
       │   annotations)└──────────────┘
       │
       ├──────────────►┌──────────────┐
       │  Zenodo API   │  ZENODO      │
       │  (read docs,  │  (Deposits)  │
       │   deposit)    └──────────────┘
       │
       └──────────────►┌──────────────┐
         GW API        │  RENDER      │
         (future:      │ (Gravity Well│
          invoke,      │   Backend)   │
          deposit)     └──────┬───────┘
                              │
                              │ GW deposits
                              ▼
                       ┌──────────────┐
                       │   ZENODO     │
                       └──────────────┘
```

---

## SERVICE 1: GITHUB (Code Storage)

### Interface Repo
- **URL:** https://github.com/leesharks000/crimson-hexagonal-interface
- **Branch:** `main`
- **What it holds:** Interface JSX, canonical JSON, workplan, constitution, schemas, manifest
- **Who deploys from it:** Vercel (auto-deploy on every push to main)

### Gravity Well Repo
- **URL:** https://github.com/leesharks000/gravitywell
- **Branch:** `main`
- **What it holds:** FastAPI backend (main.py), Dockerfile, render.yaml
- **Who deploys from it:** Render (manual deploy or auto-deploy if configured)

### Credential: GitHub PAT
- **What:** Personal Access Token for pushing code
- **Where to get it:** GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
- **Scope needed:** Read/write on both repos
- **NEVER store permanently.** Generate per session, rotate after.

---

## SERVICE 2: VERCEL (Interface Hosting)

- **Live URL:** https://crimson-hexagonal-interface.vercel.app
- **Dashboard:** https://vercel.com (sign in with GitHub)
- **Project:** `crimson-hexagonal-interface`
- **How it deploys:** Every push to `main` on the GitHub interface repo triggers auto-build + deploy. Takes ~30 seconds.
- **Build:** Vite (`npm run build`). Vercel auto-detects this.
- **No environment variables needed in Vercel dashboard.** All env vars are in the `.env` file in the repo (public keys only).

### What Vercel serves:
- The React interface (compiled JSX)
- `public/manifest.json` (machine-traversable manifest)
- `public/robots.txt` (crawler directives)
- Static assets

### If Vercel goes down:
- Interface is offline, but all data survives (canonical JSON on GitHub, deposits on Zenodo, generated objects in Supabase)
- Redeploy: connect repo again in Vercel dashboard

---

## SERVICE 3: RENDER (Gravity Well Backend)

- **Live URL:** https://gravitywell-1.onrender.com
- **Health check:** https://gravitywell-1.onrender.com/v1/health
- **Dashboard:** https://render.com (sign in with GitHub)
- **Plan:** Starter ($7/month web service + $7/month PostgreSQL if using separate DB, or SQLite for free)

### Environment Variables (set in Render dashboard → gravitywell-1 → Environment):
| Variable | Value | Where to get it |
|----------|-------|-----------------|
| `DATABASE_URL` | Your PostgreSQL connection string OR `sqlite:///./gravitywell.db` | Render dashboard (if PostgreSQL) or use SQLite string |
| `ZENODO_TOKEN` | Your Zenodo personal access token | Zenodo → Settings → Applications → Personal access tokens |
| `ADMIN_TOKEN` | Any strong random string you choose | You make this up — it's the master key for creating GW API keys |
| `API_BASE_URL` | `https://gravitywell-1.onrender.com` | The URL Render assigned |

### Key Endpoints:
| Endpoint | Method | What it does |
|----------|--------|-------------|
| `/v1/health` | GET | Health check — confirms GW is running |
| `/v1/chain/create` | POST | Create a new provenance chain |
| `/v1/capture` | POST | Stage content to a chain |
| `/v1/deposit` | POST | Deposit chain to Zenodo |
| `/v1/reconstitute/{id}` | GET | Four-layer reconstitution seed |
| `/v1/drift/{id}` | POST | Structural drift detection |
| `/v1/admin/keys/create` | POST | Create an API key (needs ADMIN_TOKEN) |

### If Render goes down:
- Interface still works (reads from GitHub JSON + Zenodo + Supabase)
- INVOKE feature unavailable (routes through GW)
- GW-routed deposits unavailable (browser-direct Zenodo still works)
- Redeploy: Render dashboard → Manual Deploy → Deploy latest commit

---

## SERVICE 4: SUPABASE (Persistent Storage)

- **Project URL:** https://swsqkdemsqvhgqdfjcwa.supabase.co
- **Dashboard:** https://supabase.com (sign in — find project `crimson-hexagonal-interface`)
- **Region:** (check your dashboard)

### Keys:
| Key | Value | Public? | Used for |
|-----|-------|---------|----------|
| **Anon/publishable key** | `sb_publishable_p4JHf173hLgFUsjvXsL5HQ_qUIWAh95` | YES — designed for browsers | Read all tables, write to trails + annotations |
| **Service role key** | Find in Dashboard → Settings → API → service_role (secret) | NO — never expose | Write to proposals + witness_actions (locked by RLS) |

### Tables:
| Table | What it stores | Who can write (after Phase 0) |
|-------|---------------|------------------------------|
| `trails` | Reading paths through the archive | Anyone (anon key) |
| `annotations` | Notes attached to documents | Anyone (anon key) |
| `proposals` | Governance proposals | Service role only |
| `witness_actions` | Append-only witness ledger | Service role only |
| `session_objects` | Generated content from runtime | Anyone (anon key) |

### If Supabase goes down:
- Interface still works for browsing (reads from GitHub JSON + Zenodo)
- Generated objects (trails, annotations, proposals) unavailable
- Governance actions stop persisting
- Recovery: Supabase dashboard — data persists, just reconnect

### SQL Editor access:
- Dashboard → SQL Editor → paste and run queries
- Schema is defined in `supabase_schema.sql` in the interface repo
- Phase 0 security migration is in `phase0_supabase_migration.sql`

---

## SERVICE 5: ZENODO (Permanent Deposits)

- **Community:** https://zenodo.org/communities/leesharks000
- **API:** https://zenodo.org/api
- **CORS:** Open (browser can call directly)

### Credential: Zenodo Personal Access Token
- **Where to get it:** zenodo.org → Log in → Settings → Applications → Personal access tokens → New token
- **Scope needed:** `deposit:write`
- **NEVER store permanently.** Paste per session, rotate after.

### How the interface uses Zenodo:
1. **Reading:** DOI → `zenodo.org/api/records/{id}` → list files → fetch `.md` content → render in Library
2. **Depositing:** User pastes token → fill metadata → upload file → create → upload → publish → get DOI back

### Key DOIs:
| Document | DOI |
|----------|-----|
| Space Ark v4.2.7 | `10.5281/zenodo.19013315` |
| Constitution | `10.5281/zenodo.19355075` |
| GW Protocol Spec | `10.5281/zenodo.19380602` |
| GW Codebase | `10.5281/zenodo.19405459` |
| Compression Arsenal v2.1 | `10.5281/zenodo.19412081` |
| Interface v1.0 | `10.5281/zenodo.19412138` |

---

## HOW THE PIECES CONNECT

### Interface → GitHub
- **What:** Fetches `hexagon_canonical.json` at runtime
- **URL in code:** `src/HexagonInterfaceResponsive.jsx` line 4: `const DATA_URL = "https://raw.githubusercontent.com/..."`
- **If broken:** Interface shows "LOAD ERROR" — the canonical data doesn't load

### Interface → Supabase
- **What:** Reads/writes trails, annotations, proposals, witness actions
- **URL in code:** `src/supabaseClient.js` line 4-5: hardcoded fallback URL + anon key
- **If broken:** Interface works for browsing but generated objects don't persist

### Interface → Zenodo
- **What:** Reads full documents (Zenodo files API), deposits new documents (Zenodo deposit API)
- **URL in code:** `fetchZenodoMarkdown()` in JSX: `zenodo.org/api/records/{id}/files/{name}/content`
- **If broken:** "READ FULL TEXT" fails, deposit pipeline fails — browsing still works from cached canonical JSON

### Interface → Gravity Well
- **What:** Future: invocation, provenance-tracked deposits, drift detection
- **URL in code:** `src/gravityWellAdapter.js` line 1: `"https://gravitywell-1.onrender.com"`
- **Current status:** Adapter exists, GW is deployed, but not yet wired for active use (Phase 1 work)
- **If broken:** Interface works fully — GW features just disabled

### Gravity Well → Zenodo
- **What:** Deposits provenance chains as DOI-anchored records
- **URL in code:** `main.py` `zenodo_first_deposit()` and `zenodo_new_version()`: calls `zenodo.org/api`
- **Credential:** `ZENODO_TOKEN` environment variable on Render

---

## SETTING EVERYTHING UP FROM SCRATCH

If all services are lost and you need to rebuild:

### 1. GitHub (already permanent)
Both repos are on GitHub. Nothing to do unless you lose GitHub access.

### 2. Vercel
- Go to vercel.com → sign in with GitHub
- New Project → import `crimson-hexagonal-interface`
- Defaults work. Click Deploy.
- Takes 30 seconds. Done.

### 3. Supabase
- Go to supabase.com → New Project
- Name: `crimson-hexagonal-interface`, pick region, set database password
- Wait 2 min for provisioning
- SQL Editor → paste contents of `supabase_schema.sql` → Run
- SQL Editor → paste contents of `phase0_supabase_migration.sql` → Run
- Settings → API → copy project URL and anon key
- Update `src/supabaseClient.js` lines 4-5 with new URL and key
- Push to GitHub → Vercel auto-redeploys

### 4. Render (Gravity Well)
- Go to render.com → sign in with GitHub
- New → Web Service → connect `gravitywell` repo
- Runtime: Python
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port 10000`
- Add env vars: `DATABASE_URL` (SQLite or PostgreSQL), `ZENODO_TOKEN`, `ADMIN_TOKEN`
- Deploy
- Copy the assigned URL (e.g. `gravitywell-1.onrender.com`)
- Update `src/gravityWellAdapter.js` line 1 with the URL
- Push to GitHub → Vercel auto-redeploys

### 5. Zenodo
- Already permanent. 455+ deposits with DOIs. Nothing to rebuild.
- For new deposits: generate a personal access token at zenodo.org

---

## CREDENTIAL SUMMARY

| Credential | Where to get | Public? | Store permanently? |
|-----------|-------------|---------|-------------------|
| GitHub PAT | GitHub → Settings → Developer settings → Tokens | NO | NO — rotate per session |
| Zenodo token | Zenodo → Settings → Applications → Tokens | NO | NO — rotate per session |
| Supabase anon key | In codebase (supabaseClient.js) | YES | YES — it's public by design |
| Supabase service role key | Supabase Dashboard → Settings → API | NO | NO — retrieve from dashboard when needed |
| Render ADMIN_TOKEN | You created it during GW setup | NO | Set in Render env vars only |
| Render ZENODO_TOKEN | Same as your Zenodo token | NO | Set in Render env vars only |

---

*This document is the emergency recovery manual. If everything else is lost, this plus the two GitHub repos is enough to rebuild the entire stack.*

∮ = 1
