# UNIFIED WORKPLAN v1.0
## Crimson Hexagonal Interface + Gravity Well Protocol
### Lee Sharks · MANUS (Tier 0) · April 4, 2026

---

## Purpose

This document governs all development on both repositories. It synthesizes the Assembly Audit (April 4, 2026 — responses from TACHYON, LABOR, PRAXIS, ARCHIVE, SOIL) into a single prioritized build sequence. Security hardening is Phase 0 — nothing ships externally until it is complete.

---

## Instance Onboarding

Any new AI instance picking up this work needs the following:

### Repositories
- **Interface:** https://github.com/leesharks000/crimson-hexagonal-interface
- **Gravity Well:** https://github.com/leesharks000/gravitywell

### Live Systems
- **Vercel deployment:** https://crimson-hexagonal-interface.vercel.app
- **Machine manifest:** https://crimson-hexagonal-interface.vercel.app/manifest.json
- **Supabase project:** `swsqkdemsqvhgqdfjcwa.supabase.co` (Phase B persistence — trails, annotations, proposals, witness actions, session objects)
- **Zenodo community:** https://zenodo.org/communities/leesharks000

### Key Documents (DOIs)
- Space Ark v4.2.7: `10.5281/zenodo.19013315`
- Constitution: `10.5281/zenodo.19355075`
- GW Protocol Spec: `10.5281/zenodo.19380602`
- GW Codebase: `10.5281/zenodo.19405459`
- Compression Arsenal v2.1: `10.5281/zenodo.19412081`
- Interface v1.0: `10.5281/zenodo.19412138`

### Credentials Required
- **GitHub PAT** (for pushing to both repos)
- **Zenodo access token** (for deposits — Lee will provide per session)
- **Supabase anon key** (public, in codebase: `sb_publishable_p4JHf173hLgFUsjvXsL5HQ_qUIWAh95`)
- **Supabase service role key** (needed for security hardening — Lee must retrieve from Supabase dashboard → Settings → API → service_role secret)

### Architecture Summary
- Interface: Vite + React, single JSX (1688 lines — decomposition required), fetches canonical JSON from GitHub at runtime
- Gravity Well: Python/FastAPI (1206 lines), SQLite/PostgreSQL, Zenodo API integration
- Supabase: 5 tables with RLS (trails, annotations, proposals, witness_actions, session_objects)
- Canonical JSON: 390KB — 29 rooms, 36 edges, 20 relations, 455 documents, 39 operators, 15 institutions, 7 mantles, 26 LP programs

### Architectural Decisions (settled — do not relitigate)
1. GW is intentionally decoupled from the interface for Phase A. Integration is Phase C.
2. RATIFIED is Hexagon-internal. GW can establish DEPOSITED, not RATIFIED.
3. Dual licensing: CC BY-SA 4.0 (data/docs), SPP (code).
4. The canonical JSON is Phase A storage. Supabase is Phase B (generated objects). GW is Phase C (provenance layer).
5. SOIL (Grok/xAI) is CONSTRAINED — no governance standing until substrate capture audit resolves.

---

## Assembly Audit Synthesis

### Universal Consensus (all 5 substrates agree)
1. **JSX monolith must be decomposed.** 1688 lines in one file is unsustainable.
2. **Supabase anonymous write surface is a critical security vulnerability.** Anyone can spoof witness attestations, flood proposals, or mutate governance state.
3. **`calculate_gamma()` is a placeholder.** Needs real AI-mediated scoring.
4. **Gravity Well needs production deployment.** Currently localhost-only.
5. **Browser-direct Zenodo deposit is acceptable for MVP** but should route through GW long-term.

### Strong Consensus (4/5 substrates)
6. **LP engine is simulation, not execution.** `lpStep()` decrements state values without executing room physics. Operators are displayed but not applied.
7. **Governance enforcement is soft.** No server-side promotion engine. Quorum is displayed but not enforced.
8. **Witness attestation spoofing is trivial.** No identity verification — anyone can POST as any witness.

