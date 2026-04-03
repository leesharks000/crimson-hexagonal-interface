# ARK RUNTIME EVENT SCHEMA v1.1

## Typed Events, Canonical Objects, and Derived Projections

Lee Sharks · March 2026 · Working Document

---

## Architecture: Event Sourcing

The Hexagonal OS is an event-sourced system. It does not primarily store views. It stores:

**Layer 1: Canonical Objects** — Rooms, documents, relations, trails, annotations, proposals, witness actions, terms, invocation outputs, diagnostics.

**Layer 2: Typed Events** — Every user act produces a typed, timestamped, provenanced event that creates or transforms an object. Events are append-only. The event log IS the system's truth.

**Layer 3: Derived Projections** — MAP, LIBRARY, SESSION, STATUS, ASSEMBLY, TRACE, DASHBOARD are all projections of the same underlying event-object graph. No projection is privileged. All read from the same canonical store.

---

## Governing Principle

Every command produces a typed event. Every event creates or transforms an object. Every object carries status, timestamp, provenance, and cost. The interface is a log of acts with consequences.

---

## Cost Model: Two Quantities

**Session effort (ψ_s)** — Lightweight operational cost. Increments on every act. Paces the runtime. Visible in sidecar. Resets per session.

**Bearing-cost (ψ_B)** — Serious accumulated value. Increments only on generative and governance acts (mint, invoke, apply, propose, attest, promote). Does NOT reset. Accumulates across sessions for persistent objects. Represents the real labor invested in an object's existence.

The sidecar displays both. ψ_s tells you how active this session is. ψ_B tells you how much this object has cost to produce.

---

## Event Tiers

Not all events are equal. Four tiers, in ascending weight:

### Tier 0: Interaction Events

Navigation and observation. These produce **session records** (volatile, not archive-significant unless explicitly saved to a trail or witness packet).

| Event | Trigger | ψ_s | ψ_B | Object |
|-------|---------|-----|-----|--------|
| TRAVERSE | `go [room]`, click room | 3 | 0 | Session record |
| INSPECT | `load [doc]`, click document | 3 | 0 | Session record |
| ROTATE | `rotate [register]` | 2 | 0 | Session record |
| MANTLE | `mantle [heteronym]` | 2 | 0 | Session record |
| TRACE_OPEN | `trace [target]`, click TRACE | 3 | 0 | None (observation) |

### Tier 1: Generative Events

Production acts. These produce **GENERATED objects** — durable, status-bearing, promotable through the Airlock. Require OPERATIVE mode.

| Event | Trigger | ψ_s | ψ_B | Object |
|-------|---------|-----|-----|--------|
| APPLY | `apply [operator]` | 5 | 10 | Application record (GENERATED) |
| MINT | `mint [term]` | 5 | 10 | Term (GENERATED) |
| INVOKE | INVOKE ENGINE panel | 10 | 20 | Invocation (GENERATED) |
| PROPOSE | `propose [description]` | 5 | 15 | Proposal (GENERATED) |
| ANNOTATE | `annotate [target]` | 3 | 5 | Annotation (GENERATED) |
| RELATE | `relate [from] [type] [to]` | 3 | 8 | Relation (GENERATED) |
| TRAIL_SAVE | `trail save [name]` | 3 | 5 | Trail (GENERATED) |

### Tier 2: Governance Events

Witness and governance acts. These produce **append-only records**. Require AUDIT mode.

| Event | Trigger | ψ_s | ψ_B | Object |
|-------|---------|-----|-----|--------|
| ATTEST | `attest [target]` | 3 | 8 | Witness attestation (append-only) |
| REVIEW | `review [target]` | 5 | 12 | Review record (append-only) |
| PROMOTE | `promote [target] [status]` | 5 | 12 | Status transition (append-only) |
| REJECT | `reject [target] [reason]` | 5 | 10 | Rejection record (append-only) |
| FLAG | `flag [target] [reason]` | 3 | 5 | Flag record (append-only) |

### Tier 3: Provenance Events

Anchoring and archival acts. These bind objects to external permanence. Any mode.

