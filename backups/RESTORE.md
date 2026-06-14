# Supabase backups & restore

Snapshots of the LIVE trip plan (Supabase `plan_overrides` + `user_places`), taken
before autonomous edits. The live plan is the source of truth (NOT `src/defaultPlan.ts`).

Files: `plan_overrides-<ts>.json`, `user_places-<ts>.json` (raw REST `select=*` dumps).

## Restore (re-upload a snapshot back into Supabase)

```bash
python3 backups/restore.py backups/plan_overrides-<ts>.json backups/user_places-<ts>.json
```

`restore.py` upserts every row back (on_conflict on the primary key). It does NOT
delete rows added after the snapshot — to fully roll back, you'd also delete any
`place_id`/`id` not present in the snapshot (the script prints those as a warning).

The `.env` `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` are used for auth.
