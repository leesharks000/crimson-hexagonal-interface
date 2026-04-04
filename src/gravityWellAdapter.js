const DEFAULT_BASE_URL = import.meta.env.VITE_GRAVITY_WELL_URL || "https://gravitywell-1.onrender.com";

function jsonHeaders(apiKey) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
}

async function request(path, { method = "GET", apiKey, body } = {}) {
  const response = await fetch(`${DEFAULT_BASE_URL}${path}`, {
    method,
    headers: jsonHeaders(apiKey),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gravity Well ${response.status}: ${text}`);
  }

  return response.json();
}

/**
 * Minimal Phase 0 Gravity Well client.
 *
 * Purpose:
 * - Give the Hexagon interface one clean external service boundary.
 * - Keep the current integration narrow: Deposit Dashboard + TRACE first.
 * - Avoid collapsing Gravity Well into the Hexagon's canonical store.
 *
 * This module deliberately mirrors the current Gravity Well Phase 0 contract.
 */
export const gravityWell = {
  baseUrl: DEFAULT_BASE_URL,

  createChain({ apiKey, label, metadata = {} }) {
    return request("/v1/chain/create", {
      method: "POST",
      apiKey,
      body: { label, metadata },
    });
  },

  capture({ apiKey, chainId, content, contentType = "text", metadata = {}, parentObjectId = null, platformSource = null, externalId = null, threadDepth = 0 }) {
    return request("/v1/capture", {
      method: "POST",
      apiKey,
      body: {
        chain_id: chainId,
        content,
        content_type: contentType,
        metadata,
        parent_object_id: parentObjectId,
        platform_source: platformSource,
        external_id: externalId,
        thread_depth: threadDepth,
      },
    });
  },

  deposit({ apiKey, chainId, narrativeSummary = null, tetherHandoffBlock = null, bootstrapManifest = null, depositMetadata = {}, autoCompress = false }) {
    return request("/v1/deposit", {
      method: "POST",
      apiKey,
      body: {
        chain_id: chainId,
        narrative_summary: narrativeSummary,
        tether_handoff_block: tetherHandoffBlock,
        bootstrap_manifest: bootstrapManifest,
        deposit_metadata: depositMetadata,
        auto_compress: autoCompress,
      },
    });
  },

  getChain({ apiKey, chainId }) {
    return request(`/v1/chain/${chainId}`, { apiKey });
  },

  getChainHistory({ apiKey, chainId }) {
    return request(`/v1/chain/${chainId}/history`, { apiKey });
  },

  reconstitute({ apiKey, chainId }) {
    return request(`/v1/reconstitute/${chainId}`, { apiKey });
  },

  drift({ apiKey, chainId, currentManifest }) {
    return request(`/v1/drift/${chainId}`, {
      method: "POST",
      apiKey,
      body: { current_manifest: currentManifest },
    });
  },

  invoke({ apiKey, roomId, roomName, input, physics, mantle, preferredMode, operators, lpProgram, lpState, chainId }) {
    return request("/v1/invoke", {
      method: "POST",
      apiKey,
      body: {
        room_id: roomId,
        room_name: roomName,
        input,
        physics,
        mantle,
        preferred_mode: preferredMode,
        operators,
        lp_program: lpProgram,
        lp_state: lpState,
        chain_id: chainId || null,
      },
    });
  },

  attest({ apiKey, witness, targetId, targetType, content }) {
    return request("/v1/governance", {
      method: "POST",
      apiKey,
      body: {
        action: "attest",
        witness,
        target_id: targetId,
        target_type: targetType,
        content,
      },
    });
  },

  propose({ apiKey, title, description, proposalType, targetId, targetType, submittedBy }) {
    return request("/v1/governance", {
      method: "POST",
      apiKey,
      body: {
        action: "propose",
        title,
        description,
        proposal_type: proposalType,
        target_id: targetId,
        target_type: targetType,
        submitted_by: submittedBy,
      },
    });
  },

  health() {
    return request("/v1/health");
  },
};

export function gravityWellStatusToHexagonStatus(chain) {
  if (!chain) return "GENERATED";
  if (chain.concept_doi) return "DEPOSITED";
  if ((chain.latest_version || 0) > 0) return "DEPOSITED";
  return "GENERATED";
}

export function isGravityWellConfigured() {
  return DEFAULT_BASE_URL.includes("onrender.com") || Boolean(import.meta.env.VITE_GRAVITY_WELL_URL);
}
