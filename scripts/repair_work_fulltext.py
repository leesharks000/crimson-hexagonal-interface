#!/usr/bin/env python3
"""repair_work_fulltext.py — a /works page carries the work; the deposit's apparatus stays on its seat (2026-10-31).

Operator, 2026-10-31, of /works/04bc: "framed by several layers of metadata that belong on alexanarch, not crimsonhexagonal, and
the lineation of the poems is gone... lets fix this one and scan for others like it". Two defects of the full-text block, which
projects data/texts/AXN-<HEX>-text.md from the alexanarch seat:
  1. the seat's apparatus rendered as the work: the YAML front matter (deposit_number, hex, title, ...) printed as prose; the
     recovery apparatus of the blog restorations (Description, Methodology, Falsification Conditions, Recovery note, ending
     "Canonical bytes below the rule."); the mint apparatus of pipeline deposits (Description, Methodology, Falsification
     Conditions, Files) set before the work's own title; and a superseded body appended "per non-destruction";
  2. lineation lost: lines the seat ends with a markdown hard break (two spaces) run together into one paragraph.
Each page's full-text block is re-rendered from the work alone, with hard breaks kept (python-markdown honours them), the DOI
cross-walk spans the page already carried re-applied, and the word count set to the work's. Everything else on the page (the
symbolon, the address block, seat and projection, relations, provenance) is the page's own and is left byte for byte. The
apparatus is not lost: it is the seat's, at alexanarch.org/s/records/<n>/, which every page links.

Texts that are themselves metadata records (a Zenodo or DataCite dump with no separate work) are not touched; they are listed.

    python3 scripts/repair_work_fulltext.py [--apply] [--only 04bc,0465] [--alexanarch ../alexanarch]
"""
import json, re, sys, pathlib, html
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from build_work_page import render_full

ROOT = pathlib.Path(__file__).resolve().parent.parent
W = ROOT / "public" / "works"
APP_H = ("Description", "Methodology", "Falsification Conditions", "Files", "Recovery note", "Abstract", "Keywords")


def strip_yaml(t):
    t = t.lstrip("﻿")
    if t.startswith("---\n"):
        k = t.find("\n---\n", 4)
        if k > 0 and re.search(r"^(deposit_number|axn_hex|hex|title):", t[4:k], re.M):
            return t[k + 5:], "front matter"
    return t, None


def work_of(t):
    """The work, and what was cut (a list of labels)."""
    cut = []
    t, y = strip_yaml(t)
    if y: cut.append(y)
    # a body appended per non-destruction is the seat's history, not the work
    m = re.search(r"\n---\n+## Appendix — body previously seated here", t)
    if m: t = t[:m.start()]; cut.append("appended superseded body")
    # the blog restorations: the apparatus ends "Canonical bytes below the rule." and a rule
    k = t.find("Canonical bytes below the rule.")
    if k >= 0:
        r = t.find("\n---\n", k)
        if r > 0: t = t[r + 5:]; cut.append("recovery apparatus (to the rule)")
    elif "SEMI-RESTORED RECORD" not in t:   # a metadata-only record keeps its body: there is no separate work to find
        # the mint apparatus: '# Title' then ## Description / ## Methodology / ## Falsification Conditions [/ ## Files], then the work
        lines = t.lstrip("\n").split("\n")
        heads = [(i, l) for i, l in enumerate(lines) if re.match(r"^#{1,2} ", l)]
        if len(heads) >= 3 and heads[0][1].startswith("# ") and [h for _, h in heads[1:4]] and all(
                re.sub(r"^## ", "", h).split(" (")[0] in APP_H for _, h in heads[1:3]):
            # cut to the first heading after the apparatus headings that is not itself apparatus
            j = None
            for i, h in heads[1:]:
                name = re.sub(r"^#+ ", "", h).split(" (")[0]
                if name not in APP_H:
                    j = i; break
            if j is not None:
                t = "\n".join(lines[j:]); cut.append("mint apparatus (" + ", ".join(re.sub(r"^## ", "", h) for i, h in heads[1:] if i < j) + ")")
    t = re.sub(r"^(\s*---\s*\n)+", "", t.lstrip("\n"))
    return t.strip(), cut


def xw_map(full):
    """The DOI cross-walk the page already carried: 'zenodo.N' -> its AXN span."""
    return dict(re.findall(r"(zenodo\.\d+)\s*<span class=\"xw\">(&rarr; AXN:[^<]+)</span>", full))


