# UI Design

Reference targets: [D&D Beyond](https://www.dndbeyond.com/en),
[Roll20 Compendium](https://roll20.net/compendium/dnd5e/BookIndex),
[dnd-compendium.com](https://www.dnd-compendium.com/).

What we take from each, and — more importantly — what we deliberately don't.

---

## What we're borrowing

### From D&D Beyond — the look

Observed design system:

- **Dark theme with warm metallic accents.** Deep navy/charcoal grounds, gold
  and amber highlights, white body type, deep purples and blacks for section
  backgrounds. This matches the scaffold's existing PWA manifest colors
  (`#0b0a09` background and theme color) — no change needed there.
- **Sans-serif throughout.** Large bold headings, regular-weight body.
  Serif/blackletter is conspicuously *not* used for body copy.
- **Card and panel layout.** Content cards with imagery, full-width hero
  sections with centered overlays, side-by-side comparison panels.
- **Prominent, high-contrast call-to-action buttons.**

### From D&D Beyond — the information architecture

Its primary navigation maps almost directly onto what Lantern needs:

| D&D Beyond | Lantern equivalent |
|---|---|
| Play D&D (characters, campaigns, tools) | Play — beat view, dice tray, character sheet |
| Rules (classes, backgrounds, species, spells, equipment, monsters) | Compendium — SRD data browser |
| Library | Adventures — beat-graphs, hand-authored and generated |
| Community / Marketplace | **Cut.** n=1. |

### From Roll20 — the compendium taxonomy

Roll20's index gives a clean, proven content taxonomy that `packages/srd`
should mirror so the browse UI and the data layer agree:

- **Core Rules & Systems** — Character Advancement, Combat, Resting,
  Conditions, Traps, Diseases, Madness, Feats, Backgrounds, Pantheons, Poisons,
  Ability Scores, Time, Movement
- **Races** — Dragonborn, Dwarf, Elf, Gnome, Half-Elf, Half-Orc, Halfling,
  Human, Tiefling
- **Classes** — the twelve
- **Equipment** — Treasure, Armor, Weapons, Adventuring Gear, Tools,
  Mounts/Vehicles, Trade Goods, Expenses, Sentient Magic Items, Objects
- **Spells** — browsable by Name, Level, or School; filterable by class
- **Monsters** — indexed by Name, Type, or Challenge Rating
- **Items** — by Type

The three axes that matter for browse UI: **spells by level/school/class**,
**monsters by CR/type**, **equipment by category**. Those are the filters to
build; everything else is a detail page.

---

## What we're deliberately not borrowing

These are the load-bearing differences, not oversights.

**No accounts, no marketplace, no subscriptions.** D&D Beyond gates its library
behind authentication and sells tiers. Lantern is a private tool at n=1. There
is no login.

**Not a reference tool.** D&D Beyond is a *lookup* product — you go there to
find a rule, then play elsewhere. Lantern is the table itself. The compendium
is a supporting surface, not the main event. If the compendium starts feeling
like the product, that is the engine-building drift the roadmap warns about.

**No character builder in v1.** The builder is D&D Beyond's centerpiece. Ours
is deferred to Phase 4 at the earliest — four pregens until then. The full
decision tree is specified in
[`reference/character-creation-flow.md`](reference/character-creation-flow.md)
so the schema is shaped correctly now, but the UI waits.

**Desktop-first vs. phone-first.** D&D Beyond is a wide-viewport product with a
collapsed mobile menu. Lantern is a PWA that installs to a homescreen and is
played one-handed. Layout decisions resolve toward the phone.

---

## The surface D&D Beyond has no equivalent for

This is the actual product, and there is nothing to copy — it has to be
designed from scratch.

### The dice tray

Visible on **every** roll. Shows:

- the d20 face (both faces on advantage/disadvantage, with the discarded one
  visibly discarded)
- the modifier, broken out — ability mod, proficiency, situational
- the DC or AC being tested against
- the resulting margin

This is the product thesis rendered as a component. When the narrator says
*you take 7 damage*, the tray already showed the `2d6` that produced it. Every
field in the tray is read from the persisted `Resolution` object, so what is
shown is exactly what was computed and stored — the display cannot drift from
the math, because it has no independent source.

**Design constraint:** the tray must never animate a result the engine did not
produce. No "juicy" random tumbling that lands on a predetermined face — the
face shown is the face rolled.

### Beat view

Art, prose, three authored options, free-text field. The free-text field is the
risky one: per `reference/dnd-101.md` §15, the player types what their
character *attempts*, not which skill to roll. On a parse failure the response
is an in-fiction refusal, never a retry spinner and never a silent
reinterpretation.

### Combat view

Initiative order, HP bars, condition badges. Conditions are engine state, so
badges are read-only reflections — there is no UI affordance to add or clear a
condition by hand.

---

## Open questions

Not blocking, but unresolved:

- **Art direction for the ~45 pre-generated frames.** Locked prompt prefix and
  seed for style consistency is the stated approach; the actual style is
  undecided.
- **Typography.** D&D Beyond's sans-serif is right for UI chrome. Whether beat
  *prose* wants a serif for readability at length is untested.
- **Dice tray placement on a phone.** Persistent bottom sheet vs. transient
  overlay. Needs a real session to judge — this is a Phase 2 question, and the
  wrong answer is the kind of thing that makes a turn feel slow.
