/**
 * Backgrounds from SRD 5.2. GENERATED — do not edit by hand.
 *
 * Regenerate with: node tools/import-srd52.mjs
 *
 * This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the
 * Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 */

import type { BackgroundInput } from '../types.js';

export const SRD52_BACKGROUNDS: Record<string, BackgroundInput> = {
  "acolyte": {
    "id": "acolyte",
    "name": "Acolyte",
    "abilities": [
      "int",
      "wis",
      "cha"
    ],
    "skillProficiencies": [
      "insight",
      "religion"
    ],
    "tool": "Calligrapher’s Supplies"
  },
  "criminal": {
    "id": "criminal",
    "name": "Criminal",
    "abilities": [
      "dex",
      "con",
      "int"
    ],
    "skillProficiencies": [
      "sleight-of-hand",
      "stealth"
    ],
    "tool": "Thieves’ Tools"
  },
  "sage": {
    "id": "sage",
    "name": "Sage",
    "abilities": [
      "con",
      "int",
      "wis"
    ],
    "skillProficiencies": [
      "arcana",
      "history"
    ],
    "tool": "Calligrapher’s Supplies"
  },
  "soldier": {
    "id": "soldier",
    "name": "Soldier",
    "abilities": [
      "str",
      "dex",
      "con"
    ],
    "skillProficiencies": [
      "athletics",
      "intimidation"
    ],
    "tool": "Choose one kind of Gaming Set (see"
  }
} as unknown as Record<string, BackgroundInput>;