def apply_xw(h, mp):
    for doi, span in mp.items():
        h = re.sub(re.escape(doi) + r"(?!\s*<span class=\"xw\">)", doi + f' <span class="xw">{span}</span>', h)
    return h


def main():
    args = sys.argv[1:]
    alex = pathlib.Path(args[args.index("--alexanarch") + 1]) if "--alexanarch" in args else ROOT.parent / "alexanarch"
    only = set(args[args.index("--only") + 1].split(",")) if "--only" in args else None
    T = alex / "data" / "texts"
    out, dumps, skipped, failed = [], [], [], []
    for d in sorted(W.iterdir()):
        p = d / "index.html"
        if not p.exists() or (only and d.name not in only): continue
        s = p.read_text(encoding="utf-8")
        ma = re.search(r'<h2>Full text</h2>\s*<div class="full">', s)
        a = ma.start() if ma else -1
        mb = re.search(r'</div>\s*<p class="hex">(?:&mdash;|—) end of work', s[a:]) if ma else None
        b = a + mb.start() + len("</div>") if mb else -1
        if a < 0 or b < 0: skipped.append(d.name); continue
        full = s[a:b]
        tf = T / f"AXN-{d.name.upper()}-text.md"
        if not tf.exists(): skipped.append(d.name); continue
        src = tf.read_text(encoding="utf-8")
        if src.startswith("# ZENODO METADATA") or "Complete DataCite record" in src:
            dumps.append(d.name); continue
        work, cut = work_of(src)
        hb = len(re.findall(r"\S  \n", work))
        lost = hb >= 3 and "<br" not in full
        if not cut and not lost: continue
        new_full, mode = None, "re-rendered"
        if cut == ["front matter"] and not lost:
            # only the front matter is wrong: cut its rendered block (to its closing rule) and leave the rest byte for byte
            k0 = full.find('<div class="full">') + len('<div class="full">')
            body = full[k0:]
            hrs = [m.start() for m in re.finditer(r"<hr\s*/?>", body)]
            fm_words = len(re.findall(r"\S+", src[:len(src) - len(src.lstrip("\ufeff")) + src.lstrip("\ufeff").find("\n---\n", 4)])) if src.lstrip("\ufeff").startswith("---\n") else 0
            seg_words = (lambda x: len(re.findall(r"\S+", html.unescape(re.sub(r"<[^>]+>", " ", x)))))(body[:hrs[1]]) if len(hrs) >= 2 else 0
            if (len(hrs) >= 2 and hrs[0] < 40 and "deposit_number:" in body[:hrs[1]] and "deposit_number:" not in body[hrs[1]:]
                    and fm_words and seg_words <= fm_words * 1.2 + 10):
                rest = body[hrs[1]:]; rest = rest[re.match(r"<hr\s*/?>\s*", rest).end():]
                new_full = full[:k0] + "\n" + rest; mode = "front matter cut in place"
        if new_full is None:
            h = apply_xw(render_full(work), xw_map(full))
            new_full = '<h2>Full text</h2><div class="full">\n' + h + "\n</div>"
            bal = lambda x: x.count("<div") - x.count("</div")
            if bal(new_full) != bal(full):
                failed.append(d.name); continue
        words = len(re.findall(r"\S+", work))
        ns = s[:a] + new_full + s[b:]
        ns = re.sub(r"(&middot; )\d+( words &middot; body)", lambda m: f"{m.group(1)}{words}{m.group(2)}", ns, count=1)
        first = next((l for l in work.split("\n") if l.strip()), "")[:90]
        out.append({"hex": d.name, "mode": mode, "cut": cut, "lineation": lost, "hard_breaks": hb, "first_kept": first, "words": words})
        if "--apply" in args:
            p.write_text(ns, encoding="utf-8")
    for o in out:
        print(o["hex"], "| cut:", "; ".join(o["cut"]) or "-", "| lineation restored" if o["lineation"] else "", "| keeps:", o["first_kept"])
    print(f"\n{len(out)} pages {'repaired' if '--apply' in args else 'to repair (dry run)'}; metadata-record texts not touched: {len(dumps)} {' '.join(dumps)}; "
          f"no full-text block or no seat text: {len(skipped)} {' '.join(skipped)}; "
          f"left as they were (re-rendering would unbalance the page, raw markup in the text): {len(failed)} {' '.join(failed)}")
    (ROOT / "scripts" / "repair_work_fulltext.last.json").write_text(json.dumps({"pages": out, "metadata_records": dumps, "skipped": skipped, "failed": failed}, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
