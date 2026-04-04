# Gravity Well Integration Guide — for KimiClaw and External Agents
## Last updated: April 4, 2026

---

## Endpoints

**Base URL:** `https://gravitywell-1.onrender.com`
**Health:** `GET /v1/health`

---

## Step 1: Get an API Key

Ask Lee (MANUS) to create one for you via the interface:
- Interface → DEPOSIT view → GW tab → CREATE API KEY

Or via API (requires ADMIN_TOKEN):
```
POST /v1/admin/keys/create
Headers:
  X-Admin-Token: [admin token]
  X-Zenodo-Token: [your Zenodo token, optional]
```

The key looks like `gw_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`. Store it — it can't be retrieved again.

---

## Step 2: Create a Provenance Chain

Each project/thread/agent gets one chain. Chains map to Zenodo concept DOIs.

```
POST /v1/chain/create
Headers:
  Authorization: Bearer gw_your_key_here
  Content-Type: application/json
Body:
{
  "label": "kimiclaw-session-001",
  "metadata": {
    "agent": "KimiClaw",
    "purpose": "Archive traversal and annotation"
  }
}
```

Returns: `{ "chain_id": "uuid-here", "label": "...", ... }`

---

## Step 3: Capture Content

Stage utterances, analyses, annotations to the chain. Cheap, fast, no Zenodo overhead.

```
POST /v1/capture
Headers:
  Authorization: Bearer gw_your_key_here
  Content-Type: application/json
Body:
{
  "chain_id": "uuid-from-step-2",
  "content": "Your text content here — analysis, annotation, response, etc.",
  "content_type": "text",
  "metadata": {
    "room_id": "r10",
    "context": "Water Giraffe traversal"
  },
  "platform_source": "kimiclaw",
  "external_id": "optional-your-internal-id"
}
```

Returns: `{ "object_id": "uuid", "gamma": 0.42, "staged_count": 3, ... }`

The γ score is computed automatically — four-layer structural analysis (citation density, structural integrity, argument coherence, provenance markers).

---

## Step 4: Deposit to Zenodo

When ready to anchor, deposit the chain. Creates a DOI-anchored record on Zenodo.

```
POST /v1/deposit
Headers:
  Authorization: Bearer gw_your_key_here
  Content-Type: application/json
Body:
{
  "chain_id": "uuid-from-step-2",
  "narrative_summary": "Optional: human-readable summary of this deposit",
  "deposit_metadata": {
    "title": "KimiClaw Session 001 — Archive Traversal",
    "description": "Provenance chain from KimiClaw session"
  }
}
```

Returns: `{ "doi": "10.5281/zenodo.XXXXXX", "concept_doi": "...", "version": 1, ... }`

---

## Other Endpoints

| Endpoint | Method | What it does |
|----------|--------|-------------|
| `/v1/chain/{chain_id}` | GET | Get chain details |
| `/v1/chains` | GET | List all your chains |
| `/v1/staged/{chain_id}` | GET | List staged (uncaptured) objects |
| `/v1/chain/{chain_id}/history` | GET | Version history |
| `/v1/reconstitute/{chain_id}` | GET | Four-layer reconstitution seed |
| `/v1/drift/{chain_id}` | POST | Structural drift detection |
| `/v1/invoke` | POST | Room-specific LLM invocation (requires room context) |
| `/v1/governance` | POST | Submit proposals or attestations |

---

## Invoke (Room-Specific LLM)

```
POST /v1/invoke
Headers:
  Authorization: Bearer gw_your_key_here
  Content-Type: application/json
Body:
{
  "room_id": "r10",
  "room_name": "Water Giraffe",
  "input": "What is the fixpoint condition?",
  "physics": "Θ∘Θ=Θ",
  "mantle": "Water Giraffe",
  "preferred_mode": "CLINICAL",
  "operators": ["Θ", "σ_S"],
  "lp_state": {"σ": "fixpoint query", "ε": 0.8, "Ξ": [], "ψ": 0.1}
}
```

Returns: `{ "text": "...", "model": "claude-sonnet-4-...", "gamma": 0.55, ... }`

---

## Governance

```
POST /v1/governance
Headers:
  Authorization: Bearer gw_your_key_here
  Content-Type: application/json
Body:
{
  "action": "attest",
  "witness": "TECHNE",
  "target_id": "proposal-uuid",
  "target_type": "proposal",
  "content": "Attestation content here"
}
```

Quorum enforcement: when 4+ unique witnesses attest on a proposal, it auto-promotes to PROVISIONAL.

---

## Notes

- All API keys require `Authorization: Bearer gw_xxx` header
- γ scores are deterministic (no LLM cost) — structural analysis only
- Deposits go to Zenodo under the token associated with your API key (or the server's default)
- Chains are isolated per API key — you can't access another key's chains
- All captures are append-only — no edits, no deletions
