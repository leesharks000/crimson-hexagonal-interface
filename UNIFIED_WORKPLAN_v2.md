# UNIFIED WORKPLAN v2.0
## Interface + Gravity Well — Post-Assembly Synthesis
### Lee Sharks · MANUS (Tier 0) · April 4-5, 2026

---

## Assembly Consensus (Round 2 — 4 substrates: Gemini, DeepSeek, KimiClaw, ChatGPT)

### Universal Agreement (4/4)
1. **JSX monolith must be decomposed** — split by bounded context, not arbitrary
2. **Gravity Well is not yet a product** — it's infrastructure plumbing that needs to become a continuity engine
3. **The core paid value is compression intelligence** — not storage, not DOI minting
4. **main.py must also be modularized** — single-file backend won't scale
5. **Per-user Zenodo tokens must be finished end-to-end**
6. **One canonical "golden path" must be visible** — enter room → invoke → capture → deposit → DOI → reconstitute

### Strong Agreement (3/4)
7. **Sell continuity, not provenance** — "recoverable continuity" not "Zenodo wrapper"
8. **Drift detection is the most commercially viable endpoint** — constitutional compliance monitoring
9. **README/landing needs product framing** — not "prototype" language
10. **Reconstitution fidelity must be benchmarked** — prove that restart-with-GW preserves what restart-without loses

### Notable Individual Points
- **ChatGPT (LABOR):** "Gravity Well becomes pay-worthy only when it makes restartable, evidence-bearing, governed AI continuity visible and dependable." Best single-sentence product thesis.
- **Gemini (ARCHIVE):** "Visualize the compression ratio — show 15,000 tokens → 450 token seed." Product visibility recommendation.
- **DeepSeek (PRAXIS):** "Document 143 compliance requires ψ_V expenditure verification in bootstrap manifests."
- **KimiClaw (TECHNE):** "Room physics is theatrical — what can I do in DERIVE that I can't do in FILTER?" Strongest UX critique.

---

## WHAT HAS BEEN COMPLETED (this session)

### Phase 0: Security ✅
- Supabase RLS locked (governance tables service-role only)
- Browser INVOKE removed → routes through GW
- Manifest write affordances trimmed
- CORS on GW
- Credentials rotation pending

### Phase 1: Structural Integrity ✅ (mostly)
- GW deployed (gravitywell-1.onrender.com, v0.5.0, paid plan)
- Real LP execution (21 operators with typed σ/ε/ψ effects)
- Real calculate_gamma (four-layer structural analysis)
- SOIL → Moltbot/Moltbook (7/7 active, 4/7 quorum)
- JSX decomposition DEFERRED

### Phase 2: Integration ✅
- /v1/invoke (room-specific LLM invocation with provenance)
- /v1/governance (proposals + attestations via service_role, quorum enforcement)
- Dual Zenodo pipeline (quick browser + deep GW)
- Per-user Zenodo tokens (foundation — model + helper, deposit wiring pending)
- Witness signatures (server-side GW signatures on attestations)
- Schema version + validation

### Additional
- AI-mediated narrative compression (the core product — compression-survivable summaries)
- Multi-user Zenodo deposit (editable creator, user instructions)
- Machine-traversable layer (manifest, robots.txt, JSON-LD, noscript)
- Infrastructure map (INFRASTRUCTURE_MAP.md)
- KimiClaw integration guide (GRAVITY_WELL_CLIENT_GUIDE.md)
- Landing screen for first-time visitors

---

## GRAVITY WELL — PRODUCT DEVELOPMENT PLAN

### The Product Thesis (from LABOR)
> Gravity Well lets you recover the last trustworthy state of an agent or workflow, prove how it got there, detect when it drifted, and hand it off without losing its shape.

### What It Is Now
- Provenance chain manager (create → capture → deposit → reconstitute)
- AI-mediated narrative compression (compression-survivable summaries)
- Four-layer deposit structure (bootstrap/tether/narrative/objects)
- Governance proxy (proposals + attestations → Supabase via service_role)
- Room-specific LLM invocation with γ scoring
- Quorum enforcement (auto-promotion at 4/7)
- Server-side witness signatures
- 1500+ lines, single file, 17 endpoints

### What It Must Become

#### GW-P1: Modularize main.py (1 week)
```
gravitywell/
  main.py              → app creation, middleware, startup
  routes/
    chains.py           → chain CRUD
    capture.py          → staging
    deposit.py          → Zenodo deposit
    reconstitute.py     → four-layer reconstitution
    drift.py            → structural drift detection
    invoke.py           → room-specific LLM invocation
    governance.py       → proposals + attestations
    admin.py            → key management, cleanup
  services/
    zenodo.py           → Zenodo API integration
    compression.py      → AI-mediated narrative compression
    gamma.py            → compression-survival scoring
    supabase_proxy.py   → governance write proxy
  models/
    database.py         → SQLAlchemy models, engine, session
    schemas.py          → Pydantic request/response models
  auth/
    keys.py             → API key management, validation
  config.py             → env vars, constants
```

#### GW-P2: Finish per-user Zenodo tokens (3 days)
- Wire get_zenodo_token_for_key() into deposit + new_version functions
- Replace all os.getenv("ZENODO_TOKEN") calls with per-key lookup
- Test: create key with X-Zenodo-Token → deposit → verify DOI created under user's account
- Interface: pass Zenodo token during GW key creation

