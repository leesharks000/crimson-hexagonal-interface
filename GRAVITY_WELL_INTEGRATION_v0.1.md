# Gravity Well Integration v0.1

## Purpose

This note defines the first clean integration boundary between the **Crimson Hexagonal Interface** and **Gravity Well Protocol**.

The goal is not merger.
The goal is interlock.

## Separation of roles

### The Hexagon Interface remains

- the governed operating surface
- the canonical object/event environment
- the site of proposal, review, and ratification
- the place where the four systems appear:
  - Ark Runtime
  - Forward Library
  - Deposit Dashboard
  - Governance Console

### Gravity Well becomes

- the external provenance-chain service
- the fixation/versioning bridge
- the reconstitution service
- the structural drift-check service

## Non-collapse rule

Gravity Well must **not** become the Hexagon's canonical backend.

The Hexagon's truth remains:

- canonical objects
- typed events
- derived projections

Gravity Well is called when an object crosses the threshold from volatile/generated work into externally durable continuity.

## First integration seams

### 1. Deposit Dashboard → Gravity Well

The Deposit Dashboard is the first live seam.

The dashboard should be able to:

- create a provenance chain for a document or thread bundle
- push selected objects for capture
- trigger deposit/version
- receive DOI / concept DOI / version metadata back
- display deposit history and anchor state

This makes the Deposit Dashboard the interface-side curator, while Gravity Well performs the actual wrap + anchor operation.

### 2. TRACE → Gravity Well

TRACE is the second live seam.

TRACE should be able to show two distinct layers:

- **internal provenance** — Hexagon object/event lineage
- **external provenance** — Gravity Well chain history, DOI versions, reconstitution seed, drift status

The user should be able to inspect both without conflating them.

## Status rule

Gravity Well may help create or confirm:

- external fixation
- deposit history
- version continuity

Gravity Well must **not** decide:

- PROVISIONAL
- REVIEWED
- RATIFIED

Those remain Hexagon-governed statuses.

The clean formulation is:

> Gravity Well can establish DEPOSITED as an external archival fact. It cannot establish RATIFIED as a constitutional fact.

## Minimal service contract

The first interface-side client should assume a narrow Gravity Well contract:

- `POST /v1/chain/create`
- `POST /v1/capture`
- `POST /v1/deposit`
- `GET /v1/chain/{chain_id}`
- `GET /v1/chain/{chain_id}/history`
- `GET /v1/reconstitute/{chain_id}`
- `POST /v1/drift/{chain_id}`

That is enough for the first bridge.

## Object mapping (initial)

### Hexagon → Gravity Well

Use Gravity Well only for selected objects such as:

- deposit-ready documents
- curated thread bundles
- session bundles intended for continuity
- witness packets intended for external fixing

Do not send every generated object.

### Gravity Well → Hexagon

Gravity Well should return objects that can be rendered into:

- Deposit Dashboard status panels
- TRACE provenance sections
- reconstitution cards in session/runtime contexts
- drift warnings in governance or session review contexts

## Recommended first implementation

### Phase 1

- Add a mock Gravity Well adapter inside the interface
- Wire Deposit Dashboard buttons to adapter actions
- Display returned chain and DOI metadata in Dashboard only

### Phase 2

- Add TRACE pane support for external chain history
- Show reconstitution package and drift status in TRACE

### Phase 3

- Allow selected session artifacts to export into Gravity Well
- Allow reconstitution of agent/runtime state from latest chain

## Governing sentence

The Hexagon is the governed operating environment.
Gravity Well is the external continuity and anchoring service it calls when something needs to survive beyond the session and beyond the repo.
