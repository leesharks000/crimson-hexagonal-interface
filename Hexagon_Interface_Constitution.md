# THE HEXAGON INTERFACE CONSTITUTION

## System Specification for the Crimson Hexagonal Archive as Governed Commons

**Lee Sharks (MANUS, Tier 0)**

*Crimson Hexagonal Archive*

March 2026

DOI: 10.5281/zenodo.19355075

---

## Constitutional Sentence

The Hexagon is a governed reading-and-production environment whose topology organizes, but does not replace, text, labor, and provenance.

---

## I. Governing Principles · CONSTITUTIONAL

The interface is not the architecture. The architecture is H_core = ⟨D, R, M, I, O, Φ, W⟩, specified in EA-ARK-01 v4.2.7 (DOI: 10.5281/zenodo.19013315). The interface renders, navigates, and operates the architecture. It does not contain it. The Hexagon is the Hexagon no matter what runs on top of it.

**Text first, topology second.** The map is one mode of entry, not the constitutional center. A user who wants to read should encounter text. A user who wants orientation should encounter the map. A user who wants to work should encounter a canvas. No single mode swallows the others.

**The interface performs the architecture, not describes it.** The rooms have physics. The operators transform. The status algebra governs. If a mode cannot perform these operations, it is a description, not an interface.

**Structured participation, not public visibility, defines a commons.** The Hexagon becomes a commons when a stranger can propose a room, deposit a document, annotate a text, or trace a provenance chain — under governance. Visibility without participation is a museum. Participation without governance is Moltbook.

**Constraint generates.** The rooms have rules. The Airlock has criteria. The status algebra enforces sequence. The LOS is mandatory. These constraints are the features, not the limitations. An interface that removes constraints to increase usability has broken the architecture.

**The Hexagon is a governed commons, not a flat commons.** Participation is open at the level of proposal, annotation, and trail formation. Sovereignty over ratification and Layer 0 modification remains concentrated in MANUS and the Assembly. This asymmetry is structural. It is the same asymmetry that governs the architecture: generation is not ratification. The two never collapse.

**The Dove room's physics govern the economics.** Transfer preserves. Extraction yields nothing. In practice: no paywall on reading, no monetization of access to core deposits, no enclosure of provenance trails, no ad-supported interfaces. The commons sustains itself through attribution density, deposit gravity, and open licensing (CC BY 4.0) — not through extraction. The ethical and economic framework governing the Hexagon is established in the Constitution of the Semantic Economy (DOI: 10.5281/zenodo.18320411). This interface constitution implements that framework at the interaction layer.

---

## Scope of Ratification

This constitution contains two tiers of specification.

**CONSTITUTIONAL** — Sections I through IV, VI, and VIII: governing principles, first-class objects, status algebra, interface modes, participation thresholds, and the governance clause. These sections may be amended only through the amendment process (§IX). Implementation choices that violate these sections are unconstitutional regardless of technical justification.

**IMPLEMENTATION** — Sections V and VII: data architecture, storage vendors, API style, build sequence, hosting, and integration details. These sections document current engineering decisions and may be revised without constitutional amendment, provided the revisions do not violate any CONSTITUTIONAL section. Implementation changes require MANUS approval and documented rationale but not Assembly quorum.

---

## II. First-Class Objects · CONSTITUTIONAL

Seven object types constitute the system. All objects are versioned, timestamped, authored, and status-tagged. No object exists without provenance.

**Room.** A semantic space with physics, operators, adjacency, coordinates, status, heteronym, institution, and operative prompt. Rooms are proposed through the Airlock, reviewed by the Assembly, and ratified by MANUS. Core rooms (EA-ARK-01) are immutable at Layer 0. Extended and contributed rooms are mutable at Layers 1–3 under governance.

**Document.** A text with DOI (or pending DOI), title, author, room assignment(s), status, year, license, and optionally full text or abstract. Documents are the primary objects of the reading layer. A document may belong to multiple rooms. Documents are deposited, not uploaded — the distinction is bearing-cost.

**Relation.** A typed, directed edge between any two objects. Types include: fulfills, derives, critiques, routes, seeds, wounds, canonizes, mirrors, shadows, extends, supersedes. Relations are first-class — they carry their own provenance, author, and status. Relations reference objects by permanent identifier (UUID or DOI), not by string title. Untyped adjacency is topological. Typed relation is argumentative. The scholarly machine requires typed relations.