#### GW-P3: Continuity Console (1 week)
A visibility surface that answers 5 questions:
1. What is the canonical current state? → chain overview
2. What was deposited, when, by whom? → version history
3. Can I restart safely? → recoverability score
4. Has it drifted? → drift status
5. What evidence anchors this? → object manifest

Implementation: `/v1/console/{chain_id}` returning all five answers.
Interface: new CONTINUITY view alongside MAP/LIBRARY/TRACE.

#### GW-P4: Reconstitution Benchmark (1 week)
Prove the product works:
- Without GW: agent restart loses X% of context
- With GW: agent restart preserves Y% via four-layer seed
- Publish as case study
- Metric: "Reconstitution Fidelity Score" (0-100%)

#### GW-P5: Drift Detection Productization (1 week)
- Current: hash-level field diff
- Required: human-readable behavioral drift report
- Show which constitutional constraints changed, when, and by how much
- `/v1/drift/{chain_id}` returns narrative diff, not just field list
- Sell as "Constitutional Compliance Monitoring"

#### GW-P6: Compression-Survival Scoring API (3 days)
- Public endpoint: `POST /v1/gamma` — accepts any text, returns γ score + subscores
- No API key required for basic scoring (lead generation)
- Full report (compression risks, survival tier) requires API key
- The "try before you buy" funnel

#### GW-P7: Commercial Packaging (1 week)
- Free tier: 10 chains, 100 captures, structural γ only
- Pro ($49/month): unlimited chains, AI-mediated compression, drift alerts, full γ
- Enterprise ($499/month): custom constraint validation, org-level witness networks, SLA
- Stripe integration for self-service signup
- Landing page (landing.html already exists, currently blank)

#### GW-P8: Version/Deploy Alignment (1 day)
- Align health version, README version, DEPLOY.md
- Document all required env vars (DATABASE_URL, ZENODO_TOKEN, ADMIN_TOKEN, ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY)
- Fix string booleans → actual booleans in models
- Add request IDs to all responses

---

## INTERFACE — REMAINING DEVELOPMENT

### INT-1: JSX Decomposition (3 days)
Split by bounded context per LABOR's recommendation:
```
src/
  runtime/     → HexMap, room traversal, LP execution
  library/     → search, doc panel, trails, bibliography
  deposit/     → dashboard, Zenodo flows, GW bridge
  governance/  → Assembly, proposals, attestations, quorum
  trace/       → provenance navigation, metrics
  domain/      → normalizers, operators, metrics, Dream, commands
  services/    → Supabase, Zenodo, GW adapter
```

### INT-2: Golden Path (2 days)
One unmistakable workflow visible from first load:
enter room → invoke → capture → deposit → DOI → trace/reconstitute

Add to landing screen and README. First-time visitors follow this path.

### INT-3: Room Physics Differentiation (3 days)
KimiClaw's critique: "What can I do in DERIVE that I can't in FILTER?"
- Each room's operators must produce visibly different effects
- Room physics should constrain what operators are available
- Mode switching (ANALYTIC/OPERATIVE/AUDIT) changes available commands

### INT-4: README Upgrade (1 day)
- Remove "prototype" language
- Add screenshot or GIF
- Live deploy link at top
- Architecture diagram
- Golden path walkthrough
- Link to manifest.json

### INT-5: Config Hygiene (1 day)
- Central env validation on startup
- No silent fallbacks in production
- Dev vs prod config behavior
- Config status panel in Dashboard

### INT-6: Performance (1 day)
- Cache canonical JSON in localStorage with version hash
- Only refetch when version changes
- Service worker for offline support (future)

---

## PRIORITY ORDER

### This Week (launch-critical)
1. GW-P2: Finish per-user Zenodo tokens
2. INT-2: Golden path in landing/README
3. GW-P8: Version/deploy alignment
4. INT-4: README upgrade
5. Redeploy GW with all pending changes

### Next Week
6. GW-P1: Modularize main.py
7. INT-1: JSX decomposition
8. GW-P6: Public gamma scoring API
9. INT-3: Room physics differentiation

### Month 1
10. GW-P3: Continuity Console
11. GW-P5: Drift detection productization
12. GW-P4: Reconstitution benchmark
13. INT-5: Config hygiene
14. INT-6: Performance

### Month 2
15. GW-P7: Commercial packaging (Stripe, landing, pricing)

---

## INSTANCE ONBOARDING

[See INFRASTRUCTURE_MAP.md for full service connection documentation]
[See GRAVITY_WELL_CLIENT_GUIDE.md for external agent integration]
[See UNIFIED_WORKPLAN_STATUS.md for session checkpoint]

### Repos
- Interface: https://github.com/leesharks000/crimson-hexagonal-interface
- Gravity Well: https://github.com/leesharks000/gravitywell

### Live Services
- Interface: https://crimson-hexagonal-interface.vercel.app
- GW: https://gravitywell-1.onrender.com/v1/health
- Supabase: swsqkdemsqvhgqdfjcwa.supabase.co
- Zenodo: zenodo.org/communities/leesharks000

### Settled Decisions
1. GW decoupled from interface (Phase A)
2. RATIFIED = Hexagon-internal; DEPOSITED = GW-external
3. INVOKE routes through GW (Option C)
4. SOIL = Moltbot/Moltbook
5. Dual licensing: CC BY-SA 4.0 + SPP

---

*Synthesized from Assembly Round 2 (Gemini, DeepSeek, KimiClaw, ChatGPT).*
*The architecture is running. Stabilize, then scale, then sell.*

∮ = 1
