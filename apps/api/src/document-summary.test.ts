import { describe, expect, it } from 'vitest';
import {
  describeDocument,
  documentPremise,
  documentTitle,
} from './services/document-summary.js';

/**
 * The shape of a real extracted module: a cover whose display type is broken
 * across lines, a licence block, a table of contents, a running header on
 * every page, and then the introduction that actually says what it is.
 */
const MODULE = [
  'Battle',
  'for',
  '',
  'Critter Vale',
  '',
  'Gwen Malmquist',
  '',
  'System Reference Document 5.1: This work includes material taken from the',
  'System Reference Document 5.1 by Wizards of the Coast LLC.',
  '',
  'All other original material in this work is copyright 2024.',
  '',
  'Table of Contents',
  'Introduction',
  '',
  'Battle for Critter Vale',
  '',
  '3 of 64',
  '',
  'Introduction',
  '',
  'Battle for Critter Vale is a short, lighthearted one-shot adventure module',
  'where players take the role of diminutive woodland creatures, fey, and',
  'spirits who must band together to defend their home. There are three story',
  'chapters, each of which is expected to take one to two hours of play time.',
  '',
  'Battle for Critter Vale',
  '',
  '4 of 64',
].join('\n');

describe('documentTitle', () => {
  it('takes the running header, not the broken cover type', () => {
    expect(documentTitle(MODULE)).toBe('Battle for Critter Vale');
  });

  it('returns nothing when no line repeats', () => {
    expect(documentTitle('A one page handout.\n\nWith two paragraphs.')).toBeUndefined();
  });

  it('never offers a licence line as a title', () => {
    const licensed = ['Creative Commons Attribution 4.0', 'Creative Commons Attribution 4.0'].join(
      '\n',
    );
    expect(documentTitle(licensed)).toBeUndefined();
  });
});

describe('documentPremise', () => {
  it('prefers the paragraph that names the module', () => {
    expect(documentPremise(MODULE, 'Battle for Critter Vale')).toBe(
      'Battle for Critter Vale is a short, lighthearted one-shot adventure module where players take the role of diminutive woodland creatures, fey, and spirits who must band together to defend their home.',
    );
  });

  it('skips the licence and copyright blocks', () => {
    const premise = documentPremise(MODULE);
    expect(premise).not.toMatch(/System Reference Document|copyright/);
  });

  it('drops a heading glued to the front of the paragraph', () => {
    const glued = [
      'Introduction',
      'Deep Vale is a grim little adventure for four characters of third level,',
      'set in a drowned parish where the bell has started ringing again.',
    ].join('\n');
    expect(documentPremise(glued)).toBe(
      'Deep Vale is a grim little adventure for four characters of third level, set in a drowned parish where the bell has started ringing again.',
    );
  });

  it('returns nothing rather than inventing one', () => {
    expect(documentPremise('Short.')).toBeUndefined();
  });

  it('stops at a couple of sentences', () => {
    const long = ['x'.repeat(0), `${'A long sentence about the vale. '.repeat(40)}`].join('\n');
    expect((documentPremise(long) ?? '').length).toBeLessThanOrEqual(260);
  });
});

describe('describeDocument', () => {
  it('gives the ingestion path both, with no model involved', () => {
    expect(describeDocument(MODULE)).toEqual({
      title: 'Battle for Critter Vale',
      premise:
        'Battle for Critter Vale is a short, lighthearted one-shot adventure module where players take the role of diminutive woodland creatures, fey, and spirits who must band together to defend their home.',
    });
  });
});