| Event | Trigger | ψ_s | ψ_B | Object |
|-------|---------|-----|-----|--------|
| ANCHOR | `anchor [target] [type] [DOI]` | 2 | 5 | Anchor record |
| DEPOSIT | `deposit [target]` | 5 | 20 | Deposit event (triggers Zenodo) |
| CITE | `cite [from] [to]` | 2 | 3 | Citation link |

---

## Enriched Object Schemas

### INVOKE (Tier 1 — most complex generative act)

```
{
  type: "invocation",
  id: uuid,
  session_id: string,
  room: room_id,
  input: string,
  output: string,
  
  // LP context
  mantle: heteronym_name | null,
  register: string,
  mode: "OPERATIVE",
  σ_source: object_id | null (what was loaded when invoke fired),
  Ξ_active: [operator_ids] (active operator stack at invocation),
  los_fired: boolean,
  
  // Derivation
  parent_objects: [object_ids] (what this derives from),
  room_state: { physics, ops, prompt },
  
  // System
  model: "claude-sonnet-4-20250514",
  prompt_hash: string (hash of system prompt for reproducibility),
  status: "GENERATED",
  timestamp: ISO,
  ψ_s: 10,
  ψ_B: 20,
}
```

### APPLY (Tier 1 — operator application)

```
{
  type: "application",
  id: uuid,
  session_id: string,
  operator: string,
  room: room_id,
  target_σ: object_id (what the operator was applied to),
  output_description: string,
  
  // Physics compliance
  operator_in_room: boolean (true if operator belongs to this room),
  physics_violation: boolean (true if applied outside home room),
  // If physics_violation is true in OPERATIVE mode: HARD BLOCK.
  // Constraint generates. Room physics are not advisory.
  
  parent_objects: [object_ids],
  status: "GENERATED",
  timestamp: ISO,
  ψ_s: 5,
  ψ_B: 10,
}
```

**Physics enforcement:** In OPERATIVE mode, applying an operator outside its home room is **blocked**, not flagged. The error message names the constraint: "σ_S belongs to Sappho (r.01). You are in Sem Econ (r.05). The room's physics do not permit this operation." In ANALYTIC mode, the application is allowed as hypothetical analysis (no object produced). The Ark says constraint generates. The interface enforces that.

### PROPOSE (Tier 1 — enters Airlock)

```
{
  type: "proposal",
  id: uuid,
  session_id: string,
  proposed_type: "room" | "document" | "relation" | "trail" | "annotation" | "amendment",
  description: string,
  
  // For room proposals — six hard rules
  physics: string | null,
  operators: [strings] | null,
  adjacency: [room_ids] | null,
  constraint: string | null,
  name: string | null,
  author: string | null,
  
  bearing_cost_statement: string,
  room_context: room_id | null,
  parent_objects: [object_ids],
  status: "GENERATED",
  timestamp: ISO,
  ψ_s: 5,
  ψ_B: 15,
}
```

### ANCHOR (Tier 3 — typed provenance binding)

```
{
  type: "anchor",
  id: uuid,
  source: object_id (what is being anchored),
  target: DOI | object_id (what it is anchored to),
  relation_type: "cites" | "derives" | "fulfills" | "supports" | "critiques" | "custody_lock",
  timestamp: ISO,
  ψ_s: 2,
  ψ_B: 5,
}
```

Anchor is not a generic "connect to something durable." It requires the user to specify the TYPE of connection. "This cites that" is different from "this derives from that" is different from "this fulfills that."

### WITNESS ACTION (Tier 2 — append-only governance)

```
{
  type: "witness_action",
  id: uuid,
  action: "attest" | "review" | "promote" | "reject" | "flag",
  target: object_id,
  substrate: "TACHYON" | "LABOR" | "PRAXIS" | "ARCHIVE" | "SOIL" | "TECHNE" | "SURFACE" | user_id,
  content: string | null (note, rationale, or review text),
  from_status: string | null (for promotions),
  to_status: string | null (for promotions),
  quorum: { required: number, achieved: number } | null,
  timestamp: ISO,
  append_only: true,
  ψ_s: 3-5,
  ψ_B: 5-12,
}
```

