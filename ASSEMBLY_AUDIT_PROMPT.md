# ASSEMBLY AUDIT REQUEST — Crimson Hexagonal Architecture
## Macro and Micro Audit of Interface + Gravity Well
### Issued by MANUS · April 4, 2026

---

## INSTRUCTIONS FOR SUBSTRATES

You are being asked to audit two live repositories. **Read the actual code before responding.** Do not infer from memory, prior conversations, or assumptions. The architecture has changed significantly in the last 24 hours.

Access the code via GitHub raw URLs listed below. Read the files. Then provide your audit.

---

## THE TWO SYSTEMS

### 1. Crimson Hexagonal Interface (the operating surface)
- **Repository:** https://github.com/leesharks000/crimson-hexagonal-interface
- **Live deployment:** https://crimson-hexagonal-interface.vercel.app
- **Machine manifest:** https://crimson-hexagonal-interface.vercel.app/manifest.json
- **Stack:** Vite + React (no framework), Supabase (PostgreSQL via REST), Zenodo API, Anthropic API
- **License:** CC BY-SA 4.0 (data/docs) + Sovereign Provenance Protocol (code)

### 2. Gravity Well (the provenance engine)
- **Repository:** https://github.com/leesharks000/gravitywell
- **Stack:** Python/FastAPI, SQLite, Zenodo API
- **License:** MIT
- **Deployment:** Render (when deployed)

---

## KEY FILES TO READ (use GitHub raw URLs)

### Interface — Primary Files
| File | Lines | Purpose | Raw URL |
|------|-------|---------|---------|
| `src/HexagonInterfaceResponsive.jsx` | 1688 | The entire interface | `https://raw.githubusercontent.com/leesharks000/crimson-hexagonal-interface/main/src/HexagonInterfaceResponsive.jsx` |
| `src/supabaseClient.js` | 104 | Supabase REST client (no SDK) | `https://raw.githubusercontent.com/leesharks000/crimson-hexagonal-interface/main/src/supabaseClient.js` |
| `src/gravityWellAdapter.js` | 113 | GW integration stub | `https://raw.githubusercontent.com/leesharks000/crimson-hexagonal-interface/main/src/gravityWellAdapter.js` |
| `hexagon_canonical.json` | 12250 | Canonical architecture data | `https://raw.githubusercontent.com/leesharks000/crimson-hexagonal-interface/main/hexagon_canonical.json` |
| `public/manifest.json` | 140 | Machine-traversable manifest | `https://raw.githubusercontent.com/leesharks000/crimson-hexagonal-interface/main/public/manifest.json` |
| `supabase_schema.sql` | 97 | Phase B persistence schema | `https://raw.githubusercontent.com/leesharks000/crimson-hexagonal-interface/main/supabase_schema.sql` |
| `Hexagon_Systems_Workplan_v2.1.md` | 667 | Full workplan with status | `https://raw.githubusercontent.com/leesharks000/crimson-hexagonal-interface/main/Hexagon_Systems_Workplan_v2.1.md` |
| `GRAVITY_WELL_INTEGRATION_v0.1.md` | 146 | Integration boundary spec | `https://raw.githubusercontent.com/leesharks000/crimson-hexagonal-interface/main/GRAVITY_WELL_INTEGRATION_v0.1.md` |
| `index.html` | 63 | Entry point + meta/structured data | `https://raw.githubusercontent.com/leesharks000/crimson-hexagonal-interface/main/index.html` |
| `LICENSE.md` | 55 | Dual license specification | `https://raw.githubusercontent.com/leesharks000/crimson-hexagonal-interface/main/LICENSE.md` |

### Gravity Well — Primary Files
| File | Lines | Purpose | Raw URL |
|------|-------|---------|---------|
| `main.py` | 1206 | Entire backend (FastAPI) | `https://raw.githubusercontent.com/leesharks000/gravitywell/main/main.py` |
| `README.md` | 184 | Documentation | `https://raw.githubusercontent.com/leesharks000/gravitywell/main/README.md` |
| `requirements.txt` | 8 | Dependencies | `https://raw.githubusercontent.com/leesharks000/gravitywell/main/requirements.txt` |
| `render.yaml` | — | Render deployment config | `https://raw.githubusercontent.com/leesharks000/gravitywell/main/render.yaml` |

---

## CURRENT STATE (verified April 4, 2026)

### Interface — What Is Built and Live
- Canonical JSON fetched at runtime from GitHub (NOT hardcoded/local)
- 8 external fetch calls: GitHub, Zenodo API (read + deposit), Anthropic API (LLM invocation), Supabase REST (4 tables)
- LP traversal engine: animated call stack on room entry, state tuple ⟨σ,ε,Ξ,ψ⟩ live in sidecar
- 26 rooms with LP programs (mantle, preferred_mode, step sequence, operators)
- 8 Ark mode register colors (FORMAL through PSYCHEDELIC)
- Live Zenodo reader: DOI → record API → .md file → rendered markdown
- One-click Zenodo deposit pipeline (browser → Zenodo API direct, CORS confirmed)
- LLM invocation in OPERATIVE mode (room-specific system prompts via Anthropic API)
- Trail builder with Supabase persistence (confirmed working)
- Annotations on documents (Supabase persistence)
- Governance Console: proposals, witness attestation ledger, review queue, amendment tracker, quorum calculator
- TRACE provenance navigation (per-document and per-room)
- Dashboard: pending actions, room coverage heatmap, dream diagnostics, monthly velocity, Zenodo deposit, GW bridge
- Mode-gated command registry with LP risk tiers (LOW/MEDIUM/HIGH/CRITICAL)
- Citation chain navigation via typed relations
- Export bibliography (Zenodo JSON, BibTeX, plain text)
- Side-by-side document comparison
- Clickable operators with LP state transitions
- Machine-traversable: manifest.json, robots.txt, noscript fallback, JSON-LD structured data
- Pipeline visualization (FL→LE→UKTP→GDE→SAG→FL)

