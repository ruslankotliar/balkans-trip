/**
 * Single Supabase client for the collaboration layer (votes / comments /
 * friend-added places). The 406 baked places stay compiled in — Supabase is
 * ONLY the dynamic shared layer.
 *
 * #1 rule: this app must work in dead zones. So the client is OPTIONAL:
 *   - missing env vars → `supabase` is null, every collab call no-ops/degrades
 *     to the localStorage cache, the app still loads and shows places.
 *   - present but network down / tables missing → calls throw, callers catch,
 *     and fall back to cache (see collab.ts). We NEVER let a Supabase failure
 *     reach the UI as an error.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** True when credentials are configured (does NOT imply the network is up). */
export const hasSupabase = Boolean(url && key);

/**
 * The shared client, or null when env vars are absent. Created defensively:
 * even createClient throwing (bad URL, etc.) must not crash the app.
 */
export const supabase: SupabaseClient | null = (() => {
  if (!hasSupabase) {
    console.warn('[supabase] no credentials — collaboration runs local-only (offline cache).');
    return null;
  }
  try {
    return createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (e) {
    console.warn('[supabase] client init failed — running local-only.', e);
    return null;
  }
})();
