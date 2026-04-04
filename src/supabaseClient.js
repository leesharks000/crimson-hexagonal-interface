// Supabase REST client for Hexagonal OS Phase B
// Uses raw fetch (no SDK dependency) via PostgREST API
// Configure via environment variables:
//   VITE_SUPABASE_URL=https://xxxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJhbGci...

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://swsqkdemsqvhgqdfjcwa.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_p4JHf173hLgFUsjvXsL5HQ_qUIWAh95";

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

function headers(extra = {}) {
  return {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
    ...extra,
  };
}

function restUrl(table, query = "") {
  return `${SUPABASE_URL}/rest/v1/${table}${query ? "?" + query : ""}`;
}

export const supabase = {
  // ─── Read ───
  async list(table, { order = "created_at.desc", limit = 100, filter = "" } = {}) {
    const params = [`select=*`, `order=${order}`, `limit=${limit}`, filter].filter(Boolean).join("&");
    const res = await fetch(restUrl(table, params), { headers: headers() });
    if (!res.ok) throw new Error(`List ${table}: ${res.status}`);
    return res.json();
  },

  async get(table, id) {
    const res = await fetch(restUrl(table, `id=eq.${id}&select=*`), { headers: headers() });
    if (!res.ok) throw new Error(`Get ${table}/${id}: ${res.status}`);
    const rows = await res.json();
    return rows[0] || null;
  },

  // ─── Write ───
  async insert(table, data) {
    const res = await fetch(restUrl(table), {
      method: "POST", headers: headers(), body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.text(); throw new Error(`Insert ${table}: ${res.status} ${err}`); }
    const rows = await res.json();
    return rows[0] || data;
  },

  async update(table, id, data) {
    const res = await fetch(restUrl(table, `id=eq.${id}`), {
      method: "PATCH", headers: headers(), body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Update ${table}/${id}: ${res.status}`);
    const rows = await res.json();
    return rows[0] || data;
  },

  // ─── Convenience ───
  async saveTrail(trail) {
    return this.insert("trails", {
      name: trail.name,
      doc_ids: JSON.stringify(trail.docs.map(d => d.id)),
      created_by: "MANUS",
    });
  },

  async listTrails() {
    return this.list("trails", { order: "updated_at.desc", limit: 50 });
  },

  async addAnnotation(docId, content, roomId = null) {
    return this.insert("annotations", { doc_id: docId, room_id: roomId, content, author: "MANUS" });
  },

  async listAnnotations(docId) {
    return this.list("annotations", { filter: `doc_id=eq.${docId}`, order: "created_at.desc" });
  },

  async submitProposal(proposal) {
    return this.insert("proposals", proposal);
  },

  async listProposals(status = null) {
    const filter = status ? `status=eq.${status}` : "";
    return this.list("proposals", { filter, order: "created_at.desc" });
  },

  async recordWitnessAction(witness, actionType, targetId, targetType, content = "") {
    return this.insert("witness_actions", {
      witness, action_type: actionType, target_id: targetId, target_type: targetType, content,
    });
  },

  async saveSessionObject(obj) {
    return this.insert("session_objects", obj);
  },

  url: SUPABASE_URL,
};
