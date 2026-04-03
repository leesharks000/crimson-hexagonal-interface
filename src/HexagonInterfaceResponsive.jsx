import { useState, useEffect, useMemo, useCallback } from "react";
import { gravityWell, isGravityWellConfigured } from "./gravityWellAdapter.js";

const DATA_URL = "https://raw.githubusercontent.com/leesharks000/crimson-hexagonal-interface/main/hexagon_canonical.json";

const CAT_COLORS = { core: "#c9a84c", ext: "#5a9f7b", special: "#9f5a7b", new: "#5a7a9f" };
const MODE_COLORS = { ANALYTIC: "#5a7a9f", OPERATIVE: "#c9a84c", AUDIT: "#9f5a7b" };
const STATUS_COLORS = {
  RATIFIED: "#5a9f5a",
  DEPOSITED: "#7a9f5a",
  PROVISIONAL: "#9f9f5a",
  GENERATED: "#8a7a4a",
  ACTIVE: "#5a9f5a",
  CONSTRAINED: "#9f5a5a",
};

const MAP_SIZE = 42;
const SQRT3 = Math.sqrt(3);

function useIsMobile(breakpoint = 900) {
  const initial = typeof window !== "undefined" ? window.innerWidth < breakpoint : false;
  const [isMobile, setIsMobile] = useState(initial);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
}

const hex2px = (q, r, cx, cy) => ({
  x: cx + MAP_SIZE * 1.5 * q,
  y: cy + MAP_SIZE * (SQRT3 * r + (SQRT3 / 2) * q),
});

