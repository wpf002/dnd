/**
 * What a module calls itself, read off the document.
 *
 * The long path used to hand the extractor "Untitled Module" and "Extracted
 * from a long source document." as placeholders, on the theory that a title
 * page would overwrite them. When one does not — and a cover with the title
 * broken across three lines does not — the placeholder ships, and a player
 * opening the app is told a campaign was extracted from a long source
 * document. That is a note to me, not a premise.
 *
 * Both of these are read deterministically, with no model involved, because
 * they are recall and not judgement. If neither can be found the caller still
 * gets undefined and can say so rather than inventing something.
 */

/** How much of the introduction reads as a premise rather than table advice. */
const PREMISE_BUDGET = 260;

/** Boilerplate that is never the module's premise, however early it appears. */
const BOILERPLATE =
  /creative commons|system reference document|all rights reserved|copyright|©|table of contents|https?:\/\/|last edited|printed in/i;

/**
 * The title, taken from the running header.
 *
 * A cover page is unreliable — PDF text extraction breaks big display type
 * across lines, so the first line of this module's text is the single word
 * "Battle". The running header printed on every page is not broken, and it
 * repeats, which makes it the one line the document itself insists on.
 */
export function documentTitle(text: string): string | undefined {
  const counts = new Map<string, number>();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    // A header is short, has words, and is not a page number or a heading
    // ending in punctuation.
    if (line.length < 4 || line.length > 60) continue;
    if (!/^[A-Z]/.test(line)) continue;
    if (/[.:;,!?]$/.test(line)) continue;
    if (/^\d/.test(line) || /\d\s*of\s*\d/i.test(line)) continue;
    if (BOILERPLATE.test(line)) continue;
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }

  let best: string | undefined;
  let bestCount = 1; // Appearing once is a heading, not a running header.
  for (const [line, count] of counts) {
    if (count > bestCount || (count === bestCount && best && line.length > best.length)) {
      best = line;
      bestCount = count;
    }
  }
  return best;
}

/**
 * The premise, taken from the module's own opening.
 *
 * Nearly every module introduces itself in one paragraph — "X is a short,
 * lighthearted one-shot where players take the role of…" — and that paragraph
 * is a better premise than anything summarised from the whole book. Preference
 * goes to a paragraph that names the module, then to the first substantial
 * paragraph of prose that is not front-matter boilerplate.
 */
export function documentPremise(text: string, title?: string): string | undefined {
  const paragraphs = text
    .slice(0, 40_000)
    .split(/\n\s*\n/)
    .map((paragraph) => {
      // A section heading often sits on the line directly above its first
      // paragraph with no blank line between, so it arrives glued to the front
      // of the prose: "Introduction Battle for Critter Vale is a short…".
      const lines = paragraph.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length > 1 && lines[0]!.length < 40 && !/[.!?,;:]$/.test(lines[0]!)) lines.shift();
      return lines.join(' ').trim();
    });

  const usable = paragraphs.filter(
    (p) =>
      p.length >= 120 &&
      p.length <= 1200 &&
      !BOILERPLATE.test(p) &&
      // Prose, not a table of contents or a stat line.
      /[a-z]{3}.*\.\s*$|[a-z]{3}.*\./.test(p) &&
      (p.match(/,/g)?.length ?? 0) + (p.match(/\./g)?.length ?? 0) >= 2,
  );

  const named = title && usable.find((p) => p.startsWith(title));
  const chosen = named ?? usable[0];
  if (!chosen) return undefined;

  // A premise is one long sentence or a couple of short ones. What follows in
  // a module's introduction is running time and table advice, which belongs to
  // the DM rather than on the card a player picks the adventure from.
  const sentences = chosen.match(/[^.!?]+[.!?]+/g) ?? [chosen];
  let premise = '';
  for (const sentence of sentences) {
    if (premise && premise.length + sentence.length > PREMISE_BUDGET) break;
    premise += sentence;
  }
  return premise.trim();
}

/** Both, for the ingestion path that needs a title and a premise up front. */
export function describeDocument(text: string): {
  title: string | undefined;
  premise: string | undefined;
} {
  const title = documentTitle(text);
  return { title, premise: documentPremise(text, title) };
}
