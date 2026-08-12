# Attribution

This work includes material from the System Reference Document 5.1 ("SRD 5.1")
and the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC,
available at https://www.dndbeyond.com/srd.

The SRD 5.1 and SRD 5.2 are licensed under the Creative Commons Attribution 4.0
International License, available at
https://creativecommons.org/licenses/by/4.0/legalcode.

This project is unaffiliated with and unendorsed by Wizards of the Coast.

## What came from where

| Source | Where it lives | Contents |
|---|---|---|
| SRD 5.2 | `src/srd52/monsters.ts` | 222 creatures |
| SRD 5.2 | `src/srd52/spells.ts` | 326 spells |
| SRD 5.2 | `src/srd52/lineages.ts`, `backgrounds.ts` | 8 species, 4 backgrounds |
| SRD 5.1 | `src/monsters.ts`, `src/spells.ts`, `src/equipment.ts` | the earlier hand-transcribed subset |

`src/content.ts` merges the two. SRD 5.2 is authoritative for creatures. For
spells the hand-written entries win where both exist, because their mechanics
were written against the engine's resolution model and the parsed ones were
not.

Regenerate the SRD 5.2 tables with:

```bash
node tools/import-srd52.mjs work/srd52/layout.txt
```

See `docs/ATTRIBUTION.md` for the project-wide statement.