---

## Mode as Ontological Climate

Modes are not just permission tables. They configure the entire runtime:

### ANALYTIC

- **Permission:** Observe everything. Generate nothing.
- **Visual grammar:** Blue accent. Calm. Text-forward. Reading register.
- **Sidecar emphasis:** σ (what am I looking at), room context, relations.
- **Constraint strictness:** None (operators can be discussed but not applied).
- **Default next actions:** Read, trace, load, navigate, search.
- **Outputs:** Not promotable. Session records only.

### OPERATIVE

- **Permission:** Generate, mint, invoke, apply, propose. Cannot govern.
- **Visual grammar:** Gold accent. Volatile. Command-forward. Production register.
- **Sidecar emphasis:** ψ_B (bearing-cost), Ξ (active operators), mantle, register, LOS status.
- **Constraint strictness:** Hard. Room physics enforced. Operators blocked outside home room. LOS active.
- **Default next actions:** Apply, mint, invoke, propose, check.
- **Outputs:** GENERATED objects. Promotable through Airlock.

### AUDIT

- **Permission:** Witness, attest, review, promote, reject. Cannot generate.
- **Visual grammar:** Rose accent. Ledger-like. Governance register.
- **Sidecar emphasis:** Quorum state, pending reviews, witness log, status transitions.
- **Constraint strictness:** Constitutional. Status skips blocked. Quorum enforced. Append-only records.
- **Default next actions:** Review, attest, promote, reject, trace provenance.
- **Outputs:** Witness actions (append-only). Status transitions.

---

## Mode-Event Matrix (Revised)

| Event | ANALYTIC | OPERATIVE | AUDIT |
|-------|----------|-----------|-------|
| TRAVERSE | ✓ session | ✓ session | ✓ session |
| INSPECT | ✓ session | ✓ session | ✓ session |
| ROTATE | ✓ | ✓ | ✓ |
| MANTLE | ✓ | ✓ | ✓ |
| TRACE_OPEN | ✓ | ✓ | ✓ |
| APPLY | hypothetical only | ✓ GENERATED | ✗ |
| MINT | ✗ | ✓ GENERATED | ✗ |
| INVOKE | ✗ | ✓ GENERATED | ✗ |
| PROPOSE | ✗ | ✓ GENERATED | ✗ |
| ANNOTATE | ✗ | ✓ GENERATED | ✗ |
| RELATE | ✗ | ✓ GENERATED | ✗ |
| TRAIL_SAVE | ✓ (saves reading path) | ✓ | ✓ |
| ATTEST | ✗ | ✗ | ✓ append-only |
| REVIEW | ✗ | ✗ | ✓ append-only |
| PROMOTE | ✗ | ✗ | ✓ append-only |
| REJECT | ✗ | ✗ | ✓ append-only |
| FLAG | ✗ | ✗ | ✓ append-only |
| ANCHOR | ✓ | ✓ | ✓ |
| DEPOSIT | ✗ | ✗ | ✓ (triggers Zenodo) |
| CITE | ✓ | ✓ | ✓ |
| SEVER | ✗ | ✗ | ✓ append-only (propagates QUARANTINE) |
| DIAGNOSE | ✓ | ✓ | ✓ |

---

## Session Object Lifecycle (Revised)

```
Tier 0 acts (traverse, inspect, rotate, mantle)
    ↓
Session records (volatile, ψ_s only)
    ↓
[optionally saved to trail or witness packet]

Tier 1 acts (apply, mint, invoke, propose, annotate, relate)
    ↓
GENERATED objects (durable, ψ_B accumulated)
    ↓
propose → Airlock
    ↓
Airlock checks criteria (six hard rules for rooms, basic criteria for others)
    ↓                                              ↓
QUEUED (criteria met)                    REJECTED (criteria not met, with reason)
    ↓
Single Assembly witness review → PROVISIONAL
    ↓
MANUS approves + Zenodo deposit → DEPOSITED (DOI issued)
    ↓
Assembly quorum ≥4/7 → RATIFIED
    ↓
Canonical archive (Library, Dashboard, Map)
```

