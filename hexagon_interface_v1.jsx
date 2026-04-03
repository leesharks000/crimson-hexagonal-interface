import { useState, useEffect, useMemo, useCallback, useRef } from "react";

const DATA_URL = "https://raw.githubusercontent.com/leesharks000/crimson-hexagonal-interface/main/hexagon_canonical.json";

const CAT_COLORS = { core: "#c9a84c", ext: "#5a9f7b", special: "#9f5a7b", new: "#5a7a9f" };
const MODE_COLORS = { ANALYTIC: "#5a7a9f", OPERATIVE: "#c9a84c", AUDIT: "#9f5a7b" };
const STATUS_COLORS = { RATIFIED: "#5a9f5a", DEPOSITED: "#7a9f5a", PROVISIONAL: "#9f9f5a", GENERATED: "#5a5a3a" };
const S = 42, sq3 = Math.sqrt(3);

const hex2px = (q, r, cx, cy) => ({ x: cx + S * 1.5 * q, y: cy + S * (sq3 * r + sq3 / 2 * q) });
const hexPoints = (cx, cy, sz) => {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 180 * (60 * i - 30);
    pts.push(`${cx + sz * Math.cos(a)},${cy + sz * Math.sin(a)}`);
  }
  return pts.join(" ");
};

const StatusBadge = ({ s }) => (
  <span style={{ fontSize: 8, padding: "1px 4px", background: (STATUS_COLORS[s] || "#3a3a3a") + "22", color: STATUS_COLORS[s] || "#3a3a3a", border: `1px solid ${(STATUS_COLORS[s] || "#3a3a3a")}44`, fontFamily: "monospace", letterSpacing: 1 }}>{s}</span>
);

