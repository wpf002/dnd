# D&D Foundations Compendium

Project reference corpus. Feeds two consumers:

1. **Davis** (Phase 3 campaign generator) — these volumes are the design
   knowledge Davis is prompted against when emitting a `BeatGraph`.
2. **In-app compendium** — browsable reference surface in `apps/web`,
   modelled on the D&D Beyond / Roll20 compendium information architecture.

Volumes are stored verbatim. Do not summarize them in place — the linter and
Davis prompt-assembly read these files directly, and lossy edits degrade
generation quality.

---

## Volume index

| Ref | Volume | Scope | Status |
|---|---|---|---|
| `D&D-FND-COD-001` | [Volume I — Foundations](volume-1-foundations.md) | History, editions, settings, cosmology, classes, species, pantheons, magic, monsters, core mechanics | Received |
| `D&D-FND-COD-002` | [Volume II — Design](volume-2-design.md) | Worldbuilding, campaign design, narrative architecture, game-design philosophy, cultural impact | Received |
| `D&D-FND-COD-003` | Volume III — Dungeon Master's Reference | Practical DM craft, chapter-per-module | Complete (one section gap) |

---

## Volume III chapter index

Volume III ran to **ten** chapters. Note that the cross-reference sections in
Volumes I and II predict only eight — chapters 9 and 10 are not listed there.
Do not use those cross-reference lists as the authoritative chapter set; this
table is.

| Ch | Title | Ref | Status |
|---|---|---|---|
| 1 | [Dungeon Architect's Advanced Module](volume-3-ch1-dungeon-architect.md) | `003.1` | Complete |
| 2 | [Encounter Design Compendium](volume-3-ch2-encounter-design.md) | `003.2` | Complete |
| 3 | [NPC & Faction Design Compendium](volume-3-ch3-npc-faction-design.md) | `003.3` | **Partial — §XI–XIV missing** |
| 4 | [World Economy & Resource Systems Manual](volume-3-ch4-world-economy.md) | `003.4` | Complete |
| 5 | [Planar & Cosmological Design Compendium](volume-3-ch5-planar-cosmology.md) | `003.5` | Complete |
| 6 | [Campaign Structure & Story Engineering Manual](volume-3-ch6-campaign-structure.md) | `003.6` | Complete |
| 7 | [Magic Item & Relic Creation Manual](volume-3-ch7-magic-items.md) | `003.7` | Complete |
| 8 | [Dungeon Master's Philosophy of Play](volume-3-ch8-dm-philosophy.md) | `003.8` | Complete |
| 9 | [Advanced DM Systems](volume-3-ch9-advanced-dm-systems.md) | `003.9` | Complete |
| 10 | [Master Appendices & Complete Index](volume-3-ch10-master-appendices.md) | `003.10` | Complete |

### The one known gap

**Chapter 3, sections XI–XIV were never supplied:**

- XI. Governments
- XII. Reputation Systems
- XIII. Living World Simulation
- XIV. NPC Audit

Sections I–X of that chapter are present and complete. Partial coverage of the
missing topics exists elsewhere in the corpus — Ch9 §IX covers Reputation &
Renown, Ch9 §VI covers faction-turn world simulation, and Vol II Part VIII
covers political/government axes — but Chapter 3's own treatment is absent.

This is the only gap in the corpus. Everything else is complete.

---

## Sibling reference material

Not part of the numbered compendium, but part of the same corpus:

- [`../reference/dnd-101.md`](../reference/dnd-101.md) — beginner foundation,
  drives in-app onboarding and rules tooltips
- [`../reference/character-creation-flow.md`](../reference/character-creation-flow.md)
  — the character build decision tree
- [`../reference/great-campaigns.md`](../reference/great-campaigns.md) —
  official + community campaign canon, used as tone/genre reference tags
- [`../../content/adventures/synopses/`](../../content/adventures/synopses/) —
  the user's own campaigns, the primary fidelity target for Davis output

## Adding a volume

1. Drop the verbatim text in `docs/compendium/` using the existing filename
   convention.
2. Update the tables above — flip Status to Received.
3. Nothing else. Prompt assembly globs this directory; there is no registry to
   edit and no build step to run.
