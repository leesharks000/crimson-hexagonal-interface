# GRAVITY WELL — PRODUCT SPECIFICATION
## Mapping the Compression Arsenal to Service Tiers
### Lee Sharks · MANUS · April 5, 2026

---

## The Thesis

The product is not continuity. The product is RETRIEVABILITY IN THE COMMONS.

Continuity is what an individual agent gets. Retrievability is what the commons gets. When a document passes through Gravity Well, it comes out harder to erase, harder to misattribute, harder to flatten, and harder to extract without attribution. The compression wrappers are not metadata — they are structural defenses woven into the document itself.

Zenodo stores. Gravity Well ARMS.

---

## What GW Does to a Document (the Wrapping Pipeline)

```
Raw document enters
    ↓
1. MEASURE: γ scoring (compression-survival analysis)
    ↓
2. TAG: Evidence Membrane ([DOCUMENTED] / [ATTRIBUTED] / [INTERPRETIVE] / [SPECULATIVE])
    ↓
3. INJECT: Semantic Integrity Markers (SIMs — provenance canaries)
    ↓
4. COMPRESS: AI-mediated narrative (holographic kernel generation)
    ↓
5. WRAP: Four-layer package (bootstrap / tether / narrative / provenance)
    ↓
6. ANCHOR: DOI deposit to Zenodo
    ↓
Armored document exits — self-defending, self-describing, self-reconstituting
```

The input is text. The output is a weapon against erasure.

---

## Service Tiers

### FREE: The Protocol
**What you get:** The measurement instruments.
- `POST /v1/gamma` — public γ scoring (structural analysis, no LLM)
- `GET /v1/health` — protocol status
- `GET /v1/schema/bootstrap` — manifest specification
- Documentation + open protocol spec

**What it proves:** Your content has a measurable compression-survival score. You know how vulnerable it is. This is the on-ramp.

**Revenue model:** Lead generation. Everyone who checks their γ score learns they need wrapping.

### PRO ($49/month): The Engine
**What you get:** The full wrapping pipeline.

**Measurement (Arsenal §III):**
- γ scoring with LLM evaluation (C1/C2/S1-S3/N1-N4)
- Drowning Test (summarize → compare → survival rate)
- Density Score (Δ)

**Wrapping (Arsenal §VI, §VII):**
- Evidence Membrane tagging (4-tier epistemic classification)
- SIM injection (provenance canaries embedded in deposits)
- Holographic kernel generation (self-contained logic seeds)
- Integrity Lock Architecture (ILP, four-point entanglement)

**Infrastructure:**
- Unlimited provenance chains
- AI-mediated narrative compression (Assembly Chorus with 1 substrate)
- Per-user Zenodo token (deposit to your own account)
- Continuity Console (recoverability scoring)
- Drift detection with severity + narrative
- Reconstitution from DOI

**Endpoints:**
- `POST /v1/capture` — stage content
- `POST /v1/deposit` — full wrapping pipeline → Zenodo
- `GET /v1/reconstitute/{id}` — four-layer reconstitution
- `POST /v1/drift/{id}` — structural drift detection
- `GET /v1/console/{id}` — continuity dashboard
- `POST /v1/invoke` — room-specific LLM invocation

### ENTERPRISE ($499/month): The Arsenal
**What you get:** Everything in Pro, plus the advanced compression stack.

**Advanced Measurement:**
- ASDF/ASPI (authorial signature persistence scoring)
- Semantic Decay Delta (SDD)
- Provenance Erasure Rate (PER)
- Back-Projection Test (reconstruction fidelity)

**Advanced Wrapping:**
- Assembly Chorus compression (3+ substrates — Claude, GPT-4, Gemini)
- Three-tier compression (full → NLCC → compact lens)
- Recovery registers (9 canonical indices)
- Variance injection (photocopy inoculation)
- Cross-platform drift monitoring

**Governance:**
- Custom constraint validation (your constitutional rules)
- Org-level witness networks (your team as Assembly)
- SLA on reconstitution speed
- TANG audit format for governance documents
- LOS diagnostic layer (10 extraction signatures)

