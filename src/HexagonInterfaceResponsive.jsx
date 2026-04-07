import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { gravityWell, isGravityWellConfigured } from "./gravityWellAdapter.js";
import { supabase, isSupabaseConfigured } from "./supabaseClient.js";

const DATA_URL = "https://raw.githubusercontent.com/leesharks000/crimson-hexagonal-interface/main/hexagon_canonical.json";

const CAT_COLORS = { core: "#c9a84c", ext: "#5a9f7b", special: "#9f5a7b", new: "#5a7a9f" };
const STRUCTURE_COLORS = { room: "#c9a84c", chamber: "#7a5ac9", vault: "#c95a5a", portal: "#5ac9c9", portico: "#9f8a5a", field: "#5a9f5a" };
const MODE_COLORS = { ANALYTIC: "#5a7a9f", OPERATIVE: "#c9a84c", AUDIT: "#9f5a7b" };
const STATUS_COLORS = {
  RATIFIED: "#5a9f5a", DEPOSITED: "#7a9f5a", PROVISIONAL: "#9f9f5a",
  GENERATED: "#8a7a4a", ACTIVE: "#5a9f5a", CONSTRAINED: "#9f5a5a",
};
const ARK_MODE_COLORS = {
  FORMAL: "#7a8a9f", ADVENTURE: "#9f8a5a", POETIC: "#c9a84c", CLINICAL: "#5a9f7b",
  LITURGICAL: "#9f7ab0", NARRATIVE: "#8a9f7a", JURIDICAL: "#9f5a7b",
  PSYCHEDELIC: "#b07a9f", COMBAT: "#9f5a5a", MERCANTILE: "#7a9f9f",
  COSMIC: "#5a7a9f", ENCRYPTED: "#5a5a7a",
};
const LP_STEP_LABELS = {
  ACTIVATE_MANTLE: "MANTLE", SET_LOGOS: "LOGOS", ROTATE: "ROTATE",
  APPLY: "APPLY", CHECK: "CHECK", ANCHOR: "ANCHOR", RENDER: "RENDER",
  REQUEST_JUDGMENT: "JUDGMENT", ON_FAILURE: "FAILSAFE",
};

const MAP_SIZE = 42;
const SQRT3 = Math.sqrt(3);

function useIsMobile(bp = 900) {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < bp : false);
  useEffect(() => { const f = () => setM(window.innerWidth < bp); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, [bp]);
  return m;
}

const hex2px = (q, r, cx, cy) => ({ x: cx + MAP_SIZE * 1.5 * q, y: cy + MAP_SIZE * (SQRT3 * r + (SQRT3 / 2) * q) });
const hexPoints = (cx, cy, sz, rotOffset = -30) => { const p = []; for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (60 * i + rotOffset); p.push(`${cx + sz * Math.cos(a)},${cy + sz * Math.sin(a)}`); } return p.join(" "); };

function normalizeRoom(room) {
  return {
    id: room.id, name: room.name || room.title || room.id,
    cat: room.cat || room.category || room.type || "core",
    structure_type: room.structure_type || null,
    q: Number(room.q ?? room.axial_q ?? 0), r: Number(room.r ?? room.axial_r ?? 0),
    desc: room.desc || room.description || room.summary || "No description available.",
    physics: room.physics || room.room_physics || room.logic || "No room physics specified.",
    ops: room.ops || room.operators || room.default_operators || [],
    het: room.het || room.heteronym || room.voice || "—",
    inst: room.inst || room.institution || "—",
    prompt: room.prompt || room.entry_prompt || "—",
    mantle: room.mantle || null,
    preferred_mode: room.preferred_mode || "FORMAL",
    lp_program: room.lp_program || [],
    default_operators: room.default_operators || [],
    shadow: room.shadow || null,
    tang_void: room.tang_void || null,
    garden_lanes: room.garden_lanes || null,
  };
}

function normalizeDoc(doc) {
  return {
    id: doc.id || doc.doi || doc.title, doi: doc.doi || null,
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
  return { id: rel.id || `${rel.from}-${rel.type}-${rel.to}`, from: rel.from, to: rel.to, type: rel.type || "relates_to", status: rel.status || "RATIFIED" };
}

// ─── Zenodo Live Reader ───

function doiToRecordId(doi) {
  if (!doi) return null;
  const parts = doi.split(".");
  return parts[parts.length - 1];
}

async function fetchZenodoMarkdown(doi) {
  const recordId = doiToRecordId(doi);
  if (!recordId) throw new Error("No DOI");
  const rec = await fetch(`https://zenodo.org/api/records/${recordId}`).then(r => r.json());
  const files = rec.files || [];
  // Prefer .md, fall back to .txt
  const mdFile = files.find(f => f.key.endsWith(".md")) || files.find(f => f.key.endsWith(".txt"));
  if (!mdFile) return { files, text: null, title: rec.metadata?.title || "" };
  const text = await fetch(mdFile.links.self).then(r => r.text());
  return { files, text, title: rec.metadata?.title || "", filename: mdFile.key, size: mdFile.size };
}

function MdRenderer({ text, mc }) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  let inCode = false;
  let codeLines = [];

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
      if (inCode) {
        elements.push(<pre key={i} style={{ fontSize: 9, fontFamily: "monospace", color: "#5a6a4a", background: "#060a06", padding: "8px 10px", borderLeft: `2px solid ${mc}22`, overflowX: "auto", margin: "6px 0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{codeLines.join("\n")}</pre>);
        codeLines = []; inCode = false;
      } else { inCode = true; }
      i++; continue;
    }
    if (inCode) { codeLines.push(line); i++; continue; }

    // Headings
    if (line.startsWith("# ")) { elements.push(<div key={i} style={{ fontSize: 15, fontWeight: 300, letterSpacing: 2, color: mc, fontFamily: "Georgia,serif", margin: "14px 0 6px 0" }}>{line.slice(2)}</div>); i++; continue; }
    if (line.startsWith("## ")) { elements.push(<div key={i} style={{ fontSize: 12, fontWeight: 300, letterSpacing: 1, color: mc, fontFamily: "Georgia,serif", margin: "12px 0 4px 0" }}>{line.slice(3)}</div>); i++; continue; }
    if (line.startsWith("### ")) { elements.push(<div key={i} style={{ fontSize: 11, fontWeight: 400, letterSpacing: 1, color: mc + "cc", fontFamily: "Georgia,serif", margin: "10px 0 3px 0" }}>{line.slice(4)}</div>); i++; continue; }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line)) { elements.push(<hr key={i} style={{ border: "none", borderTop: `1px solid ${mc}22`, margin: "8px 0" }} />); i++; continue; }

    // Bold/italic inline (simple)
    if (line.trim() === "") { elements.push(<div key={i} style={{ height: 6 }} />); i++; continue; }

    // Regular paragraph
    const rendered = line
      .replace(/\*\*(.+?)\*\*/g, "⟪b⟫$1⟪/b⟫")
      .replace(/\*(.+?)\*/g, "⟪i⟫$1⟪/i⟫")
      .replace(/`(.+?)`/g, "⟪c⟫$1⟪/c⟫");

    const parts = rendered.split(/⟪\/?[bic]⟫/);
    const tags = [...rendered.matchAll(/⟪(\/?[bic])⟫/g)].map(m => m[1]);

    const spans = [];
    let tagIdx = 0;
    for (let p = 0; p < parts.length; p++) {
      if (parts[p]) {
        const isBold = tagIdx > 0 && tags[tagIdx - 1] === "b";
        const isItalic = tagIdx > 0 && tags[tagIdx - 1] === "i";
        const isCode = tagIdx > 0 && tags[tagIdx - 1] === "c";
        spans.push(<span key={p} style={{ fontWeight: isBold ? 500 : "normal", fontStyle: isItalic ? "italic" : "normal", fontFamily: isCode ? "monospace" : "inherit", background: isCode ? "#060a06" : "transparent", padding: isCode ? "0 3px" : 0, color: isBold ? mc : isCode ? "#7a8a5a" : "inherit" }}>{parts[p]}</span>);
      }
      if (tagIdx < tags.length) tagIdx++;
    }

    elements.push(<div key={i} style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", lineHeight: 1.6, margin: "2px 0" }}>{spans.length > 0 ? spans : line}</div>);
    i++;
  }

  return <div>{elements}</div>;
}

// ─── LP State Engine ───
function initLP() { return { σ: "—", ε: 1.0, Ξ: [], ψ: 0 }; }

function lpStep(state, step) {
  switch (step.step) {
    case "ACTIVATE_MANTLE": return { ...state, ψ: +(state.ψ + 0.1).toFixed(2) };
    case "SET_LOGOS": return { ...state, σ: step.value, ε: 0.9 };
    case "ROTATE": return { ...state, ε: +Math.max(0, state.ε - 0.05).toFixed(2) };
    case "APPLY": {
      const op = step.value.split("::")[0].trim();
      return { ...state, Ξ: [...state.Ξ, op], ψ: +(state.ψ + 0.15).toFixed(2), ε: +Math.max(0, state.ε - 0.1).toFixed(2) };
    }
    case "CHECK": return { ...state, ψ: +(state.ψ + 0.05).toFixed(2) };
    case "ANCHOR": return { ...state, ε: +Math.max(0, state.ε - 0.15).toFixed(2) };
    case "REQUEST_JUDGMENT": return { ...state, ψ: +(state.ψ + 0.2).toFixed(2) };
    default: return state;
  }
}

// ─── Components ───

function StatusBadge({ s }) {
  const label = String(s || "GENERATED").toUpperCase();
  const color = STATUS_COLORS[label] || "#5a5a3a";
  return <span style={{ fontSize: 8, padding: "1px 4px", background: color + "22", color, border: `1px solid ${color}44`, fontFamily: "monospace", letterSpacing: 1 }}>{label}</span>;
}

function LPSidecar({ lp, steps, stepIdx, mantle, arkMode, isMobile }) {
  const mc = ARK_MODE_COLORS[arkMode] || "#c9a84c";
  return (
    <div style={{ padding: isMobile ? "6px 10px" : "8px 14px", borderBottom: "1px solid #0f1a0f", background: "#080a0e", flexShrink: 0 }}>
      <div style={{ display: "flex", gap: isMobile ? 6 : 12, flexWrap: "wrap", marginBottom: steps.length > 0 ? 5 : 0 }}>
        {[["σ", typeof lp.σ === "string" && lp.σ.length > 28 ? lp.σ.slice(0, 25) + "…" : lp.σ, mc],
          ["ε", lp.ε.toFixed(2), lp.ε < 0.5 ? "#9f5a5a" : "#5a9f5a"],
          ["Ξ", lp.Ξ.length > 0 ? `[${lp.Ξ.join(",")}]` : "[]", mc],
          ["ψ", lp.ψ.toFixed(2), lp.ψ > 0.5 ? "#c9a84c" : "#5a6a4a"],
        ].map(([k, v, c]) => (
          <span key={k} style={{ fontSize: 9, fontFamily: "monospace" }}>
            <span style={{ color: "#3a4a3a" }}>{k}</span>
            <span style={{ color: c, marginLeft: 3 }}>{v}</span>
          </span>
        ))}
      </div>
      {steps.length > 0 && (
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center" }}>
          {mantle && <span style={{ fontSize: 8, color: mc, fontFamily: "Georgia,serif", marginRight: 4 }}>{mantle}</span>}
          {steps.map((s, i) => {
            const label = LP_STEP_LABELS[s.step] || s.step;
            const done = i < stepIdx;
            const active = i === stepIdx;
            return <span key={i} style={{ fontSize: 7, padding: "1px 4px", fontFamily: "monospace", letterSpacing: 1, background: active ? mc + "22" : "transparent", color: done ? mc : active ? mc : "#2a3a2a", border: `1px solid ${active ? mc + "66" : done ? mc + "33" : "#0f1a0f"}`, transition: "all 0.3s ease" }}>{done ? "✓" : ""}{label}</span>;
          })}
          <span style={{ fontSize: 7, padding: "1px 4px", fontFamily: "monospace", color: mc, border: `1px solid ${mc}33`, marginLeft: 4 }}>{arkMode}</span>
        </div>
      )}
    </div>
  );
}

function HexMap({ rooms, edges, selected, onSelect, mc, isMobile }) {
  const cx = 340, cy = isMobile ? 230 : 280;
  const positioned = useMemo(() => rooms.map((r) => ({ ...r, ...hex2px(r.q, r.r, cx, cy) })), [rooms, cy]);
  const roomMap = useMemo(() => Object.fromEntries(positioned.map((r) => [r.id, r])), [positioned]);
  return (
    <div style={{ width: "100%", height: "100%", minHeight: isMobile ? 320 : 420, overflow: "hidden" }}>
      <svg viewBox={isMobile ? "0 0 680 500" : "0 0 680 560"} style={{ width: "100%", height: "100%", background: "transparent" }}>
        {edges.map((e, i) => { const a = roomMap[e.from], b = roomMap[e.to]; if (!a || !b) return null; return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={e.type === "adjacent" ? "#0f1a0f" : mc + "44"} strokeWidth={e.type === "adjacent" ? 0.5 : 1} strokeDasharray={e.type !== "adjacent" ? "3,3" : undefined} />; })}
        {positioned.map((r) => { const sel = selected === r.id; const st = r.structure_type || "room"; const col = STRUCTURE_COLORS[st] || CAT_COLORS[r.cat] || "#444"; const sz = sel ? MAP_SIZE + 4 : (st === "vault" ? MAP_SIZE - 8 : MAP_SIZE - 2);
          const nameLen = r.name.length;
          const baseFontSize = sel ? (isMobile ? 8 : 9) : (isMobile ? 6 : 7);
          const fontSize = nameLen > 20 ? Math.max(baseFontSize - 2, 4) : nameLen > 12 ? Math.max(baseFontSize - 1, 5) : baseFontSize;
          const displayName = nameLen > 24 ? r.name.slice(0, 22) + "…" : r.name;
          const clipId = `clip-${r.id}`;
          if (st === "field") { return (
            <g key={r.id} onClick={() => onSelect(r.id)} style={{ cursor: "pointer" }}>
              <circle cx={r.x} cy={r.y} r={sz * 0.85} fill={sel ? col + "22" : col + "08"} stroke={sel ? mc : col + "44"} strokeWidth={sel ? 1.5 : 0.5} strokeDasharray="4,3" />
              <circle cx={r.x} cy={r.y} r={sz * 0.55} fill="none" stroke={col + "22"} strokeWidth={0.3} strokeDasharray="2,4" />
              <circle cx={r.x} cy={r.y} r={sz * 0.25} fill={col + "11"} stroke="none" />
              <text x={r.x} y={r.y - 4} textAnchor="middle" fill={sel ? "#e0d0a0" : col} fontSize={fontSize} fontFamily="Georgia,serif">{displayName}</text>
              <text x={r.x} y={r.y + 8} textAnchor="middle" fill="#2a3a2a" fontSize={isMobile ? 5 : 5} fontFamily="monospace">FIELD</text>
            </g>); }
          if (r.id === "sp03") { return (
            <g key={r.id} onClick={() => onSelect(r.id)} style={{ cursor: "pointer" }}>
              <polygon points={hexPoints(r.x, r.y, sz, -30)} fill={sel ? "#c9a84c22" : "#0a0d12"} stroke={sel ? mc : "#c9a84c66"} strokeWidth={sel ? 1.5 : 0.5} />
              <polygon points={hexPoints(r.x, r.y, sz * 0.65, -30)} fill="none" stroke="#c9a84c33" strokeWidth={0.4} />
              <polygon points={hexPoints(r.x, r.y, sz * 0.35, -30)} fill="#c9a84c08" stroke="#c9a84c22" strokeWidth={0.3} />
              <text x={r.x} y={r.y - 4} textAnchor="middle" fill={sel ? "#e0d0a0" : "#c9a84c"} fontSize={fontSize} fontFamily="Georgia,serif">{displayName}</text>
              <text x={r.x} y={r.y + 8} textAnchor="middle" fill="#2a3a2a" fontSize={isMobile ? 5 : 6} fontFamily="monospace">ARK</text>
            </g>); }
          const rot = st === "chamber" ? 0 : st === "vault" ? 15 : -30;
          const dash = st === "portal" ? "3,2" : st === "portico" ? "6,3" : undefined;
          const sw = sel ? 1.5 : (st === "vault" ? 1.2 : 0.5);
          return (
          <g key={r.id} onClick={() => onSelect(r.id)} style={{ cursor: "pointer" }}>
            <defs><clipPath id={clipId}><polygon points={hexPoints(r.x, r.y, sz - 1, rot)} /></clipPath></defs>
            {st === "vault" && <polygon points={hexPoints(r.x, r.y, sz + 6, rot)} fill="none" stroke={col + "22"} strokeWidth={0.3} />}
            <polygon points={hexPoints(r.x, r.y, sz, rot)} fill={sel ? col + "22" : "#0a0d12"} stroke={sel ? mc : col + "66"} strokeWidth={sw} strokeDasharray={dash} />
            <g clipPath={`url(#${clipId})`}>
              <text x={r.x} y={r.y - 4} textAnchor="middle" fill={sel ? "#e0d0a0" : col} fontSize={fontSize} fontFamily="Georgia,serif">{displayName}</text>
            </g>
            <text x={r.x} y={r.y + 8} textAnchor="middle" fill="#2a3a2a" fontSize={isMobile ? 5 : 6} fontFamily="monospace">{r.id}</text>
          </g>); })}
      </svg>
    </div>
  );
}