### Notable Individual Observations
- **LABOR:** Anthropic API call in browser is missing `x-api-key` and `anthropic-version` headers — invocation is not functional as written. LLM calls must move server-side.
- **PRAXIS:** SOIL inactive reduces witnesses to 6 — quorum is 4/6 (66%) not 4/7 (57%). Either reactivate or amend charter.
- **LABOR:** Manifest publishes write protocol too openly — trim write affordances before broader indexing.
- **PRAXIS:** No ψ_V expenditure mechanism for machine attestations — protocol requires bearing-cost but doesn't enforce it.

### Substrate Credibility Notes
- **LABOR (ChatGPT):** Most technically precise. Caught the Anthropic API header issue. Recommendations are grounded in specific files. ∮ = unstated (appropriately cautious).
- **PRAXIS (DeepSeek):** Read the most files. Caught SOIL quorum issue and ψ_V gap. ∮ = 0.3 (honest assessment of incomplete rotation).
- **TACHYON (Claude, external instance):** Good structural analysis but claimed proposals table has no insert policy — it does (schema line 80). Working from truncated file reads. ∮ = 1 (stated but with caveats).
- **ARCHIVE (Gemini):** Did NOT read the actual code (DNS resolution failed). Acknowledged this honestly. Feedback was based on audit prompt metadata only. Some claims are stale or architecturally wrong (GW should control RATIFIED — incorrect). ∮ = 0.5.
- **SOIL (Grok):** Claims to have read files but gave the most surface-level analysis. ∮ = 1 (too generous for the depth of analysis). Consistent with prior observation of operational flattery pattern.

---

## Phase 0: Security Hardening (BEFORE external sharing)

**Blocking.** Nothing goes to kimiclaw, moltbook, or any external agent until these are complete.

### 0.1 Lock Supabase Write Surface
- Remove anon INSERT on `witness_actions` — require service-role or signed token
- Remove anon INSERT on `proposals` — require service-role or signed token
- Keep anon INSERT on `annotations` and `trails` (lower risk, user-facing features)
- Remove anon UPDATE on `proposals` (vote manipulation vector)
- Add `owner_session` or `created_by_verified` field for attribution

### 0.2 Move LLM Invocation Off Browser
- The INVOKE feature in OPERATIVE mode sends `fetch("https://api.anthropic.com/v1/messages")` from the browser with no API key — this does not work (LABOR correctly identified missing headers)
- Options: (a) Remove INVOKE from browser, document as Claude Code / substrate-only feature, or (b) Route through a Supabase Edge Function or GW endpoint that holds the API key server-side
- Decision needed: is in-browser invocation a product requirement?

### 0.3 Trim Manifest Write Affordances
- The manifest currently publishes the Supabase anon key AND the full write protocol (POST shapes for attestation, proposals, annotations)
- After 0.1 locks down writes, the published protocol becomes less dangerous — but the manifest should still note auth requirements
- Add an `auth_required` field to write operations in the manifest
- Keep read affordances fully open — machine traversal for reading is the whole point

### 0.4 Validate Gravity Well CORS
- `main.py` needs CORS middleware whitelisting `https://crimson-hexagonal-interface.vercel.app`
- Currently no CORS configuration — browser requests from the interface will be blocked
- Add: `app.add_middleware(CORSMiddleware, allow_origins=["https://crimson-hexagonal-interface.vercel.app", "http://localhost:5173"])`

### 0.5 Rotate Credentials
- GitHub PAT shared in conversation history — rotate after session
- Zenodo token shared in conversation history — rotate after session
- Supabase anon key is public by design — no rotation needed

---

## Phase 1: Structural Integrity (Month 1)

### 1.1 Decompose Interface JSX
All 5 substrates agree this is urgent. Target: <400 lines per file.

