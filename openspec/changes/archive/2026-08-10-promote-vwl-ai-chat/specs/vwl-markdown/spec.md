## ADDED Requirements

### Requirement: escape untrusted markdown

`labsMarkdownToHtml` / `markdownToHtml` MUST escape HTML and produce a fragment (no document wrapper).

#### Scenario: script tag escaped
- **GIVEN** markdown containing `<script>alert(1)</script>`
- **WHEN** converted
- **THEN** the output does not contain a raw `<script>` element

### Requirement: basic GFM subset

The converter MUST support headings, lists, fenced code, links, bold, and tables.

#### Scenario: bold and link
- **GIVEN** `**hi** and [x](https://example.com)`
- **WHEN** converted
- **THEN** output contains `<strong>` and an `<a href="https://example.com">`