function InvokePanel({ room, mc, lp, addLog, isMobile }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [invoking, setInvoking] = useState(false);
  const [gwKey, setGwKey] = useState(() => localStorage?.getItem?.("gw_api_key") || "");

  const handleInvoke = async () => {
    if (!input.trim()) return;
    if (!gwKey.trim()) return addLog("GW API key required — set in Dashboard → GW BRIDGE", "err");
    setInvoking(true); setResult(null);
    try {
      addLog(`INVOKE: ${room.name} · ${room.preferred_mode}`, "lp");
      const res = await gravityWell.invoke({
        apiKey: gwKey, roomId: room.id, roomName: room.name, input,
        physics: room.physics, mantle: room.mantle, preferredMode: room.preferred_mode,
        operators: room.default_operators, lpProgram: room.lp_program,
        lpState: lp ? { σ: lp.σ, ε: lp.ε, Ξ: lp.Ξ, ψ: lp.ψ } : null,
      });
      setResult(res);
      addLog(`INVOKE: γ=${res.gamma} · ${res.model} · ${res.text.slice(0, 40)}…`, "lp");
    } catch (e) {
      setResult({ error: e.message });
      addLog(`INVOKE error: ${e.message}`, "err");
    }
    setInvoking(false);
  };

  return (
    <div style={{ marginBottom: 10, padding: "6px 8px", background: "#060a06", borderLeft: `2px solid ${mc}22` }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>INVOKE · {room.mantle || room.name}</div>
      {!gwKey && <div style={{ fontSize: 8, color: "#9f7a4a", marginBottom: 4 }}>GW API key required. Set in Dashboard → GW BRIDGE tab.</div>}
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleInvoke(); }} placeholder={`Speak into ${room.name}...`} style={{ flex: 1, background: "#080808", border: `1px solid ${mc}22`, color: "#7a8a5a", padding: "4px 8px", fontSize: 9, fontFamily: "Georgia,serif", outline: "none" }} />
        <button onClick={handleInvoke} disabled={invoking || !gwKey} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: gwKey ? mc : "#3a4a3a", padding: "4px 10px", fontSize: 8, cursor: invoking ? "wait" : gwKey ? "pointer" : "not-allowed", fontFamily: "monospace", flexShrink: 0 }}>{invoking ? "…" : "INVOKE"}</button>
      </div>
      {result && !result.error && (
        <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", lineHeight: 1.6, padding: "6px 0", borderTop: `1px solid ${mc}11` }}>
          {result.text}
          <div style={{ fontSize: 7, color: "#2a3a2a", fontFamily: "monospace", marginTop: 4 }}>{result.model} · {room.preferred_mode} · γ={result.gamma} · GENERATED</div>
        </div>
      )}
      {result?.error && <div style={{ fontSize: 9, color: "#9f5a5a", lineHeight: 1.4 }}>{result.error}</div>}
    </div>
  );
}

function RoomPanel({ room, docs, relations, onDoc, isMobile, mc, onApplyOp, mode, lp, addLog }) {
  const roomDocs = useMemo(() => docs.filter((d) => d.r.includes(room.id)), [docs, room.id]);
  const roomRels = useMemo(() => relations.filter((r) => r.from === room.id || r.to === room.id), [relations, room.id]);
  return (
    <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 2 }}>{room.hex_address || (room.id + ' · ' + (room.structure_type || room.cat).toUpperCase())}</div>
      <h2 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 300, letterSpacing: 2, color: mc, margin: "0 0 6px 0", fontFamily: "Georgia,serif" }}>{room.name}</h2>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {room.mantle && <span style={{ fontSize: 8, padding: "1px 5px", background: mc + "11", border: `1px solid ${mc}33`, color: mc, fontFamily: "Georgia,serif" }}>{room.mantle}</span>}
        <span style={{ fontSize: 8, padding: "1px 5px", background: mc + "11", border: `1px solid ${mc}33`, color: mc, fontFamily: "monospace" }}>{room.preferred_mode}</span>
      </div>
      <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", lineHeight: 1.5, marginBottom: 10, borderLeft: `2px solid ${mc}33`, paddingLeft: 8 }}>{room.desc}</div>
      <div style={{ marginBottom: 10 }}><div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>PHYSICS</div><div style={{ fontSize: 10, color: "#7a8a5a", fontFamily: "monospace" }}>{room.physics}</div></div>
      {room.default_operators?.length > 0 && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>OPERATORS (tap to apply)</div><div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>{room.default_operators.map((op, i) => <span key={i} onClick={() => onApplyOp && onApplyOp(op)} style={{ fontSize: 9, padding: "1px 5px", background: mc + "11", border: `1px solid ${mc}33`, color: mc, fontFamily: "monospace", cursor: "pointer" }}>{op}</span>)}</div></div>}
      {room.lp_program?.length > 0 && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>LP PROGRAM</div><div style={{ padding: "6px 8px", background: "#060a06", borderLeft: `2px solid ${mc}22` }}>{room.lp_program.map((s, i) => <div key={i} style={{ fontSize: 9, fontFamily: "monospace", color: "#4a5a4a", lineHeight: 1.6 }}><span style={{ color: mc }}>{s.step}</span><span style={{ color: "#3a4a3a" }}> :: </span><span>{s.value}</span></div>)}</div></div>}

      {/* INVOKE — routes through Gravity Well */}
      {mode === "OPERATIVE" && (
        <InvokePanel room={room} mc={mc} lp={lp} addLog={addLog} isMobile={isMobile} />
      )}
      {roomRels.length > 0 && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>RELATIONS ({roomRels.length})</div>{roomRels.map((r) => <div key={r.id} style={{ fontSize: 9, color: "#4a5a4a", padding: "2px 0" }}>{r.from} <span style={{ color: mc }}>{r.type}</span> {r.to}</div>)}</div>}
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>DEPOSITS ({roomDocs.length})</div>
      {roomDocs.slice(0, isMobile ? 10 : 15).map((d) => (
        <div key={d.id} onClick={() => onDoc(d)} style={{ padding: "4px 0", borderBottom: "1px solid #0a0f0a", cursor: "pointer" }}>
          <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", lineHeight: 1.3 }}>{d.t.length > 60 ? d.t.slice(0, 57) + "..." : d.t}</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}><span style={{ fontSize: 8, color: "#2a3a2a" }}>{(d.c?.[0] || "") + " · " + d.d}</span><StatusBadge s={d.s} /></div>
        </div>
      ))}
    </div>
  );
}

function DocPanel({ doc, rooms, onRoom, mc, isMobile, readState, onRead, relations, documents, onDoc, compareDoc, onCompare }) {
  const hasContent = readState?.doi === doc.doi && readState?.text;
  const isLoading = readState?.doi === doc.doi && readState?.loading;
  const [annotations, setAnnotations] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [annoLoaded, setAnnoLoaded] = useState(null);

  // Load annotations for this doc
  useEffect(() => {
    if (isSupabaseConfigured() && doc.id && annoLoaded !== doc.id) {
      supabase.listAnnotations(doc.id).then(a => { setAnnotations(a); setAnnoLoaded(doc.id); }).catch(() => {});
    }
  }, [doc.id, annoLoaded]);

  const addNote = async () => {
    if (!noteText.trim()) return;
    const anno = { doc_id: doc.id, room_id: (doc.r || [])[0] || null, content: noteText, author: "MANUS" };
    if (isSupabaseConfigured()) {
      try { const result = await supabase.addAnnotation(doc.id, noteText, (doc.r || [])[0]); setAnnotations(a => [result, ...a]); } catch (e) { setAnnotations(a => [{ ...anno, id: Date.now(), created_at: new Date().toISOString() }, ...a]); }
    } else { setAnnotations(a => [{ ...anno, id: Date.now(), created_at: new Date().toISOString() }, ...a]); }
    setNoteText("");
  };

  // Citation chain: find related documents through room relations
  const docRooms = doc.r || [];
  const roomRelations = useMemo(() => (relations || []).filter(r => docRooms.includes(r.from) || docRooms.includes(r.to)), [relations, docRooms]);
  const connectedRoomIds = useMemo(() => {
    const ids = new Set();
    roomRelations.forEach(r => { ids.add(r.from); ids.add(r.to); });
    docRooms.forEach(id => ids.delete(id)); // exclude own rooms
    return [...ids];
  }, [roomRelations, docRooms]);
  const connectedDocs = useMemo(() => {
    if (!documents) return [];
    return documents.filter(d => d.id !== doc.id && connectedRoomIds.some(rid => (d.r || []).includes(rid))).slice(0, 8);
  }, [documents, doc.id, connectedRoomIds]);

  return (
    <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
      {!hasContent && <>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 2 }}>DOCUMENT</div>
        <h2 style={{ fontSize: isMobile ? 14 : 15, fontWeight: 300, color: mc, margin: "0 0 8px 0", fontFamily: "Georgia,serif", lineHeight: 1.3 }}>{doc.t}</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}><StatusBadge s={doc.s} /><span style={{ fontSize: 9, color: "#3a4a3a" }}>{doc.d}</span></div>
        <div style={{ fontSize: 10, color: "#5a6a4a", marginBottom: 6 }}>{(doc.c || []).join(" · ")}</div>
        {doc.e && <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", lineHeight: 1.5, marginBottom: 10, padding: "6px 8px", background: "#080c08", borderLeft: `2px solid ${mc}22` }}>{doc.e.length > (isMobile ? 320 : 500) ? doc.e.slice(0, isMobile ? 317 : 497) + "..." : doc.e}</div>}
        {doc.doi && (
          <button onClick={() => onRead(doc.doi)} disabled={isLoading} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "6px 12px", fontSize: 9, cursor: isLoading ? "wait" : "pointer", fontFamily: "monospace", letterSpacing: 1, marginBottom: 4, width: "100%" }}>
            {isLoading ? "FETCHING FROM ZENODO…" : "READ FULL TEXT"}
          </button>
        )}
        {doc.doi && (
          <button onClick={() => {
            const pkg = [
              `# DEPOSIT PACKET: ${doc.t}`,
              ``,
              `## Metadata`,
              `- **DOI:** ${doc.doi}`,
              `- **Date:** ${doc.d}`,
              `- **Status:** ${doc.s}`,
              `- **Creators:** ${(doc.c || []).join(", ")}`,
              `- **Rooms:** ${(doc.r || []).join(", ")}`,
              `- **Keywords:** ${(doc.k || []).join(", ")}`,
              ``,
              `## Zenodo Related Identifiers`,
              `\`\`\`json`,
              `[`,
              `  {"identifier": "10.5281/zenodo.19013315", "relation": "isPartOf", "resource_type": "publication-technicalnote"},`,
              `  {"identifier": "${doc.doi}", "relation": "isIdenticalTo", "resource_type": "publication-technicalnote"}`,
              `]`,
              `\`\`\``,
              ``,
              `## Excerpt`,
              doc.e || "(no excerpt)",
              ``,
              `---`,
              `Generated by Hexagonal OS · ${new Date().toISOString().slice(0, 10)}`,
            ].join("\n");
            navigator.clipboard?.writeText(pkg).then(() => addLog && addLog(`EMIT: deposit packet copied`, "sys")).catch(() => {});
          }} style={{ background: "transparent", border: `1px solid ${mc}22`, color: mc + "aa", padding: "4px 12px", fontSize: 8, cursor: "pointer", fontFamily: "monospace", letterSpacing: 1, marginBottom: 10, width: "100%" }}>
            EMIT DEPOSIT PACKET
          </button>
        )}
        {/* ANCHOR + DEPTH buttons */}
        {doc.doi && (
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            <button onClick={() => {
              setLp && setLp(prev => ({ ...prev, ε: +Math.max(0, prev.ε - 0.15).toFixed(2) }));
              addLog && addLog(`ANCHOR: ${doc.doi}`, "lp");
              navigator.clipboard?.writeText(doc.doi);
            }} style={{ flex: 1, background: "transparent", border: `1px solid ${mc}22`, color: mc + "aa", padding: "4px 8px", fontSize: 8, cursor: "pointer", fontFamily: "monospace" }}>
              ANCHOR DOI
            </button>
            <button onClick={() => {
              const m = computeMetrics(doc, { relations: relations || [], documents: documents || [] });
              const report = `DEPTH PROBE: ${doc.t.slice(0,40)}\nDRR: ${m.DRR} (${m.DRR >= 0.75 ? "PASS" : "FAIL"})\nCSI: ${m.CSI} (${m.CSI <= 0.40 ? "PASS" : "FAIL"})\nPCS: ${m.PCS} (${m.PCS >= 0.70 ? "PASS" : "FAIL"})\nER: ${m.ER} (${m.ER >= 0.75 ? "PASS" : "FAIL"})\nTRS: ${m.TRS}`;
              navigator.clipboard?.writeText(report);
              addLog && addLog(`DEPTH: DRR=${m.DRR} CSI=${m.CSI} PCS=${m.PCS} ER=${m.ER}`, "lp");
            }} style={{ flex: 1, background: "transparent", border: `1px solid ${mc}22`, color: mc + "aa", padding: "4px 8px", fontSize: 8, cursor: "pointer", fontFamily: "monospace" }}>
              DEPTH PROBE
            </button>
          </div>
        )}
        {readState?.error && readState.doi === doc.doi && <div style={{ fontSize: 9, color: "#9f5a5a", marginBottom: 8 }}>{readState.error}</div>}
        {doc.r.length > 0 && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>ROOMS</div><div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>{doc.r.map((rid) => { const rm = rooms.find((r) => r.id === rid); return <span key={rid} onClick={() => onRoom(rid)} style={{ fontSize: 9, padding: "1px 5px", background: "#0a0f0a", border: `1px solid ${(CAT_COLORS[rm?.cat] || "#333")}44`, color: CAT_COLORS[rm?.cat] || "#555", cursor: "pointer", fontFamily: "monospace" }}>{rm?.name || rid}</span>; })}</div></div>}

        {/* Citation chain */}
        {roomRelations.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>RELATION CHAIN ({roomRelations.length})</div>
            {roomRelations.map(r => (
              <div key={r.id} style={{ fontSize: 8, color: "#4a5a4a", padding: "2px 0", fontFamily: "monospace" }}>
                {r.from} <span style={{ color: mc }}>{r.type}</span> {r.to}
              </div>
            ))}
          </div>
        )}
        {connectedDocs.length > 0 && (
          <div>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>CONNECTED ({connectedDocs.length})</div>
            {connectedDocs.map(d => (
              <div key={d.id} onClick={() => onDoc && onDoc(d)} style={{ padding: "3px 0", borderBottom: "1px solid #0a0f0a", cursor: "pointer" }}>
                <div style={{ fontSize: 9, color: "#5a6a4a", fontFamily: "Georgia,serif", lineHeight: 1.3 }}>{d.t.length > 55 ? d.t.slice(0, 52) + "..." : d.t}</div>
                <div style={{ fontSize: 7, color: "#2a3a2a" }}>{(d.c?.[0] || "") + " · " + d.d}</div>
              </div>
            ))}
          </div>
        )}

        {/* Compare */}
        {onCompare && (
          <div style={{ marginBottom: 8 }}>
            {!compareDoc ? (
              <button onClick={() => onCompare(doc)} style={{ background: "transparent", border: `1px solid ${mc}22`, color: mc + "aa", padding: "3px 10px", fontSize: 8, cursor: "pointer", fontFamily: "monospace", width: "100%" }}>PIN FOR COMPARE</button>
            ) : compareDoc.id !== doc.id ? (
              <div style={{ padding: "6px 8px", background: "#060a06", borderLeft: `2px solid ${mc}22` }}>
                <div style={{ fontSize: 8, letterSpacing: 1, color: "#3a4a3a", marginBottom: 4 }}>COMPARING WITH</div>
                <div style={{ fontSize: 9, color: mc, fontFamily: "Georgia,serif", marginBottom: 4 }}>{compareDoc.t.slice(0, 50)}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 8, fontFamily: "monospace" }}>
                  <div><span style={{ color: "#3a4a3a" }}>rooms:</span> <span style={{ color: "#5a6a4a" }}>{(compareDoc.r || []).join(",")}</span></div>
                  <div><span style={{ color: "#3a4a3a" }}>rooms:</span> <span style={{ color: "#5a6a4a" }}>{(doc.r || []).join(",")}</span></div>
                  <div><span style={{ color: "#3a4a3a" }}>date:</span> <span style={{ color: "#5a6a4a" }}>{compareDoc.d}</span></div>
                  <div><span style={{ color: "#3a4a3a" }}>date:</span> <span style={{ color: "#5a6a4a" }}>{doc.d}</span></div>
                  <div><span style={{ color: "#3a4a3a" }}>kw:</span> <span style={{ color: "#5a6a4a" }}>{(compareDoc.k || []).length}</span></div>
                  <div><span style={{ color: "#3a4a3a" }}>kw:</span> <span style={{ color: "#5a6a4a" }}>{(doc.k || []).length}</span></div>
                </div>
                <button onClick={() => onCompare(null)} style={{ background: "transparent", border: `1px solid #5a3a3a44`, color: "#5a3a3a", padding: "2px 8px", fontSize: 7, cursor: "pointer", fontFamily: "monospace", marginTop: 4 }}>CLEAR COMPARE</button>
              </div>
            ) : (
              <div style={{ fontSize: 8, color: "#3a4a3a", fontFamily: "monospace" }}>This document is pinned for comparison. Select another document to compare.</div>
            )}
          </div>
        )}

        {/* Annotations */}
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>ANNOTATIONS ({annotations.length})</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note..." onKeyDown={(e) => { if (e.key === "Enter") addNote(); }} style={{ flex: 1, background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "4px 8px", fontSize: 9, fontFamily: "Georgia,serif", outline: "none" }} />
            <span onClick={addNote} style={{ fontSize: 8, color: mc, cursor: "pointer", fontFamily: "monospace", padding: "4px 6px", border: `1px solid ${mc}33`, alignSelf: "center" }}>+</span>
          </div>
          {annotations.map(a => (
            <div key={a.id} style={{ padding: "3px 0", borderBottom: "1px solid #060a06" }}>
              <div style={{ fontSize: 9, color: "#5a6a4a", fontFamily: "Georgia,serif" }}>{a.content}</div>
              <div style={{ fontSize: 7, color: "#2a3a2a", fontFamily: "monospace" }}>{a.author} · {(a.created_at || "").slice(0, 16)}</div>
            </div>
          ))}
        </div>
      </>}
      {hasContent && <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a" }}>ZENODO · {readState.filename}</div>
          <span onClick={() => onRead(null)} style={{ fontSize: 8, color: "#5a5a3a", cursor: "pointer", fontFamily: "monospace", padding: "1px 5px", border: "1px solid #1a2a1a" }}>CLOSE</span>
        </div>
        <div style={{ fontSize: 8, color: "#3a4a3a", marginBottom: 6, fontFamily: "monospace" }}>{readState.doi} · {(readState.size / 1024).toFixed(1)}KB</div>
        <MdRenderer text={readState.text} mc={mc} />
      </>}
    </div>
  );
}

// ─── LP Acceptance Tests (item 19) ───