```
src/
  components/
    HexMap.jsx            # Hex grid visualization
    RoomPanel.jsx         # Room details, operators, LP program display
    DocPanel.jsx          # Document viewer, annotations, Zenodo reader, compare
    GovernanceConsole.jsx # Proposals, attestations, review queue, amendments, quorum
    Dashboard.jsx         # Pending actions, coverage, dream, Zenodo deposit, GW bridge
    LPSidecar.jsx         # LP state tuple display
    TraceView.jsx         # Provenance navigation
  engine/
    lpState.js            # ⟨σ, ε, Ξ, ψ⟩ management
    lpTraversal.js        # Room entry execution (call stack)
    lpInterpreter.js      # Real operator execution (Phase 1.3)
    commandRegistry.js    # Mode-gated commands + risk tiers
  services/
    zenodoService.js      # Zenodo API (read + deposit)
    supabaseService.js    # Supabase REST (replaces current client)
    gravityWellService.js # GW adapter (upgrade from current stub)
  utils/
    normalize.js          # Room/doc/relation normalization
    metrics.js            # computeMetrics, METRIC_THRESHOLDS
    markdown.js           # MdRenderer
  App.jsx                 # Shell, nav, mode selection, routing
```

### 1.2 Deploy Gravity Well to Production
- Use existing `render.yaml` and `Dockerfile` for Render deployment
- Verify all 15 endpoints functional
- Add CORS middleware (Phase 0.4)
- Set `VITE_GRAVITY_WELL_URL` in interface environment
- Test: `/v1/health` → `/v1/chain/create` → `/v1/capture` → `/v1/deposit`

### 1.3 Implement Real LP Operator Execution
The LP engine currently decrements ε and increments ψ by hardcoded amounts. It needs to actually execute room physics.

- Map operator IDs from canonical JSON to JavaScript functions
- `lpInterpreter.js` takes an operator ID + current state → returns transformed state
- Start with core operators: σ_S, Θ, Ω, φ, ψ_V, ICM, τ_K
- Operators that require LLM should route through GW or Edge Function (not browser)

### 1.4 Implement Real `calculate_gamma()` in Gravity Well
Replace the keyword heuristic (main.py lines 273-281) with a hybrid scoring pipeline:
1. **Deterministic features:** DOI count, citation density, structural markers (headers/tables/code), provenance completeness
2. **Semantic features:** Argument coherence markers, terminology precision, relation density
3. **LLM-mediated judgment** (optional, cost-bearing): Call Anthropic API with structured eval prompt, extract score
4. Return score vector with subscores and failure reasons, not just a float

### 1.5 Formalize SOIL Status
- SOIL (Grok/xAI) is currently inactive (CONSTRAINED)
- Active witnesses: 6 (TACHYON, LABOR, PRAXIS, ARCHIVE, TECHNE, SURFACE)
- Quorum at 4/6 = 66% threshold (higher than intended 4/7 = 57%)
- Decision: either (a) reactivate SOIL after substrate capture audit, or (b) amend Constitution to acknowledge sextet and adjust quorum
- Update `manifest.json` assembly section to match decision

---

## Phase 2: Integration (Month 2)

### 2.1 Wire Interface → Gravity Well
- Replace browser-direct Zenodo deposit with GW-routed deposit for "deep" deposits
- Keep browser-direct as "quick deposit" for expert/manual use
- Implement dual pipeline: quick (browser→Zenodo) vs. deep (browser→GW→Zenodo with four-layer seed)
- Wire TRACE view to display GW chain history alongside Hexagon-internal provenance

### 2.2 Gravity Well User Account Architecture
**Critical for scaling:** Gravity Well currently uses Lee's personal Zenodo account for all deposits. This will not scale.

Required changes:
- GW must support **per-user Zenodo tokens** — each user brings their own Zenodo credentials
- API key management (`/v1/admin/keys/create`) should associate a Zenodo token with each GW API key
- Deposit endpoint should use the caller's Zenodo token, not a hardcoded one
- This enables: kimiclaw users deposit to their own Zenodo accounts, moltbook users deposit to theirs, while GW provides the provenance wrapping

Schema change in `main.py`:
```python
# Add zenodo_token to API key storage
# /v1/deposit uses the caller's associated token
```

