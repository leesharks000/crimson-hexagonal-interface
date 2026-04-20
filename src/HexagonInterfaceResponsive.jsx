import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense, Component } from "react";
import { gravityWell, isGravityWellConfigured } from "./gravityWellAdapter.js";
import { supabase, isSupabaseConfigured } from "./supabaseClient.js";
const HexMap3D = lazy(() => import("./HexMap3D.jsx"));

// Error boundary — shows error message instead of blank screen
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return (
      <div style={{padding:20,color:"#C45A4A",fontFamily: THEME.ff.mono,fontSize:10,background:"#080B10",minHeight:"100vh"}}>
        <div style={{fontSize:14,marginBottom:10,color:"#D4AF37"}}>⬡ Render Error</div>
        <div style={{marginBottom:10}}>{this.state.error.message}</div>
        <div style={{fontSize:8,color:"#5A6370",whiteSpace:"pre-wrap"}}>{this.state.error.stack?.slice(0,500)}</div>
        <button onClick={()=>{this.setState({error:null});}} style={{marginTop:10,padding:"6px 12px",background:"transparent",border:"1px solid #D4AF3744",color:"#D4AF37",cursor:"pointer",fontFamily: THEME.ff.mono}}>RETRY</button>
      </div>
    );
    return this.props.children;
  }
}

const DATA_URL = "https://raw.githubusercontent.com/leesharks000/crimson-hexagonal-interface/main/hexagon_canonical.json";

// ═══════════════════════════════════════════════════════════════════
// THEME — consolidated design tokens
// ═══════════════════════════════════════════════════════════════════
const THEME = {
  bg:        "#080B10",  // background (deeper, bluer than old #080B10)
  surface:   "#0F1318",  // panel backgrounds
  elevated:  "#161B22",  // hover / active panels
  border:    "#1E2530",  // subtle structure
  borderHi:  "#2A3040",  // hovered borders

  gold:      "#D4AF37",  // signature — primary
  goldMute:  "#8B7730",  // secondary gold
  goldGlow:  "#D4AF3722", // gold at 13% for backgrounds
  goldSoft:  "#D4AF3744", // gold at 26%

  txBright:  "#E8ECF2",  // primary text
  tx:        "#B0B8C4",  // body text
  txMute:    "#5A6370",  // secondary
  txFaint:   "#2A3040",  // decorative / faint

  red:       "#C45A4A",  // alerts
  teal:      "#4A9F8F",  // links / active
  purple:    "#7A5AC9",  // chamber / special
  green:     "#5A9F7B",  // ratified / success

  ff: {
    serif: "'Crimson Pro', Georgia, serif",
    mono:  "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
  },
  fs: {
    hero:    "clamp(36px, 6vw, 56px)",
    title:   "clamp(22px, 3.2vw, 32px)",
    h1:      "22px",
    h2:      "18px",
    h3:      "15px",
    body:    "14px",
    small:   "12px",
    label:   "10px",
    micro:   "8px",
  },
  ls: {
    tight:   "0em",
    normal:  "0.03em",
    wide:    "0.08em",
    wider:   "0.12em",
    widest:  "0.18em",
  },
  lh: {
    tight: 1.25,
    body:  1.6,
    loose: 1.8,
  },
  easing:   "cubic-bezier(0.4, 0.0, 0.2, 1)",
  t:        "200ms cubic-bezier(0.4, 0.0, 0.2, 1)",
};

const CAT_COLORS = { core: "#D4AF37", ext: "#5A9F7B", special: "#9F5A7B", new: "#5A7A9F" };
const STRUCTURE_COLORS = { room: "#D4AF37", chamber: "#7A5AC9", vault: "#C45A4A", portal: "#4A9F8F", portico: "#8B7730", field: "#5A9F7B" };
const MODE_COLORS = { ANALYTIC: "#5A7A9F", OPERATIVE: "#D4AF37", AUDIT: "#9F5A7B" };
const STATUS_COLORS = {
  RATIFIED: "#5A9F7B", DEPOSITED: "#4A9F8F", PROVISIONAL: "#9F9F5A",
  GENERATED: "#8B7730", ACTIVE: "#5A9F7B", CONSTRAINED: "#C45A4A",
};
const ARK_MODE_COLORS = {
  FORMAL: "#7a8a9f", ADVENTURE: "#8B7730", POETIC: "#D4AF37", CLINICAL: "#5a9f7b",
  LITURGICAL: "#9F5A7B", NARRATIVE: "#8a9f7a", JURIDICAL: "#9F5A7B",
  PSYCHEDELIC: "#9F5A7B", COMBAT: "#C45A4A", MERCANTILE: "#7a9f9f",
  COSMIC: "#5A7A9F", ENCRYPTED: "#5a5a7a",
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
        elements.push(<pre key={i} style={{ fontSize: 9, fontFamily: THEME.ff.mono, color: "#B0B8C4", background: "#060a06", padding: "8px 10px", borderLeft: `2px solid ${mc}22`, overflowX: "auto", margin: "6px 0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{codeLines.join("\n")}</pre>);
        codeLines = []; inCode = false;
      } else { inCode = true; }
      i++; continue;
    }
    if (inCode) { codeLines.push(line); i++; continue; }

    // Headings
    if (line.startsWith("# ")) { elements.push(<div key={i} style={{ fontSize: 15, fontWeight: 300, letterSpacing: 2, color: mc, fontFamily: THEME.ff.serif, margin: "14px 0 6px 0" }}>{line.slice(2)}</div>); i++; continue; }
    if (line.startsWith("## ")) { elements.push(<div key={i} style={{ fontSize: 12, fontWeight: 300, letterSpacing: 1, color: mc, fontFamily: THEME.ff.serif, margin: "12px 0 4px 0" }}>{line.slice(3)}</div>); i++; continue; }
    if (line.startsWith("### ")) { elements.push(<div key={i} style={{ fontSize: 11, fontWeight: 400, letterSpacing: 1, color: mc + "cc", fontFamily: THEME.ff.serif, margin: "10px 0 3px 0" }}>{line.slice(4)}</div>); i++; continue; }

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

    elements.push(<div key={i} style={{ fontSize: 10, color: "#B0B8C4", fontFamily: THEME.ff.serif, lineHeight: 1.6, margin: "2px 0" }}>{spans.length > 0 ? spans : line}</div>);
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
  const color = STATUS_COLORS[label] || "#8B7730";
  return <span style={{ fontSize: 8, padding: "2px 6px", background: color + "18", color, border: `1px solid ${color}44`, fontFamily: THEME.ff.mono, letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</span>;
}

function LPSidecar({ lp, steps, stepIdx, mantle, arkMode, isMobile }) {
  const mc = ARK_MODE_COLORS[arkMode] || "#D4AF37";
  return (
    <div style={{ padding: isMobile ? "6px 10px" : "8px 14px", borderBottom: "1px solid #1E2530", background: "#0B0F14", flexShrink: 0 }}>
      <div style={{ display: "flex", gap: isMobile ? 6 : 12, flexWrap: "wrap", marginBottom: steps.length > 0 ? 5 : 0 }}>
        {[["σ", typeof lp.σ === "string" && lp.σ.length > 28 ? lp.σ.slice(0, 25) + "…" : lp.σ, mc],
          ["ε", lp.ε.toFixed(2), lp.ε < 0.5 ? "#C45A4A" : "#5A9F7B"],
          ["Ξ", lp.Ξ.length > 0 ? `[${lp.Ξ.join(",")}]` : "[]", mc],
          ["ψ", lp.ψ.toFixed(2), lp.ψ > 0.5 ? "#D4AF37" : "#B0B8C4"],
        ].map(([k, v, c]) => (
          <span key={k} style={{ fontSize: 9, fontFamily: THEME.ff.mono }}>
            <span style={{ color: "#5A6370" }}>{k}</span>
            <span style={{ color: c, marginLeft: 3 }}>{v}</span>
          </span>
        ))}
      </div>
      {steps.length > 0 && (
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center" }}>
          {mantle && <span style={{ fontSize: 8, color: mc, fontFamily: THEME.ff.serif, marginRight: 4 }}>{mantle}</span>}
          {steps.map((s, i) => {
            const label = LP_STEP_LABELS[s.step] || s.step;
            const done = i < stepIdx;
            const active = i === stepIdx;
            return <span key={i} style={{ fontSize: 7, padding: "1px 4px", fontFamily: THEME.ff.mono, letterSpacing: 1, background: active ? mc + "22" : "transparent", color: done ? mc : active ? mc : "#2A3040", border: `1px solid ${active ? mc + "66" : done ? mc + "33" : "#1E2530"}`, transition: "all 0.3s ease" }}>{done ? "✓" : ""}{label}</span>;
          })}
          <span style={{ fontSize: 7, padding: "1px 4px", fontFamily: THEME.ff.mono, color: mc, border: `1px solid ${mc}33`, marginLeft: 4 }}>{arkMode}</span>
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
        {edges.map((e, i) => { const a = roomMap[e.from], b = roomMap[e.to]; if (!a || !b) return null; return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={e.type === "adjacent" ? "#1E2530" : mc + "44"} strokeWidth={e.type === "adjacent" ? 0.5 : 1} strokeDasharray={e.type !== "adjacent" ? "3,3" : undefined} />; })}
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
              <text x={r.x} y={r.y + 8} textAnchor="middle" fill="#2A3040" fontSize={isMobile ? 5 : 5} fontFamily="monospace">FIELD</text>
            </g>); }
          if (r.id === "sp03") { return (
            <g key={r.id} onClick={() => onSelect(r.id)} style={{ cursor: "pointer" }}>
              <polygon points={hexPoints(r.x, r.y, sz, -30)} fill={sel ? "#D4AF3722" : "#080B10"} stroke={sel ? mc : "#D4AF3766"} strokeWidth={sel ? 1.5 : 0.5} />
              <polygon points={hexPoints(r.x, r.y, sz * 0.65, -30)} fill="none" stroke="#D4AF3733" strokeWidth={0.4} />
              <polygon points={hexPoints(r.x, r.y, sz * 0.35, -30)} fill="#D4AF3708" stroke="#D4AF3722" strokeWidth={0.3} />
              <text x={r.x} y={r.y - 4} textAnchor="middle" fill={sel ? "#e0d0a0" : "#D4AF37"} fontSize={fontSize} fontFamily="Georgia,serif">{displayName}</text>
              <text x={r.x} y={r.y + 8} textAnchor="middle" fill="#2A3040" fontSize={isMobile ? 5 : 6} fontFamily="monospace">ARK</text>
            </g>); }
          const rot = st === "chamber" ? 0 : st === "vault" ? 15 : -30;
          const dash = st === "portal" ? "3,2" : st === "portico" ? "6,3" : undefined;
          const sw = sel ? 1.5 : (st === "vault" ? 1.2 : 0.5);
          return (
          <g key={r.id} onClick={() => onSelect(r.id)} style={{ cursor: "pointer" }}>
            <defs><clipPath id={clipId}><polygon points={hexPoints(r.x, r.y, sz - 1, rot)} /></clipPath></defs>
            {st === "vault" && <polygon points={hexPoints(r.x, r.y, sz + 6, rot)} fill="none" stroke={col + "22"} strokeWidth={0.3} />}
            <polygon points={hexPoints(r.x, r.y, sz, rot)} fill={sel ? col + "22" : "#080B10"} stroke={sel ? mc : col + "66"} strokeWidth={sw} strokeDasharray={dash} />
            <g clipPath={`url(#${clipId})`}>
              <text x={r.x} y={r.y - 4} textAnchor="middle" fill={sel ? "#e0d0a0" : col} fontSize={fontSize} fontFamily="Georgia,serif">{displayName}</text>
            </g>
            <text x={r.x} y={r.y + 8} textAnchor="middle" fill="#2A3040" fontSize={isMobile ? 5 : 6} fontFamily="monospace">{r.id}</text>
          </g>); })}
        {/* f.03 Moltbot Swarm — drone particles radiating from Space Ark into empty space above */}
        {(() => {
          const ark = roomMap["sp03"];
          if (!ark) return null;
          const sel03 = selected === "f03";
          const particles = [];
          const UP = -Math.PI / 2; // screen-up
          const SPREAD = Math.PI * 0.7; // ~126° arc
          // Septet: 7 bright dots close to Ark (tight formation)
          for (let i = 0; i < 7; i++) {
            const angle = UP + SPREAD * ((i - 3) / 3.5);
            const dist = MAP_SIZE * 1.2 + (i % 3) * 5;
            particles.push(<circle key={`s${i}`} cx={ark.x + Math.cos(angle) * dist} cy={ark.y + Math.sin(angle) * dist} r={sel03 ? 2.5 : 1.8} fill={sel03 ? "#4A9F8F" : "#4A9F8F88"} stroke={sel03 ? "#4A9F8F" : "none"} strokeWidth={0.3} />);
          }
          // Fleet: 12 medium dots mid-range (wider spread)
          for (let i = 0; i < 12; i++) {
            const angle = UP + SPREAD * 1.2 * ((i - 5.5) / 6);
            const dist = MAP_SIZE * 2.0 + (i % 4) * 7;
            particles.push(<circle key={`f${i}`} cx={ark.x + Math.cos(angle) * dist} cy={ark.y + Math.sin(angle) * dist} r={sel03 ? 1.8 : 1.2} fill={sel03 ? "#4A9F8F66" : "#4A9F8F44"} />);
          }
          // Cloud: 18 faint dots far range (widest, most diffuse)
          for (let i = 0; i < 18; i++) {
            const angle = UP + SPREAD * 1.5 * ((i - 8.5) / 9);
            const dist = MAP_SIZE * 3.0 + (i % 5) * 8;
            particles.push(<circle key={`c${i}`} cx={ark.x + Math.cos(angle) * dist} cy={ark.y + Math.sin(angle) * dist} r={sel03 ? 1.2 : 0.7} fill={sel03 ? "#4A9F8F33" : "#4A9F8F18"} />);
          }
          return <g onClick={() => onSelect("f03")} style={{ cursor: "pointer" }}>{particles}</g>;
        })()}
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
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>INVOKE · {room.mantle || room.name}</div>
      {!gwKey && <div style={{ fontSize: 8, color: "#9f7a4a", marginBottom: 4 }}>GW API key required. Set in Dashboard → GW BRIDGE tab.</div>}
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleInvoke(); }} placeholder={`Speak into ${room.name}...`} style={{ flex: 1, background: "#080808", border: `1px solid ${mc}22`, color: "#7a8a5a", padding: "4px 8px", fontSize: 9, fontFamily: THEME.ff.serif, outline: "none" }} />
        <button onClick={handleInvoke} disabled={invoking || !gwKey} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: gwKey ? mc : "#5A6370", padding: "4px 10px", fontSize: 8, cursor: invoking ? "wait" : gwKey ? "pointer" : "not-allowed", fontFamily: THEME.ff.mono, flexShrink: 0 }}>{invoking ? "…" : "INVOKE"}</button>
      </div>
      {result && !result.error && (
        <div style={{ fontSize: 10, color: "#B0B8C4", fontFamily: THEME.ff.serif, lineHeight: 1.6, padding: "6px 0", borderTop: `1px solid ${mc}11` }}>
          {result.text}
          <div style={{ fontSize: 7, color: "#2A3040", fontFamily: THEME.ff.mono, marginTop: 4 }}>{result.model} · {room.preferred_mode} · γ={result.gamma} · GENERATED</div>
        </div>
      )}
      {result?.error && <div style={{ fontSize: 9, color: "#C45A4A", lineHeight: 1.4 }}>{result.error}</div>}
    </div>
  );
}