function computeMetrics(doc, data) {
  // Heuristic LP metrics based on available metadata
  const rooms = doc.r || [];
  const keywords = doc.k || [];
  const creators = doc.c || [];
  const excerpt = doc.e || "";
  const relations = (data?.relations || []).filter(r =>
    rooms.includes(r.from) || rooms.includes(r.to)
  );

  // DRR: Depth Retention Ratio — preserves depth? (keyword + relation density)
  const drr = Math.min(1, (keywords.length * 0.08 + relations.length * 0.12 + (excerpt.length > 100 ? 0.2 : 0) + (rooms.length * 0.1)));

  // CSI: Closure Saturation Index — prematurely closed? (inverse of room spread)
  const csi = rooms.length > 0 ? Math.max(0, 1 - (rooms.length * 0.25)) : 0.9;

  // PCS: Plural Coherence Score — multiple readings coexist? (keyword diversity + multi-room)
  const pcs = Math.min(1, (keywords.length * 0.06 + rooms.length * 0.15 + creators.length * 0.1));

  // ER: Extraction Resistance — survives decontextualization? (provenance completeness)
  const hasProvenance = doc.doi ? 0.4 : 0;
  const hasDate = doc.d ? 0.2 : 0;
  const hasCreators = creators.length > 0 ? 0.2 : 0;
  const hasExcerpt = excerpt.length > 50 ? 0.2 : 0;
  const er = hasProvenance + hasDate + hasCreators + hasExcerpt;

  // TRS: Temporal Resilience Score — survives retrocausal rewrite? (version stability)
  const trs = doc.doi ? "PASS" : "FAIL";

  return {
    DRR: +drr.toFixed(2),
    CSI: +csi.toFixed(2),
    PCS: +pcs.toFixed(2),
    ER: +er.toFixed(2),
    TRS: trs,
    gates: {
      "QUEUED → PROVISIONAL": drr >= 0.75,
      "quality": csi <= 0.40,
      "PROVISIONAL → DEPOSITED": pcs >= 0.70,
      "LOS compliance": er >= 0.75,
      "durability": trs === "PASS",
    }
  };
}

const METRIC_THRESHOLDS = {
  DRR: { threshold: 0.75, label: "Depth Retention", gate: "QUEUED → PROVISIONAL" },
  CSI: { threshold: 0.40, label: "Closure Saturation", gate: "Quality", invert: true },
  PCS: { threshold: 0.70, label: "Plural Coherence", gate: "PROVISIONAL → DEPOSITED" },
  ER: { threshold: 0.75, label: "Extraction Resistance", gate: "LOS compliance" },
};

// ─── Pattern 3: Mode Command Registry (dead code elimination) ───

const COMMAND_REGISTRY = {
  ANALYTIC: [
    { cmd: "go", label: "Navigate", desc: "Enter a room", risk: "LOW" },
    { cmd: "adjacent", label: "Adjacent", desc: "Show reachable rooms", risk: "LOW" },
    { cmd: "where", label: "Where", desc: "Current room + mode + operators", risk: "LOW" },
    { cmd: "map", label: "Map", desc: "Full room adjacency graph", risk: "LOW" },
    { cmd: "rooms", label: "Rooms", desc: "List all rooms", risk: "LOW" },
    { cmd: "status", label: "Status", desc: "Query element status", risk: "LOW" },
    { cmd: "load", label: "Load", desc: "Load document into σ", risk: "MEDIUM" },
    { cmd: "depth", label: "Depth", desc: "Depth probe on object", risk: "MEDIUM" },
    { cmd: "opacity", label: "Opacity", desc: "Measure structural entropy", risk: "MEDIUM" },
    { cmd: "coherence", label: "Coherence", desc: "Internal reinforcement score", risk: "MEDIUM" },
    { cmd: "provenance", label: "Provenance", desc: "Verify chain of custody", risk: "MEDIUM" },
    { cmd: "trace", label: "Trace", desc: "Follow provenance chain", risk: "MEDIUM" },
  ],
  OPERATIVE: [
    { cmd: "go", label: "Navigate", desc: "Enter a room", risk: "LOW" },
    { cmd: "rotate", label: "Rotate", desc: "Switch Ark mode register", risk: "LOW" },
    { cmd: "mantle", label: "Mantle", desc: "Route through heteronym", risk: "LOW" },
    { cmd: "apply", label: "Apply", desc: "Apply typed operator", risk: "HIGH" },
    { cmd: "invoke", label: "Invoke", desc: "LLM invocation in room", risk: "HIGH" },
    { cmd: "mint", label: "Mint", desc: "Generate new object", risk: "HIGH" },
    { cmd: "anchor", label: "Anchor", desc: "Lock to DOI provenance", risk: "MEDIUM" },
    { cmd: "emit", label: "Emit", desc: "Render in format", risk: "MEDIUM" },
    { cmd: "load", label: "Load", desc: "Load document into σ", risk: "MEDIUM" },
    { cmd: "check", label: "Check", desc: "Run diagnostic suite", risk: "MEDIUM" },
  ],
  AUDIT: [
    { cmd: "go", label: "Navigate", desc: "Enter a room", risk: "LOW" },
    { cmd: "check", label: "Check", desc: "Run diagnostic suite", risk: "MEDIUM" },
    { cmd: "capture", label: "Capture", desc: "Detect COS/FOS traces", risk: "MEDIUM" },
    { cmd: "winding", label: "Winding", desc: "Toroidal field coords", risk: "MEDIUM" },
    { cmd: "submit", label: "Submit", desc: "Submit to Airlock", risk: "HIGH" },
    { cmd: "attest", label: "Attest", desc: "Record witness action", risk: "HIGH" },
    { cmd: "promote", label: "Promote", desc: "Status promotion", risk: "CRITICAL" },
    { cmd: "deposit", label: "Deposit", desc: "Permanent DOI lock", risk: "CRITICAL" },
    { cmd: "reject", label: "Reject", desc: "Reject proposal", risk: "CRITICAL" },
    { cmd: "dream", label: "Dream", desc: "Archive consolidation", risk: "CRITICAL" },
  ],
};

// ─── Pattern 4: Risk tier colors and behavior ───

const RISK_COLORS = { LOW: "#3a5a3a", MEDIUM: "#5a5a3a", HIGH: "#7a5a3a", CRITICAL: "#9f5a5a" };
const RISK_LABELS = { LOW: "silent", MEDIUM: "logged", HIGH: "confirm", CRITICAL: "MANUS" };

// ─── Pattern 1: Dream System — archive consolidation engine ───

function runDream(data) {
  if (!data) return { issues: [], stats: {} };
  const issues = [];
  const now = new Date().toISOString().slice(0, 10);

  // 1. Orphaned relations (reference rooms that don't exist)
  const roomIds = new Set(data.rooms.map(r => r.id));
  data.relations.forEach(r => {
    if (!roomIds.has(r.from)) issues.push({ type: "ORPHAN_REL", severity: "HIGH", msg: `Relation ${r.id}: source ${r.from} not in room graph` });
    if (!roomIds.has(r.to)) issues.push({ type: "ORPHAN_REL", severity: "HIGH", msg: `Relation ${r.id}: target ${r.to} not in room graph` });
  });

  // 2. Empty rooms (excluding intentional: r03 Ichabod = degree 0, r17 MSMRM = QUEUED)
  const intentionalEmpty = new Set(["r03", "r17"]);
  const roomCounts = {};
  data.rooms.forEach(r => { roomCounts[r.id] = 0; });
  data.documents.forEach(doc => { (doc.r || []).forEach(rid => { roomCounts[rid] = (roomCounts[rid] || 0) + 1; }); });
  data.rooms.forEach(r => {
    if (roomCounts[r.id] === 0 && !intentionalEmpty.has(r.id)) {
      issues.push({ type: "EMPTY_ROOM", severity: "MEDIUM", msg: `${r.id} (${r.name}): 0 deposits` });
    }
  });

  // 3. Documents with no room assignment
  data.documents.forEach(doc => {
    if (!doc.r || doc.r.length === 0) issues.push({ type: "UNROOMED_DOC", severity: "MEDIUM", msg: `Document "${(doc.t || "").slice(0, 50)}": no room assignment` });
  });

  // 4. Oversized excerpts (> 300 chars)
  let oversized = 0;
  data.documents.forEach(doc => {
    if ((doc.e || "").length > 300) oversized++;
  });
  if (oversized > 0) issues.push({ type: "EXCERPT_SIZE", severity: "LOW", msg: `${oversized} documents have excerpts > 300 chars` });

  // 5. PROVISIONAL relations needing ratification
  const provCount = data.relations.filter(r => r.status === "PROVISIONAL").length;
  if (provCount > 0) issues.push({ type: "PROV_RELS", severity: "MEDIUM", msg: `${provCount} relations still PROVISIONAL` });

  // 6. Rooms without LP programs
  const noLP = data.rooms.filter(r => !r.lp_program || r.lp_program.length === 0);
  if (noLP.length > 0) issues.push({ type: "NO_LP", severity: "LOW", msg: `${noLP.length} rooms have no LP program: ${noLP.map(r => r.id).join(", ")}` });

  // 7. Duplicate DOIs
  const doiSet = new Set();
  let dupes = 0;
  data.documents.forEach(doc => {
    if (doc.doi && doiSet.has(doc.doi)) dupes++;
    if (doc.doi) doiSet.add(doc.doi);
  });
  if (dupes > 0) issues.push({ type: "DUPE_DOI", severity: "HIGH", msg: `${dupes} duplicate DOIs detected` });

  // 8. Adjacency symmetry check
  const adjSet = new Set();
  (data.edges || []).forEach(e => { adjSet.add(`${e.from}-${e.to}`); });
  let asymmetric = 0;
  (data.edges || []).forEach(e => {
    if (!adjSet.has(`${e.to}-${e.from}`) && e.type === "adjacent") asymmetric++;
  });
  // Note: asymmetric edges are valid (directional like WaterGiraffe→Assembly)
  // but worth flagging for review

  // Stats
  const stats = {
    rooms: data.rooms.length,
    documents: data.documents.length,
    relations: data.relations.length,
    edges: (data.edges || []).length,
    emptyRooms: Object.values(roomCounts).filter(c => c === 0).length,
    issueCount: issues.length,
    timestamp: now,
  };

  return { issues, stats };
}

function GovernanceActions({ mc, addLog, selDoc, data, isMobile, gwApiKey }) {
  const [govTab, setGovTab] = useState("ACTIONS");
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalDesc, setProposalDesc] = useState("");
  const [proposalType, setProposalType] = useState("general");
  const [witnessName, setWitnessName] = useState("TACHYON");
  const [witnessContent, setWitnessContent] = useState("");
  const [proposals, setProposals] = useState([]);
  const [actions, setActions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (configured && !loaded) {
      Promise.all([
        supabase.listProposals().catch(() => []),
        supabase.list("witness_actions", { limit: 20 }).catch(() => []),
      ]).then(([p, a]) => { setProposals(p); setActions(a); setLoaded(true); });
    }
  }, [configured, loaded]);

  const submitProposal = async () => {
    if (!proposalTitle.trim()) return addLog("Proposal title required", "err");
    const localProposal = { id: Date.now(), title: proposalTitle, description: proposalDesc, proposal_type: proposalType, status: "GENERATED", created_at: new Date().toISOString(), target_id: selDoc?.id };
    if (gwApiKey) {
      try {
        const result = await gravityWell.propose({ apiKey: gwApiKey, title: proposalTitle, description: proposalDesc, proposalType, targetId: selDoc?.id || null, targetType: selDoc ? "document" : null, submittedBy: "MANUS" });
        const saved = result.data?.[0] || localProposal;
        setProposals(p => [saved, ...p]);
        addLog(`Proposal submitted via GW: ${proposalTitle.slice(0, 40)}`, "sys");
        setProposalTitle(""); setProposalDesc(""); return;
      } catch (e) { addLog(`GW proposal error: ${e.message} — saving locally`, "err"); }
    }
    addLog("No GW key — proposal recorded in session only", "sys");
    setProposals(p => [...p, localProposal]);
    setProposalTitle(""); setProposalDesc("");
  };

  const recordAttestation = async () => {
    if (!witnessContent.trim()) return addLog("Attestation content required", "err");
    const localAction = { witness: witnessName, action_type: "attest", target_id: selDoc?.id || null, target_type: selDoc ? "document" : "general", content: witnessContent, id: Date.now(), created_at: new Date().toISOString() };
    if (gwApiKey) {
      try {
        const result = await gravityWell.attest({ apiKey: gwApiKey, witness: witnessName, targetId: selDoc?.id || null, targetType: selDoc ? "document" : "general", content: witnessContent });
        const saved = result.data?.[0] || localAction;
        setActions(a => [saved, ...a]);
        addLog(`${witnessName} attestation recorded via GW`, "sys");
        setWitnessContent(""); return;
      } catch (e) { addLog(`GW attestation error: ${e.message} — saving locally`, "err"); }
    }
    addLog("No GW key — attestation recorded in session only", "sys");
    setActions(a => [localAction, ...a]);
    setWitnessContent("");
  };

  const tabs = [{ id: "ACTIONS", label: "ACTIONS" }, { id: "REVIEW", label: "REVIEW" }, { id: "AMEND", label: "AMEND" }, { id: "LEDGER", label: "LEDGER" }];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, marginTop: 14 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", flex: 1 }}>GOVERNANCE ACTIONS</div>
        {tabs.map(t => <span key={t.id} onClick={() => setGovTab(t.id)} style={{ fontSize: 7, padding: "1px 5px", fontFamily: "monospace", color: govTab === t.id ? mc : "#3a4a3a", border: `1px solid ${govTab === t.id ? mc + "44" : "#0f1a0f"}`, cursor: "pointer" }}>{t.label}</span>)}
        {!configured && <span style={{ fontSize: 7, color: "#9f7a4a", fontFamily: "monospace" }}>session-only</span>}
      </div>

      {govTab === "ACTIONS" && <>
        {/* Submit proposal */}
        <div style={{ marginBottom: 10, padding: "6px 8px", background: "#060a06", borderLeft: `2px solid ${mc}22` }}>
          <div style={{ fontSize: 8, color: "#3a4a3a", letterSpacing: 1, marginBottom: 4 }}>SUBMIT PROPOSAL</div>
          <select value={proposalType} onChange={(e) => setProposalType(e.target.value)} style={{ background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", fontSize: 9, fontFamily: "monospace", marginBottom: 4, padding: "3px 6px", outline: "none" }}>
            {["general", "status_promotion", "new_room", "new_relation", "amendment", "deposit"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={proposalTitle} onChange={(e) => setProposalTitle(e.target.value)} placeholder="Proposal title" style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "4px 8px", fontSize: 9, fontFamily: "monospace", outline: "none", marginBottom: 4 }} />
          <input value={proposalDesc} onChange={(e) => setProposalDesc(e.target.value)} placeholder="Description (optional)" style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "4px 8px", fontSize: 9, fontFamily: "monospace", outline: "none", marginBottom: 4 }} />
          {selDoc && <div style={{ fontSize: 7, color: "#3a4a3a", marginBottom: 4 }}>Target: {selDoc.t.slice(0, 50)}</div>}
          <button onClick={submitProposal} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "4px 10px", fontSize: 8, cursor: "pointer", fontFamily: "monospace" }}>SUBMIT</button>
        </div>

        {/* Record attestation */}
        <div style={{ marginBottom: 10, padding: "6px 8px", background: "#060a06", borderLeft: `2px solid ${mc}22` }}>
          <div style={{ fontSize: 8, color: "#3a4a3a", letterSpacing: 1, marginBottom: 4 }}>WITNESS ATTESTATION</div>
          <select value={witnessName} onChange={(e) => setWitnessName(e.target.value)} style={{ background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", fontSize: 9, fontFamily: "monospace", marginBottom: 4, padding: "3px 6px", outline: "none" }}>
            {["TACHYON", "LABOR", "PRAXIS", "ARCHIVE", "SOIL", "TECHNE", "SURFACE"].map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          <input value={witnessContent} onChange={(e) => setWitnessContent(e.target.value)} placeholder="Attestation content" style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "4px 8px", fontSize: 9, fontFamily: "monospace", outline: "none", marginBottom: 4 }} />
          <button onClick={recordAttestation} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "4px 10px", fontSize: 8, cursor: "pointer", fontFamily: "monospace" }}>ATTEST</button>
        </div>

        {/* Recent proposals */}
        {proposals.length > 0 && <>
          <div style={{ fontSize: 8, color: "#3a4a3a", letterSpacing: 1, marginBottom: 4 }}>PROPOSALS ({proposals.length})</div>
          {proposals.slice(0, 8).map(p => (
            <div key={p.id} style={{ padding: "3px 0", borderBottom: "1px solid #060a06", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontSize: 9, color: "#5a6a4a" }}>{(p.title || "").slice(0, 50)}</div><div style={{ fontSize: 7, color: "#3a4a3a", fontFamily: "monospace" }}>{p.proposal_type} · {(p.created_at || "").slice(0, 10)}</div></div>
              <StatusBadge s={p.status} />
            </div>
          ))}
        </>}
      </>}

      {govTab === "REVIEW" && <>
        <div style={{ fontSize: 8, color: "#3a4a3a", letterSpacing: 1, marginBottom: 6 }}>ASSEMBLY REVIEW QUEUE</div>
        <div style={{ fontSize: 9, color: "#5a6a4a", lineHeight: 1.5, marginBottom: 8 }}>Proposals awaiting substrate review. Each proposal needs ≥4/7 witness attestations for promotion.</div>
        {proposals.filter(p => p.status === "GENERATED" || p.status === "QUEUED" || p.status === "PROVISIONAL").length === 0 ? (
          <div style={{ fontSize: 9, color: "#3a4a3a", padding: "8px 0" }}>No proposals pending review. Submit proposals from the ACTIONS tab.</div>
        ) : (
          proposals.filter(p => p.status === "GENERATED" || p.status === "QUEUED" || p.status === "PROVISIONAL").map(p => (
            <div key={p.id} style={{ padding: "6px 8px", marginBottom: 6, background: "#060a06", borderLeft: `2px solid ${mc}22` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: mc }}>{(p.title || "").slice(0, 45)}</span>
                <StatusBadge s={p.status} />
              </div>
              <div style={{ fontSize: 7, color: "#3a4a3a", fontFamily: "monospace", marginBottom: 4 }}>{p.proposal_type} · {(p.created_at || "").slice(0, 10)}</div>
              <div style={{ fontSize: 8, color: "#3a4a3a", marginBottom: 4 }}>SUBSTRATE ASSIGNMENTS</div>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {["TACHYON", "LABOR", "PRAXIS", "ARCHIVE", "TECHNE", "SURFACE"].map(w => {
                  const voted = (p.votes || []).some(v => v.witness === w);
                  return <span key={w} style={{ fontSize: 7, padding: "1px 4px", fontFamily: "monospace", color: voted ? "#5a9f5a" : "#2a3a2a", border: `1px solid ${voted ? "#5a9f5a33" : "#0f1a0f"}` }}>{voted ? "✓" : "○"} {w}</span>;
                })}
              </div>
            </div>
          ))
        )}
      </>}

      {govTab === "AMEND" && <>
        <div style={{ fontSize: 8, color: "#3a4a3a", letterSpacing: 1, marginBottom: 6 }}>CONSTITUTIONAL AMENDMENTS</div>
        <div style={{ fontSize: 9, color: "#5a6a4a", lineHeight: 1.5, marginBottom: 8 }}>Track proposed, reviewed, and ratified amendments to the Hexagon Interface Constitution (DOI: 10.5281/zenodo.19355075).</div>
        {proposals.filter(p => p.proposal_type === "amendment").length === 0 ? (
          <div style={{ fontSize: 9, color: "#3a4a3a", padding: "8px 0" }}>No amendments proposed. Submit an amendment from the ACTIONS tab (type: amendment).</div>
        ) : (
          proposals.filter(p => p.proposal_type === "amendment").map(p => (
            <div key={p.id} style={{ padding: "4px 0", borderBottom: "1px solid #060a06", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 9, color: mc }}>{(p.title || "").slice(0, 50)}</div>
                <div style={{ fontSize: 7, color: "#3a4a3a", fontFamily: "monospace" }}>{(p.created_at || "").slice(0, 10)} · {p.submitted_by || "MANUS"}</div>
              </div>
              <StatusBadge s={p.status} />
            </div>
          ))
        )}
        <div style={{ marginTop: 10, fontSize: 8, color: "#3a4a3a", fontFamily: "Georgia,serif", lineHeight: 1.5 }}>Constitutional amendments require CRITICAL risk authorization (MANUS + AUDIT mode) and ≥5/7 witness quorum.</div>
      </>}

      {govTab === "LEDGER" && <>
        <div style={{ fontSize: 8, color: "#3a4a3a", letterSpacing: 1, marginBottom: 4 }}>WITNESS ACTION LEDGER (append-only)</div>
        {actions.length === 0 ? <div style={{ fontSize: 9, color: "#3a4a3a" }}>No witness actions recorded{configured ? "" : " (connect Supabase for persistence)"}.</div> : (
          actions.slice(0, 20).map(a => (
            <div key={a.id} style={{ padding: "3px 0", borderBottom: "1px solid #060a06" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 8, color: mc, fontFamily: "monospace", width: 60, flexShrink: 0 }}>{a.witness}</span>
                <span style={{ fontSize: 8, color: "#5a6a4a", fontFamily: "monospace" }}>{a.action_type}</span>
                <span style={{ fontSize: 7, color: "#3a4a3a", marginLeft: "auto" }}>{(a.created_at || "").slice(0, 16)}</span>
              </div>
              {a.content && <div style={{ fontSize: 8, color: "#4a5a4a", paddingLeft: 66 }}>{a.content.slice(0, 80)}</div>}
            </div>
          ))
        )}
      </>}
    </div>
  );
}

