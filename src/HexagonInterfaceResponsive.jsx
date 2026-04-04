import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { gravityWell, isGravityWellConfigured } from "./gravityWellAdapter.js";

const DATA_URL = "https://raw.githubusercontent.com/leesharks000/crimson-hexagonal-interface/main/hexagon_canonical.json";

const CAT_COLORS = { core: "#c9a84c", ext: "#5a9f7b", special: "#9f5a7b", new: "#5a7a9f" };
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
const hexPoints = (cx, cy, sz) => { const p = []; for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (60 * i - 30); p.push(`${cx + sz * Math.cos(a)},${cy + sz * Math.sin(a)}`); } return p.join(" "); };

function normalizeRoom(room) {
  return {
    id: room.id, name: room.name || room.title || room.id,
    cat: room.cat || room.category || room.type || "core",
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
        {positioned.map((r) => { const sel = selected === r.id; const col = CAT_COLORS[r.cat] || "#444"; return (
          <g key={r.id} onClick={() => onSelect(r.id)} style={{ cursor: "pointer" }}>
            <polygon points={hexPoints(r.x, r.y, sel ? MAP_SIZE + 4 : MAP_SIZE - 2)} fill={sel ? col + "22" : "#0a0d12"} stroke={sel ? mc : col + "66"} strokeWidth={sel ? 1.5 : 0.5} />
            <text x={r.x} y={r.y - 4} textAnchor="middle" fill={sel ? "#e0d0a0" : col} fontSize={sel ? (isMobile ? 8 : 9) : (isMobile ? 6 : 7)} fontFamily="Georgia,serif">{r.name}</text>
            <text x={r.x} y={r.y + 8} textAnchor="middle" fill="#2a3a2a" fontSize={isMobile ? 5 : 6} fontFamily="monospace">{r.id}</text>
          </g>); })}
      </svg>
    </div>
  );
}

function RoomPanel({ room, docs, relations, onDoc, isMobile, mc }) {
  const roomDocs = useMemo(() => docs.filter((d) => d.r.includes(room.id)), [docs, room.id]);
  const roomRels = useMemo(() => relations.filter((r) => r.from === room.id || r.to === room.id), [relations, room.id]);
  return (
    <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 2 }}>{room.id} · {room.cat.toUpperCase()}</div>
      <h2 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 300, letterSpacing: 2, color: mc, margin: "0 0 6px 0", fontFamily: "Georgia,serif" }}>{room.name}</h2>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {room.mantle && <span style={{ fontSize: 8, padding: "1px 5px", background: mc + "11", border: `1px solid ${mc}33`, color: mc, fontFamily: "Georgia,serif" }}>{room.mantle}</span>}
        <span style={{ fontSize: 8, padding: "1px 5px", background: mc + "11", border: `1px solid ${mc}33`, color: mc, fontFamily: "monospace" }}>{room.preferred_mode}</span>
      </div>
      <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", lineHeight: 1.5, marginBottom: 10, borderLeft: `2px solid ${mc}33`, paddingLeft: 8 }}>{room.desc}</div>
      <div style={{ marginBottom: 10 }}><div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>PHYSICS</div><div style={{ fontSize: 10, color: "#7a8a5a", fontFamily: "monospace" }}>{room.physics}</div></div>
      {room.default_operators?.length > 0 && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>OPERATORS</div><div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>{room.default_operators.map((op, i) => <span key={i} style={{ fontSize: 9, padding: "1px 5px", background: mc + "11", border: `1px solid ${mc}33`, color: mc, fontFamily: "monospace" }}>{op}</span>)}</div></div>}
      {room.lp_program?.length > 0 && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>LP PROGRAM</div><div style={{ padding: "6px 8px", background: "#060a06", borderLeft: `2px solid ${mc}22` }}>{room.lp_program.map((s, i) => <div key={i} style={{ fontSize: 9, fontFamily: "monospace", color: "#4a5a4a", lineHeight: 1.6 }}><span style={{ color: mc }}>{s.step}</span><span style={{ color: "#3a4a3a" }}> :: </span><span>{s.value}</span></div>)}</div></div>}
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