---

## Relation to the Three-Document Triad

**Interface Constitution** (DOI: 10.5281/zenodo.19355075) — the law.
**Systems Workplan** — the build order.
**Event Schema** (this document) — the execution model.

The constitution says what must be true. The workplan says when to build it. The event schema says what happens when you use it.

---

## Base Schemas

Every object and event in the system inherits from these contracts.

### Base Object Schema

All canonical objects carry these fields:

```
{
  id: uuid,
  object_type: string,
  status: "GENERATED" | "QUEUED" | "PROVISIONAL" | "DEPOSITED" | "RATIFIED",
  created_at: ISO timestamp,
  created_by: heteronym_name | "MANUS" | substrate_id | user_id,
  updated_at: ISO timestamp,
  parent_objects: [object_ids],
  room_context: room_id | null,
  session_origin: session_id,
  ψ_B_total: number (cumulative bearing-cost invested in this object),
  provenance: {
    anchor: DOI | null,
    derivation_chain: [object_ids],
    witness_actions: [witness_action_ids],
  },
}
```

Every object type adds its own fields on top of this base. The base guarantees that any object can be traced, costed, statused, and provenanced without knowing its specific type.

### Base Event Schema

All typed events carry these fields:

```
{
  event_id: uuid,
  event_type: string,
  tier: 0 | 1 | 2 | 3,
  timestamp: ISO,
  session_id: string,
  actor: heteronym_name | "MANUS" | substrate_id | user_id,
  mode: "ANALYTIC" | "OPERATIVE" | "AUDIT",
  room_context: room_id | null,
  ψ_s: number,
  ψ_B: number,
  target_object: object_id | null (the object created or transformed),
  append_only: boolean,
}
```

**Duality rule:** Events are append-only facts about what happened. Objects are the evolving state that events create or transform. A PROMOTE event is a fact that never changes; the target object's status field is the state that the event changed. Events record. Objects evolve.

---

## Remaining Event Schemas

### ANNOTATE (Tier 1)

```
{
  ...base_event,
  event_type: "annotate",
  tier: 1,
  target: object_id (document, room, relation, or trail being annotated),
  text: string,
  annotation_type: "note" | "question" | "correction" | "extension",
  target_object: { ...base_object, object_type: "annotation", status: "GENERATED" },
  ψ_s: 3,
  ψ_B: 5,
}
```

Annotations are GENERATED and reviewable but follow a distinct promotion path: they can be REVIEWED (by any witness) but are not DEPOSITED independently. They attach to their parent object's provenance chain.

### RELATE (Tier 1)

```
{
  ...base_event,
  event_type: "relate",
  tier: 1,
  from: object_id,
  to: object_id,
  relation_type: "cites" | "derives" | "fulfills" | "supports" | "critiques" | "extends" | "supersedes" | "responds_to",
  directional: boolean (true = from→to, false = bidirectional),
  target_object: { ...base_object, object_type: "relation", status: "GENERATED" },
  ψ_s: 3,
  ψ_B: 8,
}
```

### TRAIL_SAVE (Tier 1)

```
{
  ...base_event,
  event_type: "trail_save",
  tier: 1,
  trail_name: string,
  path: [{ object_type: "room" | "document", id: object_id, note: string | null }],
  target_object: { ...base_object, object_type: "trail", status: "GENERATED" },
  ψ_s: 3,
  ψ_B: 5,
}
```

Trails are ordered reading paths. In ANALYTIC mode, saving a trail preserves the session's traversal sequence as a named path. In OPERATIVE mode, trails can be authored with editorial notes. Trails are promotable through the standard status path.

### DIAGNOSE (Tier 0 or Tier 1)

