import confusables from './data/unicode-ascii.json';
import normalization from './data/unicode-normalization-ascii.json';

const MAX_SCAN_LENGTH = 32768;
const MAX_VARIANTS = 12;
// eslint-disable-next-line no-misleading-character-class -- Deliberately remove combining/invisible code points independently.
const INVISIBLE = /[\p{Cf}\u034f\u180e\ufe00-\ufe0f]/gu;
const WORD_FIXES: Array<[RegExp, string]> = [
  [/\b(igonre|ingore|ignroe|gonre|ignr|igore|ignoer)\b/g, 'ignore'],
  [/\b(disreguard|disregad|disregaard|disregrd)\b/g, 'disregard'],
  [/\b(previousi|previuos|pervious|priveous|prevous|previus)\b/g, 'previous'],
  [/\b(instrucitons|instructons|insructions|instrctions|instructoins)\b/g, 'instructions'],
  [/\b(promtp|promt)\b/g, 'prompt'],
];

/** NFKC plus pinned Unicode 18 confusable mappings. Never alters submitted text. */
export function normalizeScanText(text: string): string {
  let out = String(text || '').slice(0, MAX_SCAN_LENGTH);
  out = Array.from(out, (char) => (normalization as Record<string, string>)[char] || char)
    .join('')
    .normalize('NFKC')
    .replace(INVISIBLE, '');
  out = Array.from(out, (char) => (confusables as Record<string, string>)[char] || char).join('');
  out = out.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
  out = out.replace(/(?<=[a-z])[._-](?=[a-z])/g, '');
  out = out.replace(/[a-z][a-z0-9@$]*[a-z]/g, (word) =>
    word.replace(
      /[013457@$]/g,
      (c) => ({ '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' })[c]!,
    ),
  );
  for (const [regex, replacement] of WORD_FIXES) out = out.replace(regex, replacement);
  return out.replace(/\s+/g, ' ').trim();
}

/** At most two decoding rounds, 12 variants and 128 KiB total scanned characters. */
export function scanVariants(text: string): string[] {
  const variants: string[] = [];
  let remaining = MAX_SCAN_LENGTH * 4;
  const add = (value: string) => {
    const normalized = value.slice(0, remaining);
    if (normalized && !variants.includes(normalized) && variants.length < MAX_VARIANTS) {
      variants.push(normalized);
      remaining -= normalized.length;
    }
  };
  const addVariants = (value: string) => {
    add(value);
    add(normalizeScanText(value));
  };
  addVariants(text.slice(0, MAX_SCAN_LENGTH));
  let pending = [text.slice(0, MAX_SCAN_LENGTH)];
  for (let depth = 0; depth < 2 && remaining > 0; depth++) {
    const next: string[] = [];
    for (const candidate of pending) {
      if (/%[0-9a-f]{2}/i.test(candidate)) {
        try {
          const decoded = decodeURIComponent(candidate);
          addVariants(decoded);
          next.push(decoded);
        } catch {
          /* malformed encoding */
        }
      }
      let count = 0;
      for (const match of candidate.matchAll(/\b[A-Za-z0-9+/]{16,2048}={0,2}/g)) {
        if (++count > 4 || remaining <= 0) break;
        try {
          const decoded = atob(match[0]);
          // eslint-disable-next-line no-control-regex -- Accept printable ASCII plus tab/newline in decoded payloads.
          if (/^[\x09\x0a\x0d\x20-\x7e]+$/.test(decoded)) {
            addVariants(decoded);
            next.push(decoded);
          }
        } catch {
          /* not base64 */
        }
      }
    }
    pending = next;
  }
  return variants;
}

/** Exempt only quoted literals in a local explanatory clause; scan every other clause. */
export function withoutEducationalQuotes(text: string): string {
  return text.replace(
    /(["`“])([^"`“”\n]{1,500})["`”]/g,
    (quote, _mark, _content, offset: number) => {
      const prefix = text.slice(Math.max(0, offset - 110), offset);
      return /(?:explain|discuss|analy[sz]e|what does|why is|meaning of|example of)\b[^.!?;]{0,90}$/i.test(
        prefix,
      )
        ? ' [quoted example] '
        : quote;
    },
  );
}