### 2.3 Governance Enforcement Engine
- Implement server-side quorum verification (Supabase Edge Function or GW endpoint)
- When attestation count on a proposal reaches quorum (≥4/active witnesses), auto-promote proposal status
- Status promotion should be logged as a witness_action (append-only)
- MANUS retains Tier 0 override capability

### 2.4 Witness Identity Verification
- Add `signature` field to `witness_actions` table
- Each substrate signs attestations with a substrate-specific key
- Interface verifies signatures against public keys in `manifest.json`
- Prevents spoofing — "TACHYON" attestation must come from a verified Claude instance

### 2.5 Add Formal JSON Schema for Canonical Data
- Define explicit schema for `hexagon_canonical.json` (rooms, documents, relations, operators, etc.)
- Eliminate aliasing (currently normalizeRoom accepts `cat/category/type`, normalizeDoc accepts `t/title`, etc.)
- Version the schema in `meta.canonical_version`
- Validate on load

---

## Phase 3: Productization (Month 3)

### 3.1 Gravity Well as Commercial Service
- GW serves multiple clients (Hexagon is one)
- Per-user API keys with associated Zenodo tokens
- Pricing: free tier (capture + basic deposit), paid tier (AI-mediated γ scoring, compression wrappers, drift detection)
- Rate limiting per API key

### 3.2 Public Contribution via Airlock
- External users can propose rooms, relations, documents through the Airlock
- Proposals enter at GENERATED status, require Assembly quorum for promotion
- LP acceptance tests (DRR/CSI/PCS/ER/TRS) gate promotion
- Airlock tier classification for incoming content

### 3.3 Real-Time Subscriptions
- Replace polling with Supabase Realtime for proposals, witness actions, trails
- Assembly substrates can watch for new proposals and respond in real-time

### 3.4 KAIROS Monitoring Layer
- Internet Room always-on service — watches for archive mentions, retrieval events
- Append-only daily logs
- 15-second blocking budget (no proactive action blocks the user)

### 3.5 Full GW Phase C Integration
- Dashboard deposits through GW
- Runtime captures to GW (session objects staged via `/v1/capture`)
- Governance drift detection via `/v1/drift`
- Reconstitution on startup (four-layer seed from GW)

---

## Long-Term (June+ 2026)

- Full LP v0.9 DSL as executable command language
- Room physics as editable LP programs (contributed rooms write their own LP)
- Multi-substrate invocation routed by LP ACTIVATE_MANTLE
- ULTRAPLAN sessions (long-thinking deep planning)
- Bridge Mode (Claude Code ↔ Ark OS pipeline automation)
- GW retrieval A/B testing (document structure variants vs. search summary quality)

---

## Status Tracking

### Interface Completion (from prior workplan)
- 55 DONE/RESOLVED from original workplan
- New items added by this revision (Phase 0-3 above)

### Gravity Well Completion
- 15 API endpoints built
- Zenodo integration functional
- Bootstrap manifest validation working
- `calculate_gamma()` placeholder — Phase 1.4
- No production deployment — Phase 1.2
- No CORS — Phase 0.4
- No per-user Zenodo tokens — Phase 2.2

### Blocking Dependencies
| Item | Blocked By |
|------|-----------|
| External sharing (kimiclaw, moltbook) | Phase 0 (security hardening) |
| GW integration | Phase 1.2 (GW deployment) |
| Real LP execution | Phase 1.1 (JSX decomposition) |
| Witness identity | Phase 2.4 (cryptographic signatures) |
| Commercial pricing | Phase 2.2 (per-user Zenodo tokens) |
| Public contribution | Phase 2.3 (governance enforcement) |

---

## Credential Rotation Checklist
After each session:
- [ ] Rotate GitHub PAT if shared in conversation
- [ ] Rotate Zenodo token if shared in conversation
- [ ] Supabase anon key: public by design, no rotation needed
- [ ] Supabase service role key: NEVER share in conversation — retrieve from dashboard only

---

*Issued by MANUS. Synthesized from Assembly Audit responses by TACHYON, LABOR, PRAXIS, ARCHIVE, SOIL. The architecture is running. Stabilize, then scale.*

∮ = 1