function DocPanel({ doc, rooms, onRoom, mc, isMobile, readState, onRead }) {
  const hasContent = readState?.doi === doc.doi && readState?.text;
  const isLoading = readState?.doi === doc.doi && readState?.loading;
  return (
    <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
      {!hasContent && <>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 2 }}>DOCUMENT</div>
        <h2 style={{ fontSize: isMobile ? 14 : 15, fontWeight: 300, color: mc, margin: "0 0 8px 0", fontFamily: "Georgia,serif", lineHeight: 1.3 }}>{doc.t}</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}><StatusBadge s={doc.s} /><span style={{ fontSize: 9, color: "#3a4a3a" }}>{doc.d}</span></div>
        <div style={{ fontSize: 10, color: "#5a6a4a", marginBottom: 6 }}>{(doc.c || []).join(" · ")}</div>
        {doc.e && <div style={{ fontSize: 10, color: "#5a6a4a", fontFamily: "Georgia,serif", lineHeight: 1.5, marginBottom: 10, padding: "6px 8px", background: "#080c08", borderLeft: `2px solid ${mc}22` }}>{doc.e.length > (isMobile ? 320 : 500) ? doc.e.slice(0, isMobile ? 317 : 497) + "..." : doc.e}</div>}
        {doc.doi && (
          <button onClick={() => onRead(doc.doi)} disabled={isLoading} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "6px 12px", fontSize: 9, cursor: isLoading ? "wait" : "pointer", fontFamily: "monospace", letterSpacing: 1, marginBottom: 10, width: "100%" }}>
            {isLoading ? "FETCHING FROM ZENODO…" : "READ FULL TEXT"}
          </button>
        )}
        {readState?.error && readState.doi === doc.doi && <div style={{ fontSize: 9, color: "#9f5a5a", marginBottom: 8 }}>{readState.error}</div>}
        {doc.r.length > 0 && <div><div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 3 }}>ROOMS</div><div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>{doc.r.map((rid) => { const rm = rooms.find((r) => r.id === rid); return <span key={rid} onClick={() => onRoom(rid)} style={{ fontSize: 9, padding: "1px 5px", background: "#0a0f0a", border: `1px solid ${(CAT_COLORS[rm?.cat] || "#333")}44`, color: CAT_COLORS[rm?.cat] || "#555", cursor: "pointer", fontFamily: "monospace" }}>{rm?.name || rid}</span>; })}</div></div>}
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

