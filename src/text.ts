export function normalizeText(value?: string | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function trimToWordBoundary(text: string, maxChars: number): string {
  const cut = text.slice(0, maxChars).trim();
  const boundary = cut.lastIndexOf(' ');
  if (boundary > 40) return cut.slice(0, boundary).trim();
  return cut;
}

function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  return matches?.map((s) => s.trim()).filter(Boolean) ?? [];
}

/**
 * Return a compact, readable excerpt that prefers the first one or two
 * sentences. This keeps the default UI from spilling long, noisy text.
 */
export function excerptText(value?: string | null, maxChars = 220): string {
  const text = normalizeText(value);
  if (!text) return '';

  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return text.length <= maxChars ? text : `${trimToWordBoundary(text, maxChars)}…`;
  }

  let out = '';
  for (const sentence of sentences) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length <= maxChars || out.length === 0) {
      out = next;
      if (out.length >= maxChars) break;
      continue;
    }
    break;
  }

  if (out.length > maxChars) out = trimToWordBoundary(out, maxChars);
  if (text.length > out.length && !/[.!?…]$/.test(out)) out += '…';
  return out;
}
