/**
 * CSP-safe Markdown → HTML (GFM-ish subset). No third-party dependencies.
 * Escapes HTML; safe for untrusted assistant / notes content.
 */

function escapeHtml(s: unknown): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const LINK_RE = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function formatLinksAndEscape(text: string): string {
  const segments: Array<{ type: string; v?: string; label?: string; href?: string }> = [];
  const re = new RegExp(LINK_RE.source, 'g');
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ type: 't', v: text.slice(last, m.index) });
    segments.push({ type: 'a', label: m[1], href: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ type: 't', v: text.slice(last) });

  let out = '';
  for (const seg of segments) {
    if (seg.type === 'a') {
      out +=
        '<a href="' +
        escapeHtml(seg.href) +
        '" rel="noopener noreferrer">' +
        formatInlineText(seg.label || '') +
        '</a>';
    } else {
      out += escapeHtml(seg.v);
    }
  }
  return out;
}

/**
 * Bold and links on a run with no backtick code (code is split out above).
 * Parse bold first so wrappers like **[label](url)** render correctly.
 */
function formatInlineNoCode(text: string): string {
  const boldRe = /\*\*([\s\S]+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let html = '';
  while ((m = boldRe.exec(text)) !== null) {
    if (m.index > last) html += formatLinksAndEscape(text.slice(last, m.index));
    html += '<strong>' + formatLinksAndEscape(m[1]) + '</strong>';
    last = m.index + m[0].length;
  }
  if (last < text.length) html += formatLinksAndEscape(text.slice(last));
  return html;
}

/**
 * `code`, then links + ** on remaining text runs.
 */
function formatInlineText(text: string): string {
  const parts: Array<{ t: string; v: string }> = [];
  const re = /`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: 'text', v: text.slice(last, m.index) });
    parts.push({ t: 'code', v: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ t: 'text', v: text.slice(last) });

  let out = '';
  for (const part of parts) {
    if (part.t === 'code') out += '<code>' + escapeHtml(part.v) + '</code>';
    else out += formatInlineNoCode(part.v);
  }
  return out;
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith('|') && t.includes('|');
}

function isTableSeparatorRow(line: string): boolean {
  const cells = splitTableRow(line);
  if (cells.length < 2) return false;
  return cells.every((c) => /^:?-{3,}:?$/.test(c.trim()));
}

function splitTableRow(line: string): string[] {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|')) t = t.slice(0, -1);
  return t.split('|').map((c) => c.trim());
}

function parseTable(lines: string[], startIdx: number): { html: string; nextIndex: number } {
  const rows: string[] = [];
  let i = startIdx;
  while (i < lines.length && isTableRow(lines[i])) {
    rows.push(lines[i]);
    i++;
  }
  if (rows.length < 2) return { html: '', nextIndex: startIdx };

  const sepIdx = rows.findIndex((r, idx) => idx > 0 && isTableSeparatorRow(r));
  if (sepIdx < 1) return { html: '', nextIndex: startIdx };

  const headerCells = splitTableRow(rows[0]);
  const bodyRows = rows.slice(sepIdx + 1);

  let h =
    '<div class="vd-table-responsive vd-mb-4"><table class="vd-table vd-table-hover"><thead><tr>';
  for (const cell of headerCells) {
    h += '<th>' + formatInlineText(cell) + '</th>';
  }
  h += '</tr></thead><tbody>';
  for (const row of bodyRows) {
    const cells = splitTableRow(row);
    h += '<tr>';
    for (let k = 0; k < cells.length; k++) {
      h += '<td>' + formatInlineText(cells[k]) + '</td>';
    }
    h += '</tr>';
  }
  h += '</tbody></table></div>';
  return { html: h, nextIndex: i };
}

function flushParagraph(acc: string[], out: string[]): void {
  if (acc.length === 0) return;
  const text = acc.join(' ').trim();
  if (text) out.push('<p>' + formatInlineText(text) + '</p>');
  acc.length = 0;
}

function parseBlockLines(lines: string[]): string {
  const out: string[] = [];
  const para: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph(para, out);
      i++;
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph(para, out);
      const level = heading[1].length;
      const tag = 'h' + Math.min(level, 6);
      out.push('<' + tag + '>' + formatInlineText(heading[2]) + '</' + tag + '>');
      i++;
      continue;
    }

    if (isTableRow(trimmed)) {
      const { html, nextIndex } = parseTable(lines, i);
      if (nextIndex > i) {
        flushParagraph(para, out);
        out.push(html);
        i = nextIndex;
        continue;
      }
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph(para, out);
      const items: string[] = [];
      while (i < lines.length) {
        const L = lines[i].trim();
        const om = L.match(/^(\d+)\.\s+(.*)$/);
        if (!om) break;
        items.push(om[2]);
        i++;
      }
      out.push('<ol>');
      for (const item of items) {
        out.push('<li>' + formatInlineText(item) + '</li>');
      }
      out.push('</ol>');
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph(para, out);
      const items: string[] = [];
      while (i < lines.length) {
        const L = lines[i].trim();
        const um = L.match(/^[-*]\s+(.*)$/);
        if (!um) break;
        items.push(um[1]);
        i++;
      }
      out.push('<ul>');
      for (const item of items) {
        out.push('<li>' + formatInlineText(item) + '</li>');
      }
      out.push('</ul>');
      continue;
    }

    para.push(trimmed);
    i++;
  }

  flushParagraph(para, out);
  return out.join('\n');
}

function splitFences(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const chunks: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim().toLowerCase();
      i++;
      const body: string[] = [];
      while (i < lines.length && !lines[i].startsWith('```')) {
        body.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      const code = body.join('\n');
      let block = '<pre><code';
      if (lang) block += ' class="language-' + escapeHtml(lang) + '"';
      block += '>' + escapeHtml(code) + '</code></pre>';
      chunks.push(block);
      continue;
    }
    const start = i;
    while (i < lines.length && !lines[i].startsWith('```')) {
      i++;
    }
    if (i > start) {
      const slice = lines.slice(start, i);
      chunks.push(parseBlockLines(slice));
    }
  }
  return chunks.join('\n');
}

/**
 * Convert markdown subset to an HTML fragment (no wrapper document).
 */
export function labsMarkdownToHtml(markdown: unknown): string {
  if (!markdown || !String(markdown).trim()) return '';
  return splitFences(String(markdown));
}

/** Alias preferred for new consumers. */
export const markdownToHtml = labsMarkdownToHtml;