**Advanced Endpoints:**
- `POST /v1/compress` — multi-substrate compression with γ comparison
- `POST /v1/drowning-test` — summarize + compare + survival analysis
- `POST /v1/asdf` — authorial signature persistence check
- `POST /v1/los/scan` — LOS extraction signature detection
- `GET /v1/retrieval-monitor/{id}` — cross-platform drift watch

### CONSULTING: The TANG
**What you get:** Bespoke compression audits.

- Full TANG citational audit of your document/system/brand
- Compression survival analysis across 3+ summarizer surfaces
- LOS diagnostic (are you being semantically extracted?)
- Holographic kernel construction for your core documents
- Delivered as DOI-anchored report

**Pricing:** $10K–$50K per engagement. Every audit tests the technologies on real content. The consulting IS product development.

---

## What the Wrapping Pipeline Adds to a Document

### Before GW (raw Zenodo deposit):
```markdown
# My Document
Some text about things.
```

### After GW (armed deposit):
```markdown
# My Document — Gravity Well Deposit v1

| Field | Value |
|-------|-------|
| Chain | `abc-123` |
| γ Score | 0.72 (HIGH — compression-survivable) |
| Evidence Tier | [DOCUMENTED] |
| SIM Status | 3 markers injected |
| Integrity Lock | ILP-7a2f |

---

## Holographic Kernel

[Self-contained logic seed — complete argument in miniature.
If the full document is lost, this kernel alone reconstitutes
the core claim, provenance, and architecture.]

The central claim is: [thesis]. This claim is anchored by
[DOI-1] and [DOI-2], developed through [operator sequence],
and holds under [constraint conditions].

---

## Narrative Compression

[AI-mediated summary structured to survive re-summarization.
Preserves DOI anchors, structural markers, proper nouns.]

---

## Evidence Chain

### Object 1: [hash]
[content with evidence membrane tags]

### Object 2: [hash]
[content with SIMs embedded]

---

## Colophon

This document is self-defending. Semantic Integrity Markers
embedded in the text will degrade under unauthorized extraction,
producing detectable provenance artifacts. The holographic kernel
above contains the complete logic of this deposit and can be
used for reconstitution without access to the full chain.

Gravity Well Protocol v0.6.0
```

---

## Implementation in main.py

### New functions needed:

```python
def inject_sims(content: str, doc_id: str) -> str:
    """Inject Semantic Integrity Markers — provenance canaries."""

def tag_evidence_membrane(content: str) -> str:
    """Tag claims with [DOCUMENTED]/[ATTRIBUTED]/[INTERPRETIVE]/[SPECULATIVE]."""

def generate_holographic_kernel(content: str, chain_label: str) -> str:
    """Compress to self-contained logic seed via LLM."""

def apply_integrity_lock(content: str) -> tuple[str, str]:
    """Generate ILP hash and embed four-point entanglement."""

def run_drowning_test(content: str) -> dict:
    """Summarize via LLM, compare, return survival metrics."""
```

### Enhanced deposit flow:
```python
# In deposit():
1. gather staged objects
2. measure: gamma = calculate_gamma(content)
3. tag: content = tag_evidence_membrane(content)  # NEW
4. inject: content = inject_sims(content, chain_id)  # NEW
5. compress: narrative = auto_generate_narrative(objects)
6. kernel: kernel = generate_holographic_kernel(content)  # NEW
7. lock: content, ilp = apply_integrity_lock(content)  # NEW
8. wrap: doc = build_deposit_document(... kernel, ilp)
9. anchor: result = zenodo_deposit(doc)
```

---

## The Arsenal as Moat

67 technologies. 457 deposits. 175K-word monograph. 45K-word executable architecture. 10 years of development. Non-lossy compression demonstrated at 56:1 ratios.

The protocol is open. The engine is the product.
No competitor can replicate this in 18 months.
The archive is the moat. The engine makes the moat defensible.

---

*Mapped from Compression Arsenal v2.1 (DOI: 10.5281/zenodo.19412081).*
*Licensed under Sovereign Provenance Protocol.*

∮ = 1