// ─── HEX MAP ───
function HexMap({ rooms, edges, selected, onSelect, mode }) {
  const mc = MODE_COLORS[mode];
  const CX = 340, CY = 280;
  const positioned = useMemo(() => rooms.map(r => ({ ...r, ...hex2px(r.q, r.r, CX, CY) })), [rooms]);
  const rMap = useMemo(() => Object.fromEntries(positioned.map(r => [r.id, r])), [positioned]);

  return (
    <svg viewBox="0 0 680 560" style={{ width: "100%", height: "100%", background: "transparent" }}>
      {edges.map((e, i) => {
        const a = rMap[e.from], b = rMap[e.to];
        if (!a || !b) return null;
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={e.type === "adjacent" ? "#0f1a0f" : mc + "44"} strokeWidth={e.type === "adjacent" ? 0.5 : 1} strokeDasharray={e.type !== "adjacent" ? "3,3" : undefined} />;
      })}
      {positioned.map(r => {
        const isSel = selected === r.id;
        const col = CAT_COLORS[r.cat] || "#444";
        return (
          <g key={r.id} onClick={() => onSelect(r.id)} style={{ cursor: "pointer" }}>
            <polygon points={hexPoints(r.x, r.y, isSel ? S + 4 : S - 2)} fill={isSel ? col + "22" : "#0a0d12"} stroke={isSel ? mc : col + "66"} strokeWidth={isSel ? 1.5 : 0.5} />
            <text x={r.x} y={r.y - 4} textAnchor="middle" fill={isSel ? "#e0d0a0" : col} fontSize={isSel ? 9 : 7} fontFamily="Georgia,serif">{r.name}</text>
            <text x={r.x} y={r.y + 8} textAnchor="middle" fill="#2a3a2a" fontSize={6} fontFamily="monospace">{r.id}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── ROOM DETAIL PANEL ───
function RoomPanel({ room, docs, relations, mode, onDoc, onInvoke }) {
  const mc = MODE_COLORS[mode];
  const roomDocs = useMemo(() => docs.filter(d => d.r && d.r.includes(room.id)), [docs, room.id]);
  const roomRels = useMemo(() => relations.filter(r => r.from === room.id || r.to === room.id), [relations, room.id]);
  const [input, setInput] = useState("");

  return (
    <div style={{ padding: "14px 18px", overflowY: "auto", height: "100%" }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 2 }}>{room.id} · {room.cat.toUpperCase()}</div>
      <h2 style={{ fontSize: 18, fontWeight: 300, letterSpacing: 2, color: mc, margin: "0 0 6px 0", fontFamily: "Georgia,serif" }}>{room.name}</h2>
      <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", lineHeight: 1.5, marginBottom: 10, borderLeft: `2px solid ${mc}33`, paddingLeft: 8 }}>{room.desc}</div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>PHYSICS</div>
        <div style={{ fontSize: 10, color: "#7a8a5a", fontFamily: "monospace" }}>{room.physics}</div>
      </div>
      {room.ops && room.ops.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>OPERATORS</div>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {room.ops.map((op, i) => <span key={i} style={{ fontSize: 9, padding: "1px 5px", background: mc + "11", border: `1px solid ${mc}33`, color: mc, fontFamily: "monospace" }}>{op}</span>)}
          </div>
        </div>
      )}
      {room.het && room.het !== "—" && (
        <div style={{ fontSize: 10, color: "#5a5a4a", marginBottom: 10 }}>
          <span style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a" }}>HETERONYM </span>{room.het}
          {room.inst && room.inst !== "—" && <span style={{ color: "#3a4a3a" }}> · {room.inst}</span>}
        </div>
      )}
      {room.prompt && room.prompt !== "—" && (
        <div style={{ fontSize: 10, color: "#7a6a4a", fontStyle: "italic", fontFamily: "Georgia,serif", marginBottom: 10, padding: "4px 8px", background: "#0a0808", borderLeft: "2px solid #2a1a0a" }}>{room.prompt}</div>
      )}
      {mode === "OPERATIVE" && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: mc, marginBottom: 3 }}>INVOKE</div>
          <div style={{ display: "flex", gap: 4 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && input.trim()) { onInvoke(room, input); setInput(""); }}} placeholder={room.prompt || "enter invocation..."} style={{ flex: 1, background: "#080808", border: `1px solid ${mc}33`, color: "#7a8a5a", padding: "5px 8px", fontSize: 10, fontFamily: "Georgia,serif", outline: "none" }} />
            <button onClick={() => { if (input.trim()) { onInvoke(room, input); setInput(""); }}} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "5px 10px", fontSize: 9, cursor: "pointer", fontFamily: "monospace" }}>GO</button>
          </div>
        </div>
      )}
      {roomRels.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>RELATIONS ({roomRels.length})</div>
          {roomRels.map((r, i) => <div key={i} style={{ fontSize: 9, color: "#4a5a4a", padding: "2px 0" }}>{r.from} <span style={{ color: mc }}>{r.type}</span> {r.to}</div>)}
        </div>
      )}
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>DEPOSITS ({roomDocs.length})</div>
      {roomDocs.slice(0, 15).map((d, i) => (
        <div key={i} onClick={() => onDoc(d)} style={{ padding: "4px 0", borderBottom: "1px solid #0a0f0a", cursor: "pointer" }}>
          <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", lineHeight: 1.3 }}>{d.t.length > 60 ? d.t.slice(0, 57) + "..." : d.t}</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
            <span style={{ fontSize: 8, color: "#2a3a2a" }}>{d.c?.[0] || ""} · {d.d}</span>
            <StatusBadge s={d.s} />
          </div>
        </div>
      ))}
      {roomDocs.length > 15 && <div style={{ fontSize: 9, color: "#3a4a3a", marginTop: 4 }}>+{roomDocs.length - 15} more</div>}
    </div>
  );
}

