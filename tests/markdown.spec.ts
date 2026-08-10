import { describe, expect, it } from 'vitest';
import { labsMarkdownToHtml, markdownToHtml } from '../src/markdown.js';

describe('markdown', () => {
  it('escapes raw HTML', () => {
    const html = labsMarkdownToHtml('<script>alert(1)</script>');
    expect(html).not.toMatch(/<script>/i);
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders bold and links', () => {
    const html = markdownToHtml('**hi** and [x](https://example.com)');
    expect(html).toContain('<strong>hi</strong>');
    expect(html).toContain('href="https://example.com"');
  });

  it('returns empty for blank input', () => {
    expect(labsMarkdownToHtml('')).toBe('');
    expect(labsMarkdownToHtml('   ')).toBe('');
  });
});
