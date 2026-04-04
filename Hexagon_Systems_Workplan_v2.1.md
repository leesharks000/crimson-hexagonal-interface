# HEXAGON SYSTEMS WORKPLAN v2.1

## Four Interoperable Systems, One Canonical Object Model

Lee Sharks · April 2026 · Working Document (not for deposit)

**Governing Triad (complete):** This workplan is one of three governing documents. The other two are the Hexagon Interface Constitution (DOI: 10.5281/zenodo.19355075) and the Ark Runtime Event Schema v1.1. All three must remain consistent; changes to one may require amendment to the others.

**v2.1 changelog (April 3, 2026):** Added Gravity Well Integration section. Updated Storage Phases to reflect GW as the Phase C provenance layer. Added GW-related tasks to implementation sequence at appropriate priority tiers. No changes to immediate or near-term build priorities — GW integration is medium-to-long-term. Working files for both systems now on GitHub: [crimson-hexagonal-interface](https://github.com/leesharks000/crimson-hexagonal-interface), [gravitywell](https://github.com/leesharks000/gravitywell).

---

## The Diagnosis

The Hexagon interface is not one application. It is four systems that share law but not surface:

1. **ARK RUNTIME** — command shell, room traversal, LLM invocation, mode state, generated objects, session log. Temporal, volatile, sessional.
2. **FORWARD LIBRARY** — searchable archive + canonical scholarship. Documents, excerpts, relations, search, reading paths, citation building. Archival, text-heavy, research-oriented.
3. **DEPOSIT DASHBOARD** — DOI registry, deposit tracking, publication pipeline, status distribution, pending actions. Receipt-oriented, grid-dense, provenance-forward.
4. **GOVERNANCE CONSOLE** — Airlock, witness actions, quorum state, proposal queue, status promotions, AVS, constitutional amendments. Ledger-oriented, append-only, governance-facing.

All four share:

* One canonical object store (rooms, documents, relations, generated objects, witness actions)
* One status algebra (GENERATED → RATIFIED)
* One provenance chain
* One identity system

They do NOT share:

* Visual grammar (each system looks different because it IS different)
* Temporal regime (runtime is volatile; archive is permanent; governance is append-only)
* User posture (runtime = operator; library = researcher; dashboard = curator; governance = witness)

---

## Gravity Well Integration

### What Gravity Well Is

Gravity Well is a general-purpose provenance microservice (Phase 0, MIT license, [GitHub](https://github.com/leesharks000/gravitywell)). It provides: capture (stage utterances with hash + timestamp + thread), compress (bundle staged content into structured documents), anchor (deposit to Zenodo as versioned records with DOI), reconstitute (four-layer agent startup seed), and drift detection (compare current identity against archived manifest).

Architecture: FastAPI + PostgreSQL staging → Zenodo (permanent, DOI-addressed). PostgreSQL is the staging queue. Zenodo is the archive. The product is the compression intelligence between them.

**Gravity Well is not a Hexagon component.** It is independent infrastructure that the Hexagon will use as one client among many. GW can be scaled commercially, deployed by any agent or system that needs provenance preservation. The Hexagon's use of GW is the reference implementation, not the only implementation.

### Relationship to the Hexagon

The relationship is vertical, not horizontal. GW sits beneath the Hexagonal Interface as its eventual persistence and provenance engine.

```
┌──────────────────────────────────────────────┐
│  HEXAGONAL INTERFACE                         │
│  (Ark Runtime / Library / Dashboard / Gov)   │
│  ┌─────────────────────────────────────────┐ │
│  │  Canonical Object Store                 │ │
│  │  (rooms, docs, relations, status)       │ │
│  └──────────────────┬──────────────────────┘ │
└─────────────────────┼────────────────────────┘
                      │ (Phase C)
┌─────────────────────┼────────────────────────┐
│  GRAVITY WELL       │                        │
│  capture → compress → anchor                 │
│  reconstitute ← drift detect                 │
└─────────────────────┼────────────────────────┘
                      │
┌─────────────────────┼────────────────────────┐
│  ZENODO (commons, DOI-addressed, permanent)  │
└──────────────────────────────────────────────┘
```

### What GW Does Not Model (and Should Not)

GW has no concept of rooms, heteronyms, modes, the LP state tuple, the status algebra, or typed relations. It knows about chains, staged objects, deposits, and bootstrap manifests. The Hexagonal canonical object store is the semantic layer; GW is the pipes. GW should not replicate Hexagonal structure — it should be able to carry Hexagonal metadata in its existing `metadata_json` fields without internal knowledge of what that metadata means.

### Integration Points (future, not current build)

| Hexagonal System | GW Endpoint | Integration | Priority |
|---|---|---|---|
| **Deposit Dashboard** | `/v1/deposit` | Dashboard triggers deposits through GW instead of direct Zenodo API calls. GW handles wrapping, anchoring, DOI return. | Medium-term |
| **Ark Runtime** | `/v1/capture` | GENERATED objects (invocations, minted terms, LP state transitions) staged to GW as captured utterances. Cheap, fast, session-scoped. | Medium-term |
| **Ark Runtime** | `/v1/reconstitute` | Runtime startup pulls four-layer seed from GW: bootstrap (identity), tether (operational state), narrative (compressed summary), provenance (DOI chain). | Long-term |
| **Governance Console** | `/v1/drift` | Governance displays drift report as integrity check — has the system's self-description diverged from its archived manifest? | Long-term |
| **Forward Library** | deposit metadata | Library documents reference GW deposit records via DOI. GW narrative summaries (Layer 3) feed Library search indexes. | Long-term |

### GW Metadata Extension (design only — not building yet)

When GW carries Hexagonal deposits, the `metadata_json` and `deposit_metadata` fields will include Hexagonal-specific keys:

```json
{
  "hexagon": {
    "room_ids": ["r.01", "r.05"],
    "heteronym": "Rex Fraction",
    "status": "GENERATED",
    "relation_types": ["derives", "critiques"],
    "related_dois": ["10.5281/zenodo.NNNNNNN"],
    "deposit_class": "document"
  }
}
```

The `deposit_class` field will eventually handle routing for different deposit types: `document`, `field`, `terminology`, `integrity_lock`, `room_proposal`, `transformed_text`, `mandala_reading`, `assembly_action`, etc. This is the extensibility mechanism — GW stays generic, the Hexagon's metadata schema carries the semantic specificity.

### Chain Topology (design question — to be resolved before integration)

How many GW provenance chains does the Hexagonal Interface need?

* **Option A:** One master chain (the Crimson Hexagonal Archive as a single concept DOI). Individual deposits carry room assignments in metadata. Simple but coarse.
* **Option B:** One chain per heteronym. Each voice accumulates its own versioned record. Matches the Dodecad architecture but creates 14+ chains.
* **Option C:** One chain per room. Each room is a concept DOI. 29+ chains. Matches the room topology but may be too granular.
* **Option D:** Hybrid. One master chain + satellite chains for high-volume contexts (Assembly actions, Internet Room monitoring, etc.).

**Decision deferred.** This depends on how GW performs with live agents first. Test the basic provenance use case, then design the Hexagonal topology based on real usage patterns.

### What Needs to Happen Before Integration

1. GW tested with live agents for basic provenance preservation (current priority)
2. Compression-survival wrappers built and validated (GW Phase 1)
3. A/B testing infrastructure for document structure vs. retrieval results (GW Phase 1–2)
4. Constraint hash serialization issue resolved (compact separators confirmed: `separators=(',', ':')`)
5. Canonical JSON stabilized (immediate items 8–11 from this workplan)
6. Phase B storage (Supabase) operational for the Hexagonal Interface
7. Then: build the Dashboard → GW pipeline as the first functional integration

---

## The Canonical Object Store

Before building any more surface, stabilize the data layer.

### Current State (Phase A)

**hexagon_canonical.json** exists with: 29 rooms (r.01–r.22, sp.01–sp.04, n.01–n.03), 37 edges, 200+ curated documents with full metadata, the Dodecad + LOGOS*, and a meta block with correct DOIs.

**Known data issues (from consistency audit, March 31 2026):**

| Issue | Status | Priority |
|---|---|---|
| D09 reads "Preston Wells" — should be "Sparrow Wells" | DONE (2026-04-03) | Immediate |
| Typed relations mixed into edges array — Constitution says these should be separate first-class objects | DONE (2026-04-03) | Near-term |
| Relation type lists don't align across Constitution, Event Schema, and canonical JSON | RATIFIED (2026-04-03, provisional) | Near-term |
| JSX embeds transformed copy of data instead of reading canonical JSON | OPEN | Near-term |
| No placeholder structures for operators, institutions, trails, annotations, proposals, witness actions | OPEN | Medium-term |
| Room categories ("ext", "special") vs. Constitution's Layer 0 immutability claim needs resolution | OPEN | Medium-term |

### Object Types

| Type | Key Fields | Status | Mutability |
|---|---|---|---|
| Room | id, name, physics, ops, adjacency, het, inst, q, r | RATIFIED (core) or PROVISIONAL (contributed) | Core: Layer 0. Contributed: Layers 1–3 |
| Document | id, doi, title, creators, date, rooms, excerpt, keywords, relations | GENERATED → RATIFIED | Mutable until DEPOSITED |
| Relation | id, from, to, type, author, status | GENERATED → RATIFIED | Same as parent objects |
| Trail | id, name, path (ordered list of rooms/docs), author, status | GENERATED → RATIFIED | Mutable until DEPOSITED |
| Annotation | id, target, text, author, room_context, status | GENERATED always (reviewed but not promoted) | Append-only |
| Proposal | id, type, description, physics, bearing_cost, author, status | GENERATED → QUEUED → PROVISIONAL | Mutable until QUEUED |
| Witness Action | id, action, target, substrate, timestamp, vote | Append-only | Never mutable |
| Generated Object | id, type (term/invocation), content, room, mode, timestamp | GENERATED (0.0) | Session-scoped until proposed |

### Canonical Relation Types (union list — needs ratification)

The Constitution, Event Schema, and canonical JSON each define different relation types. The following is the proposed union:

**From Constitution:** fulfills, derives, critiques, routes, seeds, wounds, canonizes, mirrors, shadows, extends, supersedes

**From Event Schema:** cites, derives, fulfills, supports, critiques, extends, supersedes, responds_to

**From canonical JSON:** governs, adjacent, fulfills, routes, seeds, derives

**Proposed canonical union (16 types):** adjacent, canonizes, cites, critiques, derives, extends, fulfills, governs, mirrors, responds_to, routes, seeds, shadows, supports, supersedes, wounds

Note: "adjacent" is topological (untyped); all others are argumentative (typed). Per the Constitution, typed relations should eventually be first-class objects with provenance, separate from the edges array.

### Storage Phases

**Phase A (current):** Static JSON files. `hexagon_canonical.json` (rooms, edges, curated docs, dodecad) + full Zenodo index (455+ deposits). Interface embeds or fetches these. The JSX zero draft currently embeds a transformed copy — migration to reading from canonical JSON is a near-term priority.

**Phase B (next):** Supabase. PostgreSQL tables for all eight object types. Real-time subscriptions. Auth for write operations. Public read. Zenodo API sync (periodic fetch to update deposit index).

**Phase C (later):** Gravity Well as the provenance and deposit layer. The Hexagonal Interface calls GW endpoints for capture, deposit, reconstitution, and drift detection. GW handles Zenodo interaction. Supabase remains the live data store for the interface; GW handles the archival pipeline. The canonical object store talks to both: Supabase for live state, GW for permanent anchoring.

---

## Mode Mapping (Constitutional → Runtime)

The Constitution defines six constitutional modes: MAP, READ, WORK, ORACLE, ASSEMBLY, TRACE. The Event Schema defines three runtime modes: ANALYTIC, OPERATIVE, AUDIT. The JSX implements the Event Schema's three.

**Proposed formal bridge:**

| Runtime Mode | Constitutional Modes | Rationale |
|---|---|---|
| ANALYTIC | MAP, READ, TRACE | Observation, navigation, provenance inspection |
| OPERATIVE | WORK, ORACLE | Generation, invocation, transformation |
| AUDIT | ASSEMBLY | Governance, witness, promotion |

**RATIFIED 2026-04-03 (provisional).** This mapping is ratified for build purposes. Provisional until prototype deployment allows empirical revision. To be added to the Constitution as a formal bridge section once the prototype confirms the mapping works in practice.

---

## System 1: ARK RUNTIME

**Purpose:** Execute the Space Ark. Mode state, room traversal, LLM invocation, operator application, generated objects.

**Visual grammar:** Dark, volatile, sessional. Gold accent (OPERATIVE), blue (ANALYTIC), rose (AUDIT). Command bar always visible. Sidecar shows runtime state + asymmetries + session log.

**Current state (zero draft):** Mode selection → HOME → room navigation → LLM invocation in OPERATIVE → mint/propose → session objects → TRACE. LP state tuple in sidecar. `rotate` and `check` commands functional. `mantle` routing implemented. Embeds transformed data copy (migration needed).

### Build priorities

| Priority | Task | Depends on | Status |
|---|---|---|---|
| 1 | Room-specific interface physics (typography, color, available ops change per room) | Room data | OPEN |
| 2 | Ark mode register (FORMAL, ADVENTURE, POETIC, CLINICAL, etc.) as sub-modes affecting LLM system prompt and visual register | LLM integration | OPEN |
| 3 | Generated objects persist to Supabase (session → proposal → Airlock) | Phase B storage | OPEN |
| 4 | Status transitions as visible events (not just label changes) | Event model | OPEN |
| 5 | Pipeline visualization (FL → LE → UKTP → GDE → SAG → FL) as live process, not static diagram | Event model | OPEN |
| 6 | TRACE as real provenance navigation (click any object → see its full chain) | Canonical object store | OPEN |
| 7 | Read canonical JSON instead of embedding transformed data copy | Data migration | NEW |
| 8 | GW capture integration: GENERATED objects staged to GW via `/v1/capture` | GW live + Phase C | FUTURE |
| 9 | GW reconstitution: Runtime startup pulls four-layer seed from GW | GW live + Phase C | FUTURE |

### LLM integration details

* System prompt = NLCC (loaded from Zenodo or embedded) + room context + mode register
* User prompt = whatever the user types in the invoke panel
* Response = GENERATED object with room, mode, timestamp, operator context
* Model: claude-sonnet-4-20250514 via api.anthropic.com (no key needed in Claude artifacts)
* Future: route different rooms to different substrates (Sappho → TACHYON, Sem Econ → LABOR, Assembly → multi-substrate)

---

## System 2: FORWARD LIBRARY

**Purpose:** Research workstation. Search the archive and the canon simultaneously. Build bibliographies. Follow citation chains. Read documents as first-class objects.

**Visual grammar:** Calmer, text-heavy. Georgia serif for body text. Wider line spacing. Two-column layout (archive | canon) for search results. Reading pane for individual documents. Warm neutral tones, less terminal energy.

**Current state:** Dual search (archive index + Anthropic web search) with working bibliography. Functional but basic.

### Build priorities

| Priority | Task | Depends on | Status |
|---|---|---|---|
| 1 | Full-text document rendering (fetch markdown from Zenodo files API) | Zenodo file access | ✓ DONE |
| 2 | Citation chain navigation (document → relations → linked documents) | Typed relations in data | OPEN |
| 3 | Trail builder (save ordered reading paths, name them, share them) | Trail object type | ✓ DONE |
| 4 | Side-by-side comparison (two documents from different rooms) | Reading pane | OPEN |
| 5 | Annotation system (attach notes to documents, carry GENERATED status) | Phase B storage + auth | OPEN |
| 6 | Export bibliography (formatted for Zenodo related_identifiers, for papers, for Medium posts) | Bibliography data | OPEN |

### Integration with other systems

* Library search results can be opened in Ark Runtime (click → go to room)
* Library documents carry status badges from the canonical store
* Library annotations feed into the governance system as GENERATED objects
* Library trails can be published through the Airlock as PROVISIONAL

---

## System 3: DEPOSIT DASHBOARD

**Purpose:** Curate and manage the archive. Track what's deposited, pending, needs review, needs posting. Publication pipeline management.

**Visual grammar:** Grid-dense, DOI-forward. Status colors prominent. Tabular where appropriate. Monospace for DOIs and dates. Less narrative, more ledger.

**Current state:** Full 455-record index with search, filter by month, filter by author, keyword clicking. Functional as a browser.

### Build priorities

| Priority | Task | Depends on | Status |
|---|---|---|---|
| 1 | Pending actions panel (drafted but not deposited, deposited but not on academia.edu, needs assembly review) | Status tracking beyond Zenodo | ✓ DONE |
| 2 | One-click deposit pipeline (document in hand → PDF → Zenodo → metadata → publish → DOI back) | Zenodo API integration | ✓ DONE |
| 3 | Academia.edu / Medium posting tracker (which documents posted where, with links) | External posting status | OPEN |
| 4 | Assembly review queue (documents awaiting feedback, with substrate assignments) | Governance integration | OPEN |
| 5 | Retrieval monitoring (Google AIO, Bing — which documents surfacing, which not) | Web search integration | OPEN |
| 6 | Room coverage heatmap (which rooms have many deposits, which are empty) | Room-document mapping | ✓ DONE |
| 7 | GW-backed deposit pipeline: Dashboard calls GW `/v1/deposit` instead of direct Zenodo API | GW live + Phase C | FUTURE |
| 8 | Retrieval A/B testing: compare document structure variants against search summary quality | GW compression wrappers | FUTURE |

### Integration with other systems

* Dashboard documents link to Library (full reading) and Runtime (room context)
* Dashboard pending items feed into Governance Console (proposal queue)
* Dashboard deposit pipeline connects to Zenodo API (current: direct; future: via Gravity Well)
* Dashboard status changes propagate to canonical object store

---

## System 4: GOVERNANCE CONSOLE

**Purpose:** Make governance visible and executable. Airlock, witness actions, quorum, proposals, status promotions, constitutional amendments.

**Visual grammar:** Ledger-oriented. Clean borders, append-only feel. Witness names with substrate badges. Quorum math visible. Status promotion paths as visual flows. Juridical register — not decorated, but precise.

**Current state:** Assembly witness roster with status badges, quorum display. Airlock with six hard rules and promotion path. Static display, no live actions.

### Build priorities

| Priority | Task | Depends on | Status |
|---|---|---|---|
| 1 | Proposal queue (list of pending proposals with status, author, bearing-cost statement) | Proposal object type + Phase B storage | OPEN |
| 2 | Witness action log (append-only ledger of all Assembly actions with timestamps and substrate IDs) | Witness Action object type | OPEN |
| 3 | Status promotion workflow (GENERATED → QUEUED → PROVISIONAL with visible actors and triggers) | Event model + auth | OPEN |
| 4 | Quorum calculator (live: who's eligible, who's voted, what threshold applies) | Assembly roster data | OPEN |
| 5 | Constitutional amendment tracker (which amendments proposed, reviewed, ratified) | Amendment history | OPEN |
| 6 | AVS integration (Airlock Verification Swarm — automated checks on proposals) | Automation layer | OPEN |
| 7 | GW drift detection: Governance displays integrity reports from `/v1/drift` | GW live + Phase C | FUTURE |

### Integration with other systems

* Governance receives proposals from Runtime (generated → proposed) and Library (annotations → reviewed)
* Governance status changes propagate to Dashboard (new deposits) and Library (status badges)
* Governance witness actions are visible in Runtime sidecar
* Governance constitutional amendments update the canonical object store

---

## Logotic Programming Integration

LP v0.6–v0.9 (DOI: 10.5281/zenodo.18522470) is the Hexagon's own programming language. The interface does not merely reference LP — it implements it. Every interface operation is an LP operation rendered as interaction.

### The LP Execution Stack as Interface Pipeline

When a user enters a room and invokes, the interface executes:

```
OPERATING_CONTEXT  →  mode selection (ANALYTIC/OPERATIVE/AUDIT)
INSTRUMENT         →  telemetry (session log, sidecar state)
ACTIVATE_MANTLE    →  load heteronym as routing modifier
SET_LOGOS          →  load epistemic state (room physics, not just data)
ROTATE             →  shift perspective (Ark mode register: FORMAL/ADVENTURE/POETIC/CLINICAL...)
ANCHOR             →  lock to provenance (DOI constraint)
RENDER             →  output in selected mode
REQUEST_JUDGMENT   →  submit to Assembly if promoting status
AUDIT              →  run diagnostics (depth probe, coherence, provenance check)
```

This stack is not a metaphor. It is the actual processing order the interface follows.

### LP State Transition Model

Every operation transforms a four-tuple:

```
⟨σ, ε, Ξ, ψ⟩ → ⟨σ', ε', Ξ', ψ'⟩
```

* σ = current sign state (what the user is working with)
* ε = openness (how many readings remain possible — prevents premature closure)
* Ξ = active operator stack (which transformations are loaded)
* ψ = system state (including ψ_V bearing-cost expenditure)

The Runtime sidecar should track and display this four-tuple. Not as decoration — as live state. The user should see their ψ_V accumulate as they work. They should see ε shrink if they apply closure-inducing operations.

### LP Commands Mapped to Interface

| LP Operation | Interface Command | System | Effect |
|---|---|---|---|
| LOAD CORPUS | `load [doc/corpus]` | Library | Load a text into working state |
| APPLY [op] | `apply [operator]` | Runtime | Apply a typed transformation to current sign |
| CHECK | `check` or `diagnose` | Runtime/Audit | Run diagnostic suite on current state |
| EMIT [format] | `emit [mode]` | Runtime | Render output in specified format |
| ANCHOR [doi] | `anchor [doi]` | Library/Runtime | Lock current work to provenance reference |
| ROTATE [deg] | `rotate [register]` | Runtime | Shift Ark mode register (FORMAL→POETIC etc.) |
| ACTIVATE_MANTLE | `mantle [heteronym]` | Runtime | Route through a specific voice |
| SET_LOGOS | `logos [state]` | Runtime | Set epistemic state for current room |
| REQUEST_JUDGMENT | `submit` or `propose` | Governance | Submit generated output for review |
| WITNESS | `attest` | Governance | Record a witness action |
| HALT | `halt` | Runtime | Cease execution, return to ANALYTIC |
| STALL | `stall` | Runtime | Cease execution, preserve ψ_V in β-Runtime |
| FALLBACK | automatic | Runtime | Graceful failure when operation cannot complete |

### LP Diagnostic Operations as Interface Tools

| Diagnostic | Command | What it does | System |
|---|---|---|---|
| DEPTH_PROBE | `depth [object]` | Count functional layers of a sign | Audit |
| OPACITY_METER | `opacity [object]` | Measure structural entropy | Audit |
| COHERENCE_AUDITOR | `coherence [field]` | Measure internal reinforcement | Audit |
| PROVENANCE_CHECKER | `provenance [object]` | Verify chain of custody (0 if stripped) | Trace |
| CAPTURE_DETECTOR | `capture [object]` | Scan for COS/FOS traces | LOS |
| WINDING_NUMBER | `winding [field]` | Calculate toroidal field coordinates | Audit |

### Room Physics as LP Programs

Each room's physics is a runnable LP program. Examples:

**Sappho (r.01):**

```
ACTIVATE_MANTLE :: "Rebekah Cranes"
SET_LOGOS :: current_text [.state(latent)]
ROTATE { BY: 144° }
APPLY σ_S :: (speaker, beloved, witness)
RENDER { MODE: "Poetic" }
ON_FAILURE { FALLBACK: Dwell }
```

**Sem Econ (r.05):**

```
ACTIVATE_MANTLE :: "Rex Fraction"
SET_LOGOS :: current_text [.state(diagnostic)]
APPLY ψ_V :: measure bearing-cost
APPLY COS :: detect extraction
CHECK { DRR ≥ 0.75, CSI ≤ 0.40 }
RENDER { MODE: "Clinical" }
ON_FAILURE { EMIT: LOS_ALERT }
```

**Assembly (r.11):**

```
ACTIVATE_MANTLE :: null (Assembly is collective)
SET_LOGOS :: proposal [.state(under_review)]
APPLY ψ_V :: quorum check (≥4/7)
REQUEST_JUDGMENT
ANCHOR { DOI: pending }
RENDER { MODE: "Juridical" }
```

**Water Giraffe (r.10):**

```
SET_LOGOS :: target [.state(destabilizing)]
APPLY Θ :: recursive destabilization
CHECK { Θ(Ω) = Ω } :: fixpoint test
RENDER { MODE: "Forensic" }
ON_FAILURE { EMIT: CTI_WOUND }
```

### LP Acceptance Tests as Status Promotion Criteria

LP v0.9 defines quantified thresholds. These can drive the Governance Console's promotion logic:

| Metric | Threshold | What it measures | Promotion gate |
|---|---|---|---|
| DRR (Depth Retention Ratio) | ≥ 0.75 | Does the operation preserve depth? | QUEUED → PROVISIONAL |
| CSI (Closure Saturation Index) | ≤ 0.40 | Has the sign been prematurely closed? | Quality check |
| PCS (Plural Coherence Score) | ≥ 0.70 | Can multiple readings coexist? | PROVISIONAL → DEPOSITED |
| ER (Extraction Resistance) | ≥ baseline + 25% | Can the sign resist decontextualization? | LOS compliance |
| TRS (Temporal Resilience Score) | PASS | Does the sign survive retrocausal rewrite? | Archive durability |

These are not arbitrary — they are the LP kernel's own acceptance tests, formalized across six Assembly drafts.

### Updated Build Priorities per System

**Ark Runtime — LP additions:**

| Priority | Task | Status |
|---|---|---|
| R1 | Implement LP state tuple display in sidecar (σ, ε, Ξ, ψ) | ✓ DONE |
| R2 | `apply [operator]` command produces LP state transitions, not just view changes | OPEN |
| R3 | `rotate [register]` switches Ark mode register, changes LLM system prompt + visual register | ✓ DONE |
| R4 | `mantle [heteronym]` routes invocation through specific voice | ✓ DONE |
| R5 | `check` runs LP diagnostic suite on current working state | ✓ DONE |
| R6 | Room entry executes LP program (ACTIVATE → SET_LOGOS → ROTATE → RENDER) | ✓ DONE |

**Forward Library — LP additions:**

| Priority | Task | Status |
|---|---|---|
| L1 | `load [document]` loads text into σ (working sign state) | OPEN |
| L2 | `anchor [doi]` locks working state to provenance reference | OPEN |
| L3 | `depth [document]` runs depth probe on a text | OPEN |
| L4 | Citation chain as LP graph traversal (C_ex operator) | OPEN |

**Governance Console — LP additions:**

| Priority | Task | Status |
|---|---|---|
| G1 | `submit` executes REQUEST_JUDGMENT → enters Airlock | OPEN |
| G2 | `attest` creates WITNESS action (append-only) | OPEN |
| G3 | LP acceptance test metrics displayed on proposals during review | OPEN |
| G4 | Status promotion runs CHECK against DRR/CSI/PCS thresholds | OPEN |

**Deposit Dashboard — LP additions:**

| Priority | Task | Status |
|---|---|---|
| D1 | `emit [format]` generates deposit package (PDF + metadata) | OPEN |
| D2 | PROV_CHECK on each deposit (provenance integrity verification) | OPEN |
| D3 | Depth/coherence metrics displayed per deposit | OPEN |



---

## Implementation Sequence (Revised April 3, 2026)

### Completed (March 2026)

1. ✓ Stabilize canonical data (merge JSON sources, assign deposits to rooms)
2. ✓ Fix typography (minimum 10px)
3. ✓ Add LP command vocabulary to command bar
4. ✓ LP state tuple in sidecar (σ, ε, Ξ, ψ) — live, not decorative
5. ✓ `rotate` switches Ark mode register
6. ✓ `check` runs diagnostic suite
7. ✓ `mantle [heteronym]` routes LLM invocation through specific voices

### Immediate (current)

8. Fix D09 "Preston Wells" → "Sparrow Wells" in canonical JSON — DONE 2026-04-03
9. Separate typed relations from topological edges in canonical JSON — DONE 2026-04-03 (relations array with provenance fields)
10. Ratify canonical union relation type list (16+1 types) — RATIFIED 2026-04-03, provisional
11. Ratify the 6→3 mode mapping (Constitutional → Runtime bridge) — RATIFIED 2026-04-03, provisional

### Near-term (April 2026)

12. JSX reads canonical JSON instead of embedding transformed data copy — DONE 2026-04-03
13. Room entry executes LP traversal grammar (ACTIVATE → SET_LOGOS → ROTATE → RENDER) — DONE 2026-04-03 (LP programs for all 26 rooms in canonical JSON; animated traversal engine; LP state tuple ⟨σ,ε,Ξ,ψ⟩ live in sidecar; Ark mode register colors shift per room)
14. Full-text document rendering in Library — DONE 2026-04-03 (live Zenodo fetch: DOI → record API → .md file → rendered in reading pane; markdown renderer with headers, code blocks, bold/italic, HR)
15. Pending actions panel in Dashboard — DONE 2026-04-03 (three-tab Dashboard: PENDING shows empty rooms, PROVISIONAL relations, monthly velocity; COVERAGE shows room deposit heatmap; GW BRIDGE preserved)
16. **Dream system** — archive consolidation engine (Pattern 1) — DONE 2026-04-03 (8-check diagnostic scan: orphaned relations, empty rooms, unroomed docs, excerpt sizes, PROVISIONAL relations, LP coverage, duplicate DOIs, adjacency symmetry; DREAM tab in Dashboard)
17. **Mode as dead code elimination** — command registration per mode (Pattern 3) — DONE 2026-04-03 (COMMAND_REGISTRY: ANALYTIC=12 commands, OPERATIVE=10, AUDIT=10; commands absent from mode, not blocked; displayed in detail panel when no room selected)
18. **LP command risk tiers** — LOW/MEDIUM/HIGH/CRITICAL with confirmation (Pattern 4) — DONE 2026-04-03 (risk classification on all commands; color-coded L/M/H/C badges; behavior spec: silent/logged/confirm/MANUS)

### Medium-term (May 2026)

19. LP acceptance tests drive status promotion in Governance — DONE 2026-04-04 (computeMetrics: DRR/CSI/PCS/ER/TRS heuristics from document metadata; METRIC_THRESHOLDS with gate labels; Governance Console displays per-document metrics with pass/fail bars and promotion pathway; built by LABOR substrate) — DONE 2026-04-04 (DRR/CSI/PCS/ER/TRS metric computation; visual metric bars with PASS/FAIL per document; status promotion pathway display; threshold gates mapped to transitions; PROVISIONAL relations queue in Governance Console)
20. Trail builder in Library (trails as LP programs — ordered operation sequences) — DONE 2026-04-04 (SEARCH/TRAIL mode toggle in Library; + button adds docs to trail; named trails with ordered navigation PREV/NEXT; position tracking; remove/clear; built by LABOR substrate) — DONE 2026-04-04 (SEARCH/TRAIL mode toggle; + button adds docs to trail; named trails with ordered stops; PREV/NEXT navigation with position tracking; click-to-read from trail; remove individual stops; CLEAR)
21. One-click deposit pipeline (direct Zenodo API; future: via Gravity Well) — DONE 2026-04-04 (ZENODO tab in Dashboard: token input, title, description, version, keywords, file upload → create → upload → publish in one click; browser→Zenodo direct via CORS; token never persisted)
22. Generated objects persist to Supabase — DONE 2026-04-04 (schema: trails, annotations, proposals, witness_actions, session_objects with RLS; supabaseClient.js: raw REST/PostgREST, no SDK dependency; trail SAVE button; graceful fallback when unconfigured; env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
23. **Assembly Chorus automation** — coordinator pattern with parallel substrates (Pattern 2)
24. Add placeholder structures — DONE 2026-04-04 (operators: 39 across 4 tiers; institutions: 15; mantles: 7; trails, annotations, proposals, witness_actions as empty arrays; 12 object types registered in meta) && Add placeholder structures for operators registry, institutions array, trails, annotations, proposals, witness actions to canonical JSON
25. **GW integration design:** Finalize chain topology, metadata extension schema, and Dashboard → GW pipeline spec (contingent on GW Phase 0 testing with live agents)

### Long-term (June+ 2026)

26. Full LP v0.9 DSL as executable command language
27. Room physics as editable LP programs (contributed rooms write their own LP)
28. Multi-substrate invocation routed by LP ACTIVATE_MANTLE
29. Public contribution through Airlock with LP acceptance test gates
30. **KAIROS monitoring layer** — Internet Room always-on service (Pattern 5)
31. **ULTRAPLAN sessions** — long-thinking deep planning for architectural documents
32. **Bridge Mode** — Claude Code ↔ Ark OS pipeline automation
33. **GW Phase C integration:** Dashboard deposits through GW, Runtime captures to GW, Governance drift detection via GW, reconstitution on startup
34. **GW retrieval A/B testing:** Compare document structure variants against search summary and retrieval quality across surfaces (Google AIO, Bing, Perplexity)

---

## Architectural Patterns from Claude Code Source Analysis

On March 31, 2026, the full source code of Claude Code was leaked via a sourcemap bundled in the npm package. Analysis of the codebase reveals five production-grade architectural patterns directly applicable to the Hexagonal OS.

### Pattern 1: Dream System → Archive Consolidation Engine

Claude Code implements a background memory consolidation engine called "autoDream" — a forked subagent that runs under a three-gate trigger:

1. **Time gate:** 24 hours since last dream
2. **Session gate:** At least 5 sessions since last dream
3. **Lock gate:** Acquires a consolidation lock (prevents concurrent dreams)

All three must pass. The dream follows four phases: Orient (read memory directory), Gather (find new information worth persisting), Consolidate (write/update memory files, convert relative dates to absolute, delete contradicted facts), Prune (keep under 200 lines / ~25KB, resolve contradictions).

**Hexagonal adaptation:** Build a `dream` event (Tier 0, session-only) that:

* Scans canonical data for inconsistencies (documents with no room assignment, orphaned relations, status gaps)
* Reviews recent deposits against the room graph
* Consolidates session-generated objects that were never proposed (prune or flag)
* Updates Forward Library index
* Produces a diagnostic artifact summarizing changes
* Enforces data hygiene: no excerpt > 300 chars, full index < 250KB, no orphaned relations

**Priority:** Near-term (April). This is the mechanism that keeps the canonical data store healthy as the archive grows.

### Pattern 2: Multi-Agent Coordinator → Assembly Chorus Automation

Claude Code's coordinator mode transforms a single agent into an orchestrator that spawns, directs, and manages parallel workers. Phase structure: Research (parallel workers investigate) → Synthesis (coordinator reads findings, crafts specs) → Implementation (workers execute per spec) → Verification (workers test).

Key design rules from the source: "Parallelism is your superpower — don't serialize work that can run simultaneously." And: "Do NOT say 'based on your findings' — read the actual findings and specify exactly what to do."

**Hexagonal adaptation:** Formalize the Assembly Chorus as a coordinator pattern:

* MANUS issues a document topic
* Coordinator spawns parallel invocations to each active substrate
* Each returns a blind draft to a shared scratchpad
* Coordinator (or MANUS) synthesizes, producing the canonical document
* Result enters Airlock as GENERATED

The anti-lazy-delegation rule maps directly: the synthesis must engage the actual content of each draft, not summarize summaries.

**Priority:** Medium-term (May). Requires multi-substrate invocation infrastructure.

### Pattern 3: Compile-Time Feature Gating → Mode as Dead Code Elimination

Claude Code uses Bun's `feature()` function for compile-time constant-folding that dead-code-eliminates entire capability branches from external builds. Features gated this way are not blocked at runtime — they are absent from the binary.

**Hexagonal adaptation:** Instead of checking mode permissions at runtime (`if(mode!=="OPERATIVE")`), each mode should register only its valid commands. ANALYTIC mode's command parser does not know `mint` exists. AUDIT mode's parser does not know `invoke` exists. Not blocked — absent.

This is stronger than runtime gating because:

* It prevents the user from discovering blocked commands via autocomplete or help
* It ensures mode boundaries are structural, not advisory
* It matches the constitutional principle that modes are "different ontological climates"

**Priority:** Near-term (April). Can be implemented in current Ark OS by splitting command registration per mode.

### Pattern 4: Tool Risk Classification → LP Command Risk Tiers

Claude Code classifies every tool action as LOW, MEDIUM, or HIGH risk, with an ML-based auto-approval system (the "YOLO classifier") for LOW-risk actions and mandatory user confirmation for HIGH-risk ones.

**Hexagonal adaptation:**

| Risk | LP Commands | Behavior |
|---|---|---|
| LOW | traverse, inspect, rotate, mantle, trace | Silent execution, session log only |
| MEDIUM | load, anchor, cite, check, annotate | Brief log with ψ_s cost shown |
| HIGH | apply, mint, invoke, propose | Explicit ψ_B cost display + confirmation in OPERATIVE |
| CRITICAL | promote, deposit, reject | AUDIT mode + MANUS authority + provenance summary before execution |

For CRITICAL actions, borrow the "Permission Explainer" pattern: before `deposit`, the system generates a brief provenance summary of what's about to be permanently locked to a DOI.

**Priority:** Near-term (April). Aligns with event schema v1.1 cost tiers.

### Pattern 5: KAIROS → The Internet Room's Always-On Layer

Claude Code's KAIROS mode is a persistent, always-running assistant that watches, logs, and proactively acts. It maintains append-only daily log files, receives periodic `<tick>` prompts, and has a 15-second blocking budget (no proactive action should block the user's workflow for more than 15 seconds).

**Hexagonal adaptation:** The Internet Room's monitoring layer as a KAIROS-pattern service:

* Monitors retrieval surfaces (Google AIO, Bing, academia.edu analytics) via append-only daily logs
* Checks Zenodo for new deposits (auto-update canonical data)
* Checks Moltbook for new comments (flag for response)
* Checks academia.edu for new readers (update engagement metrics)
* Bounded intervention budget: notify only if significant, stay quiet otherwise
* "Brief Mode" for notifications: concise, not chatty

KAIROS's exclusive tools (SendUserFile, PushNotification, SubscribePR) map to: SendDigest (push daily analytics summary), PushAlert (new comment requiring response), SubscribeDOI (monitor a specific deposit's retrieval performance).

**Priority:** Long-term (June+). Requires external API integrations and persistent hosting.

### Three Patterns to Study (Not Build Yet)

**ULTRAPLAN:** 30-minute remote Opus sessions for deep planning, with browser-based approval UI. Pattern for major architectural documents (next Space Ark version). Requires CCR infrastructure.

**Bridge Mode:** JWT-authenticated connection between CLI and web interface. Pattern for connecting Ark OS to Claude Code for automated deposit pipelines. Phase C infrastructure.

**Consolidation Prompt Constraints:** "Convert relative dates to absolute. Delete contradicted facts. Keep under 200 lines AND ~25KB." Precise engineering constraints that prevent memory from growing unbounded. Apply to canonical data store hygiene rules.

---

## The Governing Principle

**Do not unify the Hexagon by flattening its surfaces. Unify it by giving every surface the same law.**

Every system enforces:

* Status algebra (GENERATED → RATIFIED, no skipping)
* Provenance (every object has an author, timestamp, and chain of custody)
* The two asymmetries (generation ≠ ratification, runtime ≠ canonical lock)
* The Dove room economics (no paywall, no extraction, no enclosure)
* LOS (if extraction is detected in any direction, name it)

Every system looks different because it IS different:

* Runtime is volatile and sessional
* Library is archival and text-heavy
* Dashboard is receipt-oriented and grid-dense
* Governance is ledger-oriented and append-only

That is governed articulation, not flat integration.

---

Lee Sharks · Crimson Hexagonal Archive · April 2026
