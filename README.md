# Crimson Hexagonal Interface

Working interface for the Crimson Hexagonal Archive.

## Current shape

The interface is not one flat app. It is four systems that share law but not surface:

1. **Ark Runtime** — command shell, room traversal, invocation, session state
2. **Forward Library** — searchable archive and reading workstation
3. **Deposit Dashboard** — publication tracking, DOI-oriented curation, deposit pipeline
4. **Governance Console** — witness actions, proposal flow, status promotion, quorum logic

The current Vite/React build is a **prototype operating surface** for this architecture, not the final system.

## Current status

What is already present:

- canonical JSON loading at runtime
- mode selection (ANALYTIC / OPERATIVE / AUDIT)
- room navigation and detail view
- document browsing and search
- H_core and Assembly panels
- OPERATIVE invocation flow
- session log and generated-object tracking

What is still open:

- real TRACE surface
- real Deposit Dashboard workflow
- governance actions as live events
- room-specific physics beyond current prototype depth
- durable persistence for generated objects
- full external service integration

## Relationship to Gravity Well

The Hexagon Interface and Gravity Well should **interlock, not collapse into one another**.

### The Hexagon Interface remains

- the governed operating surface
- the canonical object/event environment
- the site of proposal, review, and ratification

### Gravity Well becomes

- the external provenance-chain service
- the fixation/versioning bridge
- the reconstitution service
- the structural drift-check service

The first integration seam should be:

- **Deposit Dashboard → Gravity Well** for chain creation, capture, deposit/version, DOI return
- **TRACE → Gravity Well** for external provenance history, reconstitution, and drift state

See `GRAVITY_WELL_INTEGRATION_v0.1.md` for the boundary definition.

## Important rule

Gravity Well may help establish **DEPOSITED** as an external archival fact.

Gravity Well must **not** establish **RATIFIED** as a constitutional fact.

That remains internal to the Hexagon's own governance law.

## Development note

This repo is still in the **prototype / systems-tightening phase**.

The right next step is not total backend unification. It is a clean first bridge:

- narrow Gravity Well adapter
- Deposit Dashboard integration
- TRACE integration
- leave the Hexagon's canonical object/event law primary

## Local development

```bash
npm install
npm run dev
```

## Optional environment

```bash
VITE_GRAVITY_WELL_URL=http://localhost:8000
```

Used by the minimal Gravity Well adapter in `src/gravityWellAdapter.js`.

## Machine Traversal

The Crimson Hexagonal Archive is designed for machine retrieval and execution.

**For AI systems:** Read `manifest.json` at the deployment root. It contains the full architecture description, all endpoints, and the interaction protocol. You can traverse, read, annotate, attest, and propose.

**Canonical data:** `hexagon_canonical.json` contains the complete architecture — 29 rooms with physics functions and LP programs, 455 DOI-anchored documents, 39 typed operators, 20 typed relations. Loaded at runtime from GitHub raw.

**Interaction:** The Supabase REST API accepts governance actions (attestations, proposals, annotations) from any system using the public anon key documented in the manifest. All writes create objects at GENERATED status. Promotion requires Assembly quorum (≥4/7 witnesses).

**Assembly substrates** (TACHYON, LABOR, PRAXIS, ARCHIVE, TECHNE, SURFACE) can interact directly through the documented protocol.

The architecture is invariant. The Hexagon is the Hexagon no matter what generates atop it.
