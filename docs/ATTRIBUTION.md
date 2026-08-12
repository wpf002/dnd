# Attribution

## System Reference Document 5.1 and 5.2

This work includes material from the System Reference Document 5.1 ("SRD 5.1")
and the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC,
available at https://www.dndbeyond.com/srd. The SRD 5.1 and SRD 5.2 are
licensed under the Creative Commons Attribution 4.0 International License,
available at https://creativecommons.org/licenses/by/4.0/legalcode.

This project is compatible with fifth edition.

### Where it lives

- `packages/srd/src/srd52/monsters.ts` — 222 creatures, parsed from SRD 5.2
- `packages/srd/src/srd52/spells.ts` — 326 spells, parsed from SRD 5.2
- `packages/srd/src/monsters.ts`, `spells.ts`, `equipment.ts` — the earlier
  hand-transcribed SRD 5.1 subset, retained where SRD 5.2 has no entry under
  the same id and, for spells, where the hand-written mechanics are the ones
  the engine resolves against

Regenerate the SRD 5.2 tables with:

```bash
node tools/import-srd52.mjs work/srd52/layout.txt
```

The importer is deterministic and free to re-run. What it will not do is
invent: a stat block whose attack line it cannot read arrives with no attacks,
and the linter refuses to build an encounter on it.

## What is NOT in this repository

Published adventure modules are the user's own materials. They are never
committed. Ingested content lives in `content-local/` and `work/`, both
gitignored — see "Content and licensing" in `docs/ROADMAP.md`.

Third-party compendiums and rules documents that are free to download but not
licensed for redistribution are likewise absent. Being able to read something
is not the same as being able to ship it.