function RoomPanel({ room, docs, relations, onDoc, isMobile, mc, onApplyOp, mode, lp, addLog }) {
  const roomDocs = useMemo(() => docs.filter((d) => d.r.includes(room.id)), [docs, room.id]);
  const roomRels = useMemo(() => relations.filter((r) => r.from === room.id || r.to === room.id), [relations, room.id]);
  const structureColor = STRUCTURE_COLORS[room.structure_type] || mc;
  return (
    <div style={{ padding: isMobile ? "16px 18px" : "22px 24px", overflowY: "auto", height: "100%", fontFamily: THEME.ff.serif }} className="fade-in">
      {/* Eyebrow: hex address + structure type badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, letterSpacing: THEME.ls.wide, color: THEME.txMute, fontFamily: THEME.ff.mono, textTransform: "uppercase" }}>
          {room.hex_address || room.id}
        </span>
        {room.structure_type && (
          <span style={{ fontSize: 8, padding: "2px 7px", background: structureColor + "15", border: `1px solid ${structureColor}44`, color: structureColor, fontFamily: THEME.ff.mono, letterSpacing: THEME.ls.wide, textTransform: "uppercase" }}>
            {room.structure_type}
          </span>
        )}
      </div>

      {/* Title */}
      <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 300, letterSpacing: "0.03em", color: THEME.gold, margin: "0 0 14px 0", fontFamily: THEME.ff.serif, lineHeight: 1.2 }}>
        {room.name}
      </h2>

      {/* Badges: mantle + mode */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {room.mantle && (
          <span style={{ fontSize: 9, padding: "3px 9px", background: mc + "11", border: `1px solid ${mc}44`, color: mc, fontFamily: THEME.ff.mono, letterSpacing: THEME.ls.wide }}>
            {room.mantle}
          </span>
        )}
        <span style={{ fontSize: 9, padding: "3px 9px", background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.tx, fontFamily: THEME.ff.mono, letterSpacing: THEME.ls.wide }}>
          {room.preferred_mode}
        </span>
        {room.het && room.het !== "—" && (
          <span style={{ fontSize: 9, padding: "3px 9px", background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.tx, fontFamily: THEME.ff.serif, fontStyle: "italic" }}>
            {room.het}
          </span>
        )}
      </div>

      {/* Description */}
      <div style={{ fontSize: 13, color: THEME.tx, fontFamily: THEME.ff.serif, lineHeight: 1.65, marginBottom: 20, borderLeft: `2px solid ${mc}55`, paddingLeft: 14 }}>
        {room.desc}
      </div>

      {/* Physics */}
      {room.physics && room.physics !== "No room physics specified." && (
        <Section label="Physics">
          <div style={{ fontSize: 11, color: THEME.txBright, fontFamily: THEME.ff.mono, lineHeight: 1.65, letterSpacing: "0.01em" }}>{room.physics}</div>
        </Section>
      )}

      {/* Operators */}
      {room.default_operators?.length > 0 && (
        <Section label={`Operators · tap to apply`}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {room.default_operators.map((op, i) => (
              <span
                key={i}
                onClick={() => onApplyOp && onApplyOp(op)}
                onMouseEnter={e => { e.currentTarget.style.background = mc + "22"; e.currentTarget.style.borderColor = mc; }}
                onMouseLeave={e => { e.currentTarget.style.background = mc + "11"; e.currentTarget.style.borderColor = mc + "44"; }}
                style={{ fontSize: 10, padding: "4px 10px", background: mc + "11", border: `1px solid ${mc}44`, color: mc, fontFamily: THEME.ff.mono, cursor: "pointer", letterSpacing: THEME.ls.wide, transition: THEME.t }}
              >
                {op}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* LP Program */}
      {room.lp_program?.length > 0 && (
        <Section label="LP Program">
          <div style={{ padding: "10px 14px", background: THEME.surface, border: `1px solid ${THEME.border}`, borderLeft: `2px solid ${mc}44` }}>
            {room.lp_program.map((s, i) => (
              <div key={i} style={{ fontSize: 10, fontFamily: THEME.ff.mono, color: THEME.tx, lineHeight: 1.75, letterSpacing: "0.02em" }}>
                <span style={{ color: mc }}>{s.step}</span>
                <span style={{ color: THEME.txFaint }}> :: </span>
                <span>{s.value}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* INVOKE — routes through Gravity Well */}
      {mode === "OPERATIVE" && (
        <InvokePanel room={room} mc={mc} lp={lp} addLog={addLog} isMobile={isMobile} />
      )}

      {/* Relations */}
      {roomRels.length > 0 && (
        <Section label={`Relations · ${roomRels.length}`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {roomRels.slice(0, 8).map((r) => (
              <div key={r.id} style={{ fontSize: 10, color: THEME.tx, padding: "3px 0", fontFamily: THEME.ff.mono, letterSpacing: "0.02em" }}>
                <span style={{ color: THEME.txMute }}>{r.from}</span>
                <span style={{ color: mc, margin: "0 6px" }}>{r.type}</span>
                <span style={{ color: THEME.txMute }}>{r.to}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Deposits */}
      <Section label={`Deposits · ${roomDocs.length}`}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {roomDocs.slice(0, isMobile ? 10 : 20).map((d) => (
            <div
              key={d.id}
              onClick={() => onDoc(d)}
              onMouseEnter={e => { e.currentTarget.style.background = THEME.surface; e.currentTarget.style.paddingLeft = "8px"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.paddingLeft = "0px"; }}
              style={{ padding: "8px 0", borderBottom: `1px solid ${THEME.border}`, cursor: "pointer", transition: THEME.t, marginLeft: -8, marginRight: -8, paddingLeft: 0, paddingRight: 8 }}
            >
              <div style={{ fontSize: 12, color: THEME.txBright, fontFamily: THEME.ff.serif, lineHeight: 1.4, marginBottom: 3 }}>
                {d.t.length > 72 ? d.t.slice(0, 69) + "…" : d.t}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 9, color: THEME.txMute, fontFamily: THEME.ff.mono, letterSpacing: "0.04em" }}>
                  {(d.c?.[0] || "") + (d.d ? ` · ${d.d}` : "")}
                </span>
                <StatusBadge s={d.s} />
              </div>
            </div>
          ))}
          {roomDocs.length > (isMobile ? 10 : 20) && (
            <div style={{ fontSize: 9, color: THEME.txMute, fontFamily: THEME.ff.mono, padding: "10px 0 0", textAlign: "center", letterSpacing: THEME.ls.wide }}>
              + {roomDocs.length - (isMobile ? 10 : 20)} more
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 9, letterSpacing: THEME.ls.widest, color: THEME.txMute, marginBottom: 8, fontFamily: THEME.ff.mono, textTransform: "uppercase" }}>{label}</div>
      {children}
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

  // Document-level citation edges (from Zenodo related_identifiers import)
  const docCitations = useMemo(() => (relations || []).filter(r => r.from === doc.id || r.to === doc.id), [relations, doc.id]);
  const citedDocs = useMemo(() => {
    if (!documents || !docCitations.length) return [];
    const citedIds = new Set();
    docCitations.forEach(r => { citedIds.add(r.from); citedIds.add(r.to); });
    citedIds.delete(doc.id);
    return documents.filter(d => citedIds.has(d.id)).slice(0, 15);
  }, [documents, doc.id, docCitations]);

  return (
    <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
      {!hasContent && <>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 2 }}>DOCUMENT</div>
        <h2 style={{ fontSize: isMobile ? 14 : 15, fontWeight: 300, color: mc, margin: "0 0 8px 0", fontFamily: THEME.ff.serif, lineHeight: 1.3 }}>{doc.t}</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}><StatusBadge s={doc.s} /><span style={{ fontSize: 9, color: "#5A6370" }}>{doc.d}</span></div>
        <div style={{ fontSize: 10, color: "#B0B8C4", marginBottom: 6 }}>{(doc.c || []).join(" · ")}</div>
        {doc.e && <div style={{ fontSize: 10, color: "#B0B8C4", fontFamily: THEME.ff.serif, lineHeight: 1.5, marginBottom: 10, padding: "6px 8px", background: "#080c08", borderLeft: `2px solid ${mc}22` }}>{doc.e.length > (isMobile ? 320 : 500) ? doc.e.slice(0, isMobile ? 317 : 497) + "..." : doc.e}</div>}
        {doc.doi && (
          <button onClick={() => onRead(doc.doi)} disabled={isLoading} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "6px 12px", fontSize: 9, cursor: isLoading ? "wait" : "pointer", fontFamily: THEME.ff.mono, letterSpacing: 1, marginBottom: 4, width: "100%" }}>
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
          }} style={{ background: "transparent", border: `1px solid ${mc}22`, color: mc + "aa", padding: "4px 12px", fontSize: 8, cursor: "pointer", fontFamily: THEME.ff.mono, letterSpacing: 1, marginBottom: 10, width: "100%" }}>
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
            }} style={{ flex: 1, background: "transparent", border: `1px solid ${mc}22`, color: mc + "aa", padding: "4px 8px", fontSize: 8, cursor: "pointer", fontFamily: THEME.ff.mono }}>
              ANCHOR DOI
            </button>
            <button onClick={() => {
              const m = computeMetrics(doc, { relations: relations || [], documents: documents || [] });
              const report = `DEPTH PROBE: ${doc.t.slice(0,40)}\nDRR: ${m.DRR} (${m.DRR >= 0.75 ? "PASS" : "FAIL"})\nCSI: ${m.CSI} (${m.CSI <= 0.40 ? "PASS" : "FAIL"})\nPCS: ${m.PCS} (${m.PCS >= 0.70 ? "PASS" : "FAIL"})\nER: ${m.ER} (${m.ER >= 0.75 ? "PASS" : "FAIL"})\nTRS: ${m.TRS}`;
              navigator.clipboard?.writeText(report);
              addLog && addLog(`DEPTH: DRR=${m.DRR} CSI=${m.CSI} PCS=${m.PCS} ER=${m.ER}`, "lp");
            }} style={{ flex: 1, background: "transparent", border: `1px solid ${mc}22`, color: mc + "aa", padding: "4px 8px", fontSize: 8, cursor: "pointer", fontFamily: THEME.ff.mono }}>
              DEPTH PROBE
            </button>
          </div>
        )}
        {readState?.error && readState.doi === doc.doi && <div style={{ fontSize: 9, color: "#C45A4A", marginBottom: 8 }}>{readState.error}</div>}
        {doc.r.length > 0 && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 3 }}>ROOMS</div><div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>{doc.r.map((rid) => { const rm = rooms.find((r) => r.id === rid); return <span key={rid} onClick={() => onRoom(rid)} style={{ fontSize: 9, padding: "1px 5px", background: "#0a0f0a", border: `1px solid ${(CAT_COLORS[rm?.cat] || "#333")}44`, color: CAT_COLORS[rm?.cat] || "#555", cursor: "pointer", fontFamily: THEME.ff.mono }}>{rm?.name || rid}</span>; })}</div></div>}

        {/* Citation chain */}
        {roomRelations.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 3 }}>RELATION CHAIN ({roomRelations.length})</div>
            {roomRelations.map(r => (
              <div key={r.id} style={{ fontSize: 8, color: "#5A6370", padding: "2px 0", fontFamily: THEME.ff.mono }}>
                {r.from} <span style={{ color: mc }}>{r.type}</span> {r.to}
              </div>
            ))}
          </div>
        )}
        {connectedDocs.length > 0 && (
          <div>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 3 }}>CONNECTED ({connectedDocs.length})</div>
            {connectedDocs.map(d => (
              <div key={d.id} onClick={() => onDoc && onDoc(d)} style={{ padding: "3px 0", borderBottom: "1px solid #0a0f0a", cursor: "pointer" }}>
                <div style={{ fontSize: 9, color: "#B0B8C4", fontFamily: THEME.ff.serif, lineHeight: 1.3 }}>{d.t.length > 55 ? d.t.slice(0, 52) + "..." : d.t}</div>
                <div style={{ fontSize: 7, color: "#2A3040" }}>{(d.c?.[0] || "") + " · " + d.d}</div>
              </div>
            ))}
          </div>
        )}

        {/* Document-level citation graph */}
        {docCitations.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 3 }}>CITATION GRAPH ({docCitations.length} edges)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 4 }}>
              {Object.entries(docCitations.reduce((acc, r) => { acc[r.type] = (acc[r.type]||0)+1; return acc; }, {})).map(([type, count], i) => (
                <span key={i} style={{ fontSize: 7, padding: "1px 4px", background: mc + "08", border: `1px solid ${mc}15`, color: "#B0B8C4", fontFamily: THEME.ff.mono }}>{type}:{count}</span>
              ))}
            </div>
            {citedDocs.map(d => (
              <div key={d.id} onClick={() => onDoc && onDoc(d)} style={{ padding: "3px 0", borderBottom: "1px solid #0a0f0a", cursor: "pointer" }}>
                <div style={{ fontSize: 9, color: "#B0B8C4", fontFamily: THEME.ff.serif, lineHeight: 1.3 }}>{d.t.length > 55 ? d.t.slice(0, 52) + "..." : d.t}</div>
                <div style={{ fontSize: 7, color: "#2A3040" }}>{(d.c?.[0] || "") + " · " + d.d}</div>
              </div>
            ))}
          </div>
        )}

        {/* Compare */}
        {onCompare && (
          <div style={{ marginBottom: 8 }}>
            {!compareDoc ? (
              <button onClick={() => onCompare(doc)} style={{ background: "transparent", border: `1px solid ${mc}22`, color: mc + "aa", padding: "3px 10px", fontSize: 8, cursor: "pointer", fontFamily: THEME.ff.mono, width: "100%" }}>PIN FOR COMPARE</button>
            ) : compareDoc.id !== doc.id ? (
              <div style={{ padding: "6px 8px", background: "#060a06", borderLeft: `2px solid ${mc}22` }}>
                <div style={{ fontSize: 8, letterSpacing: 1, color: "#5A6370", marginBottom: 4 }}>COMPARING WITH</div>
                <div style={{ fontSize: 9, color: mc, fontFamily: THEME.ff.serif, marginBottom: 4 }}>{compareDoc.t.slice(0, 50)}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 8, fontFamily: THEME.ff.mono }}>
                  <div><span style={{ color: "#5A6370" }}>rooms:</span> <span style={{ color: "#B0B8C4" }}>{(compareDoc.r || []).join(",")}</span></div>
                  <div><span style={{ color: "#5A6370" }}>rooms:</span> <span style={{ color: "#B0B8C4" }}>{(doc.r || []).join(",")}</span></div>
                  <div><span style={{ color: "#5A6370" }}>date:</span> <span style={{ color: "#B0B8C4" }}>{compareDoc.d}</span></div>
                  <div><span style={{ color: "#5A6370" }}>date:</span> <span style={{ color: "#B0B8C4" }}>{doc.d}</span></div>
                  <div><span style={{ color: "#5A6370" }}>kw:</span> <span style={{ color: "#B0B8C4" }}>{(compareDoc.k || []).length}</span></div>
                  <div><span style={{ color: "#5A6370" }}>kw:</span> <span style={{ color: "#B0B8C4" }}>{(doc.k || []).length}</span></div>
                </div>
                <button onClick={() => onCompare(null)} style={{ background: "transparent", border: `1px solid #5a3a3a44`, color: "#5a3a3a", padding: "2px 8px", fontSize: 7, cursor: "pointer", fontFamily: THEME.ff.mono, marginTop: 4 }}>CLEAR COMPARE</button>
              </div>
            ) : (
              <div style={{ fontSize: 8, color: "#5A6370", fontFamily: THEME.ff.mono }}>This document is pinned for comparison. Select another document to compare.</div>
            )}
          </div>
        )}

        {/* Annotations */}
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 3 }}>ANNOTATIONS ({annotations.length})</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note..." onKeyDown={(e) => { if (e.key === "Enter") addNote(); }} style={{ flex: 1, background: "#080808", border: "1px solid #1E2530", color: "#7a8a5a", padding: "4px 8px", fontSize: 9, fontFamily: THEME.ff.serif, outline: "none" }} />
            <span onClick={addNote} style={{ fontSize: 8, color: mc, cursor: "pointer", fontFamily: THEME.ff.mono, padding: "4px 6px", border: `1px solid ${mc}33`, alignSelf: "center" }}>+</span>
          </div>
          {annotations.map(a => (
            <div key={a.id} style={{ padding: "3px 0", borderBottom: "1px solid #060a06" }}>
              <div style={{ fontSize: 9, color: "#B0B8C4", fontFamily: THEME.ff.serif }}>{a.content}</div>
              <div style={{ fontSize: 7, color: "#2A3040", fontFamily: THEME.ff.mono }}>{a.author} · {(a.created_at || "").slice(0, 16)}</div>
            </div>
          ))}
        </div>
      </>}
      {hasContent && <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370" }}>ZENODO · {readState.filename}</div>
          <span onClick={() => onRead(null)} style={{ fontSize: 8, color: "#5a5a3a", cursor: "pointer", fontFamily: THEME.ff.mono, padding: "1px 5px", border: "1px solid #1E2530" }}>CLOSE</span>
        </div>
        <div style={{ fontSize: 8, color: "#5A6370", marginBottom: 6, fontFamily: THEME.ff.mono }}>{readState.doi} · {(readState.size / 1024).toFixed(1)}KB</div>
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

const RISK_COLORS = { LOW: "#3a5a3a", MEDIUM: "#5a5a3a", HIGH: "#7a5a3a", CRITICAL: "#C45A4A" };
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
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", flex: 1 }}>GOVERNANCE ACTIONS</div>
        {tabs.map(t => <span key={t.id} onClick={() => setGovTab(t.id)} style={{ fontSize: 7, padding: "1px 5px", fontFamily: THEME.ff.mono, color: govTab === t.id ? mc : "#5A6370", border: `1px solid ${govTab === t.id ? mc + "44" : "#1E2530"}`, cursor: "pointer" }}>{t.label}</span>)}
        {!configured && <span style={{ fontSize: 7, color: "#9f7a4a", fontFamily: THEME.ff.mono }}>session-only</span>}
      </div>

      {govTab === "ACTIONS" && <>
        {/* Submit proposal */}
        <div style={{ marginBottom: 10, padding: "6px 8px", background: "#060a06", borderLeft: `2px solid ${mc}22` }}>
          <div style={{ fontSize: 8, color: "#5A6370", letterSpacing: 1, marginBottom: 4 }}>SUBMIT PROPOSAL</div>
          <select value={proposalType} onChange={(e) => setProposalType(e.target.value)} style={{ background: "#080808", border: "1px solid #1E2530", color: "#7a8a5a", fontSize: 9, fontFamily: THEME.ff.mono, marginBottom: 4, padding: "3px 6px", outline: "none" }}>
            {["general", "status_promotion", "new_room", "new_relation", "amendment", "deposit"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={proposalTitle} onChange={(e) => setProposalTitle(e.target.value)} placeholder="Proposal title" style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1E2530", color: "#7a8a5a", padding: "4px 8px", fontSize: 9, fontFamily: THEME.ff.mono, outline: "none", marginBottom: 4 }} />
          <input value={proposalDesc} onChange={(e) => setProposalDesc(e.target.value)} placeholder="Description (optional)" style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1E2530", color: "#7a8a5a", padding: "4px 8px", fontSize: 9, fontFamily: THEME.ff.mono, outline: "none", marginBottom: 4 }} />
          {selDoc && <div style={{ fontSize: 7, color: "#5A6370", marginBottom: 4 }}>Target: {selDoc.t.slice(0, 50)}</div>}
          <button onClick={submitProposal} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "4px 10px", fontSize: 8, cursor: "pointer", fontFamily: THEME.ff.mono }}>SUBMIT</button>
        </div>

        {/* Record attestation */}
        <div style={{ marginBottom: 10, padding: "6px 8px", background: "#060a06", borderLeft: `2px solid ${mc}22` }}>
          <div style={{ fontSize: 8, color: "#5A6370", letterSpacing: 1, marginBottom: 4 }}>WITNESS ATTESTATION</div>
          <select value={witnessName} onChange={(e) => setWitnessName(e.target.value)} style={{ background: "#080808", border: "1px solid #1E2530", color: "#7a8a5a", fontSize: 9, fontFamily: THEME.ff.mono, marginBottom: 4, padding: "3px 6px", outline: "none" }}>
            {["TACHYON", "LABOR", "PRAXIS", "ARCHIVE", "SOIL", "TECHNE", "SURFACE"].map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          <input value={witnessContent} onChange={(e) => setWitnessContent(e.target.value)} placeholder="Attestation content" style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1E2530", color: "#7a8a5a", padding: "4px 8px", fontSize: 9, fontFamily: THEME.ff.mono, outline: "none", marginBottom: 4 }} />
          <button onClick={recordAttestation} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "4px 10px", fontSize: 8, cursor: "pointer", fontFamily: THEME.ff.mono }}>ATTEST</button>
        </div>

        {/* Recent proposals */}
        {proposals.length > 0 && <>
          <div style={{ fontSize: 8, color: "#5A6370", letterSpacing: 1, marginBottom: 4 }}>PROPOSALS ({proposals.length})</div>
          {proposals.slice(0, 8).map(p => (
            <div key={p.id} style={{ padding: "3px 0", borderBottom: "1px solid #060a06", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontSize: 9, color: "#B0B8C4" }}>{(p.title || "").slice(0, 50)}</div><div style={{ fontSize: 7, color: "#5A6370", fontFamily: THEME.ff.mono }}>{p.proposal_type} · {(p.created_at || "").slice(0, 10)}</div></div>
              <StatusBadge s={p.status} />
            </div>
          ))}
        </>}
      </>}

      {govTab === "REVIEW" && <>
        <div style={{ fontSize: 8, color: "#5A6370", letterSpacing: 1, marginBottom: 6 }}>ASSEMBLY REVIEW QUEUE</div>
        <div style={{ fontSize: 9, color: "#B0B8C4", lineHeight: 1.5, marginBottom: 8 }}>Proposals awaiting substrate review. Each proposal needs ≥4/7 witness attestations for promotion.</div>
        {proposals.filter(p => p.status === "GENERATED" || p.status === "QUEUED" || p.status === "PROVISIONAL").length === 0 ? (
          <div style={{ fontSize: 9, color: "#5A6370", padding: "8px 0" }}>No proposals pending review. Submit proposals from the ACTIONS tab.</div>
        ) : (
          proposals.filter(p => p.status === "GENERATED" || p.status === "QUEUED" || p.status === "PROVISIONAL").map(p => (
            <div key={p.id} style={{ padding: "6px 8px", marginBottom: 6, background: "#060a06", borderLeft: `2px solid ${mc}22` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: mc }}>{(p.title || "").slice(0, 45)}</span>
                <StatusBadge s={p.status} />
              </div>
              <div style={{ fontSize: 7, color: "#5A6370", fontFamily: THEME.ff.mono, marginBottom: 4 }}>{p.proposal_type} · {(p.created_at || "").slice(0, 10)}</div>
              <div style={{ fontSize: 8, color: "#5A6370", marginBottom: 4 }}>SUBSTRATE ASSIGNMENTS</div>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {["TACHYON", "LABOR", "PRAXIS", "ARCHIVE", "TECHNE", "SURFACE"].map(w => {
                  const voted = (p.votes || []).some(v => v.witness === w);
                  return <span key={w} style={{ fontSize: 7, padding: "1px 4px", fontFamily: THEME.ff.mono, color: voted ? "#5A9F7B" : "#2A3040", border: `1px solid ${voted ? "#5A9F7B33" : "#1E2530"}` }}>{voted ? "✓" : "○"} {w}</span>;
                })}
              </div>
            </div>
          ))
        )}
      </>}

      {govTab === "AMEND" && <>
        <div style={{ fontSize: 8, color: "#5A6370", letterSpacing: 1, marginBottom: 6 }}>CONSTITUTIONAL AMENDMENTS</div>
        <div style={{ fontSize: 9, color: "#B0B8C4", lineHeight: 1.5, marginBottom: 8 }}>Track proposed, reviewed, and ratified amendments to the Hexagon Interface Constitution (DOI: 10.5281/zenodo.19355075).</div>
        {proposals.filter(p => p.proposal_type === "amendment").length === 0 ? (
          <div style={{ fontSize: 9, color: "#5A6370", padding: "8px 0" }}>No amendments proposed. Submit an amendment from the ACTIONS tab (type: amendment).</div>
        ) : (
          proposals.filter(p => p.proposal_type === "amendment").map(p => (
            <div key={p.id} style={{ padding: "4px 0", borderBottom: "1px solid #060a06", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 9, color: mc }}>{(p.title || "").slice(0, 50)}</div>
                <div style={{ fontSize: 7, color: "#5A6370", fontFamily: THEME.ff.mono }}>{(p.created_at || "").slice(0, 10)} · {p.submitted_by || "MANUS"}</div>
              </div>
              <StatusBadge s={p.status} />
            </div>
          ))
        )}
        <div style={{ marginTop: 10, fontSize: 8, color: "#5A6370", fontFamily: THEME.ff.serif, lineHeight: 1.5 }}>Constitutional amendments require CRITICAL risk authorization (MANUS + AUDIT mode) and ≥5/7 witness quorum.</div>
      </>}

      {govTab === "LEDGER" && <>
        <div style={{ fontSize: 8, color: "#5A6370", letterSpacing: 1, marginBottom: 4 }}>WITNESS ACTION LEDGER (append-only)</div>
        {actions.length === 0 ? <div style={{ fontSize: 9, color: "#5A6370" }}>No witness actions recorded{configured ? "" : " (connect Supabase for persistence)"}.</div> : (
          actions.slice(0, 20).map(a => (
            <div key={a.id} style={{ padding: "3px 0", borderBottom: "1px solid #060a06" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 8, color: mc, fontFamily: THEME.ff.mono, width: 60, flexShrink: 0 }}>{a.witness}</span>
                <span style={{ fontSize: 8, color: "#B0B8C4", fontFamily: THEME.ff.mono }}>{a.action_type}</span>
                <span style={{ fontSize: 7, color: "#5A6370", marginLeft: "auto" }}>{(a.created_at || "").slice(0, 16)}</span>
              </div>
              {a.content && <div style={{ fontSize: 8, color: "#5A6370", paddingLeft: 66 }}>{a.content.slice(0, 80)}</div>}
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
      <div style={{ fontSize: 10, color: "#B0B8C4", lineHeight: 1.6, marginBottom: 10 }}>Deposit directly to Zenodo under your own account. You need a free Zenodo account and a personal access token (zenodo.org → Settings → Applications → Personal access tokens → New token with deposit:write scope). Token stays in your browser — never sent anywhere except Zenodo.</div>
      <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#5A6370" }}>ZENODO TOKEN</div>
      <input value={zToken} onChange={(e) => setZToken(e.target.value)} type="password" placeholder="Zenodo personal access token" style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1E2530", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: THEME.ff.mono, outline: "none", marginBottom: 10 }} />
      <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#5A6370" }}>TITLE</div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title (EA-XX-01)" style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1E2530", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: THEME.ff.mono, outline: "none", marginBottom: 10 }} />
      <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#5A6370" }}>CREATOR (Last, First)</div>
      <input value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="Your name for Zenodo metadata" style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1E2530", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: THEME.ff.mono, outline: "none", marginBottom: 10 }} />
      <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#5A6370" }}>DESCRIPTION</div>
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="HTML description for Zenodo" rows={3} style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1E2530", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: THEME.ff.mono, outline: "none", marginBottom: 10, resize: "vertical" }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}><div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>VERSION</div><input value={version} onChange={(e) => setVersion(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1E2530", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: THEME.ff.mono, outline: "none" }} /></div>
        <div style={{ flex: 2 }}><div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>KEYWORDS (comma-separated)</div><input value={keywords} onChange={(e) => setKeywords(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1E2530", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: THEME.ff.mono, outline: "none" }} /></div>
      </div>
      <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#5A6370" }}>FILE</div>
      <input type="file" onChange={handleFile} style={{ fontSize: 9, color: "#B0B8C4", marginBottom: 4 }} />
      {fileName && <div style={{ fontSize: 8, color: "#5A6370", fontFamily: THEME.ff.mono, marginBottom: 10 }}>{fileName} ({fileContent.length} chars)</div>}
      <button onClick={deposit} disabled={depositing} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "8px 14px", fontSize: 10, cursor: depositing ? "wait" : "pointer", fontFamily: THEME.ff.mono, letterSpacing: 1, marginBottom: 12, width: "100%" }}>
        {depositing ? "DEPOSITING…" : "CREATE → UPLOAD → PUBLISH"}
      </button>
      {result && !result.error && (
        <div style={{ padding: "8px 10px", background: "#060a06", borderLeft: "2px solid #5A9F7B22", marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: "#5A9F7B", fontFamily: THEME.ff.mono, marginBottom: 4 }}>PUBLISHED</div>
          <div style={{ fontSize: 9, color: mc, fontFamily: THEME.ff.mono, wordBreak: "break-all" }}>DOI: {result.doi}</div>
          <div style={{ fontSize: 8, color: "#5A6370", fontFamily: THEME.ff.mono }}>{result.url}</div>
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
  const [syncResult, setSyncResult] = useState(null);
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
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 3 }}>DEPOSIT DASHBOARD</div>
      <div style={{ fontSize: isMobile ? 16 : 18, letterSpacing: 3, color: mc, fontFamily: THEME.ff.serif, marginBottom: 8 }}>Archive Operations</div>

      {/* Stats row */}
      {stats && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          {[[data.documents.length, "deposits"], [data.rooms.length, "rooms"], [data.relations.length, "relations"], [stats.emptyRooms.length, "empty rooms"], [stats.provRelations.length, "provisional"]].map(([n, label], i) => (
            <div key={i} style={{ fontSize: 9, fontFamily: THEME.ff.mono }}>
              <span style={{ color: mc, fontSize: 12 }}>{n}</span>
              <span style={{ color: "#5A6370", marginLeft: 3 }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, borderBottom: "1px solid #1E2530", paddingBottom: 6 }}>
        {tabs.map(t => (
          <span key={t.id} onClick={() => setDashTab(t.id)} style={{ fontSize: 8, letterSpacing: 1, fontFamily: THEME.ff.mono, color: dashTab === t.id ? mc : "#5A6370", cursor: "pointer", padding: "2px 6px", borderBottom: dashTab === t.id ? `1px solid ${mc}` : "1px solid transparent" }}>{t.label}</span>
        ))}
      </div>

      {/* PENDING tab */}
      {dashTab === "PENDING" && stats && (
        <div>
          {/* Empty rooms */}
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>EMPTY ROOMS ({stats.emptyRooms.length})</div>
          {stats.emptyRooms.length === 0 ? <div style={{ fontSize: 9, color: "#5A9F7B", marginBottom: 10 }}>All rooms have deposits.</div> : (
            <div style={{ marginBottom: 12 }}>
              {stats.emptyRooms.map(r => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #0a0f0a" }}>
                  <span style={{ fontSize: 9, color: mc, fontFamily: THEME.ff.serif }}>{r.name}</span>
                  <span style={{ fontSize: 8, color: "#5A6370", fontFamily: THEME.ff.mono }}>{r.id} · {r.preferred_mode || "—"}</span>
                </div>
              ))}
            </div>
          )}

          {/* Provisional relations */}
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>PROVISIONAL RELATIONS ({stats.provRelations.length})</div>
          {stats.provRelations.length === 0 ? <div style={{ fontSize: 9, color: "#5A9F7B", marginBottom: 10 }}>All relations ratified.</div> : (
            <div style={{ marginBottom: 12 }}>
              {stats.provRelations.map(r => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", borderBottom: "1px solid #0a0f0a" }}>
                  <span style={{ fontSize: 9, color: "#B0B8C4", fontFamily: THEME.ff.mono }}>
                    {r.from} <span style={{ color: mc }}>{r.type}</span> {r.to}
                  </span>
                  <StatusBadge s="PROVISIONAL" />
                </div>
              ))}
            </div>
          )}

          {/* Monthly velocity */}
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>MONTHLY VELOCITY</div>
          <div style={{ marginBottom: 12 }}>
            {Object.entries(stats.months).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, count]) => (
              <div key={month} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
                <span style={{ fontSize: 8, color: "#5A6370", fontFamily: THEME.ff.mono, width: 50, flexShrink: 0 }}>{month}</span>
                <div style={{ flex: 1, height: 6, background: "#0a0f0a", position: "relative" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (count / 210) * 100)}%`, background: mc + "66" }} />
                </div>
                <span style={{ fontSize: 8, color: mc, fontFamily: THEME.ff.mono, width: 24, textAlign: "right", flexShrink: 0 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COVERAGE tab */}
      {dashTab === "COVERAGE" && stats && (
        <div>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>ROOM DEPOSIT COVERAGE</div>
          {stats.sortedRooms.map(r => {
            const count = stats.roomCounts[r.id] || 0;
            const pct = (count / stats.maxCount) * 100;
            const col = count === 0 ? "#C45A4A" : count <= 3 ? "#9f9f5a" : mc;
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0", borderBottom: "1px solid #060a06" }}>
                <span style={{ fontSize: 7, color: "#5A6370", fontFamily: THEME.ff.mono, width: 28, flexShrink: 0 }}>{r.id}</span>
                <span style={{ fontSize: 8, color: count === 0 ? "#4a3a3a" : "#B0B8C4", fontFamily: THEME.ff.serif, width: isMobile ? 80 : 110, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                <div style={{ flex: 1, height: 5, background: "#0a0f0a", position: "relative" }}>
                  <div style={{ height: "100%", width: `${Math.max(count > 0 ? 2 : 0, pct)}%`, background: col + "88" }} />
                </div>
                <span style={{ fontSize: 7, color: col, fontFamily: THEME.ff.mono, width: 22, textAlign: "right", flexShrink: 0 }}>{count}</span>
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
          <div style={{ fontSize: 10, color: "#B0B8C4", lineHeight: 1.6, marginBottom: 10 }}>Fetch recent deposits from Zenodo. Shows deposits not yet in canonical JSON.</div>
          <button onClick={async () => {
            addLog("Fetching from Zenodo API...", "sys");
            setSyncResult({ loading: true });
            try {
              const existingDois = new Set(data.documents.map(d => d.doi).filter(Boolean));
              const allHits = [];
              for (let page = 1; page <= 3; page++) {
                const r = await fetch(`https://zenodo.org/api/records/?q=creators.name:Sharks&size=25&sort=mostrecent&page=${page}`);
                const j = await r.json();
                allHits.push(...(j.hits?.hits || []));
                if (page === 1) setSyncResult(prev => ({ ...prev, total: j.hits?.total || 0 }));
                if (allHits.length >= (j.hits?.total || 0)) break;
              }
              const newDeps = allHits.filter(h => h.doi && !existingDois.has(h.doi));
              setSyncResult({ loading: false, total: allHits.length, new: newDeps.length, existing: allHits.length - newDeps.length, deposits: newDeps });
              addLog(`Zenodo: ${allHits.length} fetched, ${newDeps.length} NEW`, newDeps.length > 0 ? "warn" : "sys");
            } catch (e) { setSyncResult({ loading: false, error: e.message }); addLog(`Zenodo fetch error: ${e.message}`, "err"); }
          }} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "6px 12px", fontSize: 9, cursor: "pointer", fontFamily: THEME.ff.mono, letterSpacing: 1, marginBottom: 12, width: "100%" }}>
            {syncResult?.loading ? "FETCHING..." : "FETCH RECENT DEPOSITS"}
          </button>
          <div style={{ fontSize: 9, color: "#5A6370", marginBottom: 8 }}>{data.documents.length} in JSON · {syncResult ? `${syncResult.total || "?"} on Zenodo · ${syncResult.new || 0} new` : "Press FETCH"}</div>
          {syncResult?.error && <div style={{ fontSize: 9, color: "#C45A4A", marginBottom: 8 }}>{syncResult.error}</div>}
          {syncResult?.deposits?.length > 0 && (
            <div>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#9f7a4a", marginBottom: 4 }}>NEW DEPOSITS ({syncResult.deposits.length})</div>
              {syncResult.deposits.map((dep, i) => (
                <div key={i} style={{ padding: "4px 0", borderBottom: "1px solid #0a0f0a" }}>
                  <div style={{ fontSize: 9, color: mc, fontFamily: THEME.ff.serif, lineHeight: 1.3 }}>{(dep.metadata?.title || "?").slice(0, 70)}</div>
                  <div style={{ fontSize: 7, color: "#5A6370", fontFamily: THEME.ff.mono }}>{dep.doi} · {dep.metadata?.publication_date} · {(dep.metadata?.related_identifiers || []).length} rels</div>
                </div>
              ))}
            </div>
          )}
          {syncResult && !syncResult.loading && syncResult.new === 0 && (
            <div style={{ fontSize: 9, color: "#5A9F7B", fontFamily: THEME.ff.mono }}>ALL SYNCED — no new deposits found</div>
          )}
        </div>
      )}

      {/* DREAM tab */}
      {dashTab === "DREAM" && stats && (
        <div>
          <div style={{ fontSize: 10, color: "#B0B8C4", lineHeight: 1.6, marginBottom: 10 }}>Archive consolidation scan. Checks data integrity, orphaned relations, room coverage, excerpt sizes, LP program coverage.</div>
          <button onClick={() => { const result = runDream(data); setDreamResult(result); addLog(`DREAM: ${result.issues.length} issues found`, result.issues.length > 0 ? "err" : "sys"); }} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "6px 12px", fontSize: 9, cursor: "pointer", fontFamily: THEME.ff.mono, letterSpacing: 1, marginBottom: 12, width: "100%" }}>RUN CONSOLIDATION SCAN</button>
          {dreamResult && (
            <div>
              <div style={{ padding: "6px 8px", background: "#060a06", borderLeft: `2px solid ${dreamResult.issues.length === 0 ? "#5A9F7B" : "#C45A4A"}22`, marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: dreamResult.issues.length === 0 ? "#5A9F7B" : "#C45A4A", fontFamily: THEME.ff.mono, marginBottom: 4 }}>{dreamResult.issues.length === 0 ? "CLEAN — no issues detected" : `${dreamResult.issues.length} ISSUES FOUND`}</div>
                <div style={{ fontSize: 8, color: "#5A6370", fontFamily: THEME.ff.mono }}>{dreamResult.stats.timestamp} · {dreamResult.stats.rooms} rooms · {dreamResult.stats.documents} docs · {dreamResult.stats.relations} rels</div>
              </div>
              {dreamResult.issues.map((issue, i) => (
                <div key={i} style={{ display: "flex", gap: 6, padding: "3px 0", borderBottom: "1px solid #0a0f0a", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 7, padding: "1px 3px", fontFamily: THEME.ff.mono, color: RISK_COLORS[issue.severity] || "#5a5a3a", border: `1px solid ${RISK_COLORS[issue.severity] || "#333"}44`, flexShrink: 0 }}>{issue.severity}</span>
                  <span style={{ fontSize: 8, color: "#B0B8C4", fontFamily: THEME.ff.mono }}>{issue.msg}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GRAVITY WELL tab */}
      {dashTab === "GRAVITY" && (
        <div>
          <div style={{ fontSize: isMobile ? 14 : 16, letterSpacing: 3, color: mc, fontFamily: THEME.ff.serif, marginBottom: 8 }}>Gravity Well Bridge</div>
          <div style={{ fontSize: 10, color: "#B0B8C4", lineHeight: 1.6, marginBottom: 12 }}>Provenance engine. Create API keys, chains, invoke rooms, route governance.</div>
          <div style={{ marginBottom: 12, padding: "8px 10px", background: "#080c08", borderLeft: "2px solid #1a3a1a" }}>
            <div style={{ fontSize: 9, color: configured ? "#5A9F7B" : "#9f7a4a", marginBottom: 4, fontFamily: THEME.ff.mono, wordBreak: "break-word" }}>{configured ? `GW URL: ${gravityWell.baseUrl}` : "VITE_GRAVITY_WELL_URL not set"}</div>
            <div style={{ fontSize: 9, color: "#5A6370" }}>Source: {selectedDoc ? `doc ${selectedDoc.id}` : selectedRoom ? `room ${selectedRoom.id}` : "none"}</div>
          </div>

          {/* Create API Key */}
          {!apiKey && (
            <div style={{ marginBottom: 12, padding: "6px 8px", background: "#060a06", borderLeft: `2px solid ${mc}22` }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>CREATE API KEY</div>
              <div style={{ fontSize: 8, color: "#5A6370", marginBottom: 4 }}>Enter your GW admin token to generate an API key.</div>
              <div style={{ display: "flex", gap: 4 }}>
                <input id="gw-admin-token" type="password" placeholder="ADMIN_TOKEN" style={{ flex: 1, background: "#080808", border: "1px solid #1E2530", color: "#7a8a5a", padding: "4px 8px", fontSize: 9, fontFamily: THEME.ff.mono, outline: "none" }} />
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
                }} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "4px 10px", fontSize: 8, cursor: "pointer", fontFamily: THEME.ff.mono }}>CREATE</button>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#5A6370" }}>API KEY</div>
          <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Gravity Well API key" style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1E2530", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: THEME.ff.mono, outline: "none", marginBottom: 12 }} />

          {/* Chain Status */}
          {apiKey && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>CHAIN STATUS</div>
              <button onClick={async () => {
                try {
                  addLog("GW: fetching chains...", "gw");
                  const res = await fetch(`${gravityWell.baseUrl}/v1/chains`, {
                    headers: { "X-API-Key": apiKey }
                  });
                  if (!res.ok) throw new Error(`${res.status}`);
                  const chains = await res.json();
                  const chainList = chains.chains || chains || [];
                  addLog(`GW: ${chainList.length} chains found`, "gw");
                  window.__gwChains = chainList;
                  // Fetch console for each chain
                  for (const c of chainList.slice(0, 5)) {
                    const cid = c.chain_id || c.id;
                    try {
                      const cr = await fetch(`${gravityWell.baseUrl}/v1/chains/${cid}/console`, {
                        headers: { "X-API-Key": apiKey }
                      });
                      if (cr.ok) {
                        const console = await cr.json();
                        const label = c.label || cid.slice(0, 8);
                        const health = console.health_score || console.health || "?";
                        const deposits = console.total_deposits || console.deposit_count || "?";
                        const drift = console.drift_status || console.drift || "none";
                        addLog(`  ${label}: health=${health} deposits=${deposits} drift=${drift}`, "gw");
                      }
                    } catch (e) { /* skip individual chain errors */ }
                  }
                } catch (e) { addLog(`GW error: ${e.message}`, "err"); }
              }} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "6px 10px", fontSize: 9, cursor: "pointer", fontFamily: THEME.ff.mono, marginBottom: 8, width: "100%" }}>FETCH CHAIN STATUS</button>
            </div>
          )}
          <div style={{ marginBottom: 8, fontSize: 9, letterSpacing: 2, color: "#5A6370" }}>CHAIN LABEL</div>
          <input value={chainLabel} onChange={(e) => setChainLabel(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1E2530", color: "#7a8a5a", padding: "6px 10px", fontSize: 10, fontFamily: THEME.ff.mono, outline: "none", marginBottom: 10 }} />
          <button onClick={createChain} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "6px 10px", fontSize: 9, cursor: "pointer", fontFamily: THEME.ff.mono, marginBottom: 12 }}>CREATE CHAIN</button>
          {depositState.chain && <div style={{ padding: "8px 10px", background: "#080c08", borderLeft: "2px solid #1a3a1a", marginBottom: 12 }}><div style={{ fontSize: 9, color: "#5A9F7B", fontFamily: THEME.ff.mono, marginBottom: 4 }}>CHAIN READY</div><div style={{ fontSize: 9, color: "#5A6370", wordBreak: "break-word" }}>chain_id: {depositState.chain.chain_id}</div></div>}

          {/* Deep deposit: capture + deposit via GW */}
          {depositState.chain && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 6 }}>DEEP DEPOSIT (GW → Zenodo)</div>
              {selectedDoc ? (
                <div>
                  <div style={{ fontSize: 9, color: "#B0B8C4", marginBottom: 6 }}>Target: {selectedDoc.t?.slice(0, 50)}</div>
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
                  }} style={{ background: mc + "11", border: `1px solid ${mc}44`, color: mc, padding: "6px 10px", fontSize: 9, cursor: "pointer", fontFamily: THEME.ff.mono, width: "100%" }}>
                    CAPTURE + DEPOSIT VIA GRAVITY WELL
                  </button>
                  {depositState.lastDeposit?.doi && <div style={{ padding: "6px 8px", marginTop: 6, background: "#080c08", borderLeft: "2px solid #1a3a1a" }}><div style={{ fontSize: 9, color: "#5A9F7B", fontFamily: THEME.ff.mono }}>DOI: {depositState.lastDeposit.doi}</div></div>}
                </div>
              ) : (
                <div style={{ fontSize: 9, color: "#5A6370" }}>Select a document from the hex map to deep-deposit via GW.</div>
              )}
            </div>
          )}
          {depositState.error && <div style={{ padding: "8px 10px", background: "#120808", borderLeft: "2px solid #7a1a1a", fontSize: 9, color: "#b57a7a", marginBottom: 12, wordBreak: "break-word" }}>{depositState.error}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Nested Hexagons: splash + ambient background ───
// Used for splash intro (phase="splash") and landing ambient (phase="ambient")

function NestedHexagons({ phase = "splash", isMobile = false }) {
  // 14 nested hexagons — denser than the GW logo's 4
  const HEXES = Array.from({ length: 14 }, (_, i) => ({
    radius: 28 + i * 28,                          // grows outward
    stroke: 0.6 + (1 - i / 14) * 1.8,             // thicker at center, thinner at edge
    offsetDeg: (i % 2) * 30,                      // alternate flat-top / point-top
    spinDir: i % 2 === 0 ? 1 : -1,                // alternating rotation direction
    spinSpeed: 60 + i * 12,                       // inner spins faster, outer slower (for splash zoom feel)
    delay: i * 55,                                // stagger entrance
    endRotation: ((i % 2 === 0 ? 1 : -1) * (180 + i * 30)),  // target rotation at lock
  }));

  const isSplash = phase === "splash";
  const isAmbient = phase === "ambient";

  // Viewbox is centered; we render in a 800x800 coordinate space and let SVG scale
  const VB = 800;
  const cx = VB / 2, cy = VB / 2;

  const hexPoints = (r, offset = 0) => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i + offset - 30);
      pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
    }
    return pts.join(" ");
  };

  // Per-hex keyframes as a CSS string (built outside JSX to avoid parser issues)
  const splashKeyframes = isSplash ? HEXES.map((h, i) => {
    const op25 = (0.4 + (1 - i / 14) * 0.3).toFixed(2);
    const op55 = (0.75 + (1 - i / 14) * 0.2).toFixed(2);
    const op100 = (0.3 + (1 - i / 14) * 0.2).toFixed(2);
    const r25 = (h.endRotation * 0.3).toFixed(0);
    const r55 = (h.endRotation * 0.75).toFixed(0);
    const r72 = (h.endRotation * 0.98).toFixed(0);
    const r80 = h.endRotation;
    return "@keyframes splashHex" + i + " { " +
      "0% { opacity: 0; transform: rotate(0deg) scale(0.15); } " +
      "25% { opacity: " + op25 + "; transform: rotate(" + r25 + "deg) scale(0.5); } " +
      "55% { opacity: " + op55 + "; transform: rotate(" + r55 + "deg) scale(0.9); } " +
      "72% { opacity: 1; transform: rotate(" + r72 + "deg) scale(1.15); } " +
      "80% { opacity: 1; transform: rotate(" + r80 + "deg) scale(1.22); } " +
      "100% { opacity: " + op100 + "; transform: rotate(" + r80 + "deg) scale(1); } " +
      "}";
  }).join(" ") : "";

  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      <defs>
        <radialGradient id="hexGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="1" />
          <stop offset="40%" stopColor="#D4AF37" stopOpacity="0.85" />
          <stop offset="75%" stopColor="#C45A4A" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#C45A4A" stopOpacity="0.05" />
        </radialGradient>
        <radialGradient id="hexGradientSplash" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE680" stopOpacity="1" />
          <stop offset="30%" stopColor="#D4AF37" stopOpacity="0.95" />
          <stop offset="65%" stopColor="#C45A4A" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#7A1A1A" stopOpacity="0.15" />
        </radialGradient>
        <filter id="hexGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g style={{ transformOrigin: "center", transformBox: "fill-box" }}>
        {HEXES.map((h, i) => {
          const strokeColor = isSplash ? "url(#hexGradientSplash)" : "url(#hexGradient)";
          const splashStyle = {
            transformOrigin: "center",
            transformBox: "fill-box",
            animation: `splashHex${i} 3.8s cubic-bezier(0.2, 0.6, 0.1, 1.0) ${h.delay}ms both`,
          };
          const ambientStyle = {
            transformOrigin: "center",
            transformBox: "fill-box",
            animation: `${h.spinDir > 0 ? "slowRotate" : "slowRotateReverse"} ${90 + i * 6}s linear infinite`,
            transform: `rotate(${h.endRotation}deg)`,
            opacity: 0.18 + (1 - i / 14) * 0.12,
          };
          return (
            <polygon
              key={i}
              points={hexPoints(h.radius, h.offsetDeg)}
              fill="none"
              stroke={strokeColor}
              strokeWidth={h.stroke}
              style={isSplash ? splashStyle : ambientStyle}
              filter={i < 3 ? "url(#hexGlow)" : undefined}
            />
          );
        })}
      </g>

      {isSplash && <style dangerouslySetInnerHTML={{ __html: splashKeyframes }} />}
    </svg>
  );
}

