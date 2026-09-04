#!/usr/bin/env python3
"""build_sitemap.py — the sitemap is derived from the deployed tree, never hand-kept (2026-09-04).

Walks public/ for every index.html and top-level .html page, emits one <url> per page in the
site's single URL grammar (https://www.crimsonhexagonal.org/<path>, no trailing slash, root "/"),
with lastmod from the file's last git commit date (falls back to mtime), and writes
public/sitemap.xml (and a copy at the repo root for readers of the source). Data files are not
pages and are not listed. Run after the generators and normalize_urls.py; `--check` fails if the
sitemap on disk does not match what the tree would produce.
"""
import pathlib, re, subprocess, sys, datetime
ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT/'public'; BASE = 'https://www.crimsonhexagonal.org'

def lastmod(p):
    try:
        out = subprocess.run(['git','log','-1','--format=%cs','--',str(p)],cwd=ROOT,capture_output=True,text=True,timeout=10).stdout.strip()
        if out: return out
    except Exception: pass
    return datetime.datetime.fromtimestamp(p.stat().st_mtime, datetime.timezone.utc).strftime('%Y-%m-%d')

def pages():
    out = {}
    for p in PUB.rglob('index.html'):
        rel = p.parent.relative_to(PUB).as_posix(); rel = '/' if rel == '.' else '/'+rel
        out[rel] = p
    for p in PUB.glob('*.html'):
        if p.name != 'index.html': out['/'+p.stem] = p
    if (ROOT/'index.html').exists(): out['/'] = ROOT/'index.html'
    return dict(sorted(out.items(), key=lambda kv: (kv[0] != '/', kv[0].split('/')[1] if '/' in kv[0][1:] or kv[0]!='/' else '', kv[0])))

def priority(path):
    if path == '/': return '1.0'
    top = path.split('/')[1]
    return {'rooms':'0.8','navigation':'0.8','map':'0.7','works':'0.6'}.get(top, '0.5')

def render(pg):
    lines = ['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, p in pg.items():
        loc = BASE + ('/' if path == '/' else path)
        lines.append(f'  <url><loc>{loc}</loc><lastmod>{lastmod(p)}</lastmod><priority>{priority(path)}</priority></url>')
    lines.append('</urlset>'); return '\n'.join(lines)+'\n'

def main():
    pg = pages(); xml = render(pg)
    if '--check' in sys.argv:
        cur = (PUB/'sitemap.xml').read_text() if (PUB/'sitemap.xml').exists() else ''
        # compare loc sets (lastmod may legitimately move)
        a = set(re.findall(r'<loc>([^<]+)</loc>', cur)); b = set(re.findall(r'<loc>([^<]+)</loc>', xml))
        print(f"sitemap --check: {len(a)} listed vs {len(b)} on disk; missing {len(b-a)}, stale {len(a-b)}")
        return 0 if a == b else 1
    (PUB/'sitemap.xml').write_text(xml); (ROOT/'sitemap.xml').write_text(xml)
    import collections
    print(f"sitemap: {len(pg)} pages —", dict(collections.Counter(k.split('/')[1] or 'root' for k in pg)))
    return 0

if __name__ == '__main__': sys.exit(main())
