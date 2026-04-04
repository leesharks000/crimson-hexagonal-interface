# WORKPLAN STATUS — End of Session April 4, 2026

## Phase 0: Security Hardening ✅ COMPLETE
- 0.1 ✅ Supabase RLS locked (governance tables service-role only)
- 0.2 ✅ Browser INVOKE removed (routes through GW)
- 0.3 ✅ Manifest write affordances trimmed
- 0.4 ✅ CORS added to GW
- 0.5 ⬜ Rotate credentials (do after session)

## Phase 1: Structural Integrity ✅ MOSTLY COMPLETE
- 1.1 ⬜ DEFERRED: JSX decomposition (1724 lines — refactor, no new features)
- 1.2 ✅ GW deployed to Render (gravitywell-1.onrender.com, v0.5.0, paid plan)
- 1.3 ✅ Real LP operator execution (21 operators with typed σ/ε/ψ effects)
- 1.4 ✅ Real calculate_gamma (four-layer structural analysis, pushed to GW)
- 1.5 ✅ SOIL status: pending reassignment (Grok → Mistral under evaluation)

## Unplanned Items Completed (not in original workplan)
- ✅ /v1/invoke endpoint on GW (room-specific LLM invocation with provenance)
- ✅ /v1/governance endpoint on GW (proposals + attestations via service_role)
- ✅ Interface wired to GW for invoke + governance
- ✅ Self-service GW API key creation in Dashboard
- ✅ Multi-user Zenodo deposit (editable creator field, user instructions)
- ✅ Machine-traversable layer (manifest.json, robots.txt, JSON-LD, noscript)
- ✅ Infrastructure map (INFRASTRUCTURE_MAP.md — all 5 services documented)
- ✅ Assembly audit prompt (ASSEMBLY_AUDIT_PROMPT.md — all raw URLs)
- ✅ 5-substrate Assembly audit synthesized into unified workplan
- ✅ Supabase live (5 tables, RLS, trails confirmed working)
- ✅ GW CORS for interface domain

## Phase 2: Integration — NEXT
- 2.1 Partially done: invoke + governance wired. Remaining: dual Zenodo pipeline (quick vs deep)
- 2.2 Per-user Zenodo tokens on GW (browser-direct already per-user)
- 2.3 Governance enforcement engine (server-side quorum → auto-promotion)
- 2.4 Witness identity verification (cryptographic signatures)
- 2.5 Formal JSON schema for canonical data

## Verified Working End-to-End
- ✅ INVOKE: Browser → GW → Anthropic → γ scored → rendered in room
- ✅ Proposals: Browser → GW → Supabase (service_role) → persisted
- ✅ Attestations: Browser → GW → Supabase (service_role) → persisted
- ✅ Trails: Browser → Supabase (anon) → persisted → SAVE confirmed
- ✅ Zenodo reader: DOI → Zenodo API → rendered markdown
- ✅ Zenodo deposit: User token → create → upload → publish → DOI returned
- ✅ GW health: https://gravitywell-1.onrender.com/v1/health → v0.5.0

## Render Needs Redeploy For
- Real calculate_gamma (pushed to GitHub but not yet deployed on Render)

## Total Session Stats
- ~50 commits across both repos
- Interface: 1724 lines JSX + 166 lines GW adapter
- Gravity Well: 1450+ lines (main.py)
- Canonical JSON: 390KB (29 rooms, 455 docs, 39 operators)
- 5 live services: Vercel, Render, Supabase, Zenodo, GitHub