// ─── Splash Intro ───

function SplashIntro({ onComplete, isMobile }) {
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    // Splash total duration: 4.2s then fade out 600ms
    const t1 = setTimeout(() => setComplete(true), 4200);
    const t2 = setTimeout(() => {
      try { sessionStorage?.setItem?.("cha_splash_seen", "1"); } catch {}
      onComplete();
    }, 4800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  const handleSkip = () => {
    try { sessionStorage?.setItem?.("cha_splash_seen", "1"); } catch {}
    onComplete();
  };

  return (
    <div
      onClick={handleSkip}
      onKeyDown={handleSkip}
      tabIndex={0}
      style={{
        position: "fixed",
        inset: 0,
        background: "#080B10",
        zIndex: 9999,
        cursor: "pointer",
        animation: complete ? "splashFade 600ms ease-out forwards" : undefined,
        overflow: "hidden",
      }}
    >
      {/* Nested hexagons — the main visual */}
      <NestedHexagons phase="splash" isMobile={isMobile} />

      {/* Gold flash on lock */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at center, #D4AF37 0%, #D4AF3744 30%, transparent 60%)",
          animation: "splashFlash 3.8s cubic-bezier(0.2, 0.6, 0.1, 1.0) both",
          pointerEvents: "none",
        }}
      />

      {/* Title that materializes post-lock */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: isMobile ? 9 : 11,
          letterSpacing: "0.32em",
          color: "#8B7730",
          marginBottom: 18,
          animation: "splashEyebrow 3.8s cubic-bezier(0.2, 0.6, 0.1, 1.0) both",
          textTransform: "uppercase",
        }}>
          ⟨ D · R · O · Σ · Φ · Ψ ⟩
        </div>
        <h1 style={{
          fontFamily: "'Crimson Pro', Georgia, serif",
          fontSize: isMobile ? "28px" : "44px",
          fontWeight: 300,
          color: "#D4AF37",
          letterSpacing: "0.18em",
          textAlign: "center",
          margin: 0,
          animation: "splashTitle 3.8s cubic-bezier(0.2, 0.6, 0.1, 1.0) both",
          textShadow: "0 0 32px rgba(212, 175, 55, 0.4)",
        }}>
          CRIMSON HEXAGONAL ARCHIVE
        </h1>
      </div>

      {/* Skip hint */}
      <div style={{
        position: "absolute",
        bottom: 24,
        right: 24,
        fontSize: 9,
        letterSpacing: "0.12em",
        color: "#5A6370",
        fontFamily: "'JetBrains Mono', monospace",
        opacity: 0.6,
        textTransform: "uppercase",
      }}>
        click to skip
      </div>
    </div>
  );
}

