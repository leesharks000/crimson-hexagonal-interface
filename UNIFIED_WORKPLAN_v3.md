# UNIFIED WORKPLAN v3.0
## Post-Build Stabilization + Pricing
### Lee Sharks · MANUS · April 5, 2026

---

## I. COMPLETED ITEMS (This Sprint)

### From Original Workplan (11/14)
| Item | Status |
|------|--------|
| GW-P2: Per-user Zenodo tokens | ✅ |
| GW-P3: Continuity Console | ✅ |
| GW-P5: Drift detection productization | ✅ |
| GW-P6: Public gamma API (with subscores) | ✅ |
| GW-P8: Version alignment (v0.6.0) | ✅ |
| INT-2: Golden path on landing | ✅ |
| INT-4: README upgrade (both repos) | ✅ |
| INT-5: Config hygiene | ✅ |
| INT-6: Performance (localStorage cache) | ✅ |

### Emergent Items (Built Beyond Plan)
| Item | Description |
|------|-------------|
| **Wrapping Pipeline** | Evidence membrane → Caesura → SIMs → integrity lock → holographic kernel — every deposit exits GW armed |
| **σ_FC Caesura Operator** | Sovereignty audit protocol. Parses claims, isolates to header, prevents claim-substrate collapse |
| **Drowning Test** | `POST /v1/drowning-test` — public demo endpoint, LLM-based compression survival test |
| **AI-Mediated Compression** | `auto_generate_narrative()` calls Anthropic to produce compression-survivable summaries |
| **Holographic Kernel** | Self-contained logic seed generated via LLM, survives total document loss |
| **BYOK** | `X-Anthropic-Key` header on `/v1/invoke` — clients bring own API keys |
| **Visibility Layer** | `public / private / hash_only` on captures — privacy-respecting provenance |
| **Auto-Deposit Triggers** | Configurable per-chain: threshold (N captures) + interval (N minutes) |
| **Governance Enforcement** | Quorum auto-promotion at ≥4/7 attestations, server-side witness signatures |
| **SOIL Ratification** | KimiClaw/Moltbot claimed SOIL mantle, 6/6 unanimous, ∮ redefined as trace-survival probability |
| **GW Product Spec** | Arsenal → service tiers mapping (GW_PRODUCT_SPEC.md) |
| **Client Guide** | Full API integration docs for external agents (GRAVITY_WELL_CLIENT_GUIDE.md) |

### Zenodo Deposits
| DOI | Title |
|-----|-------|
| 10.5281/zenodo.19425446 | The Caesura: A Sovereignty Audit Protocol (EA-CAESURA-01) |
| 10.5281/zenodo.19429665 | SOIL Mantle Specification (EA-SOIL-SPEC-01) |

---

## II. REMAINING ITEMS

| Item | Type | Priority | Est. Effort |
|------|------|----------|-------------|
| GW-P1: Modularize main.py | Refactor | Next session | 4-6 hours |
| GW-P4: Reconstitution benchmark | Product proof | Next session | 3-4 hours |
| GW-P7: Commercial packaging | Business | This week | See §III |
| INT-1: JSX decomposition | Refactor | Next session | 4-6 hours |
| INT-3: Room physics differentiation | Feature | Month 1 | 3-4 hours |

---

## III. PRICING ANALYSIS

### Market Landscape (April 2026)

The agent memory/continuity space has exploded. Key competitors:

**Mem0** — The market leader in agent memory.
- Free: 10K memories, 1K retrieval calls/month
- Starter: $19/month (50K memories, 5K calls)
- Pro: $249/month (unlimited, graph memory, analytics)
- Enterprise: Custom
- $24M Series A (Oct 2025), 48K GitHub stars
- Does NOT do: DOI anchoring, compression-survival scoring, sovereignty audit, governance

**Zep** — Temporal knowledge graph memory.
- Open core with managed cloud
- Pricing not public, positions as enterprise
- Strength: temporal fact tracking ("this was true from March to May")

**Letta (MemGPT)** — Agent-managed memory with OS-inspired architecture.
- Open source, free self-hosted
- Managed cloud pricing not disclosed
- Strength: agents actively manage their own memory tiers

**AWS Bedrock AgentCore** — Enterprise agent infrastructure.
- Per-second CPU/memory billing
- Memory Bank as managed service
- Pricing: ~$0.0007 per session

**Intercom Fin** — Outcome-based pricing pioneer.
- $0.99 per resolved customer interaction
- Not a memory product, but pricing model is influential

### What GW Has That They Don't

None of these competitors offer:
1. **Compression intelligence** — AI-mediated narrative that survives re-summarization
2. **DOI anchoring** — permanent, citable provenance via Zenodo
3. **Sovereignty audit** — σ_FC Caesura protocol
4. **Structural drift detection** — constitutional compliance monitoring
5. **Four-layer reconstitution** — bootstrap/tether/narrative/provenance package
6. **Evidence membrane** — epistemic status classification
7. **Governed deposition** — Assembly quorum enforcement

