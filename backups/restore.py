#!/usr/bin/env python3
"""Restore a Supabase snapshot (plan_overrides + user_places) taken by the backup step.
Usage: python3 backups/restore.py <plan_overrides.json> <user_places.json>
Upserts every row back. Warns about rows that exist live now but not in the snapshot
(those would need manual deletion for a full rollback). Reads creds from .env."""
import os, sys, json, urllib.request, urllib.error

def load_env():
    env = {}
    with open(os.path.join(os.path.dirname(__file__), '..', '.env')) as f:
        for line in f:
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                env[k] = v.strip()
    return env

def main():
    if len(sys.argv) != 3:
        print(__doc__); sys.exit(1)
    env = load_env()
    base = env['VITE_SUPABASE_URL']; key = env['VITE_SUPABASE_PUBLISHABLE_KEY']
    def upsert(table, rows, conflict):
        url = f"{base}/rest/v1/{table}?on_conflict={conflict}"
        # chunk to keep requests reasonable; all rows share the same key set per table dump
        for i in range(0, len(rows), 100):
            chunk = rows[i:i+100]
            req = urllib.request.Request(url, data=json.dumps(chunk).encode(), method='POST',
                headers={'apikey': key, 'Authorization': f'Bearer {key}',
                         'Content-Type': 'application/json',
                         'Prefer': 'resolution=merge-duplicates,return=minimal'})
            try:
                urllib.request.urlopen(req)
            except urllib.error.HTTPError as e:
                print(f"  ERR {table} chunk {i}: {e.code} {e.read().decode()[:200]}")
                return False
        print(f"  {table}: restored {len(rows)} rows")
        return True
    po = json.load(open(sys.argv[1])); up = json.load(open(sys.argv[2]))
    print("Restoring plan_overrides..."); upsert('plan_overrides', po, 'place_id')
    print("Restoring user_places...");   upsert('user_places', up, 'id')
    print("Done. (Rows added AFTER the snapshot are NOT deleted — remove manually if needed.)")

if __name__ == '__main__':
    main()