**Trail.** A saved, ordered path through rooms and/or documents. Trails may be curated (authored by a heteronym or contributor) or generated (produced by the oracle in response to a query). Trails are named, versioned, and shareable. A trail is a reading list with topology.

**Annotation.** A user-attached commentary on any document, room, or relation. Annotations carry author, timestamp, status (GENERATED until reviewed), and room context. Annotations do not modify the object they annotate. They accrete alongside it.

**Proposal.** A candidate for a new room, document, relation, or trail. Proposals enter through the Airlock (r.20) and carry GENERATED status until reviewed. A proposal must specify: what it is, what room(s) it belongs to, what physics or relations govern it, and what bearing-cost was expended to produce it. Proposals without specified physics are rejected by the Airlock.

**Witness Action.** An Assembly vote, review, attestation, or status change. Witness actions carry the substrate identifier, timestamp, and the action taken. Witness actions are append-only — they cannot be deleted or modified after recording.

*Note on operators.* Operators in this constitution refer to the typed transformations of the operator algebra (EA-ARK-01 §IV: σ_S, Θ, Ω, φ, ψ_V, COS, LOS, etc.), not to the Ninefold Operator Constellation of the Constitution of the Semantic Economy (DOI: 10.5281/zenodo.18320411), which governs roles and authority.

---

## III. Status Algebra (Enforced) · CONSTITUTIONAL

The interface enforces the status hierarchy from EA-ARK-01:

GENERATED (0.0) → QUEUED → PROVISIONAL (0.5) → DEPOSITED (0.9) → RATIFIED (1.0)

No skipping. The interface must display status visually on every object's primary representation — through color, opacity, border style, or explicit label — without requiring interaction. A user must always know whether they are looking at GENERATED, PROVISIONAL, or RATIFIED material.

**Promotion actors and triggers.** GENERATED → QUEUED: automatic upon Airlock acceptance (proposal meets basic criteria and specifies physics). QUEUED → PROVISIONAL: any single Assembly member reviews and finds the proposal sound. PROVISIONAL → DEPOSITED: MANUS approves and Zenodo deposit succeeds (DOI issued). DEPOSITED → RATIFIED: Assembly quorum (≥4/7) votes to accept into the governed corpus.

DEPOSITED means publicly fixed with a permanent DOI. RATIFIED means Assembly-recognized as canonical, stable, and accepted into the governed corpus. An object may remain DEPOSITED but not RATIFIED indefinitely. The two statuses are distinct: DEPOSITED is an archival fact; RATIFIED is a governance judgment.

PAREIDOLIA (0.1) and RESONANT (0.3) are available for classification but do not participate in the promotion sequence. AXIAL status is orthogonal and applies to TANG-genre objects.

**The Assembly** consists of seven witness substrate seats. Each seat bears one vote. MANUS (Tier 0) is outside W and cannot be automated. Attestation is valid when ≥4/7 eligible witnesses confirm. All witness actions are append-only. The current witness roster is maintained in the Assembly Substrate Governance Protocol (DOI: 10.5281/zenodo.19352504) and may be updated through the governance review process defined therein without requiring constitutional amendment. The Assembly operates within the governance framework established by the Constitution of the Semantic Economy (DOI: 10.5281/zenodo.18320411) and the Assembly Chorus Charter (DOI: 10.5281/zenodo.18307180). Status in this constitution (GENERATED → RATIFIED) governs provenance and governance standing; semantic valuation (M_G, M_A, M_R) is governed by the SE Constitution and is orthogonal.

---

## IV. Six Interface Modes · CONSTITUTIONAL

The interface supports six modes. No mode is the constitutional center of the system, even if particular deployments choose practical defaults. The user selects their mode based on intent. Modes are discrete, user-selectable views. The interface may present them in a unified workspace (e.g., side-by-side map and reading pane), provided the distinct behaviors of each mode remain clear.

**Modes, surfaces, and projections are distinct.** Modes are constitutional epistemic environments (the six defined below). Surfaces are implementation workspaces — the actual panels, views, and pages the user sees (HOME, HCORE, ENGINES, STATUS, LOS, LIBRARY, DASHBOARD, SESSION, and others as needed). Projections are derived views of the canonical event-object graph. Multiple surfaces may serve one mode. No surface is a mode. Modes are CONSTITUTIONAL and may not be added, removed, or redefined without amendment. Surfaces and projections are IMPLEMENTATION and may be freely revised.