function ZenodoDeposit({ mc, addLog, isMobile }) {
  const [zToken, setZToken] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [keywords, setKeywords] = useState("Crimson Hexagonal Archive, semantic economy");
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
          creators: [{ name: "Sharks, Lee", orcid: "0009-0000-1599-0703" }],
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
      <div style={{ fontSize: 10, color: "#5a6a4a", lineHeight: 1.6, marginBottom: 10 }}>One-click deposit pipeline. Token stays in session memory — never persisted or transmitted to any server except Zenodo.</div>
      <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#3a4a3a" }}>ZENODO TOKEN</div>
      <input value={zToken} onChange={(e) => setZToken(e.target.value)} type="password" placeholder="Zenodo personal access token" style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: "monospace", outline: "none", marginBottom: 10 }} />
      <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#3a4a3a" }}>TITLE</div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title (EA-XX-01)" style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: "monospace", outline: "none", marginBottom: 10 }} />
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

  const tabs = [{ id: "PENDING", label: "PENDING" }, { id: "COVERAGE", label: "COVERAGE" }, { id: "ZENODO", label: "ZENODO" }, { id: "DREAM", label: "DREAM" }, { id: "GRAVITY", label: "GW" }];

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
          <div style={{ fontSize: 10, color: "#5a6a4a", lineHeight: 1.6, marginBottom: 12 }}>First seam only: create provenance chains, then route selected work toward external fixation.</div>
          <div style={{ marginBottom: 12, padding: "8px 10px", background: "#080c08", borderLeft: "2px solid #1a3a1a" }}>
            <div style={{ fontSize: 9, color: configured ? "#5a9f5a" : "#9f7a4a", marginBottom: 4, fontFamily: "monospace", wordBreak: "break-word" }}>{configured ? `GW URL: ${gravityWell.baseUrl}` : "VITE_GRAVITY_WELL_URL not set"}</div>
            <div style={{ fontSize: 9, color: "#4a5a4a" }}>Source: {selectedDoc ? `doc ${selectedDoc.id}` : selectedRoom ? `room ${selectedRoom.id}` : "none"}</div>
          </div>
          <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#3a4a3a" }}>API KEY</div>
          <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Gravity Well API key" style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: "monospace", outline: "none", marginBottom: 12 }} />
          <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#3a4a3a" }}>CHAIN LABEL</div>
          <input value={chainLabel} onChange={(e) => setChainLabel(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1a2a1a", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: "monospace", outline: "none", marginBottom: 10 }} />
          <button onClick={createChain} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "6px 10px", fontSize: 9, cursor: "pointer", fontFamily: "monospace", marginBottom: 12 }}>CREATE CHAIN</button>
          {depositState.chain && <div style={{ padding: "8px 10px", background: "#080c08", borderLeft: "2px solid #1a3a1a", marginBottom: 12 }}><div style={{ fontSize: 9, color: "#5a9f5a", fontFamily: "monospace", marginBottom: 4 }}>CHAIN READY</div><div style={{ fontSize: 9, color: "#4a5a4a", wordBreak: "break-word" }}>chain_id: {depositState.chain.chain_id}</div></div>}
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
  const [view, setView] = useState("MAP");
  const [search, setSearch] = useState("");
  const [log, setLog] = useState([]);
  const [gwApiKey, setGwApiKey] = useState("");
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
  const [trails, setTrails] = useState([]);
  const [activeTrail, setActiveTrail] = useState(null);
  const [trailStep, setTrailStep] = useState(0);
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
    fetch(DATA_URL).then((r) => r.json()).then((d) => {
      const rooms = (d.rooms || []).map(normalizeRoom);
      const documents = (d.documents || []).map(normalizeDoc);
      const relations = (d.relations || []).map(normalizeRelation);
      const edges = (d.edges || []).map((e, i) => ({ id: e.id || `edge-${i}`, from: e.from, to: e.to, type: e.type || "adjacent" }));
      setData({ ...d, rooms, documents, relations, edges });
      setLoading(false);
      addLog(`H_core loaded: ${rooms.length} rooms, ${documents.length} deposits, ${relations.length} relations`);
    }).catch((e) => { setError(e.message); setLoading(false); });
  }, [addLog]);

  const mc = arkMode ? (ARK_MODE_COLORS[arkMode] || MODE_COLORS[mode] || "#c9a84c") : (MODE_COLORS[mode] || "#c9a84c");
  const room = useMemo(() => data?.rooms.find((r) => r.id === selRoom) || null, [data, selRoom]);

  const handleRoomSelect = useCallback((id) => {
    setSelRoom(id); setSelDoc(null);
    const target = data?.rooms.find((r) => r.id === id);
    if (target) executeTraversal(target);
  }, [data, executeTraversal]);

  const searchResults = useMemo(() => {
    if (!data || !search.trim()) return [];
    const q = search.toLowerCase();
    return data.documents.filter((d) => d.t.toLowerCase().includes(q) || d.k.some((k) => String(k).toLowerCase().includes(q)) || d.c.some((c) => String(c).toLowerCase().includes(q)) || String(d.e || "").toLowerCase().includes(q)).slice(0, 30);
  }, [data, search]);

  if (loading) return <div style={{ height: "100dvh", background: "#0a0d12", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia,serif" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 14, letterSpacing: 4, color: "#c9a84c", marginBottom: 8 }}>CRIMSON HEXAGONAL ARCHIVE</div><div style={{ fontSize: 10, color: "#3a4a3a", letterSpacing: 2 }}>loading canonical JSON…</div></div></div>;
  if (error) return <div style={{ height: "100dvh", background: "#0a0d12", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}><div style={{ color: "#9f5a5a", fontSize: 11 }}>LOAD ERROR: {error}</div></div>;

  if (!mode) return (
    <div style={{ height: "100dvh", background: "#0a0d12", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia,serif", padding: 16 }}>
      <div style={{ textAlign: "center", maxWidth: 540 }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: "#3a4a3a", marginBottom: 4 }}>H_core · LOS · {data.meta?.total_deposits || data.documents.length} DEPOSITS</div>
        <div style={{ fontSize: isMobile ? 18 : 22, letterSpacing: 3, color: "#c9a84c", marginBottom: 4 }}>Crimson Hexagonal Archive</div>
        <div style={{ fontSize: 10, color: "#3a4a3a", marginBottom: 24 }}>{data.rooms.length} rooms · {data.documents.length} indexed · {data.relations.length} relations</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          {[["ANALYTIC", "Observe · Navigate · Trace provenance"], ["OPERATIVE", "Generate · Invoke · Transform"], ["AUDIT", "Govern · Witness · Promote"]].map(([m, desc]) => (
            <button key={m} onClick={() => { setMode(m); addLog(`Mode: ${m}`); }} style={{ background: "transparent", border: `1px solid ${MODE_COLORS[m]}44`, color: MODE_COLORS[m], padding: "14px 18px", fontSize: 11, letterSpacing: 2, cursor: "pointer", fontFamily: "monospace", textAlign: "center" }}>
              <div>{m}</div><div style={{ fontSize: 9, color: "#3a4a3a", marginTop: 5, lineHeight: 1.5 }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const navItems = [{ id: "MAP", label: "MAP" }, { id: "LIBRARY", label: "LIBRARY" }, { id: "TRAILS", label: "TRAILS" }, { id: "DEPOSIT", label: "DEPOSIT" }, { id: "DODECAD", label: "DODECAD" }, { id: "HCORE", label: "H_core" }, { id: "ASSEMBLY", label: "ASSEMBLY" }];

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
                  {libMode === "SEARCH" ? `FORWARD LIBRARY · ${data.documents.length} DEPOSITS` : `TRAIL BUILDER${trail.name ? ` · ${trail.name}` : ""}`}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {["SEARCH", "TRAIL"].map(m => (
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

        {/* Detail panel */}
        <div style={{ width: isMobile ? "100%" : 340, minWidth: 0, height: isMobile ? "34dvh" : "100%", minHeight: isMobile ? 220 : 0, maxHeight: isMobile ? "42dvh" : "none", borderLeft: isMobile ? "none" : "1px solid #0f1a0f", borderTop: isMobile ? "1px solid #0f1a0f" : "none", overflow: "hidden", flexShrink: 0, background: "#0a0d12" }}>
          {selDoc ? <DocPanel doc={selDoc} rooms={data.rooms} onRoom={(id) => { handleRoomSelect(id); setSelDoc(null); setView("MAP"); }} mc={mc} isMobile={isMobile} readState={readState} onRead={handleRead} /> : room ? <RoomPanel room={room} docs={data.documents} relations={data.relations} onDoc={(d) => setSelDoc(d)} isMobile={isMobile} mc={mc} /> : <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}><div style={{ fontSize: 9, letterSpacing: 2, color: "#3a4a3a", marginBottom: 6 }}>{view === "DEPOSIT" ? "DEPOSIT BRIDGE" : `${mode} COMMANDS`}</div>
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
