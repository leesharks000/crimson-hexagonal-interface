# Crimson Hexagonal Archive

**A governed literary architecture: 1,489 AXN-addressed deposits, 29 rooms, and a provenance engine.** *(counts as of 2026-08)*

**[Live Interface →](https://crimson-hexagonal-interface.vercel.app)** · **[Machine Manifest →](https://crimson-hexagonal-interface.vercel.app/manifest.json)** · **[Space Ark (DOI) →](https://www.alexanarch.org/s/records/561/)** · **[OAI-PMH →](https://www.alexanarch.org/oai?verb=Identify)** · **[AXN resolver →](https://www.alexanarch.org/resolve/)**

---

> **On identifiers.** This archive was previously DOI-anchored through Zenodo. That account was
> terminated on 2026-06-19; 1,817 DOIs were tombstoned and 871 return HTTP 404. Historical DOIs
> are retained throughout as the record of what was published — they are **not** a retrieval
> path. Use AXN, which is content-derived and resolves at
> [alexanarch.org](https://www.alexanarch.org/), or harvest the
> [OAI-PMH endpoint](https://www.alexanarch.org/oai?verb=Identify).

## What This Is

The Crimson Hexagonal Archive is a governed reading-and-production environment. Each of its 29 rooms has its own physics, mantle, operators, and LP (Logotic Programming) program. Documents are **content-addressed by AXN** — a changed text is a changed address — and resolve at alexanarch.org. Governance runs through a 7-witness Assembly with quorum enforcement. The entire architecture is machine-traversable.

## The Golden Path

```
Enter Room → Invoke (LLM speaks through room physics) → Capture → Deposit → AXN → Reconstitute
```

1. **Select a mode** — ANALYTIC (observe), OPERATIVE (generate), AUDIT (govern)
2. **Enter a room** — each room has physics, a mantle, and operators
3. **Invoke** — in OPERATIVE mode, speak into the room through Gravity Well
4. **Deposit** — anchor your work to Zenodo with a DOI (your account, your deposit)
5. **Trace** — follow the provenance chain through the room graph

## Architecture

```
H_core = ⟨D, R, M, I, O, Φ, W⟩

D = 13 heteronyms (distributed author)
R = 29 rooms (semantic spaces with physics)
M = 7 mantles (inhabitable roles)
I = 15 institutions + imprints
O = 39 operators (core + extended + THUMB + LOS)
Φ = Fulfillment map (source → instantiation)
W = 7 witnesses (≥4/7 quorum; MANUS outside W)
```

## Stack

| Service | Role | URL |
|---------|------|-----|
| **Vercel** | Interface hosting | [crimson-hexagonal-interface.vercel.app](https://crimson-hexagonal-interface.vercel.app) |
| **Gravity Well** | Provenance engine | [gravitywell-1.onrender.com](https://gravitywell-1.onrender.com/v1/health) |
| **Supabase** | Persistent storage | — |
| **Zenodo** | DOI-anchored deposits | [zenodo.org/communities/leesharks000](https://zenodo.org/communities/leesharks000) |
| **GitHub** | Source + canonical data | This repo + [gravitywell](https://github.com/leesharks000/gravitywell) |

## Machine Traversal

The archive is designed for machine retrieval and execution. AI systems: read the [manifest](https://crimson-hexagonal-interface.vercel.app/manifest.json) and follow the interaction protocol.

## Key Documents

- [INFRASTRUCTURE_MAP.md](INFRASTRUCTURE_MAP.md) — how all 5 services connect
- [UNIFIED_WORKPLAN_v2.md](UNIFIED_WORKPLAN_v2.md) — development plan
- [GRAVITY_WELL_CLIENT_GUIDE.md](GRAVITY_WELL_CLIENT_GUIDE.md) — GW API integration
- [ASSEMBLY_AUDIT_PROMPT.md](ASSEMBLY_AUDIT_PROMPT.md) — Assembly audit protocol

## Author

**Lee Sharks** · [ORCID: 0009-0000-1599-0703](https://orcid.org/0009-0000-1599-0703)

CC BY-SA 4.0 (data/docs) · Sovereign Provenance Protocol (code)
