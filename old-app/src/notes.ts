/**
 * Trip notes bundled into the app: the vault's own pages for the trip, copied
 * into src/notes/<tripId>/NN Title.md. The phone has no other way to read them
 * on the road. The number prefix orders the tabs and is not shown.
 */
const files = import.meta.glob('./notes/*/*.md', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

export interface TripNote {
  /** Tab label, e.g. "Plan". */
  title: string;
  /** Raw markdown. */
  body: string;
}

export function notesFor(tripId: string): TripNote[] {
  const prefix = `./notes/${tripId}/`;
  return Object.entries(files)
    .filter(([path]) => path.startsWith(prefix))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, body]) => ({
      title: path
        .slice(prefix.length)
        .replace(/\.md$/, '')
        .replace(/^\d+\s+/, ''),
      body,
    }));
}
