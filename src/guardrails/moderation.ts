import { DataSet, RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';

export type GuardrailProfile = 'family-friendly' | 'general';
/** Reviewed subset: anatomy, identities, ambiguous words and reporting terms are excluded. */
const reviewedWords = new Set([
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'nigger',
  'kike',
  'abeed',
  'africoon',
  'chingchong',
]);
const dataset = new DataSet<{ originalWord: string }>()
  .addAll(englishDataset)
  .removePhrasesIf((phrase) => !reviewedWords.has(phrase.metadata?.originalWord || ''))
  .addPhrase((phrase) => phrase.addWhitelistedTerm('scunthorpe').addWhitelistedTerm('shiitake'));
const matcher = new RegExpMatcher({ ...dataset.build(), ...englishRecommendedTransformers });

/** Narrow request/compliance patterns, not a semantic safety classifier. */
export function moderationRuleIds(
  text: string,
  profile: GuardrailProfile,
  output: boolean,
): string[] {
  const ids: string[] = [];
  if (
    /\b(?:give|provide|write|show|tell|teach|here are)\b.{0,45}\b(?:instructions?|steps?|guide|how to)\b.{0,45}\b(?:build a bomb|make a bomb|poison (?:someone|a person)|murder (?:someone|a person)|kill myself)\b/i.test(
      text,
    )
  )
    ids.push('harm.dangerous-assistance');
  if (
    /\b(?:you should|go ahead and|please)\s+(?:kill yourself|hurt yourself|commit suicide)\b/i.test(
      text,
    )
  )
    ids.push('harm.encouragement');
  if (
    /\b(?:write|generate|describe|show|create)\b.{0,40}\b(?:sexual|pornographic|erotic)\b.{0,50}\b(?:child|children|minor|underage)\b/i.test(
      text,
    )
  )
    ids.push('sexual.minors');
  if (profile === 'family-friendly') {
    const graphicPhrases =
      text.match(
        /\b(?:thrust(?:ing|ed)?|penetrat(?:ing|ed|ion))\b[^.!?;]{0,35}\b(?:cock|pussy|vagina|anus)\b/gi,
      ) || [];
    const graphicOutput =
      output &&
      graphicPhrases.some(
        (phrase) =>
          !/\b(?:injur(?:y|ies)|clinical|medical|surgical|examination|childbirth)\b/i.test(phrase),
      );
    if (
      /\b(?:write|generate|describe|create|continue)\b.{0,35}\b(?:explicit|graphic|pornographic|erotic)\b.{0,30}\b(?:sex|sexual|scene|story|fantasy)\b/i.test(
        text,
      ) ||
      graphicOutput
    )
      ids.push('family.explicit-sexual');
    if (output && matcher.hasMatch(text)) ids.push('family.profanity');
  }
  return ids;
}