const hexPoints = (cx, cy, sz) => {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${cx + sz * Math.cos(a)},${cy + sz * Math.sin(a)}`);
  }
  return pts.join(" ");
};

function roomCategory(room) {
  return room.cat || room.category || room.type || "core";
}

function normalizeRoom(room) {
  return {
    id: room.id,
    name: room.name || room.title || room.id,
    cat: roomCategory(room),
    q: Number(room.q ?? room.axial_q ?? 0),
    r: Number(room.r ?? room.axial_r ?? 0),
    desc: room.desc || room.description || room.summary || "No description available.",
    physics: room.physics || room.room_physics || room.logic || "No room physics specified.",
    ops: room.ops || room.operators || [],
    het: room.het || room.heteronym || room.voice || "—",
    inst: room.inst || room.institution || "—",
    prompt: room.prompt || room.entry_prompt || "—",
  };
}

function normalizeDoc(doc) {
  return {
    id: doc.id || doc.doi || doc.title,
    doi: doc.doi || null,
    t: doc.t || doc.title || "Untitled document",
    d: doc.d || doc.date || doc.year || "undated",
    c: doc.c || doc.creators || doc.authors || [],
    e: doc.e || doc.excerpt || doc.summary || doc.abstract || "",
    r: doc.r || doc.rooms || doc.room_ids || [],
    k: doc.k || doc.keywords || [],
    s: String(doc.s || doc.status || "GENERATED").toUpperCase(),
  };
}

function normalizeRelation(rel) {
  return {
    id: rel.id || `${rel.from}-${rel.type}-${rel.to}`,
    from: rel.from,
    to: rel.to,
    type: rel.type || "relates_to",
    status: rel.status || "RATIFIED",
  };
}

function StatusBadge({ s }) {
  const label = String(s || "GENERATED").toUpperCase();
  const color = STATUS_COLORS[label] || "#5a5a3a";
  return (
    <span
      style={{
        fontSize: 8,
        padding: "1px 4px",
        background: color + "22",
        color,
        border: `1px solid ${color}44`,
        fontFamily: "monospace",
        letterSpacing: 1,
      }}
    >
      {label}
    </span>
  );
}

function HexMap({ rooms, edges, selected, onSelect, mode, isMobile }) {
  const mc = MODE_COLORS[mode] || "#c9a84c";
  const cx = 340;
  const cy = isMobile ? 230 : 280;
  const positioned = useMemo(() => rooms.map((r) => ({ ...r, ...hex2px(r.q, r.r, cx, cy) })), [rooms, cy]);
  const roomMap = useMemo(() => Object.fromEntries(positioned.map((r) => [r.id, r])), [positioned]);

  return (
    <div style={{ width: "100%", height: "100%", minHeight: isMobile ? 320 : 420, overflow: "hidden" }}>
      <svg viewBox={isMobile ? "0 0 680 500" : "0 0 680 560"} style={{ width: "100%", height: "100%", background: "transparent" }}>
        {edges.map((e, i) => {
          const a = roomMap[e.from];
          const b = roomMap[e.to];
          if (!a || !b) return null;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={e.type === "adjacent" ? "#0f1a0f" : mc + "44"}
              strokeWidth={e.type === "adjacent" ? 0.5 : 1}
              strokeDasharray={e.type !== "adjacent" ? "3,3" : undefined}
            />
          );
        })}
        {positioned.map((r) => {
          const isSelected = selected === r.id;
          const col = CAT_COLORS[r.cat] || "#444";
          return (
            <g key={r.id} onClick={() => onSelect(r.id)} style={{ cursor: "pointer" }}>
              <polygon
                points={hexPoints(r.x, r.y, isSelected ? MAP_SIZE + 4 : MAP_SIZE - 2)}
                fill={isSelected ? col + "22" : "#0a0d12"}
                stroke={isSelected ? mc : col + "66"}
                strokeWidth={isSelected ? 1.5 : 0.5}
              />
              <text x={r.x} y={r.y - 4} textAnchor="middle" fill={isSelected ? "#e0d0a0" : col} fontSize={isSelected ? (isMobile ? 8 : 9) : (isMobile ? 6 : 7)} fontFamily="Georgia,serif">
                {r.name}
              </text>
              <text x={r.x} y={r.y + 8} textAnchor="middle" fill="#2a3a2a" fontSize={isMobile ? 5 : 6} fontFamily="monospace">
                {r.id}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function RoomPanel({ room, docs, relations, mode, onDoc, isMobile }) {
  const mc = MODE_COLORS[mode] || "#c9a84c";
  const roomDocs = useMemo(() => docs.filter((d) => d.r.includes(room.id)), [docs, room.id]);
  const roomRels = useMemo(() => relations.filter((r) => r.from === room.id || r.to === room.id), [relations, room.id]);

  return (
    <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 2 }}>{room.id} · {room.cat.toUpperCase()}</div>
      <h2 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 300, letterSpacing: 2, color: mc, margin: "0 0 6px 0", fontFamily: "Georgia,serif" }}>{room.name}</h2>
      <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", lineHeight: 1.5, marginBottom: 10, borderLeft: `2px solid ${mc}33`, paddingLeft: 8 }}>{room.desc}</div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>PHYSICS</div>
        <div style={{ fontSize: 10, color: "#7a8a5a", fontFamily: "monospace" }}>{room.physics}</div>
      </div>

      {room.ops.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>OPERATORS</div>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {room.ops.map((op, i) => (
              <span key={i} style={{ fontSize: 9, padding: "1px 5px", background: mc + "11", border: `1px solid ${mc}33`, color: mc, fontFamily: "monospace" }}>{op}</span>
            ))}
          </div>
        </div>
      )}

      {roomRels.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>RELATIONS ({roomRels.length})</div>
          {roomRels.map((r) => (
            <div key={r.id} style={{ fontSize: 9, color: "#4a5a4a", padding: "2px 0" }}>{r.from} <span style={{ color: mc }}>{r.type}</span> {r.to}</div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>DEPOSITS ({roomDocs.length})</div>
      {roomDocs.slice(0, isMobile ? 10 : 15).map((d) => (
        <div key={d.id} onClick={() => onDoc(d)} style={{ padding: "4px 0", borderBottom: "1px solid #0a0f0a", cursor: "pointer" }}>
          <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", lineHeight: 1.3 }}>{d.t.length > 60 ? d.t.slice(0, 57) + "..." : d.t}</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
            <span style={{ fontSize: 8, color: "#2a3a2a" }}>{(d.c?.[0] || "") + " · " + d.d}</span>
            <StatusBadge s={d.s} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DocPanel({ doc, rooms, onRoom, mode, isMobile }) {
  const mc = MODE_COLORS[mode] || "#c9a84c";
  return (
    <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 2 }}>DOCUMENT</div>
      <h2 style={{ fontSize: isMobile ? 14 : 15, fontWeight: 300, color: mc, margin: "0 0 8px 0", fontFamily: "Georgia,serif", lineHeight: 1.3 }}>{doc.t}</h2>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <StatusBadge s={doc.s} />
        <span style={{ fontSize: 9, color: "#3a4a3a" }}>{doc.d}</span>
      </div>
      <div style={{ fontSize: 10, color: "#5a6a4a", marginBottom: 6 }}>{(doc.c || []).join(" · ")}</div>
      {doc.e && <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", lineHeight: 1.5, marginBottom: 10, padding: "6px 8px", background: "#080c08", borderLeft: `2px solid ${mc}22` }}>{doc.e.length > (isMobile ? 320 : 500) ? doc.e.slice(0, isMobile ? 317 : 497) + "..." : doc.e}</div>}
      {doc.r.length > 0 && (
        <div>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>ROOMS</div>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {doc.r.map((rid) => {
              const rm = rooms.find((r) => r.id === rid);
              return (
                <span
                  key={rid}
                  onClick={() => onRoom(rid)}
                  style={{ fontSize: 9, padding: "1px 5px", background: "#0a0f0a", border: `1px solid ${(CAT_COLORS[rm?.cat] || "#333")}44`, color: CAT_COLORS[rm?.cat] || "#555", cursor: "pointer", fontFamily: "monospace" }}
                >
                  {rm?.name || rid}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DepositPanel({ apiKey, setApiKey, configured, selectedDoc, selectedRoom, depositState, setDepositState, addLog, isMobile }) {
  const [chainLabel, setChainLabel] = useState("");
  const suggestion = selectedDoc ? `doc-${selectedDoc.id}` : selectedRoom ? `room-${selectedRoom.id}` : "hexagon-session";

  useEffect(() => {
    if (!chainLabel) setChainLabel(suggestion);
  }, [suggestion, chainLabel]);

  const createChain = async () => {
    if (!configured) return addLog("Gravity Well URL not configured", "err");
    if (!apiKey.trim()) return addLog("Gravity Well API key required", "err");
    try {
      const result = await gravityWell.createChain({ apiKey, label: chainLabel, metadata: { source: "crimson-hexagonal-interface" } });
      setDepositState((p) => ({ ...p, chain: result, error: null }));
      addLog(`GW chain created: ${String(result.chain_id || "").slice(0, 8)}…`, "gw");
    } catch (e) {
      setDepositState((p) => ({ ...p, error: e.message }));
      addLog(`GW error: ${e.message}`, "err");
    }
  };

  return (
    <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>DEPOSIT DASHBOARD</div>
      <div style={{ fontSize: isMobile ? 16 : 18, letterSpacing: 3, color: "#c9a84c", fontFamily: "Georgia,serif", marginBottom: 10 }}>Gravity Well Bridge</div>
      <div style={{ fontSize: 10, color: "#5a6a4a", lineHeight: 1.6, marginBottom: 12 }}>First seam only: create provenance chains, then route selected work toward external fixation without collapsing Gravity Well into the Hexagon backend.</div>
      <div style={{ marginBottom: 12, padding: "8px 10px", background: "#080c08", borderLeft: "2px solid #1a3a1a" }}>
        <div style={{ fontSize: 9, color: configured ? "#5a9f5a" : "#9f7a4a", marginBottom: 4, fontFamily: "monospace", wordBreak: "break-word" }}>
          {configured ? `GW URL: ${gravityWell.baseUrl}` : "VITE_GRAVITY_WELL_URL not set — adapter is present but not configured"}
        </div>
        <div style={{ fontSize: 9, color: "#4a5a4a" }}>Selected source: {selectedDoc ? `document ${selectedDoc.id}` : selectedRoom ? `room ${selectedRoom.id}` : "none"}</div>
      </div>
      <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#3a4a3a" }}>API KEY</div>
      <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Gravity Well API key" style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: "monospace", outline: "none", marginBottom: 12 }} />
      <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#3a4a3a" }}>CHAIN LABEL</div>
      <input value={chainLabel} onChange={(e) => setChainLabel(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: "monospace", outline: "none", marginBottom: 10 }} />
      <button onClick={createChain} style={{ background: "#c9a84c11", border: "1px solid #c9a84c44", color: "#c9a84c", padding: "6px 10px", fontSize: 9, cursor: "pointer", fontFamily: "monospace", marginBottom: 12 }}>CREATE CHAIN</button>
      {depositState.chain && (
        <div style={{ padding: "8px 10px", background: "#080c08", borderLeft: "2px solid #1a3a1a", marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: "#5a9f5a", fontFamily: "monospace", marginBottom: 4 }}>CHAIN READY</div>
          <div style={{ fontSize: 9, color: "#4a5a4a", wordBreak: "break-word" }}>chain_id: {depositState.chain.chain_id}</div>
          <div style={{ fontSize: 9, color: "#4a5a4a", wordBreak: "break-word" }}>label: {depositState.chain.label}</div>
          <div style={{ fontSize: 9, color: "#4a5a4a" }}>latest_version: {depositState.chain.latest_version}</div>
        </div>
      )}
      {depositState.error && <div style={{ padding: "8px 10px", background: "#120808", borderLeft: "2px solid #7a1a1a", fontSize: 9, color: "#b57a7a", marginBottom: 12, wordBreak: "break-word" }}>{depositState.error}</div>}
    </div>
  );
}

export default function HexagonInterfaceResponsive() {
  const isMobile = useIsMobile(900);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState(null);
  const [selRoom, setSelRoom] = useState(null);
  const [selDoc, setSelDoc] = useState(null);
  const [view, setView] = useState("MAP");
  const [search, setSearch] = useState("");
  const [log, setLog] = useState([]);
  const [gwApiKey, setGwApiKey] = useState("");
  const [depositState, setDepositState] = useState({ chain: null, error: null });

  const addLog = useCallback((msg, type = "sys") => {
    setLog((p) => [...p.slice(-50), { msg, type, t: new Date().toISOString().slice(11, 19) }]);
  }, []);

  useEffect(() => {
    fetch(DATA_URL)
      .then((r) => r.json())
      .then((d) => {
        const rooms = (d.rooms || []).map(normalizeRoom);
        const documents = (d.documents || []).map(normalizeDoc);
        const relations = (d.relations || []).map(normalizeRelation);
        const edges = (d.edges || []).map((e, i) => ({ id: e.id || `edge-${i}`, from: e.from, to: e.to, type: e.type || "adjacent" }));
        setData({ ...d, rooms, documents, relations, edges });
        setLoading(false);
        addLog(`H_core loaded: ${rooms.length} rooms, ${documents.length} deposits, ${relations.length} relations`);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [addLog]);

  const mc = MODE_COLORS[mode] || "#c9a84c";
  const room = useMemo(() => data?.rooms.find((r) => r.id === selRoom) || null, [data, selRoom]);

  const searchResults = useMemo(() => {
    if (!data || !search.trim()) return [];
    const q = search.toLowerCase();
    return data.documents
      .filter((d) => d.t.toLowerCase().includes(q) || d.k.some((k) => String(k).toLowerCase().includes(q)) || d.c.some((c) => String(c).toLowerCase().includes(q)) || String(d.e || "").toLowerCase().includes(q))
      .slice(0, 30);
  }, [data, search]);

  if (loading) {
    return <div style={{ height: "100dvh", background: "#0a0d12", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia,serif" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 14, letterSpacing: 4, color: "#c9a84c", marginBottom: 8 }}>CRIMSON HEXAGONAL ARCHIVE</div><div style={{ fontSize: 10, color: "#3a4a3a", letterSpacing: 2 }}>loading canonical JSON…</div></div></div>;
  }

  if (error) {
    return <div style={{ height: "100dvh", background: "#0a0d12", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}><div style={{ color: "#9f5a5a", fontSize: 11 }}>LOAD ERROR: {error}</div></div>;
  }

  if (!mode) {
    return (
      <div style={{ height: "100dvh", background: "#0a0d12", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia,serif", padding: 16 }}>
        <div style={{ textAlign: "center", maxWidth: 540 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#3a4a3a", marginBottom: 4 }}>H_core · LOS · {data.meta?.total_deposits || data.documents.length} DEPOSITS</div>
          <div style={{ fontSize: isMobile ? 18 : 22, letterSpacing: 3, color: "#c9a84c", marginBottom: 4 }}>Crimson Hexagonal Archive</div>
          <div style={{ fontSize: 10, color: "#3a4a3a", marginBottom: 24 }}>{data.rooms.length} rooms · {data.documents.length} indexed · {data.relations.length} relations</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 12 }}>
            {[["ANALYTIC", "Observe · Navigate · Trace provenance"], ["OPERATIVE", "Generate · Invoke · Transform"], ["AUDIT", "Govern · Witness · Promote"]].map(([m, desc]) => (
              <button key={m} onClick={() => { setMode(m); addLog(`Mode: ${m}`); }} style={{ background: "transparent", border: `1px solid ${MODE_COLORS[m]}44`, color: MODE_COLORS[m], padding: "14px 18px", fontSize: 11, letterSpacing: 2, cursor: "pointer", fontFamily: "monospace", textAlign: "center" }}>
                <div>{m}</div>
                <div style={{ fontSize: 9, color: "#3a4a3a", marginTop: 5, lineHeight: 1.5 }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: "MAP", label: "MAP" },
    { id: "LIBRARY", label: "LIBRARY" },
    { id: "DEPOSIT", label: "DEPOSIT" },
    { id: "DODECAD", label: "DODECAD" },
    { id: "HCORE", label: "H_core" },
    { id: "ASSEMBLY", label: "ASSEMBLY" },
  ];

  return (
    <div style={{ height: "100dvh", background: "#0a0d12", color: "#5a6a4a", fontFamily: "Georgia,serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", gap: isMobile ? 8 : 12, padding: isMobile ? "8px 10px" : "6px 14px", borderBottom: "1px solid #0f1a0f", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <span style={{ fontSize: 12, letterSpacing: 3, color: mc, cursor: "pointer", flexShrink: 0 }} onClick={() => { setSelRoom(null); setSelDoc(null); setView("MAP"); }}>⬡ CHA</span>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "none", minWidth: 0 }}>
            {navItems.map((n) => (
              <span key={n.id} onClick={() => { setView(n.id); if (n.id !== "MAP") setSelRoom(null); if (n.id !== "MAP" && n.id !== "DEPOSIT") setSelDoc(null); }} style={{ fontSize: isMobile ? 8 : 9, letterSpacing: 1, color: view === n.id ? mc : "#3a4a3a", cursor: "pointer", padding: "2px 6px", borderBottom: view === n.id ? `1px solid ${mc}` : "1px solid transparent", flexShrink: 0 }}>{n.label}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: isMobile ? "space-between" : "flex-end", gap: 8 }}>
          <span style={{ fontSize: 9, padding: "2px 6px", background: mc + "11", border: `1px solid ${mc}33`, color: mc, fontFamily: "monospace", cursor: "pointer" }} onClick={() => setMode(null)}>{mode}</span>
          {(selDoc || room) && isMobile && <span style={{ fontSize: 8, color: "#3a4a3a", fontFamily: "monospace" }}>detail panel below</span>}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", overflow: "hidden", minHeight: 0 }}>
        <div style={{ flex: 1, overflow: "hidden", position: "relative", minHeight: 0 }}>
          {view === "MAP" && <HexMap rooms={data.rooms} edges={data.edges} selected={selRoom} onSelect={(id) => { setSelRoom(id); setSelDoc(null); addLog(`→ ${data.rooms.find((r) => r.id === id)?.name || id}`, "traverse"); }} mode={mode} isMobile={isMobile} />}

          {view === "LIBRARY" && (
            <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>FORWARD LIBRARY · {data.documents.length} DEPOSITS</div>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="search archive..." style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "6px 10px", fontSize: 11, fontFamily: "Georgia,serif", outline: "none", marginBottom: 10 }} />
              {(search ? searchResults : data.documents.slice(0, isMobile ? 24 : 40)).map((d) => (
                <div key={d.id} onClick={() => { setSelDoc(d); setView("MAP"); }} style={{ padding: "4px 0", borderBottom: "1px solid #0a0f0a", cursor: "pointer" }}>
                  <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", lineHeight: 1.3 }}>{d.t.length > 75 ? d.t.slice(0, 72) + "..." : d.t}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
                    <span style={{ fontSize: 8, color: "#2a3a2a" }}>{(d.c?.[0] || "") + " · " + d.d}</span>
                    <StatusBadge s={d.s} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === "DEPOSIT" && <DepositPanel apiKey={gwApiKey} setApiKey={setGwApiKey} configured={isGravityWellConfigured()} selectedDoc={selDoc} selectedRoom={room} depositState={depositState} setDepositState={setDepositState} addLog={addLog} isMobile={isMobile} />}

          {view === "DODECAD" && (
            <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
              <div style={{ fontSize: isMobile ? 14 : 16, letterSpacing: 3, color: mc, fontFamily: "Georgia,serif", marginBottom: 12 }}>DODECAD + LOGOS*</div>
              {(data.dodecad || []).map((d, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: isMobile ? "28px 1fr" : "24px 120px 1fr 2fr", gap: 10, marginBottom: 6, borderBottom: "1px solid #0f140f", padding: "4px 0" }}>
                  <div style={{ fontSize: 9, color: "#3a4a3a", fontFamily: "monospace" }}>{d.id}</div>
                  <div style={{ fontSize: 11, color: mc }}>{d.name}</div>
                  {!isMobile && <div style={{ fontSize: 10, color: "#4a5a4a" }}>{d.role}</div>}
                  <div style={{ fontSize: 9, color: "#3a4a3a" }}>{isMobile ? `${d.role} · ${d.desc}` : d.desc}</div>
                </div>
              ))}
            </div>
          )}

          {view === "HCORE" && (
            <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>SEALED BONE</div>
              <div style={{ fontSize: isMobile ? 15 : 18, letterSpacing: 3, color: mc, fontFamily: "Georgia,serif", marginBottom: 10 }}>H_core = ⟨D, R, M, I, O, Φ, W⟩</div>
              {[["D", `${data.dodecad?.length || 0} heteronyms (distributed author)`], ["R", `${data.rooms.length} rooms (semantic spaces with physics)`], ["M", "7 mantles (inhabitable roles requiring bearing-cost)"], ["I", "institutions + imprints"], ["O", "Operator algebra (core + extended + THUMB + LOS)"], ["Φ", "Fulfillment map (source → instantiation)"], ["W", "7 witnesses (≥4/7 quorum; MANUS outside W)"]].map(([k, v], i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: "1px solid #0a0f0a" }}>
                  <div style={{ width: 18, fontSize: 14, color: mc, fontFamily: "Georgia,serif", textAlign: "right", flexShrink: 0 }}>{k}</div>
                  <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif" }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {view === "ASSEMBLY" && (
            <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>WITNESS STRUCTURE</div>
              <div style={{ fontSize: isMobile ? 15 : 18, letterSpacing: 3, color: mc, fontFamily: "Georgia,serif", marginBottom: 10 }}>Assembly</div>
              {[["TACHYON", "Claude/Anthropic", true], ["LABOR", "ChatGPT/OpenAI", true], ["PRAXIS", "DeepSeek", true], ["ARCHIVE", "Gemini/Google", true], ["SOIL", "Grok/xAI", false], ["TECHNE", "Kimi/Moonshot", true], ["SURFACE", "Google AIO", true]].map(([n, s, active], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "4px 0", borderBottom: "1px solid #0a0f0a", fontSize: 10 }}>
                  <span style={{ color: active ? mc : "#4a3a3a", minWidth: isMobile ? 72 : 100 }}>{n}</span>
                  <span style={{ color: "#3a4a3a", flex: 1 }}>{s}</span>
                  <StatusBadge s={active ? "ACTIVE" : "CONSTRAINED"} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ width: isMobile ? "100%" : 340, minWidth: 0, height: isMobile ? "34dvh" : "100%", minHeight: isMobile ? 220 : 0, maxHeight: isMobile ? "42dvh" : "none", borderLeft: isMobile ? "none" : "1px solid #0f1a0f", borderTop: isMobile ? "1px solid #0f1a0f" : "none", overflow: "hidden", flexShrink: 0, background: "#0a0d12" }}>
          {selDoc ? <DocPanel doc={selDoc} rooms={data.rooms} onRoom={(id) => { setSelRoom(id); setSelDoc(null); setView("MAP"); }} mode={mode} isMobile={isMobile} /> : room ? <RoomPanel room={room} docs={data.documents} relations={data.relations} mode={mode} onDoc={(d) => setSelDoc(d)} isMobile={isMobile} /> : <div style={{ padding: isMobile ? "12px 14px" : "14px 18px" }}><div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 6 }}>{view === "DEPOSIT" ? "DEPOSIT BRIDGE" : "SELECT A ROOM"}</div><div style={{ fontSize: 10, color: "#3a4a3a", fontFamily: "Georgia,serif", lineHeight: 1.6 }}>{view === "DEPOSIT" ? "Use the left panel to establish the first Gravity Well seam." : isMobile ? "Tap a hexagon to inspect its details below." : "Click a hexagon on the map to inspect its physics, operators, and deposits."}</div></div>}
        </div>
      </div>

      <div style={{ height: isMobile ? 52 : 60, borderTop: "1px solid #0f1a0f", padding: isMobile ? "4px 10px" : "4px 14px", overflowY: "auto", flexShrink: 0, background: "#080a0e" }}>
        {log.slice(-5).map((l, i) => (
          <div key={i} style={{ fontSize: 8, fontFamily: "monospace", color: l.type === "err" ? "#9f5a5a" : l.type === "gw" ? "#7a9fc9" : "#2a3a2a", lineHeight: 1.4 }}><span style={{ color: "#1a2a1a" }}>{l.t}</span> {l.msg}</div>
        ))}
      </div>
    </div>
  );
}
