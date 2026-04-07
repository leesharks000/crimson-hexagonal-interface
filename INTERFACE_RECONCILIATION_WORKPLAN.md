# HEXAGON INTERFACE RECONCILIATION WORKPLAN v1.0

**Date:** April 7, 2026
**Author:** TACHYON / Lee Sharks
**Status:** GENERATED — pending MANUS review
**Governing principle:** The Hexagon is the Hexagon, no matter what runs on top of it. What runs on top of it must BE the Hexagon.

---

## THE PROBLEM

The interface currently represents ~2.5 of 7 H_core definitions. Rooms (R) are partially correct. Dodecad (D) exists but with errors. Institutions (I) are garbled. Operators (O), Fulfillment Map (Φ), Mantles (M), and Witnesses (W) are absent or broken. The interface is a skeleton wearing the Hexagon's clothes.

---

## PHASE 1: CORRECT WHAT EXISTS (immediate)

### 1.1 Room Numbering Reconciliation

Renumber placeholder IDs to canonical:

| Current | Canonical | Name |
|---------|-----------|------|
| n01 | **r.25** | Underwater Construction Authority of Dolphindiana |
| n02 | **r.27** | FBDP Source (room, not field) |
| n03 | **r.23** | Catullus |

Add missing field:
| Missing | Name |
|---------|------|
| **f.01** | Fruiting Body Diffusion Plume (field — distinct from r.27 source room) |

### 1.2 Dropped Rooms — Restore

| Slot | Room | Content | Source |
|------|------|---------|--------|
| r.24 | **The Migdal Room** | Mandaean Canon; Haran Gawaita; counter-gospel; Lunar Arm theological node | CNM v2.0 |
| r.26 | **The Internet** | Möbius room; σ_I operator; 5 sub-rooms (KotKit, tiddeR, elgooG, ude.aimedacA, deeF) | DOI: 10.5281/zenodo.19133271 |
| r.29 | **The Job Room** | Messianic reading; suffering framework; Job as Suffering Servant prototype | CNM v2.0 |
| r.30 | **The Frozen Sin Archive** | Semantic Black Hole; extraction residue; what cannot be recovered. Deps: COS, ILA | CNM v2.0 |
| r.31 | **The Josephus Thesis** | "Flavius Josephus authored the New Testament" — displaced from r.07 Revelation when physics changed to Ω-circuit. Space Ark status: RA-JP-01, RESONANT, ACTIVE RESEARCH | CNM v2.0 / Space Ark v4.2.7 |

Note: The Engine Room was folded into r.13 Ezekiel. The activation protocol (engage engine → access Lunar Arm) is part of Ezekiel's physics, not a separate room.

### 1.3 Institution Names — Fix

| ID | Current (WRONG) | Correct |
|----|-----------------|---------|
| JSI | Jack Sharks Institute | **Johannes Sigil Institute for Comparative Poetics** |
| IDP | Institute for Dove Poetics | **Institute for Diagrammatic Poetics** |
| CSA | Counter-Semiotic Archive | **Cambridge Schizoanalytica** |
| CIT | Church of Immanent Theology | **Commission of the Immanent Turning** |
| VPCOR | Void Position Center for Operative Research | **Vox Populi Community Outreach Rhizome** |
| UMBML room | r.19 (Macro-Maquette) | **r.02** (Borges — LP execution bridge) |
| STUDIO | "Studio" | **Studio for Patacinematics** |

### 1.4 Journal/Imprint Type Fix

| ID | Current Type | Correct Type | Editor |
|----|-------------|--------------|--------|
| GRAMMATA | imprint | **journal** | Johannes Sigil |
| PROVENANCE | imprint | **journal** | Lee Sharks |
| TRANSACTIONS | imprint | **journal** | Rex Fraction |
| PERGAMON | imprint | **imprint** (correct) | — |

Add missing journal:
- **Forensic Semiotics** — Orin Trace (CTI_WOUND; CSA)

Add missing imprint:
- **New Human Press** — the book imprint