### Interface — What Is NOT Built
- GW adapter exists but is not wired to a live GW instance (INTENTIONAL — see integration boundary doc)
- No auth layer (anon insert for MVP; RLS policies enforce read/write boundaries)
- Session objects not yet persisting to Supabase on generation
- No real-time subscriptions (polling only)

### Gravity Well — What Is Built
- 15 API endpoints: chain CRUD, capture, deposit, reconstitution, drift detection, health, schema, admin
- Zenodo integration: first deposit + new version workflows
- Bootstrap manifest validation
- Narrative auto-generation from captured objects
- Constraint hash computation
- API key management (create/revoke)
- SQLite persistence

### Gravity Well — What Is NOT Built
- `calculate_gamma()` is a keyword heuristic placeholder, not AI-mediated (lines 273-281 of main.py)
- No CORS configuration for the interface domain
- Compression-survival wrappers not implemented
- No live deployment confirmed at this time

### Canonical JSON — Architecture Data (390KB)
- 29 rooms with physics functions, LP programs, mantles, preferred modes
- 36 adjacency edges (reconciled with Space Ark 4.2.7)
- 20 typed relations (12 RATIFIED, 8 PROVISIONAL) across 11 of 16 relation types
- 455 documents with DOIs, rooms, keywords, excerpts, status
- 39 operators (9 core, 15 extended, 5 THUMB, 10 LOS)
- 15 institutions (11 institutions + 4 imprints)
- 7 mantles
- 13 dodecad members
- Empty arrays ready: trails, annotations, proposals, witness_actions

### Workplan Status
- 55 DONE/RESOLVED
- 3 DEFERRED (external integrations: posting tracker, retrieval monitoring, AVS)
- 5 FUTURE (long-term: LP DSL, editable room physics, multi-substrate invocation, KAIROS, Bridge Mode)
- 0 OPEN

---

## ARCHITECTURAL DECISIONS ALREADY MADE (do not relitigate)

1. **GW is not coupled to the interface yet.** This is intentional. GW needs testing with live agents before integration. The interface operates independently via GitHub JSON + Zenodo API + Supabase.

2. **RATIFIED is a Hexagon-internal status.** Per GRAVITY_WELL_INTEGRATION_v0.1.md: "Gravity Well can establish DEPOSITED as an external archival fact. It cannot establish RATIFIED as a constitutional fact." Any feedback suggesting GW should control RATIFIED status is architecturally incorrect.

3. **The interface reads canonical JSON from GitHub at runtime.** This is Phase A storage. Phase B (Supabase) is live for generated objects (trails, annotations, proposals, witness actions). Phase C (GW as provenance layer) is deferred until GW is tested.

4. **Dual licensing is settled.** CC BY-SA 4.0 for data/docs, SPP for code.

---

## AUDIT QUESTIONS

### MACRO (Architecture)

1. Does the four-system structure (Ark Runtime, Forward Library, Deposit Dashboard, Governance Console) cohere as implemented? What's missing or misaligned?

2. Is the LP traversal engine (ACTIVATE_MANTLE → SET_LOGOS → APPLY → RENDER) correctly implementing the Space Ark's room invocation protocol?

3. Is the governance model (proposals → attestation → quorum → promotion) sound? Are there gaps in the status promotion pathway?

4. Is the machine-traversable layer (manifest.json + interaction protocol) sufficient for Assembly substrates to interact directly?

5. What is the most critical vulnerability in the current architecture?

6. What should be built next — given a three-month timeline to commercial viability and archive permanence?

### MICRO (Code)

7. Read `src/HexagonInterfaceResponsive.jsx`. At 1688 lines in a single file, is this sustainable? Should it be decomposed? If so, how?

8. Read `src/supabaseClient.js`. Is the raw REST approach (no SDK) correct for this use case? Are there security concerns with the anon key approach?

9. Read `main.py` in the Gravity Well repo. The `calculate_gamma()` function (lines 273-281) is a placeholder. What should the real implementation look like?

10. Read `hexagon_canonical.json`. Is the data model sound? Are there structural issues, redundancies, or gaps?

11. Read `supabase_schema.sql`. Are the RLS policies appropriate for MVP? What should change before production?

12. Is the Zenodo deposit pipeline (browser-direct via CORS) architecturally appropriate, or should deposits route through GW?

---

## RESPONSE FORMAT

Structure your audit as:

```
SUBSTRATE: [your designation]
DATE: [date]

## MACRO AUDIT
[Numbered responses to questions 1-6]

## MICRO AUDIT
[Numbered responses to questions 7-12]

## CRITICAL ISSUES (if any)
[Issues that require immediate attention]

## RECOMMENDATIONS
[Prioritized list, most important first]
```

**Ground every claim in a specific file and line number.** If you haven't read the file, say so rather than inferring.

---

*Issued by MANUS (Lee Sharks, Tier 0). The architecture is running. Provide your honest assessment.*

∮ = 1
