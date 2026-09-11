/**
 * The vault's trip pages, rendered on the phone. A small converter for the
 * markdown Obsidian writes - headings, tables, bullet and numbered lists,
 * checkboxes, bold/italic/code, links, [[wikilinks]] - into HTML. The pages
 * are the trip owner's own notes, so the HTML is trusted; text is still
 * escaped so a stray "<" cannot break the page.
 */

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Inline markdown -> HTML. `wikiHref` turns a [[Page]] into an in-app link when known. */
export function renderInline(raw: string, wikiHref: (name: string) => string | null): string {
  let s = escapeHtml(raw);
  // code spans first, so nothing inside them is touched
  s = s.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
  // [[Page|label]] and [[Page]]
  s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, page: string, label?: string) => {
    const href = wikiHref(page.trim());
    const text = label ?? page;
    return href ? `<a class="md-wiki" href="${href}">${text}</a>` : `<strong>${text}</strong>`;
  });
  // [text](url)
  s = s.replace(
    /\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
    (_m, text, url) => `<a href="${url}" target="_blank" rel="noreferrer">${text}</a>`,
  );
  // bare urls
  s = s.replace(
    /(^|[\s(])(https?:\/\/[^\s<)]+)/g,
    (_m, pre, url) => `${pre}<a href="${url}" target="_blank" rel="noreferrer">${url}</a>`,
  );
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/-&gt;/g, '&rarr;');
  return s;
}

function isTableRow(line: string): boolean {
  return /^\s*\|.*\|\s*$/.test(line);
}
function isTableSep(line: string): boolean {
  return /^\s*\|(\s*:?-{2,}:?\s*\|)+\s*$/.test(line);
}
function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

export function renderMarkdown(md: string, wikiHref: (name: string) => string | null): string {
  let text = md.replace(/\r\n/g, '\n');
  // Obsidian frontmatter
  if (text.startsWith('---\n')) {
    const end = text.indexOf('\n---', 4);
    if (end > 0) text = text.slice(end + 4);
  }
  const lines = text.split('\n');
  const out: string[] = [];
  const inline = (s: string) => renderInline(s, wikiHref);
  let i = 0;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(' '))}</p>`);
      para = [];
    }
  };
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) {
      flushPara();
      i++;
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      const level = Math.min(h[1].length + 1, 6); // page title is the tab, so # -> h2
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flushPara();
      out.push('<hr>');
      i++;
      continue;
    }
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      flushPara();
      const head = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      const headHtml = head.some((c) => c) ? `<thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>` : '';
      const body = rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('');
      out.push(`<div class="md-table-wrap"><table>${headHtml}<tbody>${body}</tbody></table></div>`);
      continue;
    }
    const li = line.match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (li) {
      flushPara();
      // one list, nesting by indent; each item may continue on indented lines
      const ordered = /^\s*\d+[.)]/.test(line);
      out.push(ordered ? '<ol>' : '<ul>');
      // Nesting follows the indent width actually used (2 spaces, 4, or a tab):
      // a wider indent opens one level, a narrower one closes back to its level.
      const indents: number[] = [0];
      const stack: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/);
        if (!m) {
          // continuation line inside the item (indented, non-empty)
          if (/^\s{2,}\S/.test(lines[i]) && out.length) {
            out[out.length - 1] = out[out.length - 1].replace(/<\/li>$/, ` ${inline(lines[i].trim())}</li>`);
            i++;
            continue;
          }
          break;
        }
        const ind = m[1].replace(/\t/g, '    ').length;
        if (ind > indents[indents.length - 1]) {
          out[out.length - 1] = out[out.length - 1].replace(/<\/li>$/, '');
          out.push('<ul>');
          stack.push('</ul></li>');
          indents.push(ind);
        }
        while (ind < indents[indents.length - 1] && stack.length) {
          out.push(stack.pop()!);
          indents.pop();
        }
        let body = m[2];
        const cb = body.match(/^\[( |x|X)\]\s+(.*)$/);
        if (cb) body = `<span class="md-check${cb[1] === ' ' ? '' : ' done'}">${cb[1] === ' ' ? '☐' : '☑'}</span> ${cb[2]}`;
        else body = inline(body);
        if (cb) body = body.replace(/^(<span[^>]*>.<\/span>) (.*)$/s, (_m, box, rest) => `${box} ${inline(rest)}`);
        out.push(`<li>${body}</li>`);
        i++;
      }
      while (stack.length) out.push(stack.pop()!);
      out.push(ordered ? '</ol>' : '</ul>');
      continue;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushPara();
      out.push(`<blockquote>${inline(quote[1])}</blockquote>`);
      i++;
      continue;
    }
    para.push(line.trim());
    i++;
  }
  flushPara();
  return out.join('\n');
}