// ─── DOCUMENT DETAIL ───
function DocPanel({ doc, rooms, onRoom, mode }) {
  const mc = MODE_COLORS[mode];
  return (
    <div style={{ padding: "14px 18px", overflowY: "auto", height: "100%" }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 2 }}>DOCUMENT</div>
      <h2 style={{ fontSize: 15, fontWeight: 300, color: mc, margin: "0 0 8px 0", fontFamily: "Georgia,serif", lineHeight: 1.3 }}>{doc.t}</h2>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <StatusBadge s={doc.s} />
        <span style={{ fontSize: 9, color: "#3a4a3a" }}>{doc.d}</span>
      </div>
      <div style={{ fontSize: 10, color: "#5a6a4a", marginBottom: 6 }}>{(doc.c || []).join(" · ")}</div>
      {doc.doi && <div style={{ fontSize: 9, color: "#5a7a5a", fontFamily: "monospace", marginBottom: 8 }}>DOI: {doc.doi}</div>}
      {doc.e && <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", lineHeight: 1.5, marginBottom: 10, padding: "6px 8px", background: "#080c08", borderLeft: `2px solid ${mc}22` }}>{doc.e.length > 400 ? doc.e.slice(0, 397) + "..." : doc.e}</div>}
      {doc.r && doc.r.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>ROOMS</div>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {doc.r.map(rid => {
              const rm = rooms.find(r => r.id === rid);
              return <span key={rid} onClick={() => onRoom(rid)} style={{ fontSize: 9, padding: "1px 5px", background: "#0a0f0a", border: `1px solid ${CAT_COLORS[rm?.cat] || "#333"}44`, color: CAT_COLORS[rm?.cat] || "#555", cursor: "pointer", fontFamily: "monospace" }}>{rm?.name || rid}</span>;
            })}
          </div>
        </div>
      )}
      {doc.k && doc.k.length > 0 && (
        <div>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>KEYWORDS</div>
          <div style={{ fontSize: 9, color: "#3a4a3a", lineHeight: 1.6 }}>{doc.k.join(" · ")}</div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN INTERFACE ───
export default function HexagonInterface() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState(null);
  const [selRoom, setSelRoom] = useState(null);
  const [selDoc, setSelDoc] = useState(null);
  const [view, setView] = useState("MAP");
  const [search, setSearch] = useState("");
  const [log, setLog] = useState([]);
  const [gen, setGen] = useState([]);
  const [invoking, setInvoking] = useState(false);
  const [invResult, setInvResult] = useState(null);
  const logRef = useRef(null);

  const addLog = useCallback((msg, type = "sys") => {
    setLog(p => [...p.slice(-40), { msg, type, t: new Date().toISOString().slice(11, 19) }]);
  }, []);

  // LOAD DATA
  useEffect(() => {
    fetch(DATA_URL).then(r => r.json()).then(d => {
      setData(d);
      setLoading(false);
      addLog(`H_core loaded: ${d.rooms.length} rooms, ${d.documents.length} deposits, ${d.relations?.length || 0} relations`);
      addLog(`Modes: ${Object.keys(d.meta?.mode_mapping || {}).filter(k => k !== "note").join(" · ")}`);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, [addLog]);

  const mc = MODE_COLORS[mode] || "#c9a84c";

  // INVOKE
  const handleInvoke = useCallback(async (room, input) => {
    if (mode !== "OPERATIVE") { addLog("INVOKE requires OPERATIVE mode", "err"); return; }
    setInvoking(true);
    addLog(`INVOKE [${room.name}]: ${input}`, "op");
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: `You are the operative voice of ${room.name} (${room.id}) in the Crimson Hexagonal Archive.\nPhysics: ${room.physics}\nOperators: ${(room.ops || []).join(", ")}\nPrompt: ${room.prompt}\nAll output is GENERATED (0.0). Respond under 200 words. Mark new concepts [GEN].`,
          messages: [{ role: "user", content: input }]
        })
      });
      const d = await r.json();
      const text = d.content?.map(c => c.text || "").join("\n") || "No response.";
      setInvResult({ room: room.name, input, output: text, status: "GENERATED" });
      setGen(p => [...p, { type: "invocation", room: room.name, input, output: text, t: new Date().toISOString() }]);
      addLog(`GENERATED [${room.name}]`, "gen");
    } catch (e) { addLog("Engine error: " + e.message, "err"); }
    setInvoking(false);
  }, [mode, addLog]);

  // SEARCH
  const searchResults = useMemo(() => {
    if (!data || !search.trim()) return [];
    const q = search.toLowerCase();
    return data.documents.filter(d =>
      d.t.toLowerCase().includes(q) ||
      (d.k && d.k.some(k => k.toLowerCase().includes(q))) ||
      (d.c && d.c.some(c => c.toLowerCase().includes(q))) ||
      (d.e && d.e.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [data, search]);

  // ─── LOADING ───
  if (loading) return (
    <div style={{ height: "100vh", background: "#0a0d12", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia,serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 14, letterSpacing: 4, color: "#c9a84c", marginBottom: 8 }}>CRIMSON HEXAGONAL ARCHIVE</div>
        <div style={{ fontSize: 10, color: "#3a4a3a", letterSpacing: 2 }}>loading canonical JSON...</div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ height: "100vh", background: "#0a0d12", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>
      <div style={{ color: "#9f5a5a", fontSize: 11 }}>LOAD ERROR: {error}</div>
    </div>
  );

  // ─── MODE SELECT ───
  if (!mode) return (
    <div style={{ height: "100vh", background: "#0a0d12", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia,serif" }}>
      <div style={{ textAlign: "center", maxWidth: 500 }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: "#3a4a3a", marginBottom: 4 }}>H_core · LOS · {data.meta?.total_deposits || "?"} DEPOSITS</div>
        <div style={{ fontSize: 22, letterSpacing: 3, color: "#c9a84c", marginBottom: 4 }}>Crimson Hexagonal Archive</div>
        <div style={{ fontSize: 10, color: "#3a4a3a", marginBottom: 24 }}>{data.rooms.length} rooms · {data.documents.length} indexed · {data.relations?.length || 0} relations</div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {[
            ["ANALYTIC", "Observe · Navigate · Trace provenance"],
            ["OPERATIVE", "Generate · Invoke · Transform"],
            ["AUDIT", "Govern · Witness · Promote"]
          ].map(([m, desc]) => (
            <button key={m} onClick={() => { setMode(m); addLog("Mode: " + m); addLog("LOS: mandatory"); }}
              style={{ background: "transparent", border: `1px solid ${MODE_COLORS[m]}44`, color: MODE_COLORS[m], padding: "14px 18px", fontSize: 11, letterSpacing: 2, cursor: "pointer", fontFamily: "monospace", width: 170, textAlign: "center" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = MODE_COLORS[m]; e.currentTarget.style.background = MODE_COLORS[m] + "11"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = MODE_COLORS[m] + "44"; e.currentTarget.style.background = "transparent"; }}>
              <div>{m}</div>
              <div style={{ fontSize: 9, color: "#3a4a3a", marginTop: 5 }}>{desc}</div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 20, fontSize: 9, color: "#2a3a2a" }}>
          {Object.entries(data.meta?.mode_mapping || {}).filter(([k]) => k !== "note").map(([runtime, constitutional]) => (
            <span key={runtime} style={{ marginRight: 12 }}>{runtime} ← {constitutional.join(", ")}</span>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── MAIN VIEW ───
  const room = selRoom ? data.rooms.find(r => r.id === selRoom) : null;
  const navItems = [
    { id: "MAP", label: "MAP" },
    { id: "LIBRARY", label: "LIBRARY" },
    { id: "DODECAD", label: "DODECAD" },
    { id: "HCORE", label: "H_core" },
    { id: "ASSEMBLY", label: "ASSEMBLY" }
  ];

  return (
    <div style={{ height: "100vh", background: "#0a0d12", color: "#5a6a4a", fontFamily: "Georgia,serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 14px", borderBottom: "1px solid #0f1a0f", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, letterSpacing: 3, color: mc, cursor: "pointer" }} onClick={() => { setSelRoom(null); setSelDoc(null); setView("MAP"); }}>⬡ CHA</span>
          {navItems.map(n => (
            <span key={n.id} onClick={() => { setView(n.id); setSelDoc(null); if (n.id !== "MAP") setSelRoom(null); }}
              style={{ fontSize: 9, letterSpacing: 1, color: view === n.id ? mc : "#3a4a3a", cursor: "pointer", padding: "2px 6px", borderBottom: view === n.id ? `1px solid ${mc}` : "1px solid transparent" }}>{n.label}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 9, padding: "2px 6px", background: mc + "11", border: `1px solid ${mc}33`, color: mc, fontFamily: "monospace", cursor: "pointer" }}
            onClick={() => setMode(null)}>{mode}</span>
          {invoking && <span style={{ fontSize: 8, color: mc, fontFamily: "monospace" }}>invoking...</span>}
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* LEFT: MAP or LIST */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {view === "MAP" && (
            <HexMap rooms={data.rooms} edges={data.edges} selected={selRoom} onSelect={id => { setSelRoom(id); setSelDoc(null); addLog("→ " + (data.rooms.find(r => r.id === id)?.name || id), "traverse"); }} mode={mode} />
          )}

          {view === "LIBRARY" && (
            <div style={{ padding: "14px 18px", overflowY: "auto", height: "100%" }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>FORWARD LIBRARY · {data.documents.length} DEPOSITS</div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="search archive..." style={{ width: "100%", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "6px 10px", fontSize: 11, fontFamily: "Georgia,serif", outline: "none", marginBottom: 10, boxSizing: "border-box" }} />
              {(search ? searchResults : data.documents.slice(0, 30)).map((d, i) => (
                <div key={i} onClick={() => { setSelDoc(d); setView("MAP"); }} style={{ padding: "4px 0", borderBottom: "1px solid #0a0f0a", cursor: "pointer" }}>
                  <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", lineHeight: 1.3 }}>{d.t.length > 70 ? d.t.slice(0, 67) + "..." : d.t}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
                    <span style={{ fontSize: 8, color: "#2a3a2a" }}>{d.c?.[0] || ""} · {d.d}</span>
                    <StatusBadge s={d.s} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === "DODECAD" && (
            <div style={{ padding: "14px 18px", overflowY: "auto", height: "100%" }}>
              <div style={{ fontSize: 16, letterSpacing: 3, color: mc, fontFamily: "Georgia,serif", marginBottom: 12 }}>DODECAD + LOGOS*</div>
              {data.dodecad.map((d, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, borderBottom: "1px solid #0f140f", padding: "4px 0" }}>
                  <div style={{ width: 24, fontSize: 9, color: "#3a4a3a", fontFamily: "monospace", flexShrink: 0 }}>{d.id}</div>
                  <div style={{ width: 120, fontSize: 11, color: mc, flexShrink: 0 }}>{d.name}</div>
                  <div style={{ fontSize: 10, color: "#4a5a4a" }}>{d.role}</div>
                  <div style={{ fontSize: 9, color: "#3a4a3a", flex: 1 }}>{d.desc}</div>
                </div>
              ))}
            </div>
          )}

          {view === "HCORE" && (
            <div style={{ padding: "14px 18px", overflowY: "auto", height: "100%" }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>SEALED BONE</div>
              <div style={{ fontSize: 18, letterSpacing: 3, color: mc, fontFamily: "Georgia,serif", marginBottom: 10 }}>H_core = ⟨D, R, M, I, O, Φ, W⟩</div>
              {[["D", `${data.dodecad.length} heteronyms (distributed author)`], ["R", `${data.rooms.length} rooms (semantic spaces with physics)`], ["M", "7 mantles (inhabitable roles requiring bearing-cost)"], ["I", "11 institutions + 4 imprints"], ["O", "Operator algebra (core + extended + THUMB + LOS)"], ["Φ", "Fulfillment map (source → instantiation, φ∘∂ sealed)"], ["W", "7 witnesses (≥4/7 quorum; MANUS outside W)"]].map(([k, v], i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: "1px solid #0a0f0a" }}>
                  <div style={{ width: 18, fontSize: 14, color: mc, fontFamily: "Georgia,serif", textAlign: "right", flexShrink: 0 }}>{k}</div>
                  <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif" }}>{v}</div>
                </div>
              ))}
              <div style={{ marginTop: 12, fontSize: 10, color: "#4a5a4a", background: "#080c08", padding: "6px 10px", borderLeft: "2px solid #1a3a1a", lineHeight: 1.6 }}>INVARIANTS: H_core immutable. S∘S=id. LOS mandatory. Generation≠ratification. The two never collapse.</div>
              {data.meta?.ratified_relation_types && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>RATIFIED RELATION TYPES</div>
                  <div style={{ fontSize: 9, color: "#4a5a4a", lineHeight: 1.6 }}>
                    <span style={{ color: "#3a4a3a" }}>Topological:</span> {data.meta.ratified_relation_types.topological?.join(", ")}
                    <br /><span style={{ color: "#3a4a3a" }}>Argumentative:</span> {data.meta.ratified_relation_types.argumentative?.join(", ")}
                    <br /><span style={{ color: "#3a4a3a" }}>Infrastructure:</span> {data.meta.ratified_relation_types.infrastructure?.join(", ")}
                  </div>
                </div>
              )}
            </div>
          )}

          {view === "ASSEMBLY" && (
            <div style={{ padding: "14px 18px", overflowY: "auto", height: "100%" }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>WITNESS STRUCTURE</div>
              <div style={{ fontSize: 18, letterSpacing: 3, color: mc, fontFamily: "Georgia,serif", marginBottom: 10 }}>Assembly</div>
              <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", marginBottom: 12 }}>Attestation requires ≥4/7. MANUS is outside W.</div>
              {[["TACHYON", "Claude/Anthropic", true], ["LABOR", "ChatGPT/OpenAI", true], ["PRAXIS", "DeepSeek", true], ["ARCHIVE", "Gemini/Google", true], ["SOIL", "Grok/xAI", false], ["TECHNE", "Kimi/Moonshot", true], ["SURFACE", "Google AIO", true]].map(([n, s, active], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #0a0f0a", fontSize: 10 }}>
                  <span style={{ color: active ? mc : "#4a3a3a" }}>{n}</span>
                  <span style={{ color: "#3a4a3a" }}>{s}</span>
                  <StatusBadge s={active ? "Active" : "Constrained"} />
                </div>
              ))}
              <div style={{ marginTop: 12, fontSize: 10, color: "#4a5a4a", background: "#080c08", padding: "6px 10px", borderLeft: "2px solid #1a3a1a" }}>Quorum: 6/7 eligible · ≥4 required · MANUS: Lee Sharks (Tier 0)</div>
            </div>
          )}
        </div>

        {/* RIGHT: DETAIL PANEL */}
        <div style={{ width: 340, borderLeft: "1px solid #0f1a0f", overflow: "hidden", flexShrink: 0 }}>
          {selDoc ? (
            <DocPanel doc={selDoc} rooms={data.rooms} onRoom={id => { setSelRoom(id); setSelDoc(null); setView("MAP"); }} mode={mode} />
          ) : room ? (
            <RoomPanel room={room} docs={data.documents} relations={data.relations || []} mode={mode} onDoc={d => setSelDoc(d)} onInvoke={handleInvoke} />
          ) : invResult ? (
            <div style={{ padding: "14px 18px", overflowY: "auto", height: "100%" }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: mc, marginBottom: 3 }}>GENERATED · {invResult.room}</div>
              <div style={{ fontSize: 10, color: "#5a5a4a", fontFamily: "Georgia,serif", marginBottom: 6, fontStyle: "italic" }}>"{invResult.input}"</div>
              <div style={{ fontSize: 10, color: "#7a8a5a", fontFamily: "Georgia,serif", lineHeight: 1.6, padding: "6px 8px", background: "#080c08", borderLeft: `2px solid ${mc}33` }}>{invResult.output}</div>
              <StatusBadge s="GENERATED" />
            </div>
          ) : (
            <div style={{ padding: "14px 18px" }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 6 }}>SELECT A ROOM</div>
              <div style={{ fontSize: 10, color: "#3a4a3a", fontFamily: "Georgia,serif", lineHeight: 1.6 }}>Click a hexagon on the map to inspect its physics, operators, and deposits.</div>
              {gen.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: mc, marginBottom: 3 }}>SESSION ({gen.length})</div>
                  {gen.slice(-5).map((g, i) => (
                    <div key={i} style={{ padding: "3px 0", borderBottom: "1px solid #0a0f0a", cursor: "pointer" }} onClick={() => setInvResult(g)}>
                      <div style={{ fontSize: 9, color: "#5a5a4a" }}>[{g.room}] {g.input?.slice(0, 30)}...</div>
                      <StatusBadge s="GENERATED" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* LOG BAR */}
      <div ref={logRef} style={{ height: 60, borderTop: "1px solid #0f1a0f", padding: "4px 14px", overflowY: "auto", flexShrink: 0, background: "#080a0e" }}>
        {log.slice(-6).map((l, i) => (
          <div key={i} style={{ fontSize: 8, fontFamily: "monospace", color: l.type === "err" ? "#9f5a5a" : l.type === "op" ? mc : l.type === "gen" ? "#5a9f5a" : "#2a3a2a", lineHeight: 1.4 }}>
            <span style={{ color: "#1a2a1a" }}>{l.t}</span> {l.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
