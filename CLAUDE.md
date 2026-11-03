# Trips site

Hosts his trip pages on GitHub Pages: https://ruslankotliar.github.io/balkans-trip/ (trip list) and one folder per trip, e.g. `/winter-2027/`. Phone first: add to the home screen, opens offline.

- **Source of truth is the vault**, not this repo: `~/personal/vault/trips/page/` holds `template.html`, `build.py` and one JSON per trip; the shape is in the vault's `trips/Page standard.md`.
- Update: `python3 ~/personal/vault/trips/page/build.py ~/personal/vault/trips/page/<trip>.json --site`, then commit `site/` and push to main. Live about a minute later. No PRs, no build step in CI.
- Never edit `site/` by hand: the next build overwrites it.
- Public repo and public site: no passport data, booking references or addresses beyond what a listing link shows.

Archive (nothing here is deployed):
- `old-app/`: the React + map app used for the Balkans (Jun 2026), Lake Como and Albania (Sep 2026) trips, with its places data and notes. Tag `react-app-final` is the last commit where it was live. `old-app/CLAUDE.md` is its old instructions.
- `research/`, `backups/`, `RESEARCH_PROMPTS.md`: Balkans-era research.
