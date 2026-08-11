import { describe, expect, it } from 'vitest';
import { labsMarkdownToHtml, markdownToHtml } from '../src/markdown.js';

describe('markdown', () => {
  it('escapes raw HTML', () => {
    const html = labsMarkdownToHtml('<script>alert(1)</script>');
    expect(html).not.toMatch(/<script>/i);
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders bold, inline code, and links', () => {
    const html = markdownToHtml('**hi** and `code` and [x](https://example.com)');
    expect(html).toContain('<strong>hi</strong>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('returns empty for blank input', () => {
    expect(labsMarkdownToHtml('')).toBe('');
    expect(labsMarkdownToHtml('   ')).toBe('');
  });

  it('renders headings, lists, tables, and fenced code', () => {
    const md = `# Title

## Sub

- one
- two

1. first
2. second

| A | B |
| --- | --- |
| 1 | 2 |

\`\`\`ts
const x = 1;
\`\`\`
`;
    const html = labsMarkdownToHtml(md);
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<h2>Sub</h2>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<ol>');
    expect(html).toContain('<li>first</li>');
    expect(html).toContain('<table');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>1</td>');
    expect(html).toContain('class="language-ts"');
    expect(html).toContain('const x = 1;');
  });

  it('renders paragraphs and bold links', () => {
    const html = labsMarkdownToHtml('Hello **[labs](https://vanduo.dev)** world');
    expect(html).toContain('<p>');
    expect(html).toContain('<strong>');
    expect(html).toContain('href="https://vanduo.dev"');
  });
});