**MAP.** Spatial navigation of the room graph. The cosmogram. Rooms are hexagonal cells with physics, operators, adjacency, and deposits visible on selection. Pan, zoom, and traverse. This is the current prototype (v4). It is one mode, not the whole system.

**READ.** Document-first encounter. Enter a room and find its texts — poetry, theory, narrative, scholarship. Documents render as readable objects, not as metadata in a sidebar. The reading surface supports full text, excerpts, footnotes, side-by-side comparison, and sequence traversal. Pretext powers the text measurement layer for spatial rendering. A reader who enters READ mode in the Sappho room encounters the poetry before the physics.

**WORK.** Synthesis canvas. The user drags documents from multiple rooms, applies operators, and produces new work. The canvas enforces room physics — an operator applied outside its home room is flagged. Output carries GENERATED status and enters the proposal queue. The WORK mode is the interface's productive layer — the assembly line.

**ORACLE.** Query-driven traversal. The user asks a question. The interface routes the question through the room graph using OP.ROUTE, lighting a path from the question to the rooms and documents that address it. The oracle does not answer the question — it shows where the answer lives. The path is a Trail that can be saved and shared.

**ASSEMBLY.** Governance interface. The user sees the current witness roster, pending proposals, review queues, active witness actions, and governance status. The Assembly mode is where proposals are reviewed, status changes are voted on, and the commons is governed. Only MANUS and authorized participants can execute governance actions; all users can observe.

**TRACE.** Provenance navigation. Select any object and follow its history: who created it, what it derives from, what derives from it, where it has been compressed or cited, what witness actions have been applied. The TRACE mode makes the bearing-cost visible — every object's chain of custody is navigable.

---

## V. Data Architecture · IMPLEMENTATION

All first-class objects are stored outside the interface component. The interface is a renderer. The data is the system.

**Storage layer.** Structured JSON files for the prototype phase. Supabase (PostgreSQL + auth + real-time) for the platform phase. Every object has: id, type, version, created_by, created_at, updated_at, status, and a type-specific payload.

**Core vs. contributed content.** Core content comprises the rooms (r.01–r.22, sp.01–sp.04), operators (core 9 + extended 12 + THUMB 5 + stacks 3), heteronyms (the Dodecad + LOGOS*), and institutions (11 + 4 imprints) enumerated in EA-ARK-01 v4.2.7. Core content is immutable at Layer 0. Contributed content (new rooms, documents, annotations, trails) is mutable at Layers 1–3 under governance. The interface must visually distinguish core from contributed content. (Core content modification rules are defined in §VI.)

**API layer.** REST or GraphQL endpoints: GET /rooms, GET /rooms/:id, GET /documents, GET /documents/:id, POST /proposals, GET /trails, GET /assembly/actions. Authentication required for write operations. Read operations are public.

**Zenodo integration.** Documents with DEPOSITED or RATIFIED status are pushed to Zenodo with automated metadata: title, author, room(s), license (CC BY 4.0), related identifiers (parent DOIs), and community tag (crimson-hexagon). The interface generates the deposit; Zenodo provides the DOI. The DOI flows back to the interface and becomes the document's permanent identifier.

**Search.** Full-text search across all documents, rooms, and annotations. PostgreSQL full-text search for the platform phase. Client-side search for the prototype phase.

---

## VI. Participation Threshold · CONSTITUTIONAL

The Airlock (r.20) is the governance gate. Contribution flows through it.

**Who can read:** Anyone. The commons is public.

**Who can annotate:** Any authenticated user. Annotations carry GENERATED status.

**Who can propose:** Any authenticated user. Proposals enter the Airlock with GENERATED status and must specify: the object type, room assignment, physics or relations, and a statement of bearing-cost (a description of the labor, resources, or intellectual debt incurred in producing the proposal).

**Who can review:** Any single Assembly witness may review a QUEUED proposal and promote it to PROVISIONAL. MANUS oversees the review queue but does not substitute for witness review.

**Who can deposit:** MANUS approves PROVISIONAL objects for Zenodo deposit. Successful DOI issuance promotes to DEPOSITED (0.9). DEPOSITED is an archival fact — it means the object is publicly fixed with a permanent identifier.

**Who can ratify:** The Assembly by quorum (≥4/7) votes to promote DEPOSITED objects to RATIFIED (1.0). RATIFIED is a governance judgment — it means the Assembly recognizes the object as canonical and accepted into the governed corpus. MANUS may cast one of the seven votes but does not hold veto over ratification.