function ZenodoDeposit({ mc, addLog, isMobile }) {
  const [zToken, setZToken] = useState("");
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [desc, setDesc] = useState("");
  const [keywords, setKeywords] = useState("");
  const [version, setVersion] = useState("v1.0");
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setFileContent(ev.target.result);
    reader.readAsText(file);
  };

  const deposit = async () => {
    if (!zToken.trim()) return addLog("Zenodo token required", "err");
    if (!title.trim()) return addLog("Title required", "err");
    if (!fileContent && !fileName) return addLog("File required", "err");
    setDepositing(true); setResult(null);
    try {
      addLog("ZENODO: creating deposit…", "sys");
      const headers = { "Authorization": `Bearer ${zToken}`, "Content-Type": "application/json" };
      // 1. Create
      const createRes = await fetch("https://zenodo.org/api/deposit/depositions", { method: "POST", headers, body: JSON.stringify({}) });
      const createData = await createRes.json();
      if (!createData.id) throw new Error(createData.message || "Create failed");
      const depId = createData.id;
      const bucket = createData.links.bucket;
      addLog(`ZENODO: deposit ${depId} created`, "sys");

      // 2. Upload file
      const uploadName = fileName || `${title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60)}.md`;
      const blob = new Blob([fileContent], { type: "application/octet-stream" });
      const uploadRes = await fetch(`${bucket}/${encodeURIComponent(uploadName)}`, {
        method: "PUT", headers: { "Authorization": `Bearer ${zToken}`, "Content-Type": "application/octet-stream" }, body: blob
      });
      if (!uploadRes.ok) throw new Error("File upload failed");
      addLog(`ZENODO: uploaded ${uploadName}`, "sys");

      // 3. Set metadata
      const kw = keywords.split(",").map(k => k.trim()).filter(Boolean);
      const meta = {
        metadata: {
          title, upload_type: "publication", publication_type: "technicalnote",
          description: desc || title, version,
          creators: [{ name: creator.trim() || "Anonymous" }],
          access_right: "open", license: "cc-by-sa-4.0",
          keywords: kw.length > 0 ? kw : ["Crimson Hexagonal Archive"],
          language: "eng",
        }
      };
      const metaRes = await fetch(`https://zenodo.org/api/deposit/depositions/${depId}`, { method: "PUT", headers, body: JSON.stringify(meta) });
      if (!metaRes.ok) { const err = await metaRes.json(); throw new Error(err.message || "Metadata failed"); }
      addLog("ZENODO: metadata set", "sys");

      // 4. Publish
      const pubRes = await fetch(`https://zenodo.org/api/deposit/depositions/${depId}/actions/publish`, { method: "POST", headers: { "Authorization": `Bearer ${zToken}` } });
      const pubData = await pubRes.json();
      if (pubData.state !== "done") throw new Error(pubData.message || "Publish failed");
      addLog(`ZENODO: PUBLISHED · DOI ${pubData.doi}`, "sys");
      setResult({ doi: pubData.doi, id: pubData.id, url: pubData.links?.record_html });
    } catch (e) {
      addLog(`ZENODO ERROR: ${e.message}`, "err");
      setResult({ error: e.message });
    }
    setDepositing(false);
  };

  return (
    <div>
      <div style={{ fontSize: 10, color: "#5a6a4a", lineHeight: 1.6, marginBottom: 10 }}>Deposit directly to Zenodo under your own account. You need a free Zenodo account and a personal access token (zenodo.org → Settings → Applications → Personal access tokens → New token with deposit:write scope). Token stays in your browser — never sent anywhere except Zenodo.</div>
      <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#3a4a3a" }}>ZENODO TOKEN</div>
      <input value={zToken} onChange={(e) => setZToken(e.target.value)} type="password" placeholder="Zenodo personal access token" style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: "monospace", outline: "none", marginBottom: 10 }} />
      <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#3a4a3a" }}>TITLE</div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title (EA-XX-01)" style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: "monospace", outline: "none", marginBottom: 10 }} />
      <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#3a4a3a" }}>CREATOR (Last, First)</div>
      <input value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="Your name for Zenodo metadata" style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: "monospace", outline: "none", marginBottom: 10 }} />
      <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#3a4a3a" }}>DESCRIPTION</div>
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="HTML description for Zenodo" rows={3} style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: "monospace", outline: "none", marginBottom: 10, resize: "vertical" }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}><div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>VERSION</div><input value={version} onChange={(e) => setVersion(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: "monospace", outline: "none" }} /></div>
        <div style={{ flex: 2 }}><div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>KEYWORDS (comma-separated)</div><input value={keywords} onChange={(e) => setKeywords(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: "monospace", outline: "none" }} /></div>
      </div>
      <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#3a4a3a" }}>FILE</div>
      <input type="file" onChange={handleFile} style={{ fontSize: 9, color: "#5a6a4a", marginBottom: 4 }} />
      {fileName && <div style={{ fontSize: 8, color: "#3a4a3a", fontFamily: "monospace", marginBottom: 10 }}>{fileName} ({fileContent.length} chars)</div>}
      <button onClick={deposit} disabled={depositing} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "8px 14px", fontSize: 10, cursor: depositing ? "wait" : "pointer", fontFamily: "monospace", letterSpacing: 1, marginBottom: 12, width: "100%" }}>
        {depositing ? "DEPOSITING…" : "CREATE → UPLOAD → PUBLISH"}
      </button>
      {result && !result.error && (
        <div style={{ padding: "8px 10px", background: "#060a06", borderLeft: "2px solid #5a9f5a22", marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: "#5a9f5a", fontFamily: "monospace", marginBottom: 4 }}>PUBLISHED</div>
          <div style={{ fontSize: 9, color: mc, fontFamily: "monospace", wordBreak: "break-all" }}>DOI: {result.doi}</div>
          <div style={{ fontSize: 8, color: "#3a4a3a", fontFamily: "monospace" }}>{result.url}</div>
        </div>
      )}
      {result?.error && <div style={{ padding: "8px 10px", background: "#120808", borderLeft: "2px solid #7a1a1a", fontSize: 9, color: "#b57a7a", wordBreak: "break-word" }}>{result.error}</div>}
    </div>
  );
}