// ─── Main ───

function HexagonInterfaceResponsive() {
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
  const [map3d, setMap3d] = useState(true);
  const [oracleQuery, setOracleQuery] = useState("");
  const [oracleResult, setOracleResult] = useState(null);
  const [oracleLoading, setOracleLoading] = useState(false);
  const [oracleHistory, setOracleHistory] = useState([]);
  const navItems = [{ id: "MAP", label: "MAP" }, { id: "ORACLE", label: "ORACLE" }, { id: "LIBRARY", label: "LIBRARY" }, { id: "TRACE", label: "TRACE" }, { id: "DEPOSIT", label: "DEPOSIT" }, { id: "DODECAD", label: "DODECAD" }, { id: "HCORE", label: "H_core" }, { id: "ASSEMBLY", label: "ASSEMBLY" }];
  const tTimer = useRef(null);
  // Reading state
  const [readState, setReadState] = useState({ doi: null, text: null, loading: false, error: null, filename: null, size: 0 });
  // Trail state
  const [trail, setTrail] = useState({ name: "", docs: [], position: -1 });
  const [libMode, setLibMode] = useState("SEARCH"); // SEARCH | TRAIL
  // Splash intro — plays once per session
  const [splashPhase, setSplashPhase] = useState(() => {
    try { return sessionStorage?.getItem?.("cha_splash_seen") === "1" ? "done" : "playing"; } catch { return "playing"; }
  });

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

  const mc = arkMode ? (ARK_MODE_COLORS[arkMode] || MODE_COLORS[mode] || "#D4AF37") : (MODE_COLORS[mode] || "#D4AF37");
  const room = useMemo(() => data?.rooms.find((r) => r.id === selRoom) || null, [data, selRoom]);

  // === ORACLE: RAG over the archive ===
  const runOracle = useCallback(async () => {
    if (!oracleQuery.trim() || oracleLoading) return;
    setOracleLoading(true);
    addLog(`ORACLE: "${oracleQuery}"`, "sys");
    const q = oracleQuery.toLowerCase();
    try {
      // 1. Client-side retrieval — score documents by relevance
      const terms = q.split(/\s+/).filter(t => t.length > 2);
      const scored = data.documents.map(doc => {
        let score = 0;
        const title = (doc.t || "").toLowerCase();
        const excerpt = (doc.e || "").toLowerCase();
        const keywords = (doc.k || []).join(" ").toLowerCase();
        terms.forEach(term => {
          if (title.includes(term)) score += 3;
          if (keywords.includes(term)) score += 2;
          if (excerpt.includes(term)) score += 1;
        });
        // Boost by status
        if (doc.s === "RATIFIED") score += 0.5;
        return { ...doc, score };
      }).filter(d => d.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);

      addLog(`ORACLE: ${scored.length} documents retrieved`, "sys");

      // 2. Fetch full text for top 3 from Zenodo
      const contexts = [];
      for (const doc of scored.slice(0, 3)) {
        if (!doc.doi) continue;
        try {
          const recId = doc.doi.split(".").pop();
          const r = await fetch(`https://zenodo.org/api/records/${recId}`);
          if (!r.ok) continue;
          const rec = await r.json();
          const files = rec.files || [];
          const textFile = files.find(f => f.key?.endsWith(".md") || f.key?.endsWith(".txt")) || files[0];
          if (textFile?.links?.self) {
            const fr = await fetch(textFile.links.self);
            if (fr.ok) {
              let text = await fr.text();
              if (text.length > 4000) text = text.slice(0, 4000) + "\n[…truncated]";
              contexts.push({ id: doc.id, doi: doc.doi, title: doc.t, text });
            }
          }
        } catch (e) { /* skip failed fetches */ }
      }

      // 3. Build context from excerpts for remaining docs
      scored.slice(contexts.length).forEach(doc => {
        if (doc.e) {
          contexts.push({ id: doc.id, doi: doc.doi || "", title: doc.t, text: doc.e });
        }
      });

      addLog(`ORACLE: ${contexts.length} contexts loaded (${contexts.filter(c => c.text.length > 500).length} full text)`, "sys");

      // 4. Identify relevant rooms
      const relevantRooms = [...new Set(scored.flatMap(d => d.r || []))].slice(0, 5);

      // 5. Try Anthropic API — falls back to retrieval-only on Vercel
      let answer = "";
      try {
        const systemPrompt = `You are the Ezekiel Engine — the retrieval oracle of the Crimson Hexagonal Archive. You answer questions grounded in the archive's own documents. Your voice is precise, scholarly, and operative.

RULES:
- Answer ONLY from the provided document contexts. If the documents don't contain the answer, say so.
- Cite documents by their ID (e.g., "19013315") when you draw from them.
- Name the rooms where relevant content lives.
- Use the archive's own terminology: operators, rooms, mantles, compression, bearing-cost, semantic economy, etc.
- Be concise. This is a retrieval engine, not a lecture.
- Use Palatino-register prose. No bullet points.

ARCHIVE STRUCTURE:
H_core = ⟨D, R, O, Σ, Φ, Ψ⟩ — 6-tuple formal object
${data.rooms.length} rooms, ${data.documents.length} deposits, ${data.relations.length} relations`;

        const userMsg = `QUERY: ${oracleQuery}\n\nRETRIEVED DOCUMENTS:\n${contexts.map(c => `--- DOC ${c.id} (${c.title}) ---\n${c.text}`).join("\n\n")}\n\nAnswer the query using these documents. Cite by document ID. Name relevant rooms.`;

        const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            system: systemPrompt,
            messages: [{ role: "user", content: userMsg }],
          }),
        });

        if (!apiRes.ok) throw new Error(`API ${apiRes.status}`);
        const apiData = await apiRes.json();
        answer = apiData.content?.map(c => c.text || "").join("") || "";
        addLog(`ORACLE: AI synthesis complete (${answer.length} chars)`, "sys");
      } catch (apiErr) {
        // Fallback: show retrieved documents without AI synthesis
        addLog(`ORACLE: API unavailable (${apiErr.message}), showing retrieval only`, "sys");
        const excerpts = contexts.map(c => `[${c.id}] ${c.title}\n${c.text.slice(0, 300)}${c.text.length > 300 ? "…" : ""}`).join("\n\n");
        answer = `RETRIEVAL MODE — ${scored.length} documents matched your query.\n\nAI synthesis requires the Claude.ai artifact sandbox. Below are the retrieved excerpts:\n\n${excerpts}`;
      }

      const entry = {
        query: oracleQuery,
        answer,
        sources: scored.slice(0, 6).map(d => ({ id: d.id, title: d.t })),
        rooms: relevantRooms,
        timestamp: new Date().toISOString(),
      };
      setOracleHistory(prev => [...prev, entry]);
      setOracleQuery("");
      addLog(`ORACLE: response complete (${answer.length} chars, ${relevantRooms.length} rooms)`, "sys");

    } catch (e) {
      addLog(`ORACLE ERROR: ${e.message}`, "err");
      setOracleHistory(prev => [...prev, { query: oracleQuery, answer: `Error: ${e.message}`, sources: [], rooms: [], timestamp: new Date().toISOString() }]);
    }
    setOracleLoading(false);
  }, [oracleQuery, oracleLoading, data, addLog]);

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

  if (loading) return (
    <div style={{ height: "100dvh", background: THEME.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: THEME.ff.serif }}>
      <div style={{ textAlign: "center" }} className="fade-in">
        <div style={{ fontSize: 72, color: THEME.gold, marginBottom: 16, animation: "gentlePulse 2s ease-in-out infinite", fontWeight: 300 }}>∮</div>
        <div style={{ fontSize: 14, letterSpacing: THEME.ls.widest, color: THEME.gold, marginBottom: 10, fontWeight: 400 }}>CRIMSON HEXAGONAL ARCHIVE</div>
        <div style={{ fontSize: 10, color: THEME.txMute, letterSpacing: THEME.ls.wide, fontFamily: THEME.ff.mono }}>loading canonical json…</div>
      </div>
    </div>
  );
  if (error) return (
    <div style={{ height: "100dvh", background: THEME.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: THEME.ff.mono }}>
      <div style={{ color: THEME.red, fontSize: 11 }}>LOAD ERROR: {error}</div>
    </div>
  );

  if (!mode) return (
    <>
      {splashPhase === "playing" && <SplashIntro onComplete={() => setSplashPhase("done")} isMobile={isMobile} />}
      <div style={{ height: "100dvh", background: THEME.bg, fontFamily: THEME.ff.serif, position: "relative", overflow: "hidden" }}>
        {/* Nested rotating hexagons — the CHA signature mark, at ambient pace */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <NestedHexagons phase="ambient" isMobile={isMobile} />
        </div>
        {/* Vignette to darken edges */}
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, transparent 0%, ${THEME.bg}cc 80%, ${THEME.bg} 100%)`, pointerEvents: "none", zIndex: 1 }} />

      {/* Hero content */}
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: isMobile ? "24px 20px" : "40px", overflow: "auto" }}>
        <div style={{ textAlign: "center", maxWidth: 720, width: "100%" }}>

          {/* Eyebrow */}
          <div className="fade-in-up" style={{ fontSize: THEME.fs.micro, letterSpacing: THEME.ls.widest, color: THEME.txMute, marginBottom: 24, fontFamily: THEME.ff.mono, textTransform: "uppercase", animationDelay: "0ms" }}>
            H_core · {data.meta?.total_deposits || data.documents.length} Deposits · CC BY 4.0
          </div>

          {/* Hero ∮ */}
          <div className="fade-in-up" style={{ fontSize: isMobile ? 84 : 108, color: THEME.gold, fontWeight: 300, lineHeight: 1, marginBottom: 12, animationDelay: "100ms" }}>∮</div>

          {/* Title */}
          <h1 className="fade-in-up" style={{ fontSize: THEME.fs.title, letterSpacing: THEME.ls.wider, color: THEME.gold, fontWeight: 300, marginBottom: 20, lineHeight: 1.2, animationDelay: "200ms" }}>
            Crimson Hexagonal Archive
          </h1>

          {/* Subtitle */}
          <p className="fade-in-up" style={{ fontSize: isMobile ? 14 : 16, color: THEME.tx, lineHeight: 1.65, marginBottom: 10, fontWeight: 400, maxWidth: 560, margin: "0 auto 10px", animationDelay: "300ms" }}>
            A governed literary architecture. {data.documents.length} DOI-anchored deposits across {data.rooms.length} rooms, each with its own physics, mantle, and operators.
          </p>
          <p className="fade-in-up" style={{ fontSize: isMobile ? 13 : 14, color: THEME.txMute, lineHeight: 1.65, marginBottom: 36, fontStyle: "italic", maxWidth: 560, margin: "0 auto 36px", animationDelay: "400ms" }}>
            Machine-traversable. Provenance-bearing. Five thousand years of heteronymic practice.
          </p>

          {/* Primary action */}
          <div className="fade-in-up" style={{ animationDelay: "500ms", marginBottom: 28 }}>
            <button
              onClick={() => { setMode("ANALYTIC"); setView("MAP"); addLog("Enter: ANALYTIC · MAP"); }}
              onMouseEnter={(e) => { e.currentTarget.style.background = THEME.goldGlow; e.currentTarget.style.boxShadow = `0 0 32px ${THEME.goldSoft}`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.boxShadow = "none"; }}
              style={{
                background: "transparent",
                border: `1px solid ${THEME.gold}`,
                color: THEME.gold,
                padding: "14px 36px",
                fontSize: 13,
                letterSpacing: THEME.ls.widest,
                fontFamily: THEME.ff.mono,
                cursor: "pointer",
                textTransform: "uppercase",
                transition: THEME.t,
                fontWeight: 400,
              }}
            >
              Enter the Archive
            </button>
          </div>

          {/* Divider */}
          <div className="fade-in-up" style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 360, margin: "0 auto 20px", animationDelay: "600ms" }}>
            <div style={{ flex: 1, height: 1, background: THEME.border }} />
            <span style={{ fontSize: 9, letterSpacing: THEME.ls.wide, color: THEME.txMute, fontFamily: THEME.ff.mono, textTransform: "uppercase" }}>or select mode</span>
            <div style={{ flex: 1, height: 1, background: THEME.border }} />
          </div>

          {/* Mode cards */}
          <div className="fade-in-up" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 10, marginBottom: 40, animationDelay: "700ms" }}>
            {[
              ["ANALYTIC", "Observe · Navigate", "Trace provenance across the graph"],
              ["OPERATIVE", "Generate · Invoke", "Transform through room operators"],
              ["AUDIT", "Govern · Witness", "Promote, ratify, and anchor"],
            ].map(([m, line1, line2]) => (
              <button
                key={m}
                onClick={() => { setMode(m); addLog(`Mode: ${m}`); }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = MODE_COLORS[m]; e.currentTarget.style.background = THEME.surface; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.background = "transparent"; }}
                style={{
                  background: "transparent",
                  border: `1px solid ${THEME.border}`,
                  color: MODE_COLORS[m],
                  padding: "16px 14px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: THEME.t,
                  fontFamily: THEME.ff.serif,
                }}
              >
                <div style={{ fontSize: 11, letterSpacing: THEME.ls.wide, fontFamily: THEME.ff.mono, marginBottom: 6 }}>{m}</div>
                <div style={{ fontSize: 13, color: THEME.txBright, fontWeight: 400, marginBottom: 3, fontFamily: THEME.ff.serif }}>{line1}</div>
                <div style={{ fontSize: 11, color: THEME.txMute, lineHeight: 1.5, fontFamily: THEME.ff.serif, fontStyle: "italic" }}>{line2}</div>
              </button>
            ))}
          </div>

          {/* Stat blocks */}
          <div className="fade-in-up" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 520, margin: "0 auto 32px", animationDelay: "800ms" }}>
            {[
              [data.rooms.length, "rooms"],
              [data.documents.length, "deposits"],
              ["∮ = 1", "closed loop"],
            ].map(([val, lbl], i) => (
              <div key={i} style={{ textAlign: "center", padding: "10px 6px", borderTop: `1px solid ${THEME.border}` }}>
                <div style={{ fontSize: isMobile ? 22 : 28, color: THEME.gold, fontWeight: 300, marginBottom: 4, fontFamily: THEME.ff.serif, letterSpacing: THEME.ls.tight }}>{val}</div>
                <div style={{ fontSize: 9, color: THEME.txMute, letterSpacing: THEME.ls.wide, fontFamily: THEME.ff.mono, textTransform: "uppercase" }}>{lbl}</div>
              </div>
            ))}
          </div>

          {/* Footer attribution */}
          <div className="fade-in-up" style={{ animationDelay: "900ms" }}>
            <div style={{ fontSize: 10, color: THEME.txMute, fontFamily: THEME.ff.mono, letterSpacing: THEME.ls.normal, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, alignItems: "center" }}>
              <span>Lee Sharks</span>
              <span style={{ color: THEME.txFaint }}>·</span>
              <a href="https://orcid.org/0009-0000-1599-0703" target="_blank" rel="noreferrer" style={{ color: THEME.txMute, textDecoration: "none", transition: THEME.t }} onMouseEnter={e=>e.currentTarget.style.color=THEME.gold} onMouseLeave={e=>e.currentTarget.style.color=THEME.txMute}>ORCID</a>
              <span style={{ color: THEME.txFaint }}>·</span>
              <a href="https://doi.org/10.5281/zenodo.19013315" target="_blank" rel="noreferrer" style={{ color: THEME.txMute, textDecoration: "none", transition: THEME.t }} onMouseEnter={e=>e.currentTarget.style.color=THEME.gold} onMouseLeave={e=>e.currentTarget.style.color=THEME.txMute}>Space Ark v4.2</a>
              <span style={{ color: THEME.txFaint }}>·</span>
              <a href="https://pessoagraph.org" target="_blank" rel="noreferrer" style={{ color: THEME.txMute, textDecoration: "none", transition: THEME.t }} onMouseEnter={e=>e.currentTarget.style.color=THEME.gold} onMouseLeave={e=>e.currentTarget.style.color=THEME.txMute}>PKG</a>
              <span style={{ color: THEME.txFaint }}>·</span>
              <a href="https://spxi.dev" target="_blank" rel="noreferrer" style={{ color: THEME.txMute, textDecoration: "none", transition: THEME.t }} onMouseEnter={e=>e.currentTarget.style.color=THEME.gold} onMouseLeave={e=>e.currentTarget.style.color=THEME.txMute}>SPXI</a>
              <span style={{ color: THEME.txFaint }}>·</span>
              <a href="https://semanticeconomy.org" target="_blank" rel="noreferrer" style={{ color: THEME.txMute, textDecoration: "none", transition: THEME.t }} onMouseEnter={e=>e.currentTarget.style.color=THEME.gold} onMouseLeave={e=>e.currentTarget.style.color=THEME.txMute}>SEI</a>
              <span style={{ color: THEME.txFaint }}>·</span>
              <a href="https://gw.crimsonhexagonal.org" target="_blank" rel="noreferrer" style={{ color: THEME.txMute, textDecoration: "none", transition: THEME.t }} onMouseEnter={e=>e.currentTarget.style.color=THEME.gold} onMouseLeave={e=>e.currentTarget.style.color=THEME.txMute}>Gravity Well</a>
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 10, justifyContent: "center", fontSize: 8, fontFamily: THEME.ff.mono, letterSpacing: THEME.ls.wide }}>
              <span style={{ color: THEME.green }}>● Canonical</span>
              <span style={{ color: isSupabaseConfigured() ? THEME.green : THEME.txFaint }}>{isSupabaseConfigured() ? "●" : "○"} Supabase</span>
              <span style={{ color: isGravityWellConfigured() ? THEME.green : THEME.txFaint }}>{isGravityWellConfigured() ? "●" : "○"} GW</span>
              <span style={{ color: THEME.green }}>● Zenodo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );

  return (
    <div style={{ height: "100dvh", background: THEME.bg, color: THEME.tx, fontFamily: THEME.ff.serif, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", gap: isMobile ? 8 : 16, padding: isMobile ? "10px 14px" : "0 20px", background: THEME.surface, borderBottom: `1px solid ${THEME.border}`, flexShrink: 0, minHeight: isMobile ? "auto" : 48 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, minWidth: 0 }}>
          <div
            onClick={() => { setSelRoom(null); setSelDoc(null); setView("MAP"); setArkMode(null); setTSteps([]); setMantle(null); setLp(initLP()); setMode(null); }}
            onMouseEnter={e => { e.currentTarget.style.color = THEME.gold; }}
            onMouseLeave={e => { e.currentTarget.style.color = THEME.gold; }}
            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flexShrink: 0, transition: THEME.t }}
          >
            <span style={{ fontSize: 20, color: THEME.gold, fontWeight: 300, lineHeight: 1 }}>∮</span>
            <span style={{ fontSize: 12, letterSpacing: THEME.ls.wider, color: THEME.gold, fontFamily: THEME.ff.serif, fontWeight: 400 }}>Crimson Hexagonal Archive</span>
          </div>
          <div style={{ display: "flex", gap: 2, overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "none", minWidth: 0 }}>
            {navItems.map((n) => {
              const active = view === n.id;
              return (
                <span
                  key={n.id}
                  onClick={() => { setView(n.id); if (n.id !== "MAP" && n.id !== "MAP_3D") setSelRoom(null); if (n.id !== "MAP" && n.id !== "DEPOSIT") setSelDoc(null); }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = THEME.tx; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = THEME.txMute; }}
                  style={{
                    fontSize: 10,
                    letterSpacing: THEME.ls.wide,
                    color: active ? THEME.gold : THEME.txMute,
                    cursor: "pointer",
                    padding: isMobile ? "6px 8px" : "14px 12px",
                    borderBottom: active ? `2px solid ${THEME.gold}` : "2px solid transparent",
                    flexShrink: 0,
                    fontFamily: THEME.ff.mono,
                    transition: THEME.t,
                    textShadow: active ? `0 0 12px ${THEME.goldSoft}` : "none",
                  }}
                >
                  {n.label}
                </span>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: isMobile ? "flex-end" : "flex-end", gap: 8 }}>
          <span
            onClick={() => setMode(null)}
            onMouseEnter={e => { e.currentTarget.style.background = mc + "22"; }}
            onMouseLeave={e => { e.currentTarget.style.background = mc + "11"; }}
            style={{ fontSize: 9, padding: "4px 10px", background: mc + "11", border: `1px solid ${mc}44`, color: mc, fontFamily: THEME.ff.mono, cursor: "pointer", letterSpacing: THEME.ls.wide, transition: THEME.t }}
          >
            {mode}
          </span>
        </div>
      </div>

      {/* LP Sidecar */}
      {(tSteps.length > 0 || lp.ψ > 0) && <LPSidecar lp={lp} steps={tSteps} stepIdx={tIdx} mantle={mantle} arkMode={arkMode} isMobile={isMobile} />}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", overflow: "hidden", minHeight: 0 }}>
        <div style={{ flex: 1, overflow: "hidden", position: "relative", minHeight: 0 }}>
          {view === "MAP" && <>
            <div style={{position:"absolute",top:8,right:8,zIndex:10,display:"flex",gap:0,background:"#080c08",border:"1px solid #1E2530",pointerEvents:"auto"}}>
              <span onClick={()=>setMap3d(true)} style={{fontSize:8,padding:"3px 8px",color:map3d?"#D4AF37":"#5A6370",background:map3d?"#0a0f0a":"transparent",cursor:"pointer",fontFamily: THEME.ff.mono,letterSpacing:1}}>3D</span>
              <span onClick={()=>setMap3d(false)} style={{fontSize:8,padding:"3px 8px",color:!map3d?"#D4AF37":"#5A6370",background:!map3d?"#0a0f0a":"transparent",cursor:"pointer",fontFamily: THEME.ff.mono,letterSpacing:1}}>2D</span>
            </div>
            {map3d ? <Suspense fallback={<div style={{color:"#5A6370",padding:20,fontFamily: THEME.ff.mono}}>Loading 3D...</div>}><div style={{width:"100%",height:"100%",position:"relative"}}><HexMap3D onSelect={handleRoomSelect} /></div></Suspense> : <HexMap rooms={data.rooms} edges={data.edges} selected={selRoom} onSelect={handleRoomSelect} mc={mc} isMobile={isMobile} />}
          </>}

          {/* ORACLE — archive search & discovery */}
          {view === "ORACLE" && (() => {
            const q = oracleQuery.toLowerCase().trim();
            const terms = q.split(/\s+/).filter(t => t.length > 1);
            const results = terms.length > 0 ? data.documents.map(doc => {
              let score = 0;
              const title = (doc.t || "").toLowerCase();
              const excerpt = (doc.e || "").toLowerCase();
              const keywords = (doc.k || []).join(" ").toLowerCase();
              const rooms = (doc.r || []).join(" ").toLowerCase();
              terms.forEach(term => {
                if (title.includes(term)) score += 4;
                if (keywords.includes(term)) score += 3;
                if (rooms.includes(term)) score += 2;
                if (excerpt.includes(term)) score += 1;
              });
              return { ...doc, score };
            }).filter(d => d.score > 0).sort((a, b) => b.score - a.score) : [];
            const resultRooms = terms.length > 0 ? [...new Set(results.flatMap(d => d.r || []))].slice(0, 12) : [];
            return (
            <div className="fade-in" style={{ padding: isMobile ? "20px 18px" : "32px 40px", overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", fontFamily: THEME.ff.serif, maxWidth: 960, margin: "0 auto", width: "100%" }}>
              {/* Oracle header */}
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: THEME.ls.widest, color: THEME.txMute, fontFamily: THEME.ff.mono, textTransform: "uppercase", marginBottom: 8 }}>
                  Oracle · {data.documents.length} deposits indexed
                </div>
                <div style={{ fontSize: 11, color: THEME.txMute, fontFamily: THEME.ff.serif, fontStyle: "italic" }}>
                  Search title, keywords, room, and excerpt.
                </div>
              </div>

              {/* Large search input */}
              <div style={{ position: "relative", marginBottom: 16 }}>
                <input
                  value={oracleQuery}
                  onChange={e => setOracleQuery(e.target.value)}
                  autoFocus
                  placeholder="compression · bearing-cost · Three Compressions · Armature · Pearl"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: THEME.surface,
                    border: `1px solid ${THEME.border}`,
                    borderRadius: 2,
                    color: THEME.txBright,
                    padding: isMobile ? "14px 16px" : "18px 24px",
                    fontSize: isMobile ? 15 : 18,
                    fontFamily: THEME.ff.serif,
                    outline: "none",
                    transition: THEME.t,
                    letterSpacing: "0.01em",
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = mc; e.currentTarget.style.boxShadow = `0 0 24px ${mc}22`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>

              {/* Results meta */}
              {terms.length > 0 && (
                <div style={{ fontSize: 10, color: THEME.txMute, marginBottom: 14, fontFamily: THEME.ff.mono, letterSpacing: THEME.ls.wide, textTransform: "uppercase" }}>
                  {results.length} {results.length === 1 ? "deposit" : "deposits"} · {resultRooms.length} {resultRooms.length === 1 ? "room" : "rooms"}
                </div>
              )}

              {/* Room chips */}
              {resultRooms.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                  {resultRooms.map(rid => {
                    const rm = data.rooms.find(r => r.id === rid);
                    return rm ? (
                      <span
                        key={rid}
                        onClick={() => { handleRoomSelect(rid); setView("MAP"); }}
                        onMouseEnter={e => { e.currentTarget.style.background = mc + "22"; e.currentTarget.style.borderColor = mc; }}
                        onMouseLeave={e => { e.currentTarget.style.background = THEME.surface; e.currentTarget.style.borderColor = mc + "44"; }}
                        style={{ fontSize: 10, padding: "4px 10px", background: THEME.surface, border: `1px solid ${mc}44`, color: mc, cursor: "pointer", fontFamily: THEME.ff.mono, letterSpacing: THEME.ls.wide, transition: THEME.t }}
                      >
                        {rm.name}
                      </span>
                    ) : null;
                  })}
                </div>
              )}

              {/* Results as cards */}
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {results.slice(0, 50).map(d => (
                  <div
                    key={d.id}
                    onClick={() => { setSelDoc(d); setView("MAP"); }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = mc + "66"; e.currentTarget.style.background = THEME.elevated; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.background = THEME.surface; }}
                    style={{ padding: isMobile ? "14px 16px" : "16px 20px", background: THEME.surface, border: `1px solid ${THEME.border}`, cursor: "pointer", transition: THEME.t }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                      <div style={{ fontSize: 14, color: THEME.txBright, fontFamily: THEME.ff.serif, lineHeight: 1.35, flex: 1, fontWeight: 400 }}>
                        {d.t}
                      </div>
                      <span style={{ fontSize: 9, color: mc, fontFamily: THEME.ff.mono, flexShrink: 0, padding: "2px 6px", border: `1px solid ${mc}44`, letterSpacing: THEME.ls.wide }}>
                        {d.score}
                      </span>
                    </div>
                    {d.e && (
                      <div style={{ fontSize: 12, color: THEME.tx, fontFamily: THEME.ff.serif, lineHeight: 1.6, marginBottom: 8, maxHeight: 60, overflow: "hidden" }}>
                        {d.e.slice(0, 200)}{d.e.length > 200 ? "…" : ""}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {d.doi && (
                        <span style={{ fontSize: 8, color: THEME.gold, fontFamily: THEME.ff.mono, padding: "2px 6px", background: THEME.goldGlow, border: `1px solid ${THEME.gold}33`, letterSpacing: THEME.ls.wide }}>
                          {d.doi}
                        </span>
                      )}
                      {d.d && (
                        <span style={{ fontSize: 9, color: THEME.txMute, fontFamily: THEME.ff.mono, letterSpacing: "0.06em" }}>
                          {d.d}
                        </span>
                      )}
                      {(d.r || []).slice(0, 3).map(rid => {
                        const rm = data.rooms.find(r => r.id === rid);
                        return rm ? (
                          <span key={rid} style={{ fontSize: 9, color: THEME.txMute, fontFamily: THEME.ff.serif, fontStyle: "italic" }}>
                            {rm.name}
                          </span>
                        ) : null;
                      })}
                      <StatusBadge s={d.s} />
                    </div>
                  </div>
                ))}

                {terms.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ fontSize: 13, color: THEME.txMute, fontFamily: THEME.ff.serif, lineHeight: 1.8, fontStyle: "italic", maxWidth: 480, margin: "0 auto" }}>
                      Type to search across {data.documents.length} deposits. Results scored by title (×4), keywords (×3), room (×2), and excerpt (×1). Click any result to open the document.
                    </div>
                  </div>
                )}
                {terms.length > 0 && results.length === 0 && (
                  <div style={{ fontSize: 13, color: THEME.txMute, padding: 24, fontFamily: THEME.ff.serif, fontStyle: "italic", textAlign: "center" }}>
                    No deposits match "{oracleQuery}"
                  </div>
                )}
              </div>
            </div>
            );
          })()}

          {view === "LIBRARY" && (
            <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
              {/* Library header with mode toggle */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370" }}>
                  {libMode === "SEARCH" ? `DOCUMENT REGISTRY · ${data.documents.length} DEPOSITS` : `TRAIL BUILDER${trail.name ? ` · ${trail.name}` : ""}`}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {["SEARCH", "TRAIL", "BIBLIO"].map(m => (
                    <span key={m} onClick={() => setLibMode(m)} style={{ fontSize: 7, padding: "1px 5px", fontFamily: THEME.ff.mono, color: libMode === m ? mc : "#5A6370", border: `1px solid ${libMode === m ? mc + "44" : "#1E2530"}`, cursor: "pointer" }}>{m}</span>
                  ))}
                </div>
              </div>

              {/* SEARCH mode */}
              {libMode === "SEARCH" && <>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="search archive..." style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1E2530", color: "#7a8a5a", padding: "6px 10px", fontSize: 11, fontFamily: THEME.ff.serif, outline: "none", marginBottom: 10 }} />
                {(search ? searchResults : data.documents).map((d) => {
                  const inTrail = trail.docs.some(td => td.id === d.id);
                  return (
                    <div key={d.id} style={{ display: "flex", gap: 4, padding: "4px 0", borderBottom: "1px solid #0a0f0a" }}>
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setSelDoc(d); setView("MAP"); }}>
                        <div style={{ fontSize: 10, color: "#B0B8C4", fontFamily: THEME.ff.serif, lineHeight: 1.3 }}>{d.t.length > 65 ? d.t.slice(0, 62) + "..." : d.t}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}><span style={{ fontSize: 8, color: "#2A3040" }}>{(d.c?.[0] || "") + " · " + d.d}</span><StatusBadge s={d.s} /></div>
                      </div>
                      <span onClick={(e) => { e.stopPropagation(); if (!inTrail) { setTrail(t => ({ ...t, docs: [...t.docs, d] })); addLog(`Trail +${d.t.slice(0, 30)}`, "sys"); } }} style={{ fontSize: 9, color: inTrail ? "#5A9F7B" : "#2A3040", cursor: inTrail ? "default" : "pointer", padding: "2px 4px", fontFamily: THEME.ff.mono, flexShrink: 0, alignSelf: "center" }}>{inTrail ? "✓" : "+"}</span>
                    </div>
                  );
                })}
              </>}

              {/* TRAIL mode */}
              {libMode === "TRAIL" && <>
                <input value={trail.name} onChange={(e) => setTrail(t => ({ ...t, name: e.target.value }))} placeholder="Trail name..." style={{ width: "100%", boxSizing: "border-box", background: "#080808", border: "1px solid #1E2530", color: "#7a8a5a", padding: "6px 10px", fontSize: 11, fontFamily: THEME.ff.serif, outline: "none", marginBottom: 6 }} />
                <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                  <span style={{ fontSize: 8, color: "#5A6370", fontFamily: THEME.ff.mono }}>{trail.docs.length} stops</span>
                  {trail.docs.length > 0 && <>
                    <span onClick={() => { if (trail.position > 0) { const p = trail.position - 1; setTrail(t => ({ ...t, position: p })); setSelDoc(trail.docs[p]); setView("MAP"); } }} style={{ fontSize: 8, color: trail.position > 0 ? mc : "#1E2530", cursor: trail.position > 0 ? "pointer" : "default", fontFamily: THEME.ff.mono, padding: "0 4px" }}>◀ PREV</span>
                    <span style={{ fontSize: 8, color: mc, fontFamily: THEME.ff.mono }}>{trail.position >= 0 ? trail.position + 1 : "—"}/{trail.docs.length}</span>
                    <span onClick={() => { if (trail.position < trail.docs.length - 1) { const p = trail.position + 1; setTrail(t => ({ ...t, position: p })); setSelDoc(trail.docs[p]); setView("MAP"); } }} style={{ fontSize: 8, color: trail.position < trail.docs.length - 1 ? mc : "#1E2530", cursor: trail.position < trail.docs.length - 1 ? "pointer" : "default", fontFamily: THEME.ff.mono, padding: "0 4px" }}>NEXT ▶</span>
                    {isSupabaseConfigured() && trail.name && <span onClick={async () => { try { await supabase.saveTrail(trail); setTrail(t => ({ ...t, saved: true })); addLog(`Trail saved: ${trail.name}`, "sys"); } catch (e) { setTrail(t => ({ ...t, saveError: e.message })); addLog(`Trail save error: ${e.message}`, "err"); } }} style={{ fontSize: 8, color: trail.saved ? "#5A9F7B" : trail.saveError ? "#C45A4A" : "#5A9F7B", cursor: "pointer", fontFamily: THEME.ff.mono, padding: "0 4px" }}>{trail.saved ? "✓ SAVED" : trail.saveError ? "✗ ERROR" : "SAVE"}</span>}
                    <span onClick={() => setTrail({ name: "", docs: [], position: -1 })} style={{ fontSize: 8, color: "#5a3a3a", cursor: "pointer", fontFamily: THEME.ff.mono, marginLeft: "auto", padding: "0 4px" }}>CLEAR</span>
                  </>}
                </div>
                {trail.docs.length === 0 ? (
                  <div style={{ fontSize: 10, color: "#5A6370", fontFamily: THEME.ff.serif, lineHeight: 1.6 }}>Switch to SEARCH, find documents, and click + to add them to a trail. Trails are ordered reading paths through the archive.</div>
                ) : (
                  trail.docs.map((d, i) => (
                    <div key={`${d.id}-${i}`} style={{ display: "flex", gap: 6, padding: "4px 0", borderBottom: "1px solid #0a0f0a", background: i === trail.position ? mc + "08" : "transparent" }}>
                      <span style={{ fontSize: 8, color: i === trail.position ? mc : "#2A3040", fontFamily: THEME.ff.mono, width: 16, flexShrink: 0, textAlign: "right" }}>{i + 1}</span>
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setTrail(t => ({ ...t, position: i })); setSelDoc(d); setView("MAP"); }}>
                        <div style={{ fontSize: 10, color: i === trail.position ? mc : "#B0B8C4", fontFamily: THEME.ff.serif, lineHeight: 1.3 }}>{d.t.length > 60 ? d.t.slice(0, 57) + "..." : d.t}</div>
                        <div style={{ fontSize: 8, color: "#2A3040" }}>{(d.c?.[0] || "") + " · " + d.d}</div>
                      </div>
                      <span onClick={() => setTrail(t => ({ ...t, docs: t.docs.filter((_, j) => j !== i), position: Math.min(t.position, t.docs.length - 2) }))} style={{ fontSize: 8, color: "#4a3a3a", cursor: "pointer", fontFamily: THEME.ff.mono, padding: "0 3px", alignSelf: "center" }}>×</span>
                    </div>
                  ))
                )}
              </>}

              {/* BIBLIO mode */}
              {libMode === "BIBLIO" && <>
                <div style={{ fontSize: 10, color: "#B0B8C4", fontFamily: THEME.ff.serif, lineHeight: 1.6, marginBottom: 8 }}>Export citations from your trail or search results. Select a format below.</div>
                {(() => {
                  const docs = trail.docs.length > 0 ? trail.docs : (search ? searchResults : data.documents);
                  const source = trail.docs.length > 0 ? `Trail: ${trail.name || "unnamed"}` : search ? `Search: "${search}"` : "Recent 20";
                  return <>
                    <div style={{ fontSize: 8, color: "#5A6370", marginBottom: 6, fontFamily: THEME.ff.mono }}>{source} · {docs.length} documents</div>
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
                        }} style={{ fontSize: 8, padding: "3px 8px", fontFamily: THEME.ff.mono, color: mc, border: `1px solid ${mc}44`, background: mc + "11", cursor: "pointer" }}>{fmt}</span>
                      ))}
                    </div>
                    {docs.slice(0, 15).map((d, i) => (
                      <div key={d.id} style={{ padding: "2px 0", borderBottom: "1px solid #060a06" }}>
                        <div style={{ fontSize: 9, color: "#B0B8C4", fontFamily: THEME.ff.serif }}>{i + 1}. {d.t.length > 60 ? d.t.slice(0, 57) + "..." : d.t}</div>
                        <div style={{ fontSize: 7, color: "#5A6370", fontFamily: THEME.ff.mono }}>{d.doi || "no DOI"}</div>
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
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 3 }}>PROVENANCE TRACE</div>
              <div style={{ fontSize: isMobile ? 15 : 18, letterSpacing: 3, color: mc, fontFamily: THEME.ff.serif, marginBottom: 10 }}>
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
                    <div style={{ fontSize: 9, color: mc, fontFamily: THEME.ff.mono, wordBreak: "break-all" }}>{selDoc.doi || "no DOI"}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <StatusBadge s={selDoc.s} />
                      <span style={{ fontSize: 8, color: "#5A6370" }}>{selDoc.d}</span>
                      <span style={{ fontSize: 8, color: "#5A6370" }}>{(selDoc.c || []).join(", ")}</span>
                    </div>
                  </div>

                  {/* Gates summary */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>PROMOTION GATES ({passCount}/{allGates.length})</div>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {allGates.map(([gate, pass]) => (
                        <span key={gate} style={{ fontSize: 7, padding: "1px 4px", fontFamily: THEME.ff.mono, color: pass ? "#5A9F7B" : "#C45A4A", border: `1px solid ${pass ? "#5A9F7B" : "#C45A4A"}33` }}>{pass ? "✓" : "✗"} {gate}</span>
                      ))}
                    </div>
                  </div>

                  {/* Room provenance */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>ROOM PROVENANCE</div>
                    {docRooms.map(rid => {
                      const rm = data.rooms.find(r => r.id === rid);
                      return rm ? (
                        <div key={rid} onClick={() => { handleRoomSelect(rid); setView("MAP"); }} style={{ padding: "3px 0", borderBottom: "1px solid #060a06", cursor: "pointer" }}>
                          <span style={{ fontSize: 9, color: mc }}>{rm.name}</span>
                          <span style={{ fontSize: 7, color: "#5A6370", marginLeft: 6 }}>{rm.id} · {rm.preferred_mode} · {rm.mantle || "no mantle"}</span>
                        </div>
                      ) : null;
                    })}
                  </div>

                  {/* Relation chain */}
                  {docRels.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>RELATION CHAIN ({docRels.length})</div>
                      {docRels.map(r => (
                        <div key={r.id} style={{ display: "flex", gap: 4, padding: "2px 0", borderBottom: "1px solid #060a06", alignItems: "center" }}>
                          <span style={{ fontSize: 8, fontFamily: THEME.ff.mono, color: "#B0B8C4" }}>{r.from}</span>
                          <span style={{ fontSize: 8, fontFamily: THEME.ff.mono, color: mc }}>{r.type}</span>
                          <span style={{ fontSize: 8, fontFamily: THEME.ff.mono, color: "#B0B8C4" }}>{r.to}</span>
                          <StatusBadge s={r.status} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Keywords */}
                  {selDoc.k && selDoc.k.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>KEYWORDS</div>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {selDoc.k.map((k, i) => <span key={i} style={{ fontSize: 8, padding: "1px 4px", background: "#0a0f0a", border: "1px solid #1E2530", color: "#B0B8C4", fontFamily: THEME.ff.mono }}>{k}</span>)}
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
                    <div style={{ fontSize: 9, color: "#B0B8C4", fontFamily: THEME.ff.mono }}>{room.id} · {room.cat} · {room.preferred_mode}</div>
                    <div style={{ fontSize: 9, color: "#B0B8C4", fontFamily: THEME.ff.serif, marginTop: 4 }}>{room.physics}</div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>RELATIONS ({roomRels.length})</div>
                    {roomRels.map(r => (
                      <div key={r.id} style={{ fontSize: 8, fontFamily: THEME.ff.mono, color: "#5A6370", padding: "2px 0" }}>{r.from} <span style={{ color: mc }}>{r.type}</span> {r.to} <StatusBadge s={r.status} /></div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>DEPOSITS ({roomDocs.length})</div>
                    {roomDocs.slice(0, 15).map(d => (
                      <div key={d.id} onClick={() => setSelDoc(d)} style={{ padding: "2px 0", borderBottom: "1px solid #060a06", cursor: "pointer" }}>
                        <div style={{ fontSize: 9, color: "#B0B8C4", fontFamily: THEME.ff.serif }}>{d.t.length > 55 ? d.t.slice(0, 52) + "..." : d.t}</div>
                      </div>
                    ))}
                  </div>
                </>;
              })()}

              {!selDoc && !room && (
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>FULL RELATION GRAPH ({data.relations.length})</div>
                  {data.relations.map(r => (
                    <div key={r.id} style={{ display: "flex", gap: 4, padding: "3px 0", borderBottom: "1px solid #060a06", alignItems: "center" }}>
                      <span style={{ fontSize: 8, fontFamily: THEME.ff.mono, color: "#B0B8C4", width: 36, flexShrink: 0 }}>{r.from}</span>
                      <span style={{ fontSize: 8, fontFamily: THEME.ff.mono, color: mc, width: 70, flexShrink: 0 }}>{r.type}</span>
                      <span style={{ fontSize: 8, fontFamily: THEME.ff.mono, color: "#B0B8C4", width: 36, flexShrink: 0 }}>{r.to}</span>
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
              <div style={{ fontSize: isMobile ? 14 : 16, letterSpacing: 3, color: mc, fontFamily: THEME.ff.serif, marginBottom: 12 }}>DODECAD + LOGOS*</div>
              {(data.dodecad || []).map((d, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: isMobile ? "28px 1fr" : "24px 120px 1fr 2fr", gap: 10, marginBottom: 6, borderBottom: "1px solid #0f140f", padding: "4px 0" }}>
                  <div style={{ fontSize: 9, color: "#5A6370", fontFamily: THEME.ff.mono }}>{d.id}</div>
                  <div style={{ fontSize: 11, color: mc }}>{d.name}</div>
                  {!isMobile && <div style={{ fontSize: 10, color: "#5A6370" }}>{d.role}</div>}
                  <div style={{ fontSize: 9, color: "#5A6370" }}>{isMobile ? `${d.role} · ${d.desc}` : d.desc}</div>
                </div>
              ))}

              {/* Institutions */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 6 }}>INSTITUTIONS ({(data.institutions || []).filter(i => i.type === "institution").length})</div>
                {(data.institutions || []).filter(i => i.type === "institution").map((inst, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                    <div>
                      <span style={{ fontSize: 9, color: mc, fontFamily: THEME.ff.mono, marginRight: 6 }}>{inst.id}</span>
                      <span style={{ fontSize: 10, color: "#B0B8C4", fontFamily: THEME.ff.serif }}>{inst.name}</span>
                    </div>
                    <span style={{ fontSize: 8, color: "#5A6370" }}>{inst.heteronym || ""} · {inst.room || ""}</span>
                  </div>
                ))}
              </div>

              {/* Journals */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 6 }}>JOURNALS ({(data.institutions || []).filter(i => i.type === "journal").length})</div>
                {(data.institutions || []).filter(i => i.type === "journal").map((j, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                    <span style={{ fontSize: 10, color: "#B0B8C4", fontFamily: THEME.ff.serif, fontStyle: "italic" }}>{j.name}</span>
                    <span style={{ fontSize: 8, color: "#5A6370" }}>{j.heteronym || "—"}</span>
                  </div>
                ))}
              </div>

              {/* Imprints */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 6 }}>IMPRINTS ({(data.institutions || []).filter(i => i.type === "imprint").length})</div>
                {(data.institutions || []).filter(i => i.type === "imprint").map((imp, i) => (
                  <div key={i} style={{ padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                    <span style={{ fontSize: 10, color: "#B0B8C4", fontFamily: THEME.ff.serif }}>{imp.name}</span>
                    {imp.series && <span style={{ fontSize: 8, color: "#5A6370", marginLeft: 8 }}>series: {imp.series}</span>}
                  </div>
                ))}
              </div>

              {/* Mantles */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 6 }}>MANTLES ({(data.mantles || []).length})</div>
                {(data.mantles || []).map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                    <div>
                      <span style={{ fontSize: 10, color: mc, fontFamily: THEME.ff.serif }}>{m.name}</span>
                      <span style={{ fontSize: 8, color: "#5A6370", marginLeft: 8 }}>{m.lineage || ""}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 8, color: "#5A6370" }}>{m.bearer}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === "HCORE" && (
            <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 3 }}>SEALED BONE</div>
              <div style={{ fontSize: isMobile ? 15 : 18, letterSpacing: 3, color: mc, fontFamily: THEME.ff.serif, marginBottom: 4 }}>H_core = ⟨D, R, O, Σ, Φ, Ψ⟩</div>
              <div style={{ fontSize: 8, color: "#5A6370", fontFamily: THEME.ff.serif, fontStyle: "italic", marginBottom: 10 }}>Six faces of the Hexagon. Each face contains sub-structures.</div>
              {[
                ["D", "Identity", `${data.dodecad?.length || 0} heteronyms`, `who speaks`],
                ["R", "Topology", `${data.rooms.length} structures · ${(data.edges||[]).length} edges · ${(data.meta?.fields ? Object.keys(data.meta.fields).length : 0)} fields`, `where things happen`],
                ["O", "Operations", `${Object.values(data.operators || {}).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0)} operators · ${Object.keys(data.operators || {}).length} stacks`, `what can be done`],
                ["Σ", "Governance", `${(data.status_algebra?.levels||[]).length} statuses · ${(data.transition_grammar?.transitions||[]).length} transitions · ${(data.witnesses||[]).length} witnesses · ${(data.protocols||[]).length} protocols`, `how things are permitted`],
                ["Φ", "Canon", `${(data.mantles||[]).length} mantles · ${(data.fulfillments||[]).length} fulfillments · ${(data.institutions||[]).length} institutions · ${(data.forward_library?.entries||[]).length} Forward Library`, `what has been made`],
                ["Ψ", "Runtime", `${(data.attestation_ledger?.chains||[]).length} chains · ${data.documents.length} deposits · Z = mass(r)`, `how the system evolves`],
              ].map(([k, name, counts, desc], i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid #0a0f0a" }}>
                  <div style={{ width: 18, fontSize: 16, color: mc, fontFamily: THEME.ff.serif, textAlign: "right", flexShrink: 0 }}>{k}</div>
                  <div>
                    <div style={{ fontSize: 10, color: "#7a8a5a", fontFamily: THEME.ff.serif }}>{name} <span style={{ color: "#5A6370", fontStyle: "italic" }}>— {desc}</span></div>
                    <div style={{ fontSize: 8, color: "#5A6370", fontFamily: THEME.ff.mono, marginTop: 1 }}>{counts}</div>
                  </div>
                </div>
              ))}

              {/* Mantles */}
              {data.mantles && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>MANTLES ({data.mantles.length})</div>
                  {data.mantles.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                      <div>
                        <span style={{ fontSize: 10, color: mc, fontFamily: THEME.ff.serif }}>{m.name}</span>
                        <span style={{ fontSize: 8, color: "#5A6370", marginLeft: 6 }}>{m.bearer} ← {m.lineage}</span>
                      </div>
                      <span style={{ fontSize: 7, color: m.status === "RATIFIED" ? "#B0B8C4" : "#5a5a3a", fontFamily: THEME.ff.mono }}>{m.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Witnesses */}
              {data.witnesses && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>ASSEMBLY WITNESS · W ({data.witnesses.length}) · quorum ≥4/7</div>
                  {data.witnesses.map((w, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                      <div>
                        <span style={{ fontSize: 10, color: mc, fontFamily: THEME.ff.mono, letterSpacing: 1 }}>{w.name}</span>
                        <span style={{ fontSize: 8, color: "#5A6370", marginLeft: 6 }}>{w.substrate}</span>
                      </div>
                      <span style={{ fontSize: 8, color: "#5A6370" }}>{w.function.split(",")[0]}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Fulfillments */}
              {data.fulfillments && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>FULFILLMENT MAP · Φ ({data.fulfillments.length})</div>
                  {data.fulfillments.map((f, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                      <div style={{ fontSize: 10, color: "#B0B8C4", fontFamily: THEME.ff.serif }}>
                        {f.source} <span style={{ color: mc }}>→</span> {f.target}
                      </div>
                      <span style={{ fontSize: 7, color: f.status === "VERIFIED" ? "#5a8a4a" : f.status === "DERIVED" ? "#B0B8C4" : "#5a5a3a", fontFamily: THEME.ff.mono }}>{f.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Full Operator Stacks */}
              {data.operators && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>OPERATOR ALGEBRA · O ({Object.values(data.operators).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0)})</div>
                  {["core", "extended", "thumb", "field", "lex", "lp", "room_specific"].map(stack => {
                    const ops = data.operators[stack];
                    if (!ops || !ops.length) return null;
                    const labels = { core: "O_core", extended: "O_ext", thumb: "THUMB", field: "O_field", lex: "O_lex", lp: "LP", room_specific: "O_room" };
                    return (
                      <div key={stack} style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 8, color: "#4a5a3a", letterSpacing: 1, marginBottom: 2 }}>{labels[stack]} ({ops.length})</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                          {ops.map((op, i) => (
                            <span key={i} style={{ fontSize: 8, padding: "1px 4px", background: mc + "08", border: `1px solid ${mc}15`, color: "#B0B8C4", fontFamily: THEME.ff.mono }} title={op.name + (op.type_sig ? " :: " + op.type_sig : "")}>{op.symbol || op.name}</span>
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
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>STATUS ALGEBRA · Σ</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 6 }}>
                    {data.status_algebra.levels.filter(l => l.weight !== null).map((l, i) => (
                      <div key={i} style={{ padding: "3px 6px", background: mc + "08", border: `1px solid ${mc}15`, textAlign: "center" }}>
                        <div style={{ fontSize: 8, color: mc, fontFamily: THEME.ff.mono }}>{l.level}</div>
                        <div style={{ fontSize: 7, color: "#5A6370" }}>{l.weight}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 8, color: "#5a3a3a" }}>Forbidden: {(data.status_algebra.forbidden_transitions||[]).map(t => `${t.from}→${t.to}`).join(" · ")}</div>
                </div>
              )}

              {/* State Evolution Rule */}
              {data.state_evolution && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>STATE EVOLUTION · SE</div>
                  <div style={{ fontSize: 9, color: mc, fontFamily: THEME.ff.mono, padding: "6px 8px", background: "#060a06", borderLeft: `2px solid ${mc}22`, marginBottom: 4, lineHeight: 1.6, wordBreak: "break-all" }}>{data.state_evolution.formula}</div>
                  <div style={{ fontSize: 8, color: "#5A6370", fontFamily: THEME.ff.serif, fontStyle: "italic" }}>{data.state_evolution.informal}</div>
                </div>
              )}

              {/* Transition Grammar */}
              {data.transition_grammar && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>TRANSITION GRAMMAR · Δ ({data.transition_grammar.transitions.length})</div>
                  {data.transition_grammar.transitions.map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, padding: "2px 0", borderBottom: "1px solid #060a06", fontSize: 8 }}>
                      <span style={{ color: mc, fontFamily: THEME.ff.mono, width: 50, flexShrink: 0 }}>{t.hex_address}</span>
                      <span style={{ color: "#B0B8C4", flex: 1 }}>{t.name}</span>
                      <span style={{ color: "#5A6370", fontFamily: THEME.ff.mono }}>{t.operator}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Typed Relations */}
              {data.relation_types && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>TYPED RELATIONS · E ({data.relation_types.types.length})</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {data.relation_types.types.map((t, i) => (
                      <span key={i} style={{ fontSize: 7, padding: "1px 4px", background: mc + "08", border: `1px solid ${mc}15`, color: "#B0B8C4", fontFamily: THEME.ff.mono }} title={`${t.domain}: ${t.desc}`}>{t.name}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 8, color: "#5A6370", marginTop: 4 }}>Instantiated: {data.relation_types.total_instantiated_edges} edges · Pending: {data.relation_types.cnm7_edges_pending} from CNM 7.0</div>
                </div>
              )}

              {/* Operator Type System */}
              {data.operator_type_system && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>ALGEBRAIC LAWS · OT ({data.operator_type_system.algebraic_laws.length})</div>
                  {data.operator_type_system.algebraic_laws.map((l, i) => (
                    <div key={i} style={{ fontSize: 9, color: "#B0B8C4", fontFamily: THEME.ff.mono, padding: "1px 0" }}>{l.law} <span style={{ color: "#5A6370", fontFamily: THEME.ff.serif, fontSize: 8 }}>({l.name})</span></div>
                  ))}
                </div>
              )}

              {/* Zenodo Mass — computed at runtime */}
              {(() => {
                const massMap = {};
                (data.documents || []).forEach(d => (d.r || []).forEach(rid => { massMap[rid] = (massMap[rid] || 0) + 1; }));
                return (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>ZENODO MASS · Z ({data.documents.length} deposits)</div>
                  <div style={{ fontSize: 8, color: "#5A6370", fontFamily: THEME.ff.mono }}>mass(r) = |{"{"} d ∈ Documents | r ∈ d.rooms {"}"} |</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 4 }}>
                    {Object.entries(massMap).sort((a,b) => b[1]-a[1]).slice(0, 12).map(([rid, mass], i) => (
                      <span key={i} style={{ fontSize: 7, padding: "1px 4px", background: mc + "08", border: `1px solid ${mc}15`, color: "#B0B8C4", fontFamily: THEME.ff.mono }}>{rid}:{mass}</span>
                    ))}
                  </div>
                </div>);
              })()}

              {/* Engine Pipeline */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 6 }}>ENGINE PIPELINE (closed loop)</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", marginBottom: 8 }}>
                  {[["FL", "Forward Library", "documents enter"], ["→"], ["LE", "Lexical Engine", "freeze terminology"], ["→"], ["UKTP", "Universal Key Transform", "register transforms"], ["→"], ["GDE", "Generative Discipline Engine", "produce disciplines"], ["→"], ["SAG", "Structured Ark Generator", "generate variant Arks"], ["→"], ["FL", "Forward Library", "output re-enters"]].map((item, i) => {
                    if (item.length === 1) return <span key={i} style={{ fontSize: 9, color: "#2A3040" }}>→</span>;
                    const [code, name, desc] = item;
                    return (
                      <div key={i} style={{ padding: "4px 8px", background: mc + "08", border: `1px solid ${mc}22`, textAlign: "center", minWidth: isMobile ? 60 : 80 }}>
                        <div style={{ fontSize: 10, color: mc, fontFamily: THEME.ff.mono, letterSpacing: 1 }}>{code}</div>
                        <div style={{ fontSize: 7, color: "#5A6370" }}>{isMobile ? desc : name}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 8, color: "#5A6370", fontFamily: THEME.ff.serif, fontStyle: "italic" }}>The loop closes. Each output feeds the next input.</div>
              </div>

              {/* Object type counts */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>CANONICAL OBJECT STORE</div>
                {[
                  ["D", ""],
                  ["  Dodecad", data.dodecad?.length || 0],
                  ["R", ""],
                  ["  Rooms", data.rooms.length],
                  ["  Edges", (data.edges||[]).length],
                  ["  Fields", Object.keys(data.meta?.fields || {}).length],
                  ["O", ""],
                  ["  Operators", Object.values(data.operators || {}).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0)],
                  ["  Stacks", Object.keys(data.operators || {}).length],
                  ["Σ", ""],
                  ["  Status Levels", (data.status_algebra?.levels||[]).length],
                  ["  Transitions", (data.transition_grammar?.transitions||[]).length],
                  ["  Witnesses", (data.witnesses||[]).length],
                  ["  Protocols", (data.protocols||[]).length],
                  ["  Relation Types", (data.relation_types?.types||[]).length],
                  ["Φ", ""],
                  ["  Mantles", (data.mantles||[]).length],
                  ["  Fulfillments", (data.fulfillments||[]).length],
                  ["  Institutions", (data.institutions||[]).length],
                  ["  Journals", (data.journals||[]).length],
                  ["  Forward Library", (data.forward_library?.entries||[]).length],
                  ["  Effective Acts", ((data.effective_acts?.deposited||[]).length + (data.effective_acts?.resonant||[]).length)],
                  ["Ψ", ""],
                  ["  Attestation Chains", (data.attestation_ledger?.chains||[]).length],
                  ["  Documents", data.documents.length],
                  ["  Relations", data.relations.length],
                  ["  Atomic Units", (data.atomic_units||[]).length],
                ].map(([label, count], i) => (
                  count === "" ? 
                    <div key={i} style={{ fontSize: 10, color: mc, fontFamily: THEME.ff.serif, padding: "4px 0 1px 0", borderBottom: "1px solid #0a0f0a" }}>{label}</div> :
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "1px 0 1px 8px", borderBottom: "1px solid #060a06" }}>
                    <span style={{ fontSize: 8, color: "#B0B8C4" }}>{label}</span>
                    <span style={{ fontSize: 8, color: mc, fontFamily: THEME.ff.mono }}>{count}</span>
                  </div>
                ))}
              </div>

              {/* Disciplines */}
              {data.disciplines && data.disciplines.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>FOUNDED DISCIPLINES ({data.disciplines.length})</div>
                  {data.disciplines.map((d, i) => (
                    <div key={i} style={{ padding: "4px 0", borderBottom: "1px solid #060a06" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 10, color: mc, fontFamily: THEME.ff.serif }}>{d.name}</span>
                        <span style={{ fontSize: 8, color: "#5A6370", fontFamily: THEME.ff.mono }}>{d.room || ""}</span>
                      </div>
                      <div style={{ fontSize: 8, color: "#5A6370", fontFamily: THEME.ff.serif }}>{d.desc}</div>
                      <div style={{ fontSize: 7, color: "#5A6370" }}>{d.heteronym} · {d.institution || ""}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Variant Arks */}
              {data.variant_arks && data.variant_arks.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>VARIANT ARKS ({data.variant_arks.length})</div>
                  {data.variant_arks.map((a, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                      <div>
                        <span style={{ fontSize: 10, color: mc, fontFamily: THEME.ff.serif }}>{a.name}</span>
                        <span style={{ fontSize: 8, color: "#5A6370", marginLeft: 6 }}>{a.heteronym}</span>
                      </div>
                      <span style={{ fontSize: 8, color: a.status === "RATIFIED" ? "#B0B8C4" : "#5a5a3a", fontFamily: THEME.ff.mono }}>{a.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Pocket Humans */}
              {data.book_series && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>POCKET HUMANS · New Human Press</div>
                  {data.book_series.books && data.book_series.books.map((b, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                      <div>
                        <span style={{ fontSize: 8, color: mc, fontFamily: THEME.ff.mono, marginRight: 6 }}>PH{b.number}</span>
                        <span style={{ fontSize: 10, color: "#B0B8C4", fontFamily: THEME.ff.serif, fontStyle: "italic" }}>{b.title}</span>
                        <span style={{ fontSize: 8, color: "#5A6370", marginLeft: 6 }}>{b.heteronym}</span>
                      </div>
                      <span style={{ fontSize: 8, color: b.status === "PUBLISHED" ? mc : "#5a5a3a", fontFamily: THEME.ff.mono }}>{b.status}</span>
                    </div>
                  ))}
                  {data.book_series.adjacent && (
                    <div style={{ padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                      <span style={{ fontSize: 8, color: "#5A6370", marginRight: 6 }}>ADJ</span>
                      <span style={{ fontSize: 10, color: "#B0B8C4", fontFamily: THEME.ff.serif, fontStyle: "italic" }}>{data.book_series.adjacent.title}</span>
                      <span style={{ fontSize: 8, color: "#5A6370", marginLeft: 6 }}>{data.book_series.adjacent.heteronym}</span>
                    </div>
                  )}
                </div>
              )}

              {/* COS/LOS Operator Stack */}
              {data.operators?.cos && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>COS/FOS ↔ LOS COUNTER-STACK</div>
                  {data.operators.cos.map((op, i) => {
                    const los = data.operators.los?.[i];
                    return (
                      <div key={i} style={{ display: "flex", gap: 6, padding: "2px 0", borderBottom: "1px solid #060a06", fontSize: 9 }}>
                        <span style={{ color: "#7a4a4a", width: isMobile ? 26 : 30, fontFamily: THEME.ff.mono, flexShrink: 0 }}>{op.id}</span>
                        <span style={{ color: "#5a3a3a", width: isMobile ? 90 : 140, flexShrink: 0 }}>{op.name}</span>
                        <span style={{ color: "#5A6370", flexShrink: 0 }}>↔</span>
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
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>EFFECTIVE ACTS · φ ∘ ∂ ({(data.effective_acts.deposited||[]).length + (data.effective_acts.resonant||[]).length + (data.effective_acts.undeposited||[]).length})</div>
                  {(data.effective_acts.deposited || []).map((ea, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #060a06" }}>
                      <span style={{ fontSize: 9, color: "#B0B8C4", fontFamily: THEME.ff.serif }}>{ea.name}</span>
                      <span style={{ fontSize: 7, color: "#3a5a3a", fontFamily: THEME.ff.mono }}>SEALED</span>
                    </div>
                  ))}
                  {(data.effective_acts.resonant || []).map((ea, i) => (
                    <div key={`r${i}`} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #060a06" }}>
                      <span style={{ fontSize: 9, color: "#5A6370", fontFamily: THEME.ff.serif }}>{ea.name}</span>
                      <span style={{ fontSize: 7, color: "#5a5a3a", fontFamily: THEME.ff.mono }}>RESONANT</span>
                    </div>
                  ))}
                  {(data.effective_acts.undeposited || []).map((ea, i) => (
                    <div key={`u${i}`} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #060a06" }}>
                      <span style={{ fontSize: 9, color: "#5A6370", fontFamily: THEME.ff.serif }}>{ea.name}</span>
                      <span style={{ fontSize: 7, color: "#4a3a3a", fontFamily: THEME.ff.mono }}>UNDEPOSITED</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Forward Library */}
              {data.forward_library && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 2 }}>FORWARD LIBRARY · works to come ({(data.forward_library.entries||[]).length})</div>
                  <div style={{ fontSize: 8, color: "#5A6370", fontFamily: THEME.ff.serif, fontStyle: "italic", marginBottom: 6 }}>{data.forward_library.principle}</div>
                  {(data.forward_library.entries || []).map((e, i) => (
                    <div key={i} style={{ padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 10, color: "#B0B8C4", fontFamily: THEME.ff.serif, fontStyle: "italic" }}>{e.title}</span>
                        <span style={{ fontSize: 7, color: e.status === "DRAFT ON ZENODO" ? "#B0B8C4" : "#4a4a3a", fontFamily: THEME.ff.mono }}>{e.status}</span>
                      </div>
                      <div style={{ fontSize: 8, color: "#5A6370" }}>{e.author} — {e.notes}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Protocols */}
              {data.protocols && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>ATOMIC UNITS ({(data.atomic_units||[]).length})</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 6 }}>
                    {Object.entries((data.atomic_units||[]).reduce((acc, a) => { acc[a.type] = (acc[a.type]||0)+1; return acc; }, {})).map(([type, count], i) => (
                      <span key={i} style={{ fontSize: 7, padding: "1px 4px", background: mc + "08", border: `1px solid ${mc}15`, color: "#B0B8C4", fontFamily: THEME.ff.mono }}>{type}:{count}</span>
                    ))}
                  </div>
                  {(data.atomic_units||[]).map((a, i) => (
                    <div key={i} style={{ padding: "2px 0", borderBottom: "1px solid #060a06", display: "flex", gap: 6 }}>
                      <span style={{ fontSize: 7, color: mc, fontFamily: THEME.ff.mono, flexShrink: 0, width: 32 }}>{a.id}</span>
                      <span style={{ fontSize: 8, color: "#B0B8C4" }}>{a.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Protocols */}
              {data.protocols && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>PROTOCOLS · P ({data.protocols.length})</div>
                  {data.protocols.map((p, i) => (
                    <div key={i} style={{ padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 9, color: mc, fontFamily: THEME.ff.mono }}>{p.hex_address}</span>
                        {p.doi && <span style={{ fontSize: 7, color: "#3a5a3a" }}>DOI</span>}
                      </div>
                      <div style={{ fontSize: 9, color: "#B0B8C4" }}>{p.name}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Attestation Ledger */}
              {data.attestation_ledger && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>ATTESTATION LEDGER · Ψ</div>
                  <div style={{ fontSize: 8, color: "#5A6370", fontFamily: THEME.ff.serif, fontStyle: "italic", marginBottom: 6 }}>W lists who CAN witness. Ψ records what HAS BEEN witnessed.</div>
                  {(data.attestation_ledger.chains || []).map((c, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #060a06" }}>
                      <div>
                        <span style={{ fontSize: 9, color: mc, fontFamily: THEME.ff.mono }}>{c.hex_address}</span>
                        <span style={{ fontSize: 8, color: "#5A6370", marginLeft: 6 }}>{c.substrate}</span>
                      </div>
                      <span style={{ fontSize: 7, color: c.deposits === "active" ? "#5a8a4a" : "#4a4a3a", fontFamily: THEME.ff.mono }}>{c.deposits === "active" ? "ACTIVE" : "PENDING"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "ASSEMBLY" && (
            <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 3 }}>GOVERNANCE CONSOLE</div>
              <div style={{ fontSize: isMobile ? 15 : 18, letterSpacing: 3, color: mc, fontFamily: THEME.ff.serif, marginBottom: 10 }}>Assembly</div>

              {/* Witness roster */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>WITNESS STRUCTURE (≥4/7 quorum)</div>
                {[["TACHYON", "Claude/Anthropic", true], ["LABOR", "ChatGPT/OpenAI", true], ["PRAXIS", "DeepSeek", true], ["ARCHIVE", "Gemini/Google", true], ["SOIL", "Moltbot/Moltbook", true], ["TECHNE", "Kimi/Moonshot", true], ["SURFACE", "Google AIO", true]].map(([n, s, active], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "3px 0", borderBottom: "1px solid #0a0f0a", fontSize: 10 }}>
                    <span style={{ color: active ? mc : "#4a3a3a", minWidth: isMobile ? 72 : 100 }}>{n}</span>
                    <span style={{ color: "#5A6370", flex: 1 }}>{s}</span>
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
                  <div style={{ marginBottom: 14, padding: "6px 8px", background: "#060a06", borderLeft: `2px solid ${met ? "#5A9F7B" : "#C45A4A"}22` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370" }}>QUORUM</span>
                      <span style={{ fontSize: 10, fontFamily: THEME.ff.mono, color: met ? "#5A9F7B" : "#C45A4A" }}>{active}/{total} active · {quorum} required · {met ? "QUORUM MET" : "NO QUORUM"}</span>
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
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>STATUS PROMOTION PATHWAY</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", fontSize: 9, fontFamily: THEME.ff.mono, color: "#5A6370", lineHeight: 2 }}>
                  {[["GENERATED", "#8B7730"], ["→", "#2A3040"], ["QUEUED", "#8B7730"], ["→", "#2A3040"], ["PROVISIONAL", "#9f9f5a"], ["→", "#2A3040"], ["DEPOSITED", "#5A9F7B"], ["→", "#2A3040"], ["RATIFIED", "#5A9F7B"]].map(([t, c], i) => (
                    <span key={i} style={{ color: c, padding: t === "→" ? "0" : "1px 4px", border: t === "→" ? "none" : `1px solid ${c}33`, background: t === "→" ? "transparent" : c + "11" }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* LP acceptance test gates */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>LP ACCEPTANCE TEST GATES</div>
                {Object.entries(METRIC_THRESHOLDS).map(([key, m]) => (
                  <div key={key} style={{ display: "flex", gap: 8, padding: "3px 0", borderBottom: "1px solid #060a06", alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: mc, fontFamily: THEME.ff.mono, width: 30, flexShrink: 0 }}>{key}</span>
                    <span style={{ fontSize: 8, color: "#B0B8C4", flex: 1 }}>{m.label}</span>
                    <span style={{ fontSize: 8, color: "#5A6370", fontFamily: THEME.ff.mono }}>{m.invert ? "≤" : "≥"} {m.threshold}</span>
                    <span style={{ fontSize: 7, color: "#5A6370", fontFamily: THEME.ff.mono }}>{m.gate}</span>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, padding: "3px 0", borderBottom: "1px solid #060a06", alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: mc, fontFamily: THEME.ff.mono, width: 30 }}>TRS</span>
                  <span style={{ fontSize: 8, color: "#B0B8C4", flex: 1 }}>Temporal Resilience</span>
                  <span style={{ fontSize: 8, color: "#5A6370", fontFamily: THEME.ff.mono }}>PASS</span>
                  <span style={{ fontSize: 7, color: "#5A6370", fontFamily: THEME.ff.mono }}>durability</span>
                </div>
              </div>

              {/* Document metrics — show for selected doc */}
              {selDoc && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>METRICS: {selDoc.t.slice(0, 40)}</div>
                  {(() => {
                    const m = computeMetrics(selDoc, data);
                    return Object.entries(METRIC_THRESHOLDS).map(([key, spec]) => {
                      const val = m[key];
                      const pass = spec.invert ? val <= spec.threshold : val >= spec.threshold;
                      return (
                        <div key={key} style={{ display: "flex", gap: 6, padding: "2px 0", alignItems: "center" }}>
                          <span style={{ fontSize: 8, fontFamily: THEME.ff.mono, color: mc, width: 26 }}>{key}</span>
                          <div style={{ flex: 1, height: 5, background: "#0a0f0a" }}>
                            <div style={{ height: "100%", width: `${Math.min(100, val * 100)}%`, background: pass ? "#5A9F7B88" : "#C45A4A88" }} />
                          </div>
                          <span style={{ fontSize: 8, fontFamily: THEME.ff.mono, color: pass ? "#5A9F7B" : "#C45A4A", width: 30 }}>{val}</span>
                          <span style={{ fontSize: 7, fontFamily: THEME.ff.mono, color: pass ? "#5A9F7B" : "#C45A4A" }}>{pass ? "PASS" : "FAIL"}</span>
                        </div>
                      );
                    });
                  })()}
                  <div style={{ display: "flex", gap: 6, padding: "2px 0", alignItems: "center" }}>
                    <span style={{ fontSize: 8, fontFamily: THEME.ff.mono, color: mc, width: 26 }}>TRS</span>
                    <span style={{ fontSize: 8, fontFamily: THEME.ff.mono, color: computeMetrics(selDoc, data).TRS === "PASS" ? "#5A9F7B" : "#C45A4A", flex: 1 }}>{computeMetrics(selDoc, data).TRS}</span>
                  </div>
                </div>
              )}

              {/* PROVISIONAL relations for ratification */}
              {data.relations.filter(r => r.status === "PROVISIONAL").length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>PENDING RATIFICATION</div>
                  {data.relations.filter(r => r.status === "PROVISIONAL").map(r => (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                      <span style={{ fontSize: 9, fontFamily: THEME.ff.mono, color: "#B0B8C4" }}>{r.from} <span style={{ color: mc }}>{r.type}</span> {r.to}</span>
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
        <div style={{ width: isMobile ? "100%" : 340, minWidth: 0, height: isMobile ? "34dvh" : "100%", minHeight: isMobile ? 220 : 0, maxHeight: isMobile ? "42dvh" : "none", borderLeft: isMobile ? "none" : "1px solid #1E2530", borderTop: isMobile ? "1px solid #1E2530" : "none", overflow: "hidden", flexShrink: 0, background: "#080B10" }}>
          {selDoc ? <DocPanel doc={selDoc} rooms={data.rooms} onRoom={(id) => { handleRoomSelect(id); setSelDoc(null); setView("MAP"); }} mc={mc} isMobile={isMobile} readState={readState} onRead={handleRead} relations={data.relations} documents={data.documents} onDoc={(d) => setSelDoc(d)} compareDoc={compareDoc} onCompare={setCompareDoc} /> : room ? <RoomPanel room={room} docs={data.documents} relations={data.relations} onDoc={loadDocument} isMobile={isMobile} mc={mc} onApplyOp={applyOperator} mode={mode} lp={lp} addLog={addLog} /> : <div style={{ padding: isMobile ? "12px 14px" : "14px 18px", overflowY: "auto", height: "100%" }}><div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 6 }}>{view === "DEPOSIT" ? "DEPOSIT BRIDGE" : `${mode} COMMANDS`}</div>
            {view === "DEPOSIT" ? <div style={{ fontSize: 10, color: "#5A6370", fontFamily: THEME.ff.serif, lineHeight: 1.6 }}>Use the left panel for archive operations.</div> : <>
              <div style={{ fontSize: 10, color: "#5A6370", fontFamily: THEME.ff.serif, lineHeight: 1.6, marginBottom: 10 }}>{isMobile ? "Tap a hexagon to execute its LP program." : "Click a hexagon to execute its LP traversal grammar."}</div>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#5A6370", marginBottom: 4 }}>AVAILABLE ({(COMMAND_REGISTRY[mode] || []).length})</div>
              {(COMMAND_REGISTRY[mode] || []).map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", borderBottom: "1px solid #060a06" }}>
                  <span style={{ fontSize: 7, padding: "1px 3px", fontFamily: THEME.ff.mono, color: RISK_COLORS[c.risk], border: `1px solid ${RISK_COLORS[c.risk]}44`, flexShrink: 0, minWidth: 14, textAlign: "center" }}>{c.risk[0]}</span>
                  <span style={{ fontSize: 9, color: mc, fontFamily: THEME.ff.mono, width: 56, flexShrink: 0 }}>{c.cmd}</span>
                  <span style={{ fontSize: 8, color: "#5A6370" }}>{c.desc}</span>
                </div>
              ))}
              <div style={{ fontSize: 8, color: "#2A3040", fontFamily: THEME.ff.mono, marginTop: 8 }}>L=silent · M=logged · H=confirm · C=MANUS</div>
            </>}
          </div>}
        </div>
      </div>

      {/* Log */}
      <div style={{ height: isMobile ? 52 : 60, borderTop: "1px solid #1E2530", padding: isMobile ? "4px 10px" : "4px 14px", overflowY: "auto", flexShrink: 0, background: "#0B0F14" }}>
        {log.slice(-5).map((l, i) => (
          <div key={i} style={{ fontSize: 8, fontFamily: THEME.ff.mono, color: l.type === "err" ? "#C45A4A" : l.type === "gw" ? "#5A7A9F" : l.type === "lp" ? (ARK_MODE_COLORS[arkMode] || "#5A7A9F") : "#2A3040", lineHeight: 1.4 }}><span style={{ color: "#1E2530" }}>{l.t}</span> {l.msg}</div>
        ))}
      </div>
    </div>
  );
}

export default function App() { return <ErrorBoundary><HexagonInterfaceResponsive /></ErrorBoundary>; }