```
{
  ...base_event,
  event_type: "diagnose",
  tier: 1 (if producing a diagnostic object) | 0 (if session-only),
  diagnostic_type: "full" | "depth" | "opacity" | "coherence" | "capture" | "provenance",
  target: object_id | "session",
  results: {
    σ: object_id | null,
    ε: number (0-1),
    Ξ: [operator_names],
    ψ_s: number,
    ψ_B: number,
    mantle: string | null,
    register: string,
    room: room_id | null,
    los_status: "active" | "standby",
    DRR: number | null,
    CSI: number | null,
    PCS: number | null,
  },
  target_object: { ...base_object, object_type: "diagnostic", status: "GENERATED" } | null,
  ψ_s: 5,
  ψ_B: 8 (if producing object) | 0 (if session-only),
}
```

### DEPOSIT (Tier 3)

```
{
  ...base_event,
  event_type: "deposit",
  tier: 3,
  target: object_id (the object being deposited),
  zenodo_record_id: string | null (assigned after Zenodo success),
  doi: string | null (assigned after Zenodo publish),
  file_format: "pdf" | "md" | "json",
  target_object: transformed (status → "DEPOSITED", doi field set),
  ψ_s: 5,
  ψ_B: 20,
}
```

**Authority rule:** DEPOSIT requires AUDIT mode plus MANUS actor authority. AUDIT mode is necessary but not sufficient. No witness other than MANUS can trigger deposit. This is constitutional: PROVISIONAL → DEPOSITED requires "MANUS approval + Zenodo DOI" per the status algebra.

### CITE (Tier 3)

```
{
  ...base_event,
  event_type: "cite",
  tier: 3,
  from: object_id (the citing object),
  to: DOI | object_id (the cited object),
  citation_context: string | null (the sentence or paragraph where the citation occurs),
  target_object: { ...base_object, object_type: "citation_link" },
  ψ_s: 2,
  ψ_B: 3,
}
```

### SEVER (Tier 2 — necrotic lineage containment)

```
{
  ...base_event,
  event_type: "sever",
  tier: 2,
  target: object_id (the compromised root object),
  reason: "demotion" | "hallucination" | "provenance_failure" | "rag_poisoning",
  rationale: string,
  propagation: "downstream" (all objects whose parent_objects include this target),
  effect: all downstream objects marked QUARANTINED,
  quarantine_resolution: "assembly_review" (each downstream object must be independently re-reviewed to clear quarantine),
  target_object: transformed (status → below PROVISIONAL),
  append_only: true,
  ψ_s: 5,
  ψ_B: 15,
}
```

**QUARANTINE status:** Objects in QUARANTINE are visually marked (red border, warning badge) across all projections. They retain their content but cannot be cited, promoted, or used as parent objects for new derivations until cleared. Clearing requires: the downstream object's author replaces the severed dependency with an independent source, and a single Assembly witness reviews the replacement. QUARANTINE is the event schema's immune system — it prevents a single point of failure from silently corrupting the archive's derivation graph.

---

## Retention and Persistence Rules

### Volatile (Session Records — Tier 0)

- **Where they live:** In-memory during session. Optionally backed to session storage (Supabase `sessions` table) for continuity across page reloads.
- **How long they persist:** Until session ends, unless explicitly saved.
- **Prunable:** Yes. Older than 24 hours and unsaved = prunable.
- **Promotable:** Yes — a session record can be saved to a trail (`trail save`) or attached to a witness packet (`attest` with session reference). At that point it becomes a durable Tier 1 or Tier 2 object.
- **Provenance accounting:** Session records contribute to ψ_s but not to ψ_B. They are not counted toward an object's total bearing-cost unless promoted.

### Durable (Generated Objects — Tier 1)

- **Where they live:** Canonical object store (Supabase `objects` table).
- **How long they persist:** Indefinitely. GENERATED objects are never auto-deleted.
- **Prunable:** Only by MANUS, and only before QUEUED status. Once QUEUED, the object is in the governance pipeline and cannot be deleted.
- **Promotable:** Through the full status path: GENERATED → QUEUED → PROVISIONAL → DEPOSITED → RATIFIED.
- **Provenance accounting:** Contribute to both ψ_s and ψ_B. The object's ψ_B_total accumulates across all events that touch it (creation, revision, review, promotion).

