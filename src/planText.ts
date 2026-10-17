import { formatClock, formatTimeRange, noRouteText, type DaySchedule } from './schedule';
import type { PlaceWithOverride } from './store';
import { formatDuration } from './trip';

export interface PlanTextDay {
  day: number;
  date: string;
  /** The day's routed stops: their names are written when the schedule is not built yet. */
  stops: PlaceWithOverride[];
  schedule: DaySchedule | null;
}

export function legLabel(p: PlaceWithOverride): string {
  if (p.legMinutes == null) return 'drive';
  return !p.legMode || p.legMode === 'walk' ? 'on foot' : p.legMode;
}

export function fixedTimeText(p: PlaceWithOverride, waitSec: number, lateSec: number): string | null {
  if (p.fixedStartMin == null) return null;
  let text = `fixed ${formatClock(p.fixedStartMin * 60)}`;
  // Route legs are in seconds: under half a minute rounds to "0m", so it is not shown.
  if (waitSec >= 30) text += ` · wait ${formatDuration(waitSec)}`;
  if (lateSec >= 30) text += ` · late ${formatDuration(lateSec)}`;
  return text;
}

/** The trip's plan as plain text, the way the Plan tab shows each day. */
export function planText(days: PlanTextDay[]): string {
  return days
    .filter((d) => d.stops.length > 0)
    .map((d) => {
      const lines = [`Day ${d.day} · ${d.date}`];
      if (!d.schedule) {
        for (const p of d.stops) lines.push(`Unscheduled ${p.name}`);
      } else {
        d.schedule.entries.forEach((e, i) => {
          const legSec = e.driveSec + e.ferrySec;
          if (i > 0 && legSec > 0) lines.push(`↓ ${formatDuration(legSec)} ${legLabel(e.place)}`);
          const fixed = fixedTimeText(e.place, e.waitSec, e.lateSec);
          lines.push(`${formatTimeRange(e.arriveSec, e.departSec)} ${e.place.name}${fixed ? ` · ${fixed}` : ''}`);
        });
        const gap = d.schedule.noRouteTo;
        if (gap) {
          lines.push(noRouteText(gap));
          const from = d.stops.findIndex((p) => p.id === gap.id);
          if (from >= 0) for (const p of d.stops.slice(from)) lines.push(`Unscheduled ${p.name}`);
        }
      }
      return lines.join('\n');
    })
    .join('\n\n');
}
