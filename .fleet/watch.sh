#!/bin/bash
# Master-session fleet watcher. Exits (which wakes the boss session) when:
#  - a .fleet/done/<LETTER> marker appears that isn't in the ledger yet, or
#  - a deliverable (src/data/*.json, research/*.md) not in the ledger has been
#    stable for >= 4 min (sessions write incrementally; stability = finished), or
#  - 45 minutes pass (heartbeat, so the boss periodically reviews regardless).
cd "$(dirname "$0")/.." || exit 1
LEDGER=.fleet/intaken.txt
touch "$LEDGER"
START=$(date +%s)
while true; do
  now=$(date +%s)
  for m in .fleet/done/*; do
    [ -e "$m" ] || continue
    k="marker:$(basename "$m")"
    grep -qx "$k" "$LEDGER" || { echo "DONE-MARKER: $(basename "$m")"; exit 0; }
  done
  for f in src/data/*.json research/*.md; do
    [ -e "$f" ] || continue
    grep -qx "$f" "$LEDGER" && continue
    age=$(( now - $(stat -f %m "$f") ))
    [ "$age" -ge 240 ] && { echo "NEW-STABLE-FILE: $f"; exit 0; }
  done
  [ $(( now - START )) -ge 2700 ] && { echo "HEARTBEAT"; exit 0; }
  sleep 45
done
