#!/usr/bin/env python3
"""Apply plan_overrides changes to Supabase by MERGING fields into each row's data jsonb.

Usage: python3 backups/apply_overrides.py <changes.json> [--dry]

changes.json shape:
{
  "updates": [ {"place_id": "hr-foo", "data": {"note": "...", "timeMinutes": 120}}, ... ],
  "clears":  [ "hr-bar", ... ]                      # set cleared=true (unschedule)
}

For each update: fetch the existing override row, merge `data` on top of existing data
(so we only touch the named fields), then upsert. Clears set cleared=true with data preserved.
Reads creds from ../.env. --dry prints what WOULD change without writing.
Only persists override-supported fields (status, day, dayOrder, note, timeMinutes, pick) — others ignored.
"""
import os, sys, json, urllib.request, urllib.error, urllib.parse

OVERRIDE_FIELDS = {"status", "day", "dayOrder", "note", "timeMinutes", "pick"}

def load_env():
    env = {}
    with open(os.path.join(os.path.dirname(__file__), '..', '.env')) as f:
        for line in f:
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1); env[k] = v.strip()
    return env

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    dry = '--dry' in sys.argv
    if len(args) != 1:
        print(__doc__); sys.exit(1)
    env = load_env()
    base = env['VITE_SUPABASE_URL']; key = env['VITE_SUPABASE_PUBLISHABLE_KEY']
    H = {'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}

    def get_row(pid):
        url = f"{base}/rest/v1/plan_overrides?place_id=eq.{urllib.parse.quote(pid)}&select=*"
        req = urllib.request.Request(url, headers=H)
        rows = json.load(urllib.request.urlopen(req))
        return rows[0] if rows else None

    def upsert(pid, data, cleared):
        url = f"{base}/rest/v1/plan_overrides?on_conflict=place_id"
        body = [{"place_id": pid, "data": data, "cleared": cleared}]
        req = urllib.request.Request(url, data=json.dumps(body).encode(), method='POST',
            headers={**H, 'Prefer': 'resolution=merge-duplicates,return=minimal'})
        urllib.request.urlopen(req)

    ch = json.load(open(args[0]))
    # overwrites: SET the row's data exactly (no merge) — used to unschedule (drop day) cleanly.
    for u in ch.get('overwrites', []):
        pid = u['place_id']
        data = {k: v for k, v in u['data'].items() if k in OVERRIDE_FIELDS}
        if dry:
            print(f"[DRY-OVERWRITE] {pid}: data={data}")
        else:
            upsert(pid, data, False)
            print(f"  ✓ OVERWROTE {pid}: {data}")
    for u in ch.get('updates', []):
        pid = u['place_id']
        incoming = {k: v for k, v in u['data'].items() if k in OVERRIDE_FIELDS}
        skipped = [k for k in u['data'] if k not in OVERRIDE_FIELDS]
        row = get_row(pid)
        existing = (row or {}).get('data') or {}
        merged = {**existing, **incoming}
        cleared = (row or {}).get('cleared', False)
        warn = f"  (ignored non-override fields: {skipped})" if skipped else ""
        if dry:
            changed = {k: merged[k] for k in incoming if existing.get(k) != merged.get(k)}
            print(f"[DRY] {pid}: {changed}{warn}")
        else:
            upsert(pid, merged, cleared)
            print(f"  ✓ {pid}: merged {list(incoming.keys())}{warn}")
    for pid in ch.get('clears', []):
        row = get_row(pid)
        data = (row or {}).get('data') or {}
        if dry:
            print(f"[DRY] CLEAR {pid}")
        else:
            upsert(pid, data, True)
            print(f"  ✓ CLEARED {pid}")
    print("Done." if not dry else "Dry run complete.")

if __name__ == '__main__':
    main()