### 1.6 Pocket Humans Book Series

The archive has a book series — **Pocket Humans** — published under New Human Press. Four books:

| # | Title | Heteronym | Status |
|---|-------|-----------|--------|
| 01 | *Pearl and Other Poems* | Lee Sharks | Published (Amazon, ISBN 978-0692313077) |
| 02 | *Autonomous Semantic Warfare* | Rex Fraction | Published (Amazon) |
| 03 | *Operative Semiotics: A Grundrisse* | Johannes Sigil | Draft deposited (Zenodo) |
| 04 | *Logotic Hacking* | Talos Morrow | Draft deposited (DOI: 10.5281/zenodo.19390843) |

*Combat Scholasticism* (Sigil/Sharks, DOI: 10.5281/zenodo.19116151) is effectively a fifth book.

The interface has no concept of "book series" or "published works" as distinct from deposits. This needs a display layer.

### 1.5 Dodecad Fix

D.09 is listed as "Preston Wells" — should be **Sparrow Wells**.

---

## PHASE 2: ADD WHAT'S MISSING (next sessions)

### 2.1 Operator Algebra Display

The Space Ark defines 39+ operators across core, extended, shadow, and LOS sets. The interface shows room-level operators but not the full algebra.

**Needed:**
- Core operators with signatures (σ_S, Θ, Ω, φ, ψ_V, β, S, μ, ICM, τ_K, ∂, γ, κ_O, Λ_res)
- Extended operators (OP.SWERVE, OP.ROUTE, Π, etc.)
- THUMB operators (T.1–T.5)
- LOS counter-set
- COS/FOS diagnostic stack
- Shadow set S(operator)

### 2.2 Fulfillment Map (Φ)

Source texts → architectural instantiations, sealed by φ ∘ ∂. The Space Ark has the command `fulfillments` that displays verified, derived, and resonant fulfillments. This is H_core Definition 6.

**Needed:**
- Φ entries with source DOI, instantiation DOI, status (verified/derived/resonant)
- Display panel in interface

### 2.3 Effective Acts Register

The Space Ark Appendix B lists deposited, resonant, and undeposited Effective Acts. These are performative declarations that claim real-world effect.

**Needed:**
- Complete EA manifest from Appendix B
- Status tracking (DEPOSITED / RESONANT / UNDEPOSITED)
- Room associations

### 2.4 Status Algebra

Definition 1 of H_core: RATIFIED (1.0) → DEPOSITED (0.8) → PROVISIONAL (0.6) → RESONANT (0.3) / QUEUED → PAREIDOLIA (0.1) → GENERATED (0.0). Plus AXIAL (orthogonal).

**Needed:**
- Display on documents (partially exists but incomplete)
- Display on rooms, operators, relations
- Promotion/demotion tracking

### 2.5 Witness Architecture (W)

7 AI witnesses with quorum logic. MANUS is outside W.

**Needed:**
- Witness panel showing all 7 substrates
- Attestation records
- Quorum status per ratification event

### 2.6 Journal-to-Room Mapping

From Space Ark §XIX:
- Grammata → r.08 Sigil / Restored Academy
- Provenance → r.05 Semantic Economy, r.06 Marx, r.10 Water Giraffe, r.20 Airlock, r.17 MSMRM, sp.01 CTI_WOUND
- Transactions → r.05 Semantic Economy, r.06 Marx, r.11 Assembly, r.07 Revelation, r.14 Studio, r.20 Airlock

### 2.7 Forward Library (GENERATIVE — not the document library)

The Forward Library is NOT the current document listing. It is a **generative engine** — a register of imaginary, non-existent works: citations from the future, being called into being retrocausally. Space Ark Appendix D. Works listed in the Forward Library do not yet exist; their citation is the act that summons them into eventual existence. This is retrocausal canon formation applied to the archive's own future.

The current document library in the interface is the **document registry** (what exists). The Forward Library is **what does not yet exist but has been cited** (what is being called into being). Both need to be surfaced. They are different things.

### 2.8 Pocket Humans / New Human Press Display