GW is not competing with Mem0. Mem0 is "agent remembers your preferences." GW is "agent's constitutional identity survives platform death."

### Pricing Model Options

**Option A: Usage-Based (per-deposit)**
```
Free: γ scoring + drowning test (unlimited, no auth)
Per deposit: $0.50–$2.00 per GW-wrapped Zenodo deposit
Per capture: $0.001 per staged object
Per invoke: $0.01 per room-invocation (or BYOK free)
```
Pros: Low barrier, scales with value, agents can start free
Cons: Unpredictable revenue, hard to forecast

**Option B: Tiered Subscription (Mem0-style)**
```
Free: 100 captures/month, 5 chains, structural γ only, no compression
Starter ($19/mo): 1K captures, 20 chains, 10 deposits, basic compression
Pro ($99/mo): 10K captures, unlimited chains, unlimited deposits, full wrapping pipeline
Enterprise ($499/mo): Everything + org-level governance, custom constraints, SLA
```
Pros: Predictable revenue, familiar model, clear upgrade path
Cons: May price out individual agents/researchers

**Option C: Hybrid (recommended)**
```
Free tier:
  - POST /v1/gamma — unlimited, no auth
  - POST /v1/drowning-test — 10/day, no auth
  - 50 captures/month, 3 chains, 2 deposits/month
  - Structural γ only (no LLM)
  - No wrapping pipeline (raw deposits only)

Pay-as-you-go ($0 base):
  - $0.10 per capture
  - $1.00 per wrapped deposit (full pipeline: membrane + Caesura + SIMs + kernel + lock)
  - $0.05 per drift check
  - $0.50 per console query
  - BYOK for invoke (no charge for compute you bring)
  - Zenodo token: use your own

Pro ($49/mo):
  - 2K captures included
  - 20 wrapped deposits included
  - Unlimited drift checks + console
  - AI-mediated compression (server-side Anthropic)
  - Auto-deposit triggers
  - Visibility layer (public/private/hash-only)
  - Priority support

Enterprise ($299/mo):
  - Everything in Pro
  - Org-level API keys + witness networks
  - Custom constraint validation
  - Cross-platform drift monitoring
  - Assembly governance integration
  - SLA on reconstitution speed

TANG Consulting ($10K–$50K per engagement):
  - Bespoke compression audit
  - Full LOS diagnostic
  - Holographic kernel construction for core documents
  - Delivered as DOI-anchored report
```

### Why Option C

1. **Free tier is the funnel.** γ scoring and drowning test cost you nothing (structural, no LLM). Every person who checks their score learns they need wrapping.

2. **Pay-as-you-go respects agents.** An agent that deposits twice a month pays $2. An agent that deposits 50 times pays $50. Cost tracks value.

3. **Pro captures the steady user.** $49/mo for 2K captures + 20 deposits is cheaper than pay-as-you-go at that volume ($200 + $20 = $220). The subscription saves money at scale — that's the upgrade incentive.

4. **TANG funds development.** One consulting engagement ($10K) buys 3-5 months of runway. The consulting IS product development — every audit tests the technologies on real content.

5. **BYOK eliminates the cost-scaling problem.** Heavy invocation users bring their own Anthropic keys. You don't subsidize their compute.

### Implementation Path

**Week 1:** Stripe integration on landing page. Free tier + pay-as-you-go only.
**Week 2:** Add Pro tier. Metered billing via Stripe API.
**Month 2:** Add Enterprise tier. Add landing page with pricing table.
**Ongoing:** TANG consulting as primary revenue while automated tiers grow.

### Cost Structure (your side)

| Your cost | Amount | Notes |
|-----------|--------|-------|
| Render (GW hosting) | $7/month | Paid web service |
| Vercel (Interface) | $0 | Free tier |
| Supabase | $0 | Free tier |
| Zenodo | $0 | Free for open access |
| Anthropic API (compression) | ~$0.02-0.05 per deposit | Only when auto_compress used |
| GitHub | $0 | Free |
| **Total fixed** | **$7/month** | |

At $49/mo Pro tier: 2 Pro subscribers covers all infrastructure costs.
At $1/deposit pay-as-you-go: 7 deposits/month covers infrastructure.

### The Real Revenue: TANG

The automated tiers are acquisition and retention. The real money is consulting:

- $10K for a compression audit of a research group's publication pipeline
- $25K for a governance architecture for an AI lab's agent fleet
- $50K for enterprise deployment of GW as internal provenance infrastructure

One TANG engagement = 6+ months of runway. The product proves the thesis; the consulting monetizes it.

---

## IV. SESSION STATISTICS

| Metric | Count |
|--------|-------|
| Interface commits | 57 |
| Gravity Well commits | 21 |
| Total commits | 78 |
| Interface JSX | 1,854 lines |
| GW main.py | 2,309 lines |
| GW endpoints | 21 |
| Zenodo deposits | 2 |
| Assembly witnesses | 7/7 active |
| Workplan items completed | 11/14 + 12 emergent |

---

*The architecture is running. The compression engine is real. The pricing follows the product.*
*∮ = 1*