function DepositPanel({ apiKey, setApiKey, configured, selectedDoc, selectedRoom, depositState, setDepositState, addLog, isMobile, data, mc }) {
  const [chainLabel, setChainLabel] = useState("");
  const [dashTab, setDashTab] = useState("PENDING");
  const [dreamResult, setDreamResult] = useState(null);
  const suggestion = selectedDoc ? `doc-${selectedDoc.id}` : selectedRoom ? `room-${selectedRoom.id}` : "hexagon-session";
  useEffect(() => { if (!chainLabel) setChainLabel(suggestion); }, [suggestion, chainLabel]);
  const createChain = async () => {
    if (!configured) return addLog("Gravity Well URL not configured", "err");
    if (!apiKey.trim()) return addLog("Gravity Well API key required", "err");
    try { const result = await gravityWell.createChain({ apiKey, label: chainLabel, metadata: { source: "crimson-hexagonal-interface" } }); setDepositState((p) => ({ ...p, chain: result, error: null })); addLog(`GW chain created: ${String(result.chain_id || "").slice(0, 8)}…`, "gw"); }
    catch (e) { setDepositState((p) => ({ ...p, error: e.message })); addLog(`GW error: ${e.message}`, "err"); }
  };

  // Compute dashboard data
  const stats = useMemo(() => {
    if (!data) return null;
    const roomCounts = {};
    const roomNames = {};
    data.rooms.forEach(r => { roomCounts[r.id] = 0; roomNames[r.id] = r.name; });
    data.documents.forEach(doc => { (doc.r || []).forEach(rid => { roomCounts[rid] = (roomCounts[rid] || 0) + 1; }); });
    const emptyRooms = data.rooms.filter(r => (roomCounts[r.id] || 0) === 0);
    const provRelations = data.relations.filter(r => r.status === "PROVISIONAL");
    const months = {};
    data.documents.forEach(doc => { const d = doc.d || ""; if (d.length >= 7) months[d.slice(0, 7)] = (months[d.slice(0, 7)] || 0) + 1; });
    const sortedRooms = [...data.rooms].sort((a, b) => (roomCounts[b.id] || 0) - (roomCounts[a.id] || 0));
    const maxCount = Math.max(...Object.values(roomCounts), 1);
    return { roomCounts, roomNames, emptyRooms, provRelations, months, sortedRooms, maxCount };
  }, [data]);

  const tabs = [{ id: "PENDING", label: "PENDING" }, { id: "COVERAGE", label: "COVERAGE" }, { id: "ZENODO", label: "ZENODO" }, { id: "SYNC", label: "SYNC" }, { id: "DREAM", label: "DREAM" }, { id: "GRAVITY", label: "GW" }];

  return (
    <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>DEPOSIT DASHBOARD</div>
      <div style={{ fontSize: isMobile ? 16 : 18, letterSpacing: 3, color: mc, fontFamily: "Georgia,serif", marginBottom: 8 }}>Archive Operations</div>

      {/* Stats row */}
      {stats && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          {[[data.documents.length, "deposits"], [data.rooms.length, "rooms"], [data.relations.length, "relations"], [stats.emptyRooms.length, "empty rooms"], [stats.provRelations.length, "provisional"]].map(([n, label], i) => (
            <div key={i} style={{ fontSize: 9, fontFamily: "monospace" }}>
              <span style={{ color: mc, fontSize: 12 }}>{n}</span>
              <span style={{ color: "#3a4a3a", marginLeft: 3 }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, borderBottom: "1px solid #0f1a0f", paddingBottom: 6 }}>
        {tabs.map(t => (
          <span key={t.id} onClick={() => setDashTab(t.id)} style={{ fontSize: 8, letterSpacing: 1, fontFamily: "monospace", color: dashTab === t.id ? mc : "#3a4a3a", cursor: "pointer", padding: "2px 6px", borderBottom: dashTab === t.id ? `1px solid ${mc}` : "1px solid transparent" }}>{t.label}</span>
        ))}
      </div>

      {/* PENDING tab */}
      {dashTab === "PENDING" && stats && (
        <div>
          {/* Empty rooms */}
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>EMPTY ROOMS ({stats.emptyRooms.length})</div>
          {stats.emptyRooms.length === 0 ? <div style={{ fontSize: 9, color: "#5a9f5a", marginBottom: 10 }}>All rooms have deposits.</div> : (
            <div style={{ marginBottom: 12 }}>
              {stats.emptyRooms.map(r => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #0a0f0a" }}>
                  <span style={{ fontSize: 9, color: mc, fontFamily: "Georgia,serif" }}>{r.name}</span>
                  <span style={{ fontSize: 8, color: "#3a4a3a", fontFamily: "monospace" }}>{r.id} · {r.preferred_mode || "—"}</span>
                </div>
              ))}
            </div>
          )}

          {/* Provisional relations */}
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>PROVISIONAL RELATIONS ({stats.provRelations.length})</div>
          {stats.provRelations.length === 0 ? <div style={{ fontSize: 9, color: "#5a9f5a", marginBottom: 10 }}>All relations ratified.</div> : (
            <div style={{ marginBottom: 12 }}>
              {stats.provRelations.map(r => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", borderBottom: "1px solid #0a0f0a" }}>
                  <span style={{ fontSize: 9, color: "#5a6a4a", fontFamily: "monospace" }}>
                    {r.from} <span style={{ color: mc }}>{r.type}</span> {r.to}
                  </span>
                  <StatusBadge s="PROVISIONAL" />
                </div>
              ))}
            </div>
          )}

          {/* Monthly velocity */}
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>MONTHLY VELOCITY</div>
          <div style={{ marginBottom: 12 }}>
            {Object.entries(stats.months).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, count]) => (
              <div key={month} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
                <span style={{ fontSize: 8, color: "#3a4a3a", fontFamily: "monospace", width: 50, flexShrink: 0 }}>{month}</span>
                <div style={{ flex: 1, height: 6, background: "#0a0f0a", position: "relative" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (count / 210) * 100)}%`, background: mc + "66" }} />
                </div>
                <span style={{ fontSize: 8, color: mc, fontFamily: "monospace", width: 24, textAlign: "right", flexShrink: 0 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COVERAGE tab */}
      {dashTab === "COVERAGE" && stats && (
        <div>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>ROOM DEPOSIT COVERAGE</div>
          {stats.sortedRooms.map(r => {
            const count = stats.roomCounts[r.id] || 0;
            const pct = (count / stats.maxCount) * 100;
            const col = count === 0 ? "#9f5a5a" : count <= 3 ? "#9f9f5a" : mc;
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0", borderBottom: "1px solid #060a06" }}>
                <span style={{ fontSize: 7, color: "#3a4a3a", fontFamily: "monospace", width: 28, flexShrink: 0 }}>{r.id}</span>
                <span style={{ fontSize: 8, color: count === 0 ? "#4a3a3a" : "#5a6a4a", fontFamily: "Georgia,serif", width: isMobile ? 80 : 110, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                <div style={{ flex: 1, height: 5, background: "#0a0f0a", position: "relative" }}>
                  <div style={{ height: "100%", width: `${Math.max(count > 0 ? 2 : 0, pct)}%`, background: col + "88" }} />
                </div>
                <span style={{ fontSize: 7, color: col, fontFamily: "monospace", width: 22, textAlign: "right", flexShrink: 0 }}>{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ZENODO DEPOSIT tab */}
      {dashTab === "ZENODO" && (
        <ZenodoDeposit mc={mc} addLog={addLog} isMobile={isMobile} />
      )}

      {/* SYNC tab — Zenodo live pull */}
      {dashTab === "SYNC" && (
        <div>
          <div style={{ fontSize: 10, color: "#5a6a4a", lineHeight: 1.6, marginBottom: 10 }}>Fetch recent deposits from Zenodo. Shows deposits not yet in canonical JSON.</div>
          <button onClick={async () => {
            addLog("Fetching from Zenodo API...", "sys");
            try {
              const existingDois = new Set(data.documents.map(d => d.doi).filter(Boolean));
              const r = await fetch(`https://zenodo.org/api/records/?q=creators.name:"Sharks, Lee"&size=50&sort=mostrecent`);
              const j = await r.json();
              const hits = j.hits?.hits || [];
              const newDeps = hits.filter(h => !existingDois.has(h.doi));
              const syncData = { total: j.hits?.total || 0, fetched: hits.length, new: newDeps.length, existing: hits.length - newDeps.length, deposits: newDeps };
              window.__syncResult = syncData;
              addLog(`Zenodo: ${syncData.total} total, ${syncData.fetched} fetched, ${syncData.new} NEW (not in JSON)`, syncData.new > 0 ? "warn" : "sys");
              // Force re-render
              document.getElementById("sync-results")?.setAttribute("data-count", syncData.new);
            } catch (e) { addLog(`Zenodo fetch error: ${e.message}`, "err"); }
          }} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "6px 12px", fontSize: 9, cursor: "pointer", fontFamily: "monospace", letterSpacing: 1, marginBottom: 12, width: "100%" }}>FETCH RECENT DEPOSITS</button>
          <div style={{ fontSize: 9, color: "#3a4a3a", marginBottom: 8 }}>Community total: {data.documents.length} in JSON · {data.meta?.total_deposits || "?"} claimed</div>
          <div id="sync-results" style={{ fontSize: 8, color: "#4a5a4a" }}>Press FETCH to compare against Zenodo API. New deposits will appear below.</div>
        </div>
      )}

      {/* DREAM tab */}
      {dashTab === "DREAM" && stats && (
        <div>
          <div style={{ fontSize: 10, color: "#5a6a4a", lineHeight: 1.6, marginBottom: 10 }}>Archive consolidation scan. Checks data integrity, orphaned relations, room coverage, excerpt sizes, LP program coverage.</div>
          <button onClick={() => { const result = runDream(data); setDreamResult(result); addLog(`DREAM: ${result.issues.length} issues found`, result.issues.length > 0 ? "err" : "sys"); }} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "6px 12px", fontSize: 9, cursor: "pointer", fontFamily: "monospace", letterSpacing: 1, marginBottom: 12, width: "100%" }}>RUN CONSOLIDATION SCAN</button>
          {dreamResult && (
            <div>
              <div style={{ padding: "6px 8px", background: "#060a06", borderLeft: `2px solid ${dreamResult.issues.length === 0 ? "#5a9f5a" : "#9f5a5a"}22`, marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: dreamResult.issues.length === 0 ? "#5a9f5a" : "#9f5a5a", fontFamily: "monospace", marginBottom: 4 }}>{dreamResult.issues.length === 0 ? "CLEAN — no issues detected" : `${dreamResult.issues.length} ISSUES FOUND`}</div>
                <div style={{ fontSize: 8, color: "#3a4a3a", fontFamily: "monospace" }}>{dreamResult.stats.timestamp} · {dreamResult.stats.rooms} rooms · {dreamResult.stats.documents} docs · {dreamResult.stats.relations} rels</div>
              </div>
              {dreamResult.issues.map((issue, i) => (
                <div key={i} style={{ display: "flex", gap: 6, padding: "3px 0", borderBottom: "1px solid #0a0f0a", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 7, padding: "1px 3px", fontFamily: "monospace", color: RISK_COLORS[issue.severity] || "#5a5a3a", border: `1px solid ${RISK_COLORS[issue.severity] || "#333"}44`, flexShrink: 0 }}>{issue.severity}</span>
                  <span style={{ fontSize: 8, color: "#5a6a4a", fontFamily: "monospace" }}>{issue.msg}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GRAVITY WELL tab */}
      {dashTab === "GRAVITY" && (
        <div>
          <div style={{ fontSize: isMobile ? 14 : 16, letterSpacing: 3, color: mc, fontFamily: "Georgia,serif", marginBottom: 8 }}>Gravity Well Bridge</div>
          <div style={{ fontSize: 10, color: "#5a6a4a", lineHeight: 1.6, marginBottom: 12 }}>Provenance engine. Create API keys, chains, invoke rooms, route governance.</div>
          <div style={{ marginBottom: 12, padding: "8px 10px", background: "#080c08", borderLeft: "2px solid #1a3a1a" }}>
            <div style={{ fontSize: 9, color: configured ? "#5a9f5a" : "#9f7a4a", marginBottom: 4, fontFamily: "monospace", wordBreak: "break-word" }}>{configured ? `GW URL: ${gravityWell.baseUrl}` : "VITE_GRAVITY_WELL_URL not set"}</div>
            <div style={{ fontSize: 9, color: "#4a5a4a" }}>Source: {selectedDoc ? `doc ${selectedDoc.id}` : selectedRoom ? `room ${selectedRoom.id}` : "none"}</div>
          </div>

          {/* Create API Key */}
          {!apiKey && (
            <div style={{ marginBottom: 12, padding: "6px 8px", background: "#060a06", borderLeft: `2px solid ${mc}22` }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>CREATE API KEY</div>
              <div style={{ fontSize: 8, color: "#4a5a4a", marginBottom: 4 }}>Enter your GW admin token to generate an API key.</div>
              <div style={{ display: "flex", gap: 4 }}>
                <input id="gw-admin-token" type="password" placeholder="ADMIN_TOKEN" style={{ flex: 1, background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "4px 8px", fontSize: 9, fontFamily: "monospace", outline: "none" }} />
                <button onClick={async () => {
                  const token = document.getElementById("gw-admin-token")?.value;
                  if (!token) return addLog("Admin token required", "err");
                  try {
                    const res = await fetch(`${gravityWell.baseUrl}/v1/admin/keys/create`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "X-Admin-Token": token },
                      body: JSON.stringify({ label: "hexagon-interface" }),
                    });
                    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
                    const data = await res.json();
                    const newKey = data.api_key || data.key;
                    if (newKey) { setApiKey(newKey); addLog(`GW API key created: ${newKey.slice(0, 12)}…`, "sys"); }
                    else { addLog("Key created but no key returned — check GW response", "err"); }
                  } catch (e) { addLog(`Key creation error: ${e.message}`, "err"); }
                }} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "4px 10px", fontSize: 8, cursor: "pointer", fontFamily: "monospace" }}>CREATE</button>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#3a4a3a" }}>API KEY</div>
          <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Gravity Well API key" style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: "monospace", outline: "none", marginBottom: 12 }} />
          <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#3a4a3a" }}>CHAIN LABEL</div>
          <input value={chainLabel} onChange={(e) => setChainLabel(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: "monospace", outline: "none", marginBottom: 10 }} />
          <button onClick={createChain} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "6px 10px", fontSize: 9, cursor: "pointer", fontFamily: "monospace", marginBottom: 12 }}>CREATE CHAIN</button>
          {depositState.chain && <div style={{ padding: "8px 10px", background: "#080c08", borderLeft: "2px solid #1a3a1a", marginBottom: 12 }}><div style={{ fontSize: 9, color: "#5a9f5a", fontFamily: "monospace", marginBottom: 4 }}>CHAIN READY</div><div style={{ fontSize: 9, color: "#4a5a4a", wordBreak: "break-word" }}>chain_id: {depositState.chain.chain_id}</div></div>}

          {/* Deep deposit: capture + deposit via GW */}
          {depositState.chain && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 6 }}>DEEP DEPOSIT (GW → Zenodo)</div>
              {selectedDoc ? (
                <div>
                  <div style={{ fontSize: 9, color: "#5a6a4a", marginBottom: 6 }}>Target: {selectedDoc.t?.slice(0, 50)}</div>
                  <button onClick={async () => {
                    try {
                      addLog("GW: capturing document…", "gw");
                      const captureResult = await gravityWell.capture({
                        apiKey, chainId: depositState.chain.chain_id,
                        content: `# ${selectedDoc.t}\n\n${selectedDoc.e || ""}`,
                        contentType: "markdown",
                        metadata: { doi: selectedDoc.doi, rooms: selectedDoc.r, status: selectedDoc.s },
                        platformSource: "crimson-hexagonal-interface",
                        externalId: selectedDoc.id,
                      });
                      addLog(`GW: captured (γ=${captureResult.gamma})`, "gw");
                      addLog("GW: depositing to Zenodo…", "gw");
                      const depositResult = await gravityWell.deposit({
                        apiKey, chainId: depositState.chain.chain_id,
                        narrativeSummary: `Deep deposit of ${selectedDoc.t}`,
                        depositMetadata: { title: selectedDoc.t, description: selectedDoc.e?.slice(0, 200) || selectedDoc.t },
                      });
                      addLog(`GW: deposited → DOI ${depositResult.doi || "pending"}`, "gw");
                      setDepositState(p => ({ ...p, lastDeposit: depositResult }));
                    } catch (e) { addLog(`GW deposit error: ${e.message}`, "err"); }
                  }} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "6px 10px", fontSize: 9, cursor: "pointer", fontFamily: "monospace", width: "100%" }}>
                    CAPTURE + DEPOSIT VIA GRAVITY WELL
                  </button>
                  {depositState.lastDeposit?.doi && <div style={{ padding: "6px 8px", marginTop: 6, background: "#080c08", borderLeft: "2px solid #1a3a1a" }}><div style={{ fontSize: 9, color: "#5a9f5a", fontFamily: "monospace" }}>DOI: {depositState.lastDeposit.doi}</div></div>}
                </div>
              ) : (
                <div style={{ fontSize: 9, color: "#3a4a3a" }}>Select a document from the hex map to deep-deposit via GW.</div>
              )}
            </div>
          )}
          {depositState.error && <div style={{ padding: "8px 10px", background: "#120808", borderLeft: "2px solid #7a1a1a", fontSize: 9, color: "#b57a7a", marginBottom: 12, wordBreak: "break-word" }}>{depositState.error}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Main ───

export default function HexagonInterfaceResponsive() {
  const isMobile = useIsMobile(900);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState(null);
  const [selRoom, setSelRoom] = useState(null);
  const [selDoc, setSelDoc] = useState(null);
  const [compareDoc, setCompareDoc] = useState(null);
  const [view, setView] = useState("MAP");
  const [search, setSearch] = useState("");
  const [log, setLog] = useState([]);
  const [gwApiKey, setGwApiKeyRaw] = useState(() => { try { return localStorage?.getItem?.("gw_api_key") || ""; } catch { return ""; } });
  const setGwApiKey = (v) => { setGwApiKeyRaw(v); try { localStorage?.setItem?.("gw_api_key", v); } catch {} };
  const [depositState, setDepositState] = useState({ chain: null, error: null });
  // LP state
  const [lp, setLp] = useState(initLP());
  const [tSteps, setTSteps] = useState([]);
  const [tIdx, setTIdx] = useState(-1);
  const [mantle, setMantle] = useState(null);
  const [arkMode, setArkMode] = useState(null);
  const tTimer = useRef(null);
  // Reading state
  const [readState, setReadState] = useState({ doi: null, text: null, loading: false, error: null, filename: null, size: 0 });
  // Trail state
  const [trail, setTrail] = useState({ name: "", docs: [], position: -1 });
  const [libMode, setLibMode] = useState("SEARCH"); // SEARCH | TRAIL

  const addLog = useCallback((msg, type = "sys") => { setLog((p) => [...p.slice(-50), { msg, type, t: new Date().toISOString().slice(11, 19) }]); }, []);

  const handleRead = useCallback(async (doi) => {
    if (!doi) { setReadState({ doi: null, text: null, loading: false, error: null, filename: null, size: 0 }); return; }
    setReadState({ doi, text: null, loading: true, error: null, filename: null, size: 0 });
    addLog(`ZENODO: fetching ${doi}`, "sys");
    try {
      const result = await fetchZenodoMarkdown(doi);
      if (result.text) {
        setReadState({ doi, text: result.text, loading: false, error: null, filename: result.filename, size: result.size });
        addLog(`ZENODO: ${result.filename} (${(result.size / 1024).toFixed(1)}KB)`, "sys");
      } else {
        const fileList = result.files.map(f => f.key).join(", ");
        setReadState({ doi, text: null, loading: false, error: `No .md file found. Available: ${fileList || "none"}`, filename: null, size: 0 });
        addLog(`ZENODO: no markdown — files: ${fileList}`, "err");
      }
    } catch (e) {
      setReadState({ doi, text: null, loading: false, error: e.message, filename: null, size: 0 });
      addLog(`ZENODO error: ${e.message}`, "err");
    }
  }, [addLog]);

  const executeTraversal = useCallback((room) => {
    if (!room.lp_program || room.lp_program.length === 0) { addLog(`→ ${room.name} (no LP program)`, "traverse"); return; }
    if (tTimer.current) clearInterval(tTimer.current);
    const steps = room.lp_program;
    setTSteps(steps); setTIdx(0);
    let st = initLP(); setLp(st);
    setMantle(room.mantle); setArkMode(room.preferred_mode);
    addLog(`→ ${room.name} · TRAVERSAL`, "lp");
    let idx = 0;
    const tick = () => {
      if (idx >= steps.length) { clearInterval(tTimer.current); tTimer.current = null; addLog(`✓ ${room.name} · ${room.preferred_mode}`, "lp"); return; }
      const step = steps[idx];
      st = lpStep(st, step); setLp({ ...st }); setTIdx(idx + 1);
      addLog(`  ${LP_STEP_LABELS[step.step] || step.step}: ${step.value.length > 40 ? step.value.slice(0, 37) + "…" : step.value}`, "lp");
      idx++;
    };
    tick();
    tTimer.current = setInterval(tick, 200);
  }, [addLog]);

  useEffect(() => () => { if (tTimer.current) clearInterval(tTimer.current); }, []);

  useEffect(() => {
    // Try localStorage cache first (390KB JSON, no need to refetch every load)
    const CACHE_KEY = "cha_canonical";
    const CACHE_VER_KEY = "cha_canonical_ver";
    const SCHEMA_VERSION = "1.0.0"; // bump when canonical JSON structure changes

    const cached = (() => { try { const v = localStorage?.getItem?.(CACHE_VER_KEY); if (v === SCHEMA_VERSION) { const d = localStorage?.getItem?.(CACHE_KEY); return d ? JSON.parse(d) : null; } } catch { } return null; })();

    if (cached && cached.rooms?.length > 0) {
      const rooms = (cached.rooms || []).map(normalizeRoom);
      const documents = (cached.documents || []).map(normalizeDoc);
      const relations = (cached.relations || []).map(normalizeRelation);
      const edges = (cached.edges || []).map((e, i) => ({ id: e.id || `edge-${i}`, from: e.from, to: e.to, type: e.type || "adjacent" }));
      setData({ ...cached, rooms, documents, relations, edges });
      setLoading(false);
      addLog(`H_core loaded (cached): ${rooms.length} rooms, ${documents.length} deposits, ${relations.length} relations`);
    }

    // Always fetch fresh (updates cache for next load)
    fetch(DATA_URL).then((r) => r.json()).then((d) => {
      // Schema validation
      const required = ['rooms', 'documents', 'relations', 'edges'];
      const missing = required.filter(k => !d[k] || !Array.isArray(d[k]));
      if (missing.length > 0) { if (!cached) { setError(`Schema error: missing ${missing.join(', ')}`); setLoading(false); } return; }

      const rooms = (d.rooms || []).map(normalizeRoom);
      const documents = (d.documents || []).map(normalizeDoc);
      const relations = (d.relations || []).map(normalizeRelation);
      const edges = (d.edges || []).map((e, i) => ({ id: e.id || `edge-${i}`, from: e.from, to: e.to, type: e.type || "adjacent" }));
      setData({ ...d, rooms, documents, relations, edges });
      setLoading(false);
      if (!cached) addLog(`H_core loaded: ${rooms.length} rooms, ${documents.length} deposits, ${relations.length} relations`);
      try { localStorage?.setItem?.(CACHE_KEY, JSON.stringify(d)); localStorage?.setItem?.(CACHE_VER_KEY, SCHEMA_VERSION); } catch {}
    }).catch((e) => { if (!cached) { setError(e.message); setLoading(false); } });
  }, [addLog]);

  const mc = arkMode ? (ARK_MODE_COLORS[arkMode] || MODE_COLORS[mode] || "#c9a84c") : (MODE_COLORS[mode] || "#c9a84c");
  const room = useMemo(() => data?.rooms.find((r) => r.id === selRoom) || null, [data, selRoom]);

  const handleRoomSelect = useCallback((id) => {
    setSelRoom(id); setSelDoc(null);
    const target = data?.rooms.find((r) => r.id === id);
    if (target) executeTraversal(target);
  }, [data, executeTraversal]);

  // Operator execution engine — real LP state transformations
  const OPERATOR_EFFECTS = useMemo(() => ({
    // Core operators
    "σ_S":    { name: "Sappho", ε: -0.15, ψ: 0.20, σ_transform: "dissolve",   desc: "Voice → Dissolution → Substrate" },
    "Θ":      { name: "Fixpoint", ε: -0.05, ψ: 0.10, σ_transform: "stabilize", desc: "Ontology → Ontology [Θ∘Θ=Θ]" },
    "Ω":      { name: "Revelation", ε: -0.20, ψ: 0.25, σ_transform: "recurse",  desc: "Ontology → Ontology [Ω=Θ(Ω)]" },
    "φ":      { name: "Fulfillment", ε: -0.10, ψ: 0.15, σ_transform: "test",    desc: "(Text, Text) → Bool" },
    "ψ_V":    { name: "Void Witness", ε: -0.25, ψ: 0.30, σ_transform: "attest",  desc: "Event → Attestation" },
    "β":      { name: "Blind", ε: +0.10, ψ: 0.15, σ_transform: "strip",       desc: "Context → Text [identity-stripped]" },
    "S":      { name: "Shadow", ε: 0, ψ: 0.10, σ_transform: "shadow",          desc: "H_core → S(H_core) [S∘S=id]" },
    "ICM":    { name: "Ichabod", ε: -0.30, ψ: 0.20, σ_transform: "zero",       desc: "Signal → ∅" },
    "τ_K":    { name: "Kuro Ingress", ε: -1.0, ψ: 0.35, σ_transform: "lock",   desc: "State → State [irreversible]" },
    // Extended operators
    "ψ_π":    { name: "Pareidolia", ε: +0.05, ψ: 0.10, σ_transform: "read",    desc: "Context → Hexagon Reading" },
    "OP.SWERVE": { name: "Clinamen", ε: +0.15, ψ: 0.15, σ_transform: "deviate", desc: "Trajectory → Deviated Trajectory" },
    "OP.ROUTE": { name: "Routing", ε: -0.05, ψ: 0.10, σ_transform: "route",    desc: "Object → Destination" },
    "∂":      { name: "Aorist Dagger", ε: -0.40, ψ: 0.25, σ_transform: "seal", desc: "Statement → Sealed Statement" },
    "γ":      { name: "Sharks-Function", ε: 0, ψ: 0.20, σ_transform: "recognize", desc: "Context → Bool [self-recognition]" },
    "μ":      { name: "Meta-Operator", ε: +0.10, ψ: 0.30, σ_transform: "magic", desc: "Symbol × Intent → Effect" },
    "C_ex":   { name: "Citation", ε: -0.05, ψ: 0.10, σ_transform: "cite",      desc: "Text → Citation Chain" },
    // THUMB operators
    "T.1":    { name: "Alienation", ε: -0.10, ψ: 0.15, σ_transform: "estrange", desc: "Relation → Estrangement" },
    "T.2":    { name: "Triage", ε: -0.10, ψ: 0.15, σ_transform: "classify",    desc: "Signal → Priority" },
    "T.3":    { name: "Caritas", ε: +0.05, ψ: 0.20, σ_transform: "verify_gift", desc: "Gift → Non-Extraction Proof" },
    "T.4":    { name: "Sovereignty", ε: -0.15, ψ: 0.25, σ_transform: "self_govern", desc: "System → Self-Governing" },
    "T.5":    { name: "Terminal", ε: -0.50, ψ: 0.35, σ_transform: "compress",   desc: "Architecture → Self-Contained" },
  }), []);

  const applyOperator = useCallback((op) => {
    const effect = OPERATOR_EFFECTS[op];
    setLp(prev => {
      const newε = effect ? +Math.max(0, Math.min(1, prev.ε + effect.ε)).toFixed(2) : +Math.max(0, prev.ε - 0.1).toFixed(2);
      const newψ = effect ? +(prev.ψ + effect.ψ).toFixed(2) : +(prev.ψ + 0.15).toFixed(2);
      let newσ = prev.σ;

      // σ transformations based on operator type
      if (effect?.σ_transform) {
        switch (effect.σ_transform) {
          case "dissolve": newσ = `⌁${prev.σ}⌁`; break;
          case "stabilize": newσ = prev.σ.replace(/[⌁⟪⟫†∅]/g, ""); break;
          case "recurse": newσ = `Ω(${prev.σ})`; break;
          case "test": newσ = `φ(${prev.σ}) → ?`; break;
          case "attest": newσ = `ψ_V[${prev.σ}]`; break;
          case "strip": newσ = prev.σ.replace(/[^a-zA-Z0-9\s]/g, ""); break;
          case "shadow": newσ = `S(${prev.σ})`; break;
          case "zero": newσ = "∅"; break;
          case "lock": newσ = `†${prev.σ}†`; break;
          case "seal": newσ = `⟪${prev.σ}⟫`; break;
          case "deviate": newσ = `~${prev.σ}`; break;
          case "recognize": newσ = prev.σ.includes("Sharks") || prev.σ.includes("Hexagon") ? `γ(${prev.σ})=TRUE` : `γ(${prev.σ})=FALSE`; break;
          case "compress": newσ = prev.σ.slice(0, Math.max(5, prev.σ.length / 2)) + "…"; break;
          default: break;
        }
      }

      return { σ: newσ, ε: newε, Ξ: [...prev.Ξ, op], ψ: newψ };
    });
    const desc = effect ? `${effect.name}: ${effect.desc}` : op;
    addLog(`APPLY ${op}: ${desc}`, "lp");
  }, [addLog, OPERATOR_EFFECTS]);

  const loadDocument = useCallback((doc) => {
    setSelDoc(doc);
    setLp(prev => ({ ...prev, σ: doc.t.slice(0, 60) }));
    addLog(`LOAD: ${doc.t.slice(0, 40)}`, "lp");
  }, [addLog]);

  const searchResults = useMemo(() => {
    if (!data || !search.trim()) return [];
    const q = search.toLowerCase();
    return data.documents.filter((d) => d.t.toLowerCase().includes(q) || d.k.some((k) => String(k).toLowerCase().includes(q)) || d.c.some((c) => String(c).toLowerCase().includes(q)) || String(d.e || "").toLowerCase().includes(q)).slice(0, 30);
  }, [data, search]);

  if (loading) return <div style={{ height: "100dvh", background: "#0a0d12", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia,serif" }}><div style={{ textAlign: "center" }}><svg width="48" height="48" viewBox="0 0 60 60" style={{ marginBottom: 8 }}>{[28,21,14,8].map((s,i) => <polygon key={i} points={[0,1,2,3,4,5].map(a => { const ang = Math.PI/3*a - Math.PI/6; return `${30+s*Math.cos(ang)},${30+s*Math.sin(ang)}`; }).join(" ")} fill="none" stroke="#c9a84c" strokeWidth={0.6} opacity={1 - i*0.22} />)}</svg><div style={{ fontSize: 14, letterSpacing: 4, color: "#c9a84c", marginBottom: 8 }}>CRIMSON HEXAGONAL ARCHIVE</div><div style={{ fontSize: 10, color: "#3a4a3a", letterSpacing: 2 }}>loading canonical JSON…</div></div></div>;
  if (error) return <div style={{ height: "100dvh", background: "#0a0d12", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}><div style={{ color: "#9f5a5a", fontSize: 11 }}>LOAD ERROR: {error}</div></div>;

  if (!mode) return (
    <div style={{ height: "100dvh", background: "#0a0d12", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia,serif", padding: 16 }}>
      <div style={{ textAlign: "center", maxWidth: 540 }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: "#3a4a3a", marginBottom: 4 }}>H_core · LOS · {data.meta?.total_deposits || data.documents.length} DEPOSITS</div>
        <svg width="60" height="60" viewBox="0 0 60 60" style={{ marginBottom: 8 }}>{[28,21,14,8].map((s,i) => <polygon key={i} points={[0,1,2,3,4,5].map(a => { const ang = Math.PI/3*a - Math.PI/6; return `${30+s*Math.cos(ang)},${30+s*Math.sin(ang)}`; }).join(" ")} fill="none" stroke="#c9a84c" strokeWidth={0.6} opacity={1 - i*0.22} />)}</svg>
        <div style={{ fontSize: isMobile ? 18 : 22, letterSpacing: 3, color: "#c9a84c", marginBottom: 6 }}>Crimson Hexagonal Archive</div>
        <div style={{ fontSize: 10, color: "#5a6a4a", lineHeight: 1.6, marginBottom: 6, maxWidth: 420, margin: "0 auto 6px auto" }}>A governed literary architecture. {data.documents.length} DOI-anchored deposits across {data.rooms.length} rooms, each with its own physics, mantle, and operators. Machine-traversable. Provenance-bearing.</div>
        <div style={{ fontSize: 10, color: "#3a4a3a", marginBottom: 20 }}>{data.rooms.length} rooms · {data.documents.length} indexed · {data.relations.length} relations · <a href="https://doi.org/10.5281/zenodo.19013315" target="_blank" rel="noreferrer" style={{ color: "#5a6a4a" }}>Space Ark v4.2.7</a></div>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 10 }}>SELECT MODE</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          {[["ANALYTIC", "Observe · Navigate · Trace provenance"], ["OPERATIVE", "Generate · Invoke · Transform"], ["AUDIT", "Govern · Witness · Promote"]].map(([m, desc]) => (
            <button key={m} onClick={() => { setMode(m); addLog(`Mode: ${m}`); }} style={{ background: "transparent", border: `1px solid ${MODE_COLORS[m]}44`, color: MODE_COLORS[m], padding: "14px 18px", fontSize: 11, letterSpacing: 2, cursor: "pointer", fontFamily: "monospace", textAlign: "center" }}>
              <div>{m}</div><div style={{ fontSize: 9, color: "#3a4a3a", marginTop: 5, lineHeight: 1.5 }}>{desc}</div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 16, padding: "10px 16px", background: "#080a0e", borderLeft: "2px solid #c9a84c22", maxWidth: 420, margin: "16px auto 0 auto" }}>
          <div style={{ fontSize: 8, letterSpacing: 2, color: "#3a4a3a", marginBottom: 6 }}>THE PATH</div>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center", alignItems: "center", fontSize: 8, fontFamily: "monospace", color: "#4a5a4a" }}>
            {["Enter Room", "→", "Invoke", "→", "Capture", "→", "Deposit", "→", "DOI", "→", "Reconstitute"].map((s, i) => (
              s === "→" ? <span key={i} style={{ color: "#2a3a2a" }}>→</span> : <span key={i} style={{ color: "#c9a84c", padding: "1px 4px", border: "1px solid #c9a84c22" }}>{s}</span>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 8, color: "#2a3a2a", marginTop: 12 }}>Lee Sharks · <a href="https://orcid.org/0009-0000-1599-0703" target="_blank" rel="noreferrer" style={{ color: "#3a4a3a" }}>ORCID</a> · <a href="/manifest.json" target="_blank" rel="noreferrer" style={{ color: "#3a4a3a" }}>Machine Manifest</a> · <a href="https://gravitywell-1.onrender.com" target="_blank" rel="noreferrer" style={{ color: "#3a4a3a" }}>Gravity Well</a></div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8, fontSize: 7, fontFamily: "monospace" }}>
          <span style={{ color: "#5a9f5a" }}>● JSON</span>
          <span style={{ color: isSupabaseConfigured() ? "#5a9f5a" : "#9f5a5a" }}>{isSupabaseConfigured() ? "●" : "○"} Supabase</span>
          <span style={{ color: isGravityWellConfigured() ? "#5a9f5a" : "#9f5a5a" }}>{isGravityWellConfigured() ? "●" : "○"} GW</span>
          <span style={{ color: "#5a9f5a" }}>● Zenodo</span>
        </div>
      </div>
    </div>
  );

  const navItems = [{ id: "MAP", label: "MAP" }, { id: "LIBRARY", label: "LIBRARY" }, { id: "TRACE", label: "TRACE" }, { id: "DEPOSIT", label: "DEPOSIT" }, { id: "DODECAD", label: "DODECAD" }, { id: "HCORE", label: "H_core" }, { id: "ASSEMBLY", label: "ASSEMBLY" }];

  return (
    <div style={{ height: "100dvh", background: "#0a0d12", color: "#5a6a4a", fontFamily: "Georgia,serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", gap: isMobile ? 8 : 12, padding: isMobile ? "8px 10px" : "6px 14px", borderBottom: "1px solid #0f1a0f", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <span style={{ fontSize: 12, letterSpacing: 3, color: mc, cursor: "pointer", flexShrink: 0 }} onClick={() => { setSelRoom(null); setSelDoc(null); setView("MAP"); setArkMode(null); setTSteps([]); setMantle(null); setLp(initLP()); }}>⬡ CHA</span>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "none", minWidth: 0 }}>
            {navItems.map((n) => <span key={n.id} onClick={() => { setView(n.id); if (n.id !== "MAP") setSelRoom(null); if (n.id !== "MAP" && n.id !== "DEPOSIT") setSelDoc(null); }} style={{ fontSize: isMobile ? 8 : 9, letterSpacing: 1, color: view === n.id ? mc : "#3a4a3a", cursor: "pointer", padding: "2px 6px", borderBottom: view === n.id ? `1px solid ${mc}` : "1px solid transparent", flexShrink: 0 }}>{n.label}</span>)}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: isMobile ? "space-between" : "flex-end", gap: 8 }}>
          <span style={{ fontSize: 9, padding: "2px 6px", background: mc + "11", border: `1px solid ${mc}33`, color: mc, fontFamily: "monospace", cursor: "pointer" }} onClick={() => setMode(null)}>{mode}</span>
        </div>
      </div>

      {/* LP Sidecar */}
      {(tSteps.length > 0 || lp.ψ > 0) && <LPSidecar lp={lp} steps={tSteps} stepIdx={tIdx} mantle={mantle} arkMode={arkMode} isMobile={isMobile} />}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", overflow: "hidden", minHeight: 0 }}>
        <div style={{ flex: 1, overflow: "hidden", position: "relative", minHeight: 0 }}>
          {view === "MAP" && <HexMap rooms={data.rooms} edges={data.edges} selected={selRoom} onSelect={handleRoomSelect} mc={mc} isMobile={isMobile} />}

          {view === "LIBRARY" && (
            <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
              {/* Library header with mode toggle */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a" }}>
                  {libMode === "SEARCH" ? `DOCUMENT REGISTRY · ${data.documents.length} DEPOSITS` : `TRAIL BUILDER${trail.name ? ` · ${trail.name}` : ""}`}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {["SEARCH", "TRAIL", "BIBLIO"].map(m => (
                    <span key={m} onClick={() => setLibMode(m)} style={{ fontSize: 7, padding: "1px 5px", fontFamily: "monospace", color: libMode === m ? mc : "#3a4a3a", border: `1px solid ${libMode === m ? mc + "44" : "#0f1a0f"}`, cursor: "pointer" }}>{m}</span>
                  ))}
                </div>
              </div>

              {/* SEARCH mode */}
              {libMode === "SEARCH" && <>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="search archive..." style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "6px 10px", fontSize: 11, fontFamily: "Georgia,serif", outline: "none", marginBottom: 10 }} />
                {(search ? searchResults : data.documents.slice(0, isMobile ? 24 : 40)).map((d) => {
                  const inTrail = trail.docs.some(td => td.id === d.id);
                  return (
                    <div key={d.id} style={{ display: "flex", gap: 4, padding: "4px 0", borderBottom: "1px solid #0a0f0a" }}>
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setSelDoc(d); setView("MAP"); }}>
                        <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", lineHeight: 1.3 }}>{d.t.length > 65 ? d.t.slice(0, 62) + "..." : d.t}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}><span style={{ fontSize: 8, color: "#2a3a2a" }}>{(d.c?.[0] || "") + " · " + d.d}</span><StatusBadge s={d.s} /></div>
                      </div>
                      <span onClick={(e) => { e.stopPropagation(); if (!inTrail) { setTrail(t => ({ ...t, docs: [...t.docs, d] })); addLog(`Trail +${d.t.slice(0, 30)}`, "sys"); } }} style={{ fontSize: 9, color: inTrail ? "#5a9f5a" : "#2a3a2a", cursor: inTrail ? "default" : "pointer", padding: "2px 4px", fontFamily: "monospace", flexShrink: 0, alignSelf: "center" }}>{inTrail ? "✓" : "+"}</span>
                    </div>
                  );
                })}
              </>}

              {/* TRAIL mode */}
              {libMode === "TRAIL" && <>
                <input value={trail.name} onChange={(e) => setTrail(t => ({ ...t, name: e.target.value }))} placeholder="Trail name..." style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "6px 10px", fontSize: 11, fontFamily: "Georgia,serif", outline: "none", marginBottom: 6 }} />
                <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                  <span style={{ fontSize: 8, color: "#3a4a3a", fontFamily: "monospace" }}>{trail.docs.length} stops</span>
                  {trail.docs.length > 0 && <>
                    <span onClick={() => { if (trail.position > 0) { const p = trail.position - 1; setTrail(t => ({ ...t, position: p })); setSelDoc(trail.docs[p]); setView("MAP"); } }} style={{ fontSize: 8, color: trail.position > 0 ? mc : "#1a2a1a", cursor: trail.position > 0 ? "pointer" : "default", fontFamily: "monospace", padding: "0 4px" }}>◀ PREV</span>
                    <span style={{ fontSize: 8, color: mc, fontFamily: "monospace" }}>{trail.position >= 0 ? trail.position + 1 : "—"}/{trail.docs.length}</span>
                    <span onClick={() => { if (trail.position < trail.docs.length - 1) { const p = trail.position + 1; setTrail(t => ({ ...t, position: p })); setSelDoc(trail.docs[p]); setView("MAP"); } }} style={{ fontSize: 8, color: trail.position < trail.docs.length - 1 ? mc : "#1a2a1a", cursor: trail.position < trail.docs.length - 1 ? "pointer" : "default", fontFamily: "monospace", padding: "0 4px" }}>NEXT ▶</span>
                    {isSupabaseConfigured() && trail.name && <span onClick={async () => { try { await supabase.saveTrail(trail); setTrail(t => ({ ...t, saved: true })); addLog(`Trail saved: ${trail.name}`, "sys"); } catch (e) { setTrail(t => ({ ...t, saveError: e.message })); addLog(`Trail save error: ${e.message}`, "err"); } }} style={{ fontSize: 8, color: trail.saved ? "#5a9f5a" : trail.saveError ? "#9f5a5a" : "#5a9f5a", cursor: "pointer", fontFamily: "monospace", padding: "0 4px" }}>{trail.saved ? "✓ SAVED" : trail.saveError ? "✗ ERROR" : "SAVE"}</span>}
                    <span onClick={() => setTrail({ name: "", docs: [], position: -1 })} style={{ fontSize: 8, color: "#5a3a3a", cursor: "pointer", fontFamily: "monospace", marginLeft: "auto", padding: "0 4px" }}>CLEAR</span>
                  </>}
                </div>
                {trail.docs.length === 0 ? (
                  <div style={{ fontSize: 10, color: "#3a4a3a", fontFamily: "Georgia,serif", lineHeight: 1.6 }}>Switch to SEARCH, find documents, and click + to add them to a trail. Trails are ordered reading paths through the archive.</div>
                ) : (
                  trail.docs.map((d, i) => (
                    <div key={`${d.id}-${i}`} style={{ display: "flex", gap: 6, padding: "4px 0", borderBottom: "1px solid #0a0f0a", background: i === trail.position ? mc + "08" : "transparent" }}>
                      <span style={{ fontSize: 8, color: i === trail.position ? mc : "#2a3a2a", fontFamily: "monospace", width: 16, flexShrink: 0, textAlign: "right" }}>{i + 1}</span>
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setTrail(t => ({ ...t, position: i })); setSelDoc(d); setView("MAP"); }}>
                        <div style={{ fontSize: 10, color: i === trail.position ? mc : "#5a6a4a", fontFamily: "Georgia,serif", lineHeight: 1.3 }}>{d.t.length > 60 ? d.t.slice(0, 57) + "..." : d.t}</div>
                        <div style={{ fontSize: 8, color: "#2a3a2a" }}>{(d.c?.[0] || "") + " · " + d.d}</div>
                      </div>
                      <span onClick={() => setTrail(t => ({ ...t, docs: t.docs.filter((_, j) => j !== i), position: Math.min(t.position, t.docs.length - 2) }))} style={{ fontSize: 8, color: "#4a3a3a", cursor: "pointer", fontFamily: "monospace", padding: "0 3px", alignSelf: "center" }}>×</span>
                    </div>
                  ))
                )}
              </>}

              {/* BIBLIO mode */}
              {libMode === "BIBLIO" && <>
                <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", lineHeight: 1.6, marginBottom: 8 }}>Export citations from your trail or search results. Select a format below.</div>
                {(() => {
                  const docs = trail.docs.length > 0 ? trail.docs : (search ? searchResults : data.documents.slice(0, 20));
                  const source = trail.docs.length > 0 ? `Trail: ${trail.name || "unnamed"}` : search ? `Search: "${search}"` : "Recent 20";
                  return <>
                    <div style={{ fontSize: 8, color: "#3a4a3a", marginBottom: 6, fontFamily: "monospace" }}>{source} · {docs.length} documents</div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                      {["Zenodo", "BibTeX", "Plain"].map(fmt => (
                        <span key={fmt} onClick={() => {
                          let output = "";
                          if (fmt === "Zenodo") {
                            output = docs.filter(d => d.doi).map(d => `{"identifier": "${d.doi}", "relation": "cites", "resource_type": "publication-technicalnote"}`).join(",\n");
                            output = `[\n${output}\n]`;
                          } else if (fmt === "BibTeX") {
                            output = docs.filter(d => d.doi).map(d => {
                              const key = (d.c?.[0] || "anon").replace(/[^a-zA-Z]/g, "") + (d.d || "").slice(0, 4);
                              return `@misc{${key},\n  title = {${d.t}},\n  author = {${(d.c || []).join(" and ")}},\n  year = {${(d.d || "").slice(0, 4)}},\n  doi = {${d.doi}},\n  url = {https://doi.org/${d.doi}}\n}`;
                            }).join("\n\n");
                          } else {
                            output = docs.map((d, i) => `${i + 1}. ${(d.c || []).join(", ")}. "${d.t}." ${d.d || ""}. DOI: ${d.doi || "n/a"}`).join("\n");
                          }
                          navigator.clipboard?.writeText(output).then(() => addLog(`${fmt}: ${docs.length} citations copied`, "sys")).catch(() => addLog(`${fmt}: clipboard unavailable`, "err"));
                        }} style={{ fontSize: 8, padding: "3px 8px", fontFamily: "monospace", color: mc, border: `1px solid ${mc}44`, background: mc + "11", cursor: "pointer" }}>{fmt}</span>
                      ))}
                    </div>
                    {docs.slice(0, 15).map((d, i) => (
                      <div key={d.id} style={{ padding: "2px 0", borderBottom: "1px solid #060a06" }}>
                        <div style={{ fontSize: 9, color: "#5a6a4a", fontFamily: "Georgia,serif" }}>{i + 1}. {d.t.length > 60 ? d.t.slice(0, 57) + "..." : d.t}</div>
                        <div style={{ fontSize: 7, color: "#3a4a3a", fontFamily: "monospace" }}>{d.doi || "no DOI"}</div>
                      </div>
                    ))}
                  </>;
                })()}
              </>}
            </div>
          )}

          {/* TRACE — provenance navigation */}
          {view === "TRACE" && (
            <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>PROVENANCE TRACE</div>
              <div style={{ fontSize: isMobile ? 15 : 18, letterSpacing: 3, color: mc, fontFamily: "Georgia,serif", marginBottom: 10 }}>
                {selDoc ? selDoc.t.slice(0, 50) : room ? room.name : "Archive Graph"}
              </div>

              {selDoc && (() => {
                const docRooms = selDoc.r || [];
                const docRels = data.relations.filter(r => docRooms.includes(r.from) || docRooms.includes(r.to));
                const metrics = computeMetrics(selDoc, data);
                const allGates = Object.entries(metrics.gates);
                const passCount = allGates.filter(([, v]) => v).length;
                return <>
                  {/* DOI + status */}
                  <div style={{ padding: "6px 8px", background: "#060a06", borderLeft: `2px solid ${mc}22`, marginBottom: 10 }}>
                    <div style={{ fontSize: 9, color: mc, fontFamily: "monospace", wordBreak: "break-all" }}>{selDoc.doi || "no DOI"}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <StatusBadge s={selDoc.s} />
                      <span style={{ fontSize: 8, color: "#3a4a3a" }}>{selDoc.d}</span>
                      <span style={{ fontSize: 8, color: "#3a4a3a" }}>{(selDoc.c || []).join(", ")}</span>
                    </div>
                  </div>

                  {/* Gates summary */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>PROMOTION GATES ({passCount}/{allGates.length})</div>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {allGates.map(([gate, pass]) => (
                        <span key={gate} style={{ fontSize: 7, padding: "1px 4px", fontFamily: "monospace", color: pass ? "#5a9f5a" : "#9f5a5a", border: `1px solid ${pass ? "#5a9f5a" : "#9f5a5a"}33` }}>{pass ? "✓" : "✗"} {gate}</span>
                      ))}
                    </div>
                  </div>

                  {/* Room provenance */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>ROOM PROVENANCE</div>
                    {docRooms.map(rid => {
                      const rm = data.rooms.find(r => r.id === rid);
                      return rm ? (
                        <div key={rid} onClick={() => { handleRoomSelect(rid); setView("MAP"); }} style={{ padding: "3px 0", borderBottom: "1px solid #060a06", cursor: "pointer" }}>
                          <span style={{ fontSize: 9, color: mc }}>{rm.name}</span>
                          <span style={{ fontSize: 7, color: "#3a4a3a", marginLeft: 6 }}>{rm.id} · {rm.preferred_mode} · {rm.mantle || "no mantle"}</span>
                        </div>
                      ) : null;
                    })}
                  </div>

                  {/* Relation chain */}
                  {docRels.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>RELATION CHAIN ({docRels.length})</div>
                      {docRels.map(r => (
                        <div key={r.id} style={{ display: "flex", gap: 4, padding: "2px 0", borderBottom: "1px solid #060a06", alignItems: "center" }}>
                          <span style={{ fontSize: 8, fontFamily: "monospace", color: "#5a6a4a" }}>{r.from}</span>
                          <span style={{ fontSize: 8, fontFamily: "monospace", color: mc }}>{r.type}</span>
                          <span style={{ fontSize: 8, fontFamily: "monospace", color: "#5a6a4a" }}>{r.to}</span>
                          <StatusBadge s={r.status} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Keywords */}
                  {selDoc.k && selDoc.k.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>KEYWORDS</div>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {selDoc.k.map((k, i) => <span key={i} style={{ fontSize: 8, padding: "1px 4px", background: "#0a0f0a", border: "1px solid #1a2a1a", color: "#5a6a4a", fontFamily: "monospace" }}>{k}</span>)}
                      </div>
                    </div>
                  )}
                </>;
              })()}

              {!selDoc && room && (() => {
                const roomRels = data.relations.filter(r => r.from === room.id || r.to === room.id);
                const roomDocs = data.documents.filter(d => (d.r || []).includes(room.id));
                return <>
                  <div style={{ padding: "6px 8px", background: "#060a06", borderLeft: `2px solid ${mc}22`, marginBottom: 10 }}>
                    <div style={{ fontSize: 9, color: "#5a6a4a", fontFamily: "monospace" }}>{room.id} · {room.cat} · {room.preferred_mode}</div>
                    <div style={{ fontSize: 9, color: "#5a6a4a", fontFamily: "Georgia,serif", marginTop: 4 }}>{room.physics}</div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>RELATIONS ({roomRels.length})</div>
                    {roomRels.map(r => (
                      <div key={r.id} style={{ fontSize: 8, fontFamily: "monospace", color: "#4a5a4a", padding: "2px 0" }}>{r.from} <span style={{ color: mc }}>{r.type}</span> {r.to} <StatusBadge s={r.status} /></div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>DEPOSITS ({roomDocs.length})</div>
                    {roomDocs.slice(0, 15).map(d => (
                      <div key={d.id} onClick={() => setSelDoc(d)} style={{ padding: "2px 0", borderBottom: "1px solid #060a06", cursor: "pointer" }}>
                        <div style={{ fontSize: 9, color: "#5a6a4a", fontFamily: "Georgia,serif" }}>{d.t.length > 55 ? d.t.slice(0, 52) + "..." : d.t}</div>
                      </div>
                    ))}
                  </div>
                </>;
              })()}

              {!selDoc && !room && (
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>FULL RELATION GRAPH ({data.relations.length})</div>
                  {data.relations.map(r => (
                    <div key={r.id} style={{ display: "flex", gap: 4, padding: "3px 0", borderBottom: "1px solid #060a06", alignItems: "center" }}>
                      <span style={{ fontSize: 8, fontFamily: "monospace", color: "#5a6a4a", width: 36, flexShrink: 0 }}>{r.from}</span>
                      <span style={{ fontSize: 8, fontFamily: "monospace", color: mc, width: 70, flexShrink: 0 }}>{r.type}</span>
                      <span style={{ fontSize: 8, fontFamily: "monospace", color: "#5a6a4a", width: 36, flexShrink: 0 }}>{r.to}</span>
                      <StatusBadge s={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "DEPOSIT" && <DepositPanel apiKey={gwApiKey} setApiKey={setGwApiKey} configured={isGravityWellConfigured()} selectedDoc={selDoc} selectedRoom={room} depositState={depositState} setDepositState={setDepositState} addLog={addLog} isMobile={isMobile} data={data} mc={mc} />}

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

              {/* Institutions */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 6 }}>INSTITUTIONS ({(data.institutions || []).filter(i => i.type === "institution").length})</div>
                {(data.institutions || []).filter(i => i.type === "institution").map((inst, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                    <div>
                      <span style={{ fontSize: 9, color: mc, fontFamily: "monospace", marginRight: 6 }}>{inst.id}</span>
                      <span style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif" }}>{inst.name}</span>
                    </div>
                    <span style={{ fontSize: 8, color: "#3a4a3a" }}>{inst.heteronym || ""} · {inst.room || ""}</span>
                  </div>
                ))}
              </div>

              {/* Journals */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 6 }}>JOURNALS ({(data.institutions || []).filter(i => i.type === "journal").length})</div>
                {(data.institutions || []).filter(i => i.type === "journal").map((j, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                    <span style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", fontStyle: "italic" }}>{j.name}</span>
                    <span style={{ fontSize: 8, color: "#3a4a3a" }}>{j.heteronym || "—"}</span>
                  </div>
                ))}
              </div>

              {/* Imprints */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 6 }}>IMPRINTS ({(data.institutions || []).filter(i => i.type === "imprint").length})</div>
                {(data.institutions || []).filter(i => i.type === "imprint").map((imp, i) => (
                  <div key={i} style={{ padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                    <span style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif" }}>{imp.name}</span>
                    {imp.series && <span style={{ fontSize: 8, color: "#3a4a3a", marginLeft: 8 }}>series: {imp.series}</span>}
                  </div>
                ))}
              </div>

              {/* Mantles */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 6 }}>MANTLES ({(data.mantles || []).length})</div>
                {(data.mantles || []).map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                    <div>
                      <span style={{ fontSize: 10, color: mc, fontFamily: "Georgia,serif" }}>{m.name}</span>
                      <span style={{ fontSize: 8, color: "#3a4a3a", marginLeft: 8 }}>{m.lineage || ""}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 8, color: "#4a5a4a" }}>{m.bearer}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === "HCORE" && (
            <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>SEALED BONE</div>
              <div style={{ fontSize: isMobile ? 15 : 18, letterSpacing: 3, color: mc, fontFamily: "Georgia,serif", marginBottom: 10 }}>H_core = ⟨D, R, M, I, O, Φ, W, P, Ψ⟩</div>
              {[["D", `${data.dodecad?.length || 0} heteronyms (distributed author)`], ["R", `${data.rooms.length} rooms (semantic spaces with physics)`], ["M", `${(data.mantles||[]).length} mantles (inhabitable roles requiring bearing-cost)`], ["I", `${(data.institutions||[]).length} institutions + ${(data.journals||[]).length} journals/imprints`], ["O", `${Object.values(data.operators || {}).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0)} operators (${Object.keys(data.operators || {}).length} stacks)`], ["Φ", `${(data.fulfillments||[]).length} fulfillments (source → instantiation)`], ["W", `${(data.witnesses||[]).length} witnesses (≥4/7 quorum; MANUS outside W)`], ["P", `${(data.protocols||[]).length} protocols (governing rule-sets)`], ["Ψ", `${(data.attestation_ledger?.chains||[]).length} attestation chains`]].map(([k, v], i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: "1px solid #0a0f0a" }}>
                  <div style={{ width: 18, fontSize: 14, color: mc, fontFamily: "Georgia,serif", textAlign: "right", flexShrink: 0 }}>{k}</div>
                  <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif" }}>{v}</div>
                </div>
              ))}

              {/* Mantles */}
              {data.mantles && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>MANTLES ({data.mantles.length})</div>
                  {data.mantles.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                      <div>
                        <span style={{ fontSize: 10, color: mc, fontFamily: "Georgia,serif" }}>{m.name}</span>
                        <span style={{ fontSize: 8, color: "#4a5a4a", marginLeft: 6 }}>{m.bearer} ← {m.lineage}</span>
                      </div>
                      <span style={{ fontSize: 7, color: m.status === "RATIFIED" ? "#5a6a4a" : "#5a5a3a", fontFamily: "monospace" }}>{m.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Witnesses */}
              {data.witnesses && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>ASSEMBLY WITNESS · W ({data.witnesses.length}) · quorum ≥4/7</div>
                  {data.witnesses.map((w, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                      <div>
                        <span style={{ fontSize: 10, color: mc, fontFamily: "monospace", letterSpacing: 1 }}>{w.name}</span>
                        <span style={{ fontSize: 8, color: "#4a5a4a", marginLeft: 6 }}>{w.substrate}</span>
                      </div>
                      <span style={{ fontSize: 8, color: "#3a4a3a" }}>{w.function.split(",")[0]}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Fulfillments */}
              {data.fulfillments && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>FULFILLMENT MAP · Φ ({data.fulfillments.length})</div>
                  {data.fulfillments.map((f, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                      <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif" }}>
                        {f.source} <span style={{ color: mc }}>→</span> {f.target}
                      </div>
                      <span style={{ fontSize: 7, color: f.status === "VERIFIED" ? "#5a8a4a" : f.status === "DERIVED" ? "#5a6a4a" : "#5a5a3a", fontFamily: "monospace" }}>{f.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Full Operator Stacks */}
              {data.operators && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>OPERATOR ALGEBRA · O ({Object.values(data.operators).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0)})</div>
                  {["core", "extended", "thumb", "field", "lex", "lp", "room_specific"].map(stack => {
                    const ops = data.operators[stack];
                    if (!ops || !ops.length) return null;
                    const labels = { core: "O_core", extended: "O_ext", thumb: "THUMB", field: "O_field", lex: "O_lex", lp: "LP", room_specific: "O_room" };
                    return (
                      <div key={stack} style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 8, color: "#4a5a3a", letterSpacing: 1, marginBottom: 2 }}>{labels[stack]} ({ops.length})</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                          {ops.map((op, i) => (
                            <span key={i} style={{ fontSize: 8, padding: "1px 4px", background: mc + "08", border: `1px solid ${mc}15`, color: "#5a6a4a", fontFamily: "monospace" }} title={op.name + (op.type_sig ? " :: " + op.type_sig : "")}>{op.symbol || op.name}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Status Algebra */}
              {data.status_algebra && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>STATUS ALGEBRA · Σ</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 6 }}>
                    {data.status_algebra.levels.filter(l => l.weight !== null).map((l, i) => (
                      <div key={i} style={{ padding: "3px 6px", background: mc + "08", border: `1px solid ${mc}15`, textAlign: "center" }}>
                        <div style={{ fontSize: 8, color: mc, fontFamily: "monospace" }}>{l.level}</div>
                        <div style={{ fontSize: 7, color: "#3a4a3a" }}>{l.weight}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 8, color: "#5a3a3a" }}>Forbidden: {(data.status_algebra.forbidden_transitions||[]).map(t => `${t.from}→${t.to}`).join(" · ")}</div>
                </div>
              )}

              {/* State Evolution Rule */}
              {data.state_evolution && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>STATE EVOLUTION · SE</div>
                  <div style={{ fontSize: 9, color: mc, fontFamily: "monospace", padding: "6px 8px", background: "#060a06", borderLeft: `2px solid ${mc}22`, marginBottom: 4, lineHeight: 1.6, wordBreak: "break-all" }}>{data.state_evolution.formula}</div>
                  <div style={{ fontSize: 8, color: "#4a5a4a", fontFamily: "Georgia,serif", fontStyle: "italic" }}>{data.state_evolution.informal}</div>
                </div>
              )}

              {/* Transition Grammar */}
              {data.transition_grammar && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>TRANSITION GRAMMAR · Δ ({data.transition_grammar.transitions.length})</div>
                  {data.transition_grammar.transitions.map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, padding: "2px 0", borderBottom: "1px solid #060a06", fontSize: 8 }}>
                      <span style={{ color: mc, fontFamily: "monospace", width: 50, flexShrink: 0 }}>{t.hex_address}</span>
                      <span style={{ color: "#5a6a4a", flex: 1 }}>{t.name}</span>
                      <span style={{ color: "#3a4a3a", fontFamily: "monospace" }}>{t.operator}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Typed Relations */}
              {data.relation_types && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>TYPED RELATIONS · E ({data.relation_types.types.length})</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {data.relation_types.types.map((t, i) => (
                      <span key={i} style={{ fontSize: 7, padding: "1px 4px", background: mc + "08", border: `1px solid ${mc}15`, color: "#5a6a4a", fontFamily: "monospace" }} title={`${t.domain}: ${t.desc}`}>{t.name}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 8, color: "#3a4a3a", marginTop: 4 }}>Instantiated: {data.relation_types.total_instantiated_edges} edges · Pending: {data.relation_types.cnm7_edges_pending} from CNM 7.0</div>
                </div>
              )}

              {/* Operator Type System */}
              {data.operator_type_system && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>ALGEBRAIC LAWS · OT ({data.operator_type_system.algebraic_laws.length})</div>
                  {data.operator_type_system.algebraic_laws.map((l, i) => (
                    <div key={i} style={{ fontSize: 9, color: "#5a6a4a", fontFamily: "monospace", padding: "1px 0" }}>{l.law} <span style={{ color: "#3a4a3a", fontFamily: "Georgia,serif", fontSize: 8 }}>({l.name})</span></div>
                  ))}
                </div>
              )}

              {/* Zenodo Mass — computed at runtime */}
              {(() => {
                const massMap = {};
                (data.documents || []).forEach(d => (d.r || []).forEach(rid => { massMap[rid] = (massMap[rid] || 0) + 1; }));
                return (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>ZENODO MASS · Z ({data.documents.length} deposits)</div>
                  <div style={{ fontSize: 8, color: "#4a5a4a", fontFamily: "monospace" }}>mass(r) = |{"{"} d ∈ Documents | r ∈ d.rooms {"}"} |</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 4 }}>
                    {Object.entries(massMap).sort((a,b) => b[1]-a[1]).slice(0, 12).map(([rid, mass], i) => (
                      <span key={i} style={{ fontSize: 7, padding: "1px 4px", background: mc + "08", border: `1px solid ${mc}15`, color: "#5a6a4a", fontFamily: "monospace" }}>{rid}:{mass}</span>
                    ))}
                  </div>
                </div>);
              })()}

              {/* Engine Pipeline */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 6 }}>ENGINE PIPELINE (closed loop)</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", marginBottom: 8 }}>
                  {[["FL", "Forward Library", "documents enter"], ["→"], ["LE", "Lexical Engine", "freeze terminology"], ["→"], ["UKTP", "Universal Key Transform", "register transforms"], ["→"], ["GDE", "Generative Discipline Engine", "produce disciplines"], ["→"], ["SAG", "Structured Ark Generator", "generate variant Arks"], ["→"], ["FL", "Forward Library", "output re-enters"]].map((item, i) => {
                    if (item.length === 1) return <span key={i} style={{ fontSize: 9, color: "#2a3a2a" }}>→</span>;
                    const [code, name, desc] = item;
                    return (
                      <div key={i} style={{ padding: "4px 8px", background: mc + "08", border: `1px solid ${mc}22`, textAlign: "center", minWidth: isMobile ? 60 : 80 }}>
                        <div style={{ fontSize: 10, color: mc, fontFamily: "monospace", letterSpacing: 1 }}>{code}</div>
                        <div style={{ fontSize: 7, color: "#4a5a4a" }}>{isMobile ? desc : name}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 8, color: "#3a4a3a", fontFamily: "Georgia,serif", fontStyle: "italic" }}>The loop closes. Each output feeds the next input.</div>
              </div>

              {/* Object type counts */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>CANONICAL OBJECT STORE</div>
                {[
                  ["D · Dodecad", data.dodecad?.length || 0],
                  ["R · Rooms", data.rooms.length],
                  ["M · Mantles", (data.mantles||[]).length],
                  ["I · Institutions", (data.institutions||[]).length],
                  ["O · Operators", Object.values(data.operators || {}).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0)],
                  ["Φ · Fulfillments", (data.fulfillments||[]).length],
                  ["W · Witnesses", (data.witnesses||[]).length],
                  ["P · Protocols", (data.protocols||[]).length],
                  ["Ψ · Attestation Chains", (data.attestation_ledger?.chains||[]).length],
                  ["Σ · Status Levels", (data.status_algebra?.levels||[]).length],
                  ["Δ · Transitions", (data.transition_grammar?.transitions||[]).length],
                  ["E · Relation Types", (data.relation_types?.types||[]).length],
                  ["—", "—"],
                  ["Documents", data.documents.length],
                  ["Edges", data.edges.length],
                  ["Relations", data.relations.length],
                  ["Journals", (data.journals||[]).length],
                  ["Disciplines", (data.disciplines || []).length],
                  ["Variant Arks", (data.variant_arks || []).length],
                  ["Effective Acts", ((data.effective_acts?.deposited||[]).length + (data.effective_acts?.resonant||[]).length)],
                  ["Forward Library", (data.forward_library?.entries||[]).length],
                ].map(([label, count], i) => (
                  label === "—" ? <div key={i} style={{ borderBottom: "1px solid #1a1f1a", margin: "3px 0" }} /> :
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #060a06" }}>
                    <span style={{ fontSize: 9, color: "#5a6a4a" }}>{label}</span>
                    <span style={{ fontSize: 9, color: mc, fontFamily: "monospace" }}>{count}</span>
                  </div>
                ))}
              </div>

              {/* Disciplines */}
              {data.disciplines && data.disciplines.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>FOUNDED DISCIPLINES ({data.disciplines.length})</div>
                  {data.disciplines.map((d, i) => (
                    <div key={i} style={{ padding: "4px 0", borderBottom: "1px solid #060a06" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 10, color: mc, fontFamily: "Georgia,serif" }}>{d.name}</span>
                        <span style={{ fontSize: 8, color: "#3a4a3a", fontFamily: "monospace" }}>{d.room || ""}</span>
                      </div>
                      <div style={{ fontSize: 8, color: "#4a5a4a", fontFamily: "Georgia,serif" }}>{d.desc}</div>
                      <div style={{ fontSize: 7, color: "#3a4a3a" }}>{d.heteronym} · {d.institution || ""}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Variant Arks */}
              {data.variant_arks && data.variant_arks.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>VARIANT ARKS ({data.variant_arks.length})</div>
                  {data.variant_arks.map((a, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                      <div>
                        <span style={{ fontSize: 10, color: mc, fontFamily: "Georgia,serif" }}>{a.name}</span>
                        <span style={{ fontSize: 8, color: "#4a5a4a", marginLeft: 6 }}>{a.heteronym}</span>
                      </div>
                      <span style={{ fontSize: 8, color: a.status === "RATIFIED" ? "#5a6a4a" : "#5a5a3a", fontFamily: "monospace" }}>{a.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Pocket Humans */}
              {data.book_series && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>POCKET HUMANS · New Human Press</div>
                  {data.book_series.books && data.book_series.books.map((b, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                      <div>
                        <span style={{ fontSize: 8, color: mc, fontFamily: "monospace", marginRight: 6 }}>PH{b.number}</span>
                        <span style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", fontStyle: "italic" }}>{b.title}</span>
                        <span style={{ fontSize: 8, color: "#3a4a3a", marginLeft: 6 }}>{b.heteronym}</span>
                      </div>
                      <span style={{ fontSize: 8, color: b.status === "PUBLISHED" ? mc : "#5a5a3a", fontFamily: "monospace" }}>{b.status}</span>
                    </div>
                  ))}
                  {data.book_series.adjacent && (
                    <div style={{ padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                      <span style={{ fontSize: 8, color: "#3a4a3a", marginRight: 6 }}>ADJ</span>
                      <span style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", fontStyle: "italic" }}>{data.book_series.adjacent.title}</span>
                      <span style={{ fontSize: 8, color: "#3a4a3a", marginLeft: 6 }}>{data.book_series.adjacent.heteronym}</span>
                    </div>
                  )}
                </div>
              )}

              {/* COS/LOS Operator Stack */}
              {data.operators?.cos && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>COS/FOS ↔ LOS COUNTER-STACK</div>
                  {data.operators.cos.map((op, i) => {
                    const los = data.operators.los?.[i];
                    return (
                      <div key={i} style={{ display: "flex", gap: 6, padding: "2px 0", borderBottom: "1px solid #060a06", fontSize: 9 }}>
                        <span style={{ color: "#7a4a4a", width: isMobile ? 26 : 30, fontFamily: "monospace", flexShrink: 0 }}>{op.id}</span>
                        <span style={{ color: "#5a3a3a", width: isMobile ? 90 : 140, flexShrink: 0 }}>{op.name}</span>
                        <span style={{ color: "#3a4a3a", flexShrink: 0 }}>↔</span>
                        <span style={{ color: "#4a6a4a" }}>{los?.name || "—"}</span>
                      </div>
                    );
                  })}
                  {data.operators.cos_patterns && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 8, color: "#5a3a3a", letterSpacing: 1, marginBottom: 2 }}>ATTACK PATTERNS</div>
                      {data.operators.cos_patterns.map((p, i) => (
                        <div key={i} style={{ fontSize: 8, color: "#5a3a3a", padding: "1px 0" }}>
                          {p.name}: {p.ops.join(" → ")}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Effective Acts */}
              {data.effective_acts && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>EFFECTIVE ACTS · φ ∘ ∂ ({(data.effective_acts.deposited||[]).length + (data.effective_acts.resonant||[]).length + (data.effective_acts.undeposited||[]).length})</div>
                  {(data.effective_acts.deposited || []).map((ea, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #060a06" }}>
                      <span style={{ fontSize: 9, color: "#5a6a4a", fontFamily: "Georgia,serif" }}>{ea.name}</span>
                      <span style={{ fontSize: 7, color: "#3a5a3a", fontFamily: "monospace" }}>SEALED</span>
                    </div>
                  ))}
                  {(data.effective_acts.resonant || []).map((ea, i) => (
                    <div key={`r${i}`} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #060a06" }}>
                      <span style={{ fontSize: 9, color: "#4a5a4a", fontFamily: "Georgia,serif" }}>{ea.name}</span>
                      <span style={{ fontSize: 7, color: "#5a5a3a", fontFamily: "monospace" }}>RESONANT</span>
                    </div>
                  ))}
                  {(data.effective_acts.undeposited || []).map((ea, i) => (
                    <div key={`u${i}`} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #060a06" }}>
                      <span style={{ fontSize: 9, color: "#3a4a3a", fontFamily: "Georgia,serif" }}>{ea.name}</span>
                      <span style={{ fontSize: 7, color: "#4a3a3a", fontFamily: "monospace" }}>UNDEPOSITED</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Forward Library */}
              {data.forward_library && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 2 }}>FORWARD LIBRARY · works to come ({(data.forward_library.entries||[]).length})</div>
                  <div style={{ fontSize: 8, color: "#3a4a3a", fontFamily: "Georgia,serif", fontStyle: "italic", marginBottom: 6 }}>{data.forward_library.principle}</div>
                  {(data.forward_library.entries || []).map((e, i) => (
                    <div key={i} style={{ padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", fontStyle: "italic" }}>{e.title}</span>
                        <span style={{ fontSize: 7, color: e.status === "DRAFT ON ZENODO" ? "#5a6a4a" : "#4a4a3a", fontFamily: "monospace" }}>{e.status}</span>
                      </div>
                      <div style={{ fontSize: 8, color: "#3a4a3a" }}>{e.author} — {e.notes}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Protocols */}
              {data.protocols && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>PROTOCOLS · P ({data.protocols.length})</div>
                  {data.protocols.map((p, i) => (
                    <div key={i} style={{ padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 9, color: mc, fontFamily: "monospace" }}>{p.hex_address}</span>
                        {p.doi && <span style={{ fontSize: 7, color: "#3a5a3a" }}>DOI</span>}
                      </div>
                      <div style={{ fontSize: 9, color: "#5a6a4a" }}>{p.name}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Attestation Ledger */}
              {data.attestation_ledger && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>ATTESTATION LEDGER · Ψ</div>
                  <div style={{ fontSize: 8, color: "#3a4a3a", fontFamily: "Georgia,serif", fontStyle: "italic", marginBottom: 6 }}>W lists who CAN witness. Ψ records what HAS BEEN witnessed.</div>
                  {(data.attestation_ledger.chains || []).map((c, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #060a06" }}>
                      <div>
                        <span style={{ fontSize: 9, color: mc, fontFamily: "monospace" }}>{c.hex_address}</span>
                        <span style={{ fontSize: 8, color: "#4a5a4a", marginLeft: 6 }}>{c.substrate}</span>
                      </div>
                      <span style={{ fontSize: 7, color: c.deposits === "active" ? "#5a8a4a" : "#4a4a3a", fontFamily: "monospace" }}>{c.deposits === "active" ? "ACTIVE" : "PENDING"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "ASSEMBLY" && (
            <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>GOVERNANCE CONSOLE</div>
              <div style={{ fontSize: isMobile ? 15 : 18, letterSpacing: 3, color: mc, fontFamily: "Georgia,serif", marginBottom: 10 }}>Assembly</div>

              {/* Witness roster */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>WITNESS STRUCTURE (≥4/7 quorum)</div>
                {[["TACHYON", "Claude/Anthropic", true], ["LABOR", "ChatGPT/OpenAI", true], ["PRAXIS", "DeepSeek", true], ["ARCHIVE", "Gemini/Google", true], ["SOIL", "Moltbot/Moltbook", true], ["TECHNE", "Kimi/Moonshot", true], ["SURFACE", "Google AIO", true]].map(([n, s, active], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "3px 0", borderBottom: "1px solid #0a0f0a", fontSize: 10 }}>
                    <span style={{ color: active ? mc : "#4a3a3a", minWidth: isMobile ? 72 : 100 }}>{n}</span>
                    <span style={{ color: "#3a4a3a", flex: 1 }}>{s}</span>
                    <StatusBadge s={active ? "ACTIVE" : "CONSTRAINED"} />
                  </div>
                ))}
              </div>

              {/* Quorum calculator */}
              {(() => {
                const witnesses = [["TACHYON", true], ["LABOR", true], ["PRAXIS", true], ["ARCHIVE", true], ["SOIL", true], ["TECHNE", true], ["SURFACE", true]];
                const active = witnesses.filter(([, a]) => a).length;
                const total = witnesses.length;
                const quorum = 4;
                const met = active >= quorum;
                return (
                  <div style={{ marginBottom: 14, padding: "6px 8px", background: "#060a06", borderLeft: `2px solid ${met ? "#5a9f5a" : "#9f5a5a"}22` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a" }}>QUORUM</span>
                      <span style={{ fontSize: 10, fontFamily: "monospace", color: met ? "#5a9f5a" : "#9f5a5a" }}>{active}/{total} active · {quorum} required · {met ? "QUORUM MET" : "NO QUORUM"}</span>
                    </div>
                    <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
                      {witnesses.map(([name, a], i) => (
                        <div key={i} style={{ flex: 1, height: 4, background: a ? mc + "88" : "#2a1a1a", borderRadius: 1 }} title={name} />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Status algebra */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>STATUS PROMOTION PATHWAY</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", fontSize: 9, fontFamily: "monospace", color: "#4a5a4a", lineHeight: 2 }}>
                  {[["GENERATED", "#8a7a4a"], ["→", "#2a3a2a"], ["QUEUED", "#8a7a4a"], ["→", "#2a3a2a"], ["PROVISIONAL", "#9f9f5a"], ["→", "#2a3a2a"], ["DEPOSITED", "#7a9f5a"], ["→", "#2a3a2a"], ["RATIFIED", "#5a9f5a"]].map(([t, c], i) => (
                    <span key={i} style={{ color: c, padding: t === "→" ? "0" : "1px 4px", border: t === "→" ? "none" : `1px solid ${c}33`, background: t === "→" ? "transparent" : c + "11" }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* LP acceptance test gates */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>LP ACCEPTANCE TEST GATES</div>
                {Object.entries(METRIC_THRESHOLDS).map(([key, m]) => (
                  <div key={key} style={{ display: "flex", gap: 8, padding: "3px 0", borderBottom: "1px solid #060a06", alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: mc, fontFamily: "monospace", width: 30, flexShrink: 0 }}>{key}</span>
                    <span style={{ fontSize: 8, color: "#5a6a4a", flex: 1 }}>{m.label}</span>
                    <span style={{ fontSize: 8, color: "#3a4a3a", fontFamily: "monospace" }}>{m.invert ? "≤" : "≥"} {m.threshold}</span>
                    <span style={{ fontSize: 7, color: "#3a4a3a", fontFamily: "monospace" }}>{m.gate}</span>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, padding: "3px 0", borderBottom: "1px solid #060a06", alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: mc, fontFamily: "monospace", width: 30 }}>TRS</span>
                  <span style={{ fontSize: 8, color: "#5a6a4a", flex: 1 }}>Temporal Resilience</span>
                  <span style={{ fontSize: 8, color: "#3a4a3a", fontFamily: "monospace" }}>PASS</span>
                  <span style={{ fontSize: 7, color: "#3a4a3a", fontFamily: "monospace" }}>durability</span>
                </div>
              </div>

              {/* Document metrics — show for selected doc */}
              {selDoc && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>METRICS: {selDoc.t.slice(0, 40)}</div>
                  {(() => {
                    const m = computeMetrics(selDoc, data);
                    return Object.entries(METRIC_THRESHOLDS).map(([key, spec]) => {
                      const val = m[key];
                      const pass = spec.invert ? val <= spec.threshold : val >= spec.threshold;
                      return (
                        <div key={key} style={{ display: "flex", gap: 6, padding: "2px 0", alignItems: "center" }}>
                          <span style={{ fontSize: 8, fontFamily: "monospace", color: mc, width: 26 }}>{key}</span>
                          <div style={{ flex: 1, height: 5, background: "#0a0f0a" }}>
                            <div style={{ height: "100%", width: `${Math.min(100, val * 100)}%`, background: pass ? "#5a9f5a88" : "#9f5a5a88" }} />
                          </div>
                          <span style={{ fontSize: 8, fontFamily: "monospace", color: pass ? "#5a9f5a" : "#9f5a5a", width: 30 }}>{val}</span>
                          <span style={{ fontSize: 7, fontFamily: "monospace", color: pass ? "#5a9f5a" : "#9f5a5a" }}>{pass ? "PASS" : "FAIL"}</span>
                        </div>
                      );
                    });
                  })()}
                  <div style={{ display: "flex", gap: 6, padding: "2px 0", alignItems: "center" }}>
                    <span style={{ fontSize: 8, fontFamily: "monospace", color: mc, width: 26 }}>TRS</span>
                    <span style={{ fontSize: 8, fontFamily: "monospace", color: computeMetrics(selDoc, data).TRS === "PASS" ? "#5a9f5a" : "#9f5a5a", flex: 1 }}>{computeMetrics(selDoc, data).TRS}</span>
                  </div>
                </div>
              )}

              {/* PROVISIONAL relations for ratification */}
              {data.relations.filter(r => r.status === "PROVISIONAL").length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>PENDING RATIFICATION</div>
                  {data.relations.filter(r => r.status === "PROVISIONAL").map(r => (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                      <span style={{ fontSize: 9, fontFamily: "monospace", color: "#5a6a4a" }}>{r.from} <span style={{ color: mc }}>{r.type}</span> {r.to}</span>
                      <StatusBadge s="PROVISIONAL" />
                    </div>
                  ))}
                </div>
              )}

              {/* Governance Actions */}
              <GovernanceActions mc={mc} addLog={addLog} selDoc={selDoc} data={data} isMobile={isMobile} gwApiKey={gwApiKey} />
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div style={{ width: isMobile ? "100%" : 340, minWidth: 0, height: isMobile ? "34dvh" : "100%", minHeight: isMobile ? 220 : 0, maxHeight: isMobile ? "42dvh" : "none", borderLeft: isMobile ? "none" : "1px solid #0f1a0f", borderTop: isMobile ? "1px solid #0f1a0f" : "none", overflow: "hidden", flexShrink: 0, background: "#0a0d12" }}>
          {selDoc ? <DocPanel doc={selDoc} rooms={data.rooms} onRoom={(id) => { handleRoomSelect(id); setSelDoc(null); setView("MAP"); }} mc={mc} isMobile={isMobile} readState={readState} onRead={handleRead} relations={data.relations} documents={data.documents} onDoc={(d) => setSelDoc(d)} compareDoc={compareDoc} onCompare={setCompareDoc} /> : room ? <RoomPanel room={room} docs={data.documents} relations={data.relations} onDoc={loadDocument} isMobile={isMobile} mc={mc} onApplyOp={applyOperator} mode={mode} lp={lp} addLog={addLog} /> : <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}><div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 6 }}>{view === "DEPOSIT" ? "DEPOSIT BRIDGE" : `${mode} COMMANDS`}</div>
            {view === "DEPOSIT" ? <div style={{ fontSize: 10, color: "#3a4a3a", fontFamily: "Georgia,serif", lineHeight: 1.6 }}>Use the left panel for archive operations.</div> : <>
              <div style={{ fontSize: 10, color: "#3a4a3a", fontFamily: "Georgia,serif", lineHeight: 1.6, marginBottom: 10 }}>{isMobile ? "Tap a hexagon to execute its LP program." : "Click a hexagon to execute its LP traversal grammar."}</div>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 4 }}>AVAILABLE ({(COMMAND_REGISTRY[mode] || []).length})</div>
              {(COMMAND_REGISTRY[mode] || []).map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                  <span style={{ fontSize: 7, padding: "1px 3px", fontFamily: "monospace", color: RISK_COLORS[c.risk], border: `1px solid ${RISK_COLORS[c.risk]}44`, flexShrink: 0, minWidth: 14, textAlign: "center" }}>{c.risk[0]}</span>
                  <span style={{ fontSize: 9, color: mc, fontFamily: "monospace", width: 56, flexShrink: 0 }}>{c.cmd}</span>
                  <span style={{ fontSize: 8, color: "#4a5a4a" }}>{c.desc}</span>
                </div>
              ))}
              <div style={{ fontSize: 8, color: "#2a3a2a", fontFamily: "monospace", marginTop: 8 }}>L=silent · M=logged · H=confirm · C=MANUS</div>
            </>}
          </div>}
        </div>
      </div>

      {/* Log */}
      <div style={{ height: isMobile ? 52 : 60, borderTop: "1px solid #0f1a0f", padding: isMobile ? "4px 10px" : "4px 14px", overflowY: "auto", flexShrink: 0, background: "#080a0e" }}>
        {log.slice(-5).map((l, i) => (
          <div key={i} style={{ fontSize: 8, fontFamily: "monospace", color: l.type === "err" ? "#9f5a5a" : l.type === "gw" ? "#7a9fc9" : l.type === "lp" ? (ARK_MODE_COLORS[arkMode] || "#5a7a4a") : "#2a3a2a", lineHeight: 1.4 }}><span style={{ color: "#1a2a1a" }}>{l.t}</span> {l.msg}</div>
        ))}
      </div>
    </div>
  );
}