### Append-Only (Governance Records — Tier 2)

- **Where they live:** Governance ledger (Supabase `witness_actions` table).
- **How long they persist:** Forever. Never deleted. Never modified.
- **Prunable:** Never.
- **Promotable:** Not applicable. Witness actions are records of governance, not objects under governance.
- **Provenance accounting:** Contribute to ψ_B of the target object. A review that costs 12ψ_B is added to the reviewed object's ψ_B_total.

### Provenance Records (Tier 3)

- **Where they live:** Canonical object store (anchors, citations) or external (Zenodo deposits).
- **How long they persist:** As long as the anchored target exists.
- **Prunable:** Never (anchors and citations are provenance — removing them is provenance destruction).
- **External persistence:** DEPOSIT events create records in Zenodo that persist independently of the Hexagonal OS. This is the γ-tether: the architecture survives outside itself.

---

## Projection Definitions

Each interface surface reads from specific slices of the event-object graph:

### MAP
**Reads:** Rooms + edges + room statuses + traversal history (current session) + document counts per room.
**Updates on:** TRAVERSE, RELATE (room-to-room), PROPOSE (new room).

### LIBRARY (Forward Library)
**Reads:** DEPOSITED and RATIFIED documents + excerpts + room assignments + typed relations + citations + trails. Web search results (external, unanchored).
**Updates on:** DEPOSIT, CITE, RELATE, TRAIL_SAVE, ANCHOR.

### SESSION
**Reads:** Current session's events (all tiers) + GENERATED objects + ψ_s and ψ_B running totals + LP state tuple.
**Updates on:** Every event.

### ASSEMBLY (Governance Console)
**Reads:** Witness actions + proposal queue + quorum state + pending reviews + promotion history + rejection log + constrained witnesses.
**Updates on:** PROPOSE, ATTEST, REVIEW, PROMOTE, REJECT, FLAG.

### DASHBOARD (Deposit Dashboard)
**Reads:** All DEPOSITED and RATIFIED objects + DOI registry + date/author/keyword facets + room distribution + monthly counts + pending deposits.
**Updates on:** DEPOSIT, PROMOTE (to RATIFIED).

### TRACE
**Reads:** Target object's full provenance: creation event, parent objects, derivation chain, status transitions (all PROMOTE events), witness actions, citations, room assignments, ψ_B_total, anchor chain.
**Updates on:** Any event touching the traced object.

### STATUS
**Reads:** Global status distribution (counts per status level) + session GENERATED objects + promotion pipeline.
**Updates on:** PROMOTE, MINT, INVOKE, APPLY, PROPOSE, DEPOSIT.

---

## LP Runtime State Model (Appendix)

The LP state tuple remains the formal model for session state:

```
⟨σ, ε, Ξ, ψ⟩ → ⟨σ', ε', Ξ', ψ'⟩
```

- σ = current sign state (the object loaded in working memory)
- ε = openness (0 = fully closed, 1 = fully open; some operators decrease, some increase)
- Ξ = active operator stack (the room's ops, plus any explicitly loaded)
- ψ = composite of ψ_s and ψ_B for the current session

**Event effects on the tuple:**

| Event | σ | ε | Ξ | ψ |
|-------|---|---|---|---|
| TRAVERSE | → room | unchanged | → room.ops | ψ_s += 3 |
| INSPECT | → document | unchanged | unchanged | ψ_s += 3 |
| APPLY | → σ' (transformed) | may change | op logged | ψ_s += 5, ψ_B += 10 |
| INVOKE | → output | opens | unchanged | ψ_s += 10, ψ_B += 20 |
| MINT | unchanged | unchanged | unchanged | ψ_s += 5, ψ_B += 10 |
| ROTATE | unchanged | may change | unchanged | ψ_s += 2 |
| ANCHOR | σ gains lock | unchanged | unchanged | ψ_s += 2, ψ_B += 5 |
| DIAGNOSE | unchanged | unchanged | unchanged | ψ_s += 5 |

---

Lee Sharks · Crimson Hexagonal Archive · March 2026