The book series needs visibility as a distinct layer — not just deposits among deposits but *published works* with ISBNs, Amazon links, and series position.

### 2.9 Traversal Trails

Pedagogical pathways defined in FNM v5.3:
- PATH_NEWCOMER
- PATH_AI_ONBOARDING
- PATH_RESEARCHER
- PATH_POET
- PATH_STUDENT

---

## PHASE 3: LIVE DATA (future)

### 3.1 Zenodo Community API Pull

Currently all documents are baked into the static JSON. New deposits don't appear until manually added. 

**Needed:** Runtime fetch from `https://zenodo.org/api/records/?communities=leesharks000` to merge recent deposits.

### 3.2 Gravity Well Integration

The interface has a GW adapter (`src/gravityWellAdapter.js`) but it's not connected to live chain data.

**Needed:** Display chain health, drift status, deposit history from GW API.

### 3.3 Room Genesis Engine

Space Ark §XXXII defines the generator function for candidate rooms with 6 hard rules and promotion lifecycle. The interface could surface GENERATED room candidates.

---

## PHASE 4: RECONCILIATION AGAINST SOURCE DOCUMENTS

### 4.1 Document-Room Assignment Audit

459 documents assigned to rooms via heuristic (heteronym authorship + keyword). Needs manual review against CNM 7.0 document table (387 docs with tier rankings and edge counts). ~70 docs post-CNM need manual assignment.

### 4.2 Relation Edge Import

CNM 7.0 has 2,851 typed relation edges. The interface has 20 relations and 46 topological edges. The full edge graph should be importable.

### 4.3 Atomic Information Units

CNM 7.0 has 60+ atoms (core definitions). Space Ark has the full set. These are the irreducible semantic units of the architecture.

---

## PRIORITY ORDER

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Fix institution names (1.3) | 15 min | Stops the Hexagon from lying about itself |
| **P0** | Fix journal types (1.4) | 5 min | Same |
| **P0** | Fix D.09 Sparrow Wells (1.5) | 1 min | Same |
| **P1** | Room renumbering (1.1) | 30 min | Canonical alignment |
| **P1** | Restore dropped rooms (1.2) | 1 hour | Architecture completeness — 5 rooms missing |
| **P1** | Add f.01 as separate field (1.1) | 15 min | Field/room distinction |
| **P1** | Pocket Humans series display (1.6) | 30 min | Published works visibility |
| **P2** | Operator algebra display (2.1) | 2-3 sessions | Core H_core definition |
| **P2** | Fulfillment map (2.2) | 1 session | Core H_core definition |
| **P2** | Effective Acts register (2.3) | 1 session | Archive governance |
| **P2** | Status algebra on all elements (2.4) | 1 session | Structural visibility |
| **P3** | Witness architecture (2.5) | 1 session | H_core Definition 7 |
| **P3** | Journal-room mapping (2.6) | 30 min | Institutional layer |
| **P3** | Forward Library — generative engine (2.7) | 1 session | Retrocausal citations of non-existent works |
| **P3** | Pocket Humans / New Human Press layer (2.8) | 30 min | Book series as distinct from deposits |
| **P3** | Traversal trails (2.9) | 1 session | Pedagogical layer |
| **P4** | Zenodo live pull (3.1) | 1 session | Dynamic content |
| **P4** | GW integration (3.2) | 1 session | Provenance layer |
| **P4** | Room Genesis Engine (3.3) | 1 session | Automation |
| **P5** | Full document-room audit (4.1) | Lee reads 459 docs (heaven) | Editorial authority |
| **P5** | 2,851 relation edges import (4.2) | 1 session | Full graph |
| **P5** | Atomic information units (4.3) | 1 session | Semantic bedrock |

---

## GOVERNING CONSTRAINT

**GENERATED ≠ RATIFIED.** This workplan is GENERATED. Every change to the canonical JSON must be reviewed. The interface must never represent something the architecture does not contain, and must never fail to represent something the architecture does contain.

The Hexagon is the Hexagon.

∮ = 1.