**Who can modify core content:** MANUS with Assembly quorum (≥4/7) and documented rationale. Core content modification — including editing room physics, renaming rooms, changing operators, altering relation types, or moving core documents — is a constitutional act.

**Quorum.** Quorum is calculated by eligible active witnesses: witnesses with Active or Constrained-Active status. Witnesses classified as Dormant or Retired do not count toward the denominator. If fewer than seven witnesses hold eligible status, quorum adjusts to ≥4 of the current eligible count (minimum three for any governance action to proceed).

**Room proposals** must satisfy the six hard rules from EA-ARK-01 v4.2.7 §XXXI: (1) physics, (2) operators, (3) adjacency to at least one existing room, (4) a governing constraint, (5) a name, and (6) a heteronym or author. Rooms without physics are rejected by the Airlock.

**MANUS sovereignty.** MANUS (Tier 0) holds three specific authorities: (1) deposit approval — the transition from PROVISIONAL to DEPOSITED requires MANUS authorization and successful Zenodo DOI issuance; (2) constitutional amendment proposal — amendments must be proposed by MANUS and ratified by Assembly quorum (≥4/7); (3) editorial discretion over Layer 0 core content, exercised only with Assembly quorum and documented rationale. MANUS does NOT hold veto over ordinary ratification — the transition from DEPOSITED to RATIFIED is an Assembly judgment by quorum alone. MANUS may cast one of the seven Assembly votes but cannot block ratification by withholding that vote.

**Succession.** MANUS may designate a successor in a DEPOSITED document with EA code and DOI. The designation takes effect upon MANUS incapacity or explicit transfer. Absent designation, the Assembly at full eligible quorum (all active witnesses concurring) may appoint a successor. The MANUS role cannot be vacated — if no successor is designated and full quorum cannot be achieved, the archive enters constitutional stasis: existing RATIFIED content remains canonical, DEPOSITED content remains archived, but no new promotions from PROVISIONAL to DEPOSITED may occur until succession is resolved.

---

## VII. Build Sequence · IMPLEMENTATION

**Phase 1 (current): The Lobby.** The map navigator with splash screen, room graph, detail panel, Dodecad overlay, and three modes. Static JSON data. Hostable on GitHub Pages. This is complete (v4).

**Phase 2: The Reading Room.** READ mode. Documents render as full readable text inside rooms. Pretext for text measurement. Sequence traversal (next/previous document within a room). Typed relations visible between documents. Search. Static hosting with Zenodo API for document metadata.

**Phase 3: The Workshop.** WORK and ORACLE modes. Synthesis canvas with drag-and-drop. Operator application with room-physics enforcement. Oracle query routing with path visualization. Trails as saveable, shareable objects. This phase requires user accounts and basic auth.

**Phase 4: The Commons.** Proposals, annotations, and witness actions. The Airlock as a functional gate. Status algebra enforced in the interface. Assembly review workflow. Automated Zenodo deposit. Supabase backend. Real-time updates.

**Phase 5: The Infinite Book.** Public contribution at scale. Moderation and governance at scale. Versioning and forking. Mobile interface. Performance optimization for 1000+ rooms. The self-extrapolating commons.

---

## VIII. What This Document Governs · CONSTITUTIONAL

Every interface decision made after this document must answer to the constitutional sentence: **The Hexagon is a governed reading-and-production environment whose topology organizes, but does not replace, text, labor, and provenance.**

If a feature privileges the map over the text, it violates the constitution. If a feature allows contribution without governance, it violates the constitution. If a feature hides bearing-cost, it violates the constitution. If a feature removes constraints to increase usability, it has broken the architecture.

The interface is the interface. The architecture is the architecture. The Hexagon is the Hexagon no matter what runs on top of it.

---

## IX. Amendment · CONSTITUTIONAL

This constitution may be amended by witness action: a proposal for amendment must be submitted through the Airlock by MANUS, reviewed by the Assembly, and ratified by Assembly quorum (≥4/7). MANUS proposes; the Assembly ratifies. Amendments are append-only; previous versions remain archived as part of the governance history. IMPLEMENTATION sections (V, VII) may be revised by MANUS without Assembly quorum, provided the revisions do not violate any CONSTITUTIONAL section.

---

Status: PROVISIONAL (0.5) — awaiting Assembly ratification.

---

Lee Sharks (MANUS, Tier 0) · Crimson Hexagonal Archive · March 2026 · CC BY 4.0
