# Lantern — Roadmap

A rules-authoritative solo tabletop RPG engine, built as the forcing function
for **Flint** (AI seam layer).

Private project. Single user. Not distributed.

---

## The bet, in one paragraph

Every AI dungeon-master product on the market wins at freeform narration and
loses at mechanics. When the narrator says *you take 7 damage* and you can't
tell whether that came from `2d6` or from nothing, the fiction collapses.
Lantern makes the rules deterministic and the language model narrative-only.
The engine computes; Flint parses intent and describes outcomes. Dice are shown
on screen — the d20 face, the modifier, the DC, the margin. The transparency is
the product.

---

## Architectural invariants

Non-negotiable. Enforced by `pnpm guard` in CI, not by discipline.

1. **`@lantern/engine` never imports `@lantern/flint`** or any provider SDK.
   Dice, initiative, HP, AC, DCs, saving throws, spell slots, conditions, and
   death saves are deterministic TypeScript with zero model calls.
2. **Flint's boundary is text-in / structure-out and outcome-in / prose-out.**
   If a damage number is ever passed *to* Flint and read back *from* Flint, the
   architecture has failed.
3. **`@lantern/flint` imports nothing app-side** — not `engine`, `linter`, `db`,
   or `srd`. Extraction to its own repo must remain a `git mv` and a publish.
4. **Model calls originate server-side only.** No provider key reaches
   `apps/web`, ever, including in the "it's just me" case.
5. **Every mechanical outcome persists its inputs** — dice, modifiers, DC,
   margin — so any roll is auditable after the fact.
6. **The linter is the sole gate** between generated content and playable
   content. Nothing bypasses it, including hand-authored graphs.
7. **Free-text actions the graph can't absorb resolve as in-fiction
   constraint**, never as silent narrative override.

---

## Phase table

| Phase | App deliverable | Flint version | Est. |
|---|---|---|---|
| 0 | Fun test — no code | — | 1 weekend |
| 1 | Contract + deterministic engine | v1 — call interface, adapters, config registry | 3–4 weeks |
| 2 | First playable one-shot, end to end | v2 — schema-constrained output, retry policy | 3–4 weeks |
| 3 | **Generation** — campaign generator | v3 — routing, tiering, telemetry | 3–4 weeks |
| 4 | State ledger + multi-session | v4 — streaming, context compaction | 4–5 weeks |
| 5 | Module ingestion — research spike | — | done, research-grade |
| 6 | **Campaign scale** — multi-book, level 1→20 | — | done |
| 7 | **Published modules, playable** | v5 — long-document extraction | done — two real modules play |

Every phase is built. Read the next section for what the library is, since
the naming invites exactly one wrong assumption.

Solo, part-time. Treat estimates as sequencing, not commitments.

---

## What the adventure library is, and is not

The repo ships **79 playable adventures**, plus whatever has been ingested
locally — 4 on this machine, for 83 in the app. Be precise about what they
are, because the naming invites exactly one wrong assumption.

`content/library-index.json` maps each generated adventure to an `inspiredBy`
entry from the canon list. **That is an attribution record, not a claim of
equivalence.** The generator was given each entry's *setting type and theme*
and nothing else — the source title never entered a prompt. Picking the
Curse of Strahd slot yields *The Tithe of Grauvane*, an original gothic story
with invented characters and plot. Zero published characters, places, or plot
elements appear anywhere in the corpus.

Two consequences. Phases 6 and 7 addressed both, and the corrected statements
are recorded here rather than deleted, because the distinction still holds:

1. **They are not the published modules.** Playing the real *Curse of Strahd*
   still requires that module's own text. Phase 7 built the ingestion path,
   and two real modules — *A Most Potent Brew* and *Battle for Critter Vale* —
   play end to end through it. The generated corpus remains original work.
2. **They are one-shots.** Every generated graph is 10–16 beats, one sitting.
   Campaign scale arrived in Phase 6 as `CampaignGraph`: two campaigns run
   multi-book with advancement, and the engine levels correctly 1→20. The 79
   generated graphs were not retrofitted and are still one-shots by design.

---

## Phase 0 — Fun test

> **Status: CLOSED — waived by decision (2026-08-06).** The question this phase
> answers ("is solo 45-minute play actually fun for you?") is already settled:
> the user plays solo campaigns regularly. Kill condition #1 is satisfied by
> prior experience rather than by experiment.

**No code. This phase exists to kill the project cheaply if it deserves killing.**

### Do

Run a 45-minute solo one-shot by hand. Trident on one side, physical dice or a
roller on the other. You are the player; the model narrates; you enforce every
mechanic yourself. Three options plus free text, manually offered.

### Measure

- Did you reach an ending, or bail?
- Where did attention drop — minute 12? minute 30?
- When you typed something off-script, did the improv land or feel like a
  hand on the wheel?
- Would you start a second one the following week?

### Exit criteria

You finish it, and you want another one. That's the whole bar.

### Kill condition

You bail at minute 15 and feel relief. Solo tabletop is a known-weak format;
"cool for twenty minutes" is the default outcome for this entire product
category. If that's the answer, stop here — you've spent a weekend instead of
four months.

> This phase is the one most likely to get skipped and the one most worth
> keeping. The engine is fun to build whether or not the game is fun to play.

---

## Phase 1 — Contract and deterministic engine

**Goal:** the rules are real and provably so, with no model involved anywhere.

### Build order

Strict, because everything downstream depends on the contract landing first.

**1. `packages/schema`** — the contract every other package shares.

- `Action` — the structured object intent parsing must emit or fail to emit.
  Discriminated union: `Attack`, `CastSpell`, `AbilityCheck`, `Move`,
  `UseItem`, `Interact`, `Speak`.
- `Beat` — id, prose slot, art slot id, three authored options, improv budget,
  entry/exit state conditions.
- `Edge` — source beat, target beat, guard condition on campaign state.
- `Encounter` — combatants, terrain flags, victory/failure transitions.
- `BeatGraph` — beats, edges, encounters, metadata (tone, level, narration
  voice, content limits).
- `Resolution` — what the engine returns: dice faces, modifiers, DC, margin,
  effects applied. This is what Flint narrates and what gets persisted.

**2. `packages/srd`** — inert data, zero logic.

Dice notation, ability scores, four level-3 pregens (Fighter, Rogue, Cleric,
Wizard), ~30 spells, ~15 monsters, basic weapons and armor. Not 300 spells.
The subset is chosen to make one adventure work, not to be complete.

**3. `packages/engine`** — deterministic, in this order:

- `dice/` — seeded RNG, notation parsing, advantage/disadvantage, crits
- `checks/` — ability checks, saving throws, DC comparison, margin
- `combat/` — initiative, attack rolls vs AC, damage, death saves
- `state/` — conditions (prone, frightened, unconscious), HP, spell slots

Seeded RNG matters: it makes the engine's test suite deterministic and enables
replay of any session for debugging.

**4. `packages/linter`** — the gate.

- Reachability: every beat reachable from entry, every ending reachable
- Solvability: no encounter the pregens mathematically cannot win
- Orphaned flags: no state condition that nothing sets
- Art coverage: every beat has an art slot id
- Schema conformance (zod, but with human-legible error output — this output
  becomes the generator's retry context in Phase 3)

**5. `packages/flint` v1** — the seam, minimal.

- Typed call interface: `flint.call(consumerId, input) → Result`
- Provider adapters: Anthropic primary, OpenAI stubbed
- **Per-consumer config registry** — each consumer (`dm-narration`,
  `npc-dialogue`, `intent-parse`, `flint`) owns its own system block, model
  choice, and parameters. No shared global voice.
- Structured error types, not thrown strings

> **Flint finding #1, expected here:** Flint's existing voice/style block is
> correct for Flint-as-assistant and wrong for DM narration — a horror one-shot
> and a comedy heist need opposite registers, neither of which is Flint's. The
> voice block must become *opt-in per consumer*, not baked into the seam. Fix
> this in Flint proper; it's a real defect regardless of this project.

### Exit criteria

- `pnpm test` green: a 200-turn simulated combat produces zero mechanical errors
  under audit
- `pnpm guard` clean
- Engine runs a full combat encounter headlessly, no UI, no model
- Linter rejects three deliberately broken graphs for the right reasons

---

## Phase 2 — First playable one-shot

**Goal:** you play a complete adventure on your phone, start to finish.

This is the phase that decides whether Lantern is a product or an engine-building
hobby. Watch for the failure mode.

### Content

**One adventure. Original. ~14 beats, 3 combats, 2 skill challenges, 3 endings.**
Working title *The Bell at Saltmire*. Its purpose is to validate the schema, not
to be a portfolio piece — write it fast and let the schema pressure-test itself
against real content.

**~45 still frames, pre-generated.** One per beat plus combat states. Generated
offline, curated by hand, served from disk or CDN. Locked prompt prefix and seed
for style consistency.

> Runtime generation gets revisited in Phase 4, not here. Debug the game loop
> before adding an async image pipeline to it.

### App

- **`apps/api`** — session routes, turn resolution, Flint calls. All model calls
  originate here.
- **`apps/web`** — PWA, installs to homescreen. No app store, no review, no
  native shell.
  - Beat view: art, prose, three options, free-text field
  - **Dice tray**: d20 face, modifier, DC, margin, visible on every roll
  - Character sheet: HP, slots, conditions, inventory
  - Combat view: initiative order, HP bars, condition badges

### Flint v2 — schema-constrained output

The hard part. Intent parsing must convert arbitrary free text into a valid
`Action` or an explicit rejection — and **fail closed**. A hallucinated valid
action is worse than an error, because the engine will execute it.

- Zod schema → JSON schema → provider-constrained output
- Validation-failure feedback loop (used by the generator in Phase 3, built here)
- **Per-consumer retry policy:**
  - `intent-parse`: **zero retries.** Failure surfaces as in-fiction refusal.
    A silent retry burns 2–3 seconds mid-turn and usually returns the same
    garbage.
  - `dm-narration`: one retry, then fall back to templated prose from the
    `Resolution` object. Never block a turn on narration.
- `FLINT_REPLAY_MODE=record|replay` — deterministic tests without burning calls

> **Flint finding #2, expected here:** if Flint currently passes through to
> provider JSON mode without validation-failure feedback, that's the gap. Real
> schema enforcement is validate-then-repair, not `response_format: json`.

### The improv budget

Each beat permits N off-graph resolutions that produce real consequence — state
flags, item loss, NPC reaction — then converge back to the trunk. When spent,
the engine narrates constraint in-fiction ("the door is barred from the other
side").

**Tune N generously.** Two reasons, both specific to this being a private tool:
inference cost isn't a constraint, and you know exactly how the machine works,
so a visible rail breaks immersion for you in a way it wouldn't for a stranger.
This is the single largest experiential risk in the project.

### Exit criteria

- You play *Saltmire* end to end on your phone
- Zero mechanical errors you notice across the session
- At least three free-text actions resolve satisfyingly off-graph
- You want to play it again with different choices

---

## Phase 3 — Generation

**Goal:** content generation becomes the product. This is where a private tool
stops starving.

The generator is **not** a peer of Flint. It is a prompt configuration plus an output
schema that runs *on* Flint, and its output passes through the same linter a
human author's does. The generator inherits the schema, so it inherits every
rules guarantee. That is the entire point of Phase 1 landing first.

### Flow

1. User answers 5–6 prompts: tone, setting, length, party level, a premise
   sentence, content limits
2. The generator emits a 10–16 beat `BeatGraph` JSON
3. Linter validates
4. On failure: retry with linter errors as context, **max 3 attempts**, then
   fail loudly. It's behind a loading screen — latency is free here, unlike
   intent parsing.
5. Art assigned from a pre-rendered library tagged by biome and mood

### Flint v3 — routing and telemetry

- Model routing per consumer (cheap for intent parsing, frontier for the generator and
  scene openers)
- Prompt caching for campaign bible / system blocks
- **Telemetry: ndjson call log** — latency, tokens, provider, consumer, outcome

### The generation benchmark

**First-attempt linter pass rate is the metric.**

Binary. Objective. No judge model, no vibes eval, no human scoring. Trackable
across model routing changes, prompt revisions, and Flint versions — you can
know whether a change improved something.

This alone justifies building Lantern on Flint. None of the rest of the
portfolio produces a scorable generation benchmark this clean.

Secondary metrics from the same log: p50/p95 intent-parse latency, rejection
rate, tokens per session.

### Exit criteria

- The generator produces a playable one-shot from a premise sentence
- **First-attempt linter pass rate ≥ 70%**, ≥ 95% within 3 attempts
- You play a generated one-shot and finish it
- Blind comparison: you can't reliably tell generated output from *Saltmire*

---

## Phase 4 — State ledger and multi-session

**Goal:** campaigns that span sessions. The only known antidote to
"cool for twenty minutes."

### The ledger

**Structured and queryable, not a transcript.** `LedgerEntry` rows keyed by
kind:

- `npc_disposition` — per NPC, per axis
- `faction_clock` — 4–6 clocks that advance on session boundaries and visibly
  change available content
- `promise` — unresolved commitments the player made
- `flag` — world state
- `inventory`, `wound` — carried party state

Between sessions, a summarization pass writes **to the ledger**, not to a
transcript. A "Previously on…" recap screen reads from it.

This is where the living-world idea actually lands — as a small number of
clocks with visible consequences, not as a simulation.

### Flint v4

- Streaming narration (latency perception, not throughput)
- Context compaction: the ledger is the context, so compaction is a structured
  summarization job with a schema, not a text squeeze

### Art revisit

Runtime generation becomes viable here: generate beat N+1's frame
asynchronously while you're reading beat N. The latency hides completely. This
was economically impossible in the commercial framing and is trivial at n=1.

### Exit criteria

- A campaign survives three sessions with no continuity contradictions
- Faction clocks visibly change what's available
- Recap screen is accurate and useful after a two-week gap

---

## Phase 5 — Module ingestion

**Goal:** published adventure PDF in, playable beat-graph out.

The most interesting thing in this document, and it exists **only because this
is private and undistributed.** Running modules you own inside a personal tool
that never ships is not distribution. If distribution ever enters the picture,
this phase is deleted first and the licensing posture is revisited from scratch.

### Approach

- PDF → structured extraction (rooms, encounters, NPCs, read-aloud text, maps)
- Map extracted structure onto `BeatGraph`
- Linter validates the result like any other graph
- Human-in-the-loop repair pass for what extraction mangles

### Honest assessment

Published modules are branching, spatial, and DM-improvisation-dependent in ways
a beat-graph doesn't natively express. Expect the first attempt to produce
something that plays like a bad railroad of a great adventure. Treat this as
research, not a deliverable, and start with a linear module rather than a
sandbox.

---

## Phase 6 — Campaign scale

**Goal:** a campaign is a sequence of books that carries one party from level 1
to level 20, not a single 16-beat graph replayed.

This is a prerequisite for Phase 7, not an optional extra. A published campaign
*is* multi-book — ingesting one into a single graph is precisely why the Phase 5
spike produces a railroad.

### What is actually missing

`Campaign` holds one graph. The type carries the admission in a comment:

```ts
/** The adventure this campaign replays/continues. Multi-graph comes later. */
graph: unknown;
```

Three separate gaps, in dependency order:

**1. `packages/schema` — the container above `BeatGraph`.**

- `Book` — an ordered `BeatGraph` with a level band (`levelStart`, `levelEnd`),
  an entry guard over campaign state, and an exit condition
- `CampaignGraph` — metadata, an ordered `Book[]`, and the ledger keys that
  must survive book transitions
- The `Guard` language already expresses cross-book conditions; nothing new is
  needed there. What is new is that a flag set in Book I must still be readable
  in Book IV, which makes the ledger the campaign's spine rather than a
  per-session convenience.

**2. `packages/engine` — character advancement.**

The engine has no concept of levelling. Four pregens are frozen at level 3.
A 1→20 campaign needs:

- `advancement/` — milestone and XP progression, applying HP, proficiency
  bonus, spell slots, subclass features on level-up
- `packages/srd` — class progression tables for all 20 levels, not just the
  level-3 slice chosen to make one adventure work

This is the largest single piece of engine work remaining, and it is
deterministic — no model involved, so invariant 1 holds and it is fully
testable.

**3. `packages/linter` — campaign-level rules.**

Per-graph linting is not sufficient once graphs chain:

- Level continuity: Book N's `levelEnd` must equal Book N+1's `levelStart`
- Ledger continuity: a flag read in Book N must be written in Book ≤ N
- Encounter solvability re-checked against the *band*, not a fixed level 3
- Every book reachable; no book stranded behind an unsatisfiable guard

### App

- Campaign view: book progress, current level, party state across books
- Between-book transition screen, reading from the ledger
- The existing "Previously on…" recap generalizes from session to book

### Exit criteria — all met

- **One campaign of 3+ books runs end to end, party levelling across them.**
  `content/campaigns/the-drowned-lamp-cycle.json` — three books, levels 1→7,
  driven through the shipping services in `apps/api/src/campaign-scale.test.ts`.
- **A flag set in Book I visibly changes content in Book III.**
  `allied-wizards`, earned in Book I, opens three options in Book III that a
  party arriving without it never sees. Tested both ways.
- **The linter rejects a campaign whose level bands do not chain.**
  `level-band-gap`, plus gates on flags no earlier book writes, inverted
  bands, duplicate book ids, and per-band encounter solvability.
- **A 200-turn simulated run across books produces zero mechanical errors.**
  300+ turns, every resolution schema-validated and re-derived as it happened.

### What the audit found

The 200-turn run was not a formality. It caught a defect that had been live
since the library was generated: `requiresCheck.ability` and `.skill` were
`z.string()`, generated content wrote display names ("Animal Handling",
"Intelligence"), and `skillModifier` returned `{ source: undefined, value: NaN }`
for every one of them. 389 of 416 checks across 74 of 79 adventures silently
resolved to nothing — the roll happened, the total was `NaN`, the comparison
was always false.

The linter never saw it because the graphs were structurally perfect. Fixed in
the schema (enums, so the state is unrepresentable), in the content
(`tools/normalize-check-ids.mjs`), in the engine (throw rather than emit NaN),
and in the generator prompt.

### Kill condition

Levelling introduces mechanical errors the engine cannot hold under audit. If
20 levels of class features cannot be made deterministic and correct, cap the
supported band (say 1–10) rather than shipping a rules engine that is wrong at
the top end. Being right is the entire differentiation.

---

## Phase 7 — Published modules, playable

**Goal:** a module you own goes in as text, and comes out playable with its own
plot, characters, and structure intact.

Phase 5 built the spike: `POST /ingest` extracts a structure and maps it to a
graph. It is a **linear room→beat mapper** — it walks `module.rooms` in order
and wires each to the next. That is fine for a single dungeon and wrong for a
published campaign, which is branching, spatial, hub-based, and spread across
chapters.

### What has to change

**1. Topology.** ✅ Done. The mapper walked `module.rooms` in array order and
padded every beat to three options by repeating the same target — a five-exit
hub kept three, a ring came out a line, and two of every three "choices" were
identical. Now every exit survives: a room with more than three is split
across follow-on beats, rooms with fewer are padded with options that actually
differ, and encounter outcomes route topologically instead of by array index.
`apps/api/src/services/module-mapper.ts`.

**2. Chapters become books.** ✅ Done. `IngestedModule` gained optional
`chapters`; `mapModuleToCampaign` produces a `CampaignGraph` plus one
`BeatGraph` per chapter, carrying the module's own printed level bands. Every
book is linted individually and the campaign is linted with them resolved.
Nothing is silently repaired: level bands that do not chain, chapters with no
ending, rooms in no chapter, and connections leaving their chapter are each
reported and left for the linter to reject.

**3. Long-document extraction.** ✅ Done, untested against a real book.
`apps/api/src/services/long-extract.ts` chunks on the module's own headings
(never mid-paragraph, so read-aloud text stays verbatim), extracts each chunk
separately, and merges. Every call carries a running index of the areas, NPCs,
and chapters already found, so a later chapter connects back by id instead of
inventing a near-duplicate. A failed chunk loses that section and is reported,
rather than failing the run.

The constraint is the *output*, not the context window: three hundred rooms of
read-aloud text will not come back complete and correct from one generation,
and a single-call failure leaves nothing to keep.

**4. Human-in-the-loop repair.** ✅ Done.

`/ingest` now returns the extracted IR alongside the campaign, the books, the
lint findings, and reports naming every room that was fanned out, padded,
orphaned, merged, or renamed. `POST /ingest/map` re-maps a hand-edited IR with
no model call, so repair is free and can be iterated to convergence.

`tools/ingest-module.mjs` is the practical path: it writes `ir.json`,
`campaign.json`, `books/*.json`, and `report.json` to a working directory,
never into `content/`. Extract once (that is the part that costs), then edit
`ir.json` and re-run with `--map-only` until the linter is clean.

`tools/review-ingest.mjs` builds a local review page: per area, what the module
says beside what extraction understood beside what the mapper built, with every
finding attached to the area it concerns. It embeds the source text, so it stays
on disk and is never published.

Ingested content is playable: `content-local/` is gitignored and read by the API
alongside `content/`, and `--install` puts a linted result there. `content/` is
committed and so can never hold a module the user owns.

**5. What a beat-graph still cannot express.** Some of a module is genuinely
DM-improvisation-dependent — reactive factions, open exploration, table
negotiation. The improv budget absorbs some of it. Be honest about the
remainder rather than pretending the graph captured it.

### Input

Module text supplied by the user, for modules the user owns. Nothing is
scraped, bundled, or redistributed. See Content and licensing below — this
phase is the first thing deleted if distribution is ever on the table.

### Exit criteria

Measured against *A Most Potent Brew* (Winghorn Press), a module the user
owns. Its text and everything derived from it stay in gitignored directories.

- ✅ **Plays end to end, recognizably itself.** 9/10 runs reach an ending under
  a policy that explores and then leaves; mean 98 turns; 10 of 11 beats
  exercised.
- ✅ **Branching survives.** Choosing the Lab reaches two beats the Well Room
  choice never sees, and the reverse.
- ✅ **Chapters map to books with the module's own level progression.**
  *Battle for Critter Vale* (64 pages, three chapters) ingests to a three-book
  campaign that plays end to end, levelling 1 → 2 → 3 → 4 in 88 turns.
- ✅ **A blind read is identifiably that module.** Glowkindle, the Beer Cellar,
  the Mosaic Corridor, the Well Room, read-aloud text verbatim.

### What a real module found that fixtures did not

Every one of these was invisible until actual published text went through:

- `temperature` is deprecated on Claude 5 — the first extraction call 400'd
- encounter victory routed to the room the party had just come from, because
  printed connection lists are bidirectional
- a room that is both a fight and a junction lost its other exits
- a cleared room re-ran its fight forever — which uncovered that `Edge` and
  `entryWhen` were declared, linted, and never evaluated in play
- every unmatched creature became the same fixed statblock
- the module's conclusion was wired as just another exit, so the whole dungeon
  was skippable
- chunked extraction reused a 32k-token config per section and was unusably
  slow

### What the second module found

A 64-page chaptered book found a further set, none of which the first module
could have:

- pdftotext repeats a chapter's name on every page, so one chapter became a
  dozen sections — 61 sections from 64 pages
- the keyed-area pattern matched ordinary numbered lists and table rows
- a chapter that continues has no ending of its own; requiring a terminal beat
  per book failed two of three books. Non-final chapters now get a hand-off
  built from the connections that left the chapter
- sequential extraction cannot make forward references, so a junction lost the
  exits described in later sections. A second linking pass fixes it
- allies and bystanders live in the same statblock list as the monsters,
  marked only in prose — every one of them came out hostile, and the party's
  own pixie ranger fought them
- not every fight is to the death; the IR could only say `defeat-all`, which
  made an avoidable weasel den a required massacre
- the solvability threshold only fired when the party died four times over. A
  fight the party loses every single time passed. Retuned to "the party falls
  first" (shipped content's worst case is 0.81; the failing fight was 1.12)
- `destroy` and `reach-location` encounters were being raced against the whole
  room's hit points, which called five shipped encounters unwinnable

### Still open

- A defeat has no ending in the module, so a party that keeps losing the same
  fight loops. A total party kill ends the session; short of that, walking
  back into a losing fight is the player's own affair.
- Extraction misreads party-size scaling tables — a "4 PCs: Adult ×1, Cubs ×2"
  column came through as six cubs. Repairable in the IR, but the IR has no way
  to express "scales with party size".
- Skill challenges have no representation at all. The weasel den is a DC 13
  group Stealth check in the module; the IR can only say there is a fight.

### Honest assessment

Unchanged from the Phase 5 note, and worth repeating: expect the first attempt
to play like a bad railroad of a great adventure. The difference now is that
"good enough" is defined — the exit criteria above are falsifiable, and the
first one is the one that matters.

Start with a linear, single-book module. Do not start with a sandbox.

---

## Flint build-out summary

| Version | Capability | Driven by | Phase |
|---|---|---|---|
| v1 | Typed call interface, provider adapters, per-consumer config registry | Narration needs a seam at all | 1 |
| v2 | Schema-constrained output, validation-feedback retry, per-consumer retry policy | Intent parsing must fail closed | 2 |
| v3 | Routing/tiering, prompt caching, ndjson telemetry | The generator needs a scorable benchmark | 3 |
| v4 | Streaming, structured context compaction | Multi-session ledger | 4 |

### What Lantern stresses that the rest of the portfolio doesn't

1. **Structured output under adversarial input.** Free text like *"I seduce the
   door"* must produce a valid `Action` or an explicit rejection. Fail-closed
   semantics, tested continuously.
2. **Latency in an interactive loop.** Turn-by-turn, human waiting. Batch work
   hides seam overhead; this won't. You'll learn Flint's real per-call floor.
3. **Persona multiplexing on one seam.** Four consumers with different system
   blocks hitting Flint concurrently in a single session. Tests config
   isolation — whether one consumer's block bleeds into another's.
4. **Objectively scorable generation.** The linter pass rate. See Phase 3.

Fixes discovered here land in Flint proper and propagate across the portfolio.

---

## Cut list

Explicit. Each is reasonable to want and each is a reason v1 doesn't ship.
Two have since been built and are struck through — both because the ground
moved: SRD 5.2 arrived under CC-BY-4.0, and eighty-three adventures made
playing the same four pregens the limiting factor.

- **AR** — a demo, not a product. Nobody plays three hours holding a phone at
  arm's length.
- **Multiplayer** — the whole premise is solo play
- **Voice** — later, if ever
- **Native app / app stores** — PWA covers it, zero review overhead
- ~~**Character creator**~~ — built. Eight SRD species, four backgrounds, the
  four classes the progression tables cover; a made character replaces the
  pregen of its class so the party stays at four.
- ~~**Full spell list**~~ — built. SRD 5.2 is CC-BY-4.0, so the real list (326
  spells, 222 creatures) is simply in the repository.
- **Homebrew rules** — the engine is the authority; don't make it configurable
- **UGC / marketplace** — n=1
- **Runtime image generation in the core loop** — Phase 4, not before
- **Offline play** — cut at the finish line. Offline *reading* ships; taking a
  turn needs the server. Reversing it is a phase, and the design to start from
  is written under F2 — replay an input log, do not sync state.
- **Generated art frames** — cut at the finish line. 1,285 deterministic
  placeholder SVGs are the art. `BeatArt` still prefers `<slot>.png` if one
  ever appears, so this costs nothing to reverse.

### Deliberately dropped from the commercial framing

Irrelevant at n=1, do not reintroduce: retention gates, conversion targets, unit
economics, model tiering *for cost* (v3 tiering is for latency), free-tier caps,
fair-use limits, 50-person playtests, seven-genre content spread, human art
director, AI-art disclosure, app store policy, "5e-compatible" branding
discipline, and the IP wall on published modules.

---

## Kill conditions

Falsifiable. Each has a phase.

| # | Condition | Phase | If it fails |
|---|---|---|---|
| 1 | Solo 45-minute play is actually fun | 0 | Stop. Weekend spent, not months. |
| 2 | Engine holds < 2% noticeable mechanical error over 200 turns | 1 | The entire differentiation is gone; you're building a chat wrapper. |
| 3 | Intent parsing fails closed reliably | 2 | Free text becomes a liability; cut to three options only. |
| 4 | Generator first-attempt linter pass ≥ 70% | 3 | Content engine is you writing graphs by hand. Project starves. |
| 5 | A campaign survives three sessions coherently | 4 | Ship one-shots only; drop the ledger. |
| 6 | Levelling stays mechanically correct 1→20 | 6 | Cap the supported band (1–10) rather than ship a rules engine that is wrong at the top end. |
| 7 | An ingested module is recognizably itself | 7 | Ingestion is a research result, not a feature. Say so, and keep authored + generated content as the product. |

---

## Standing risks

**Engine-building drift.** No external accountability, sole consumer, and the
engine is more fun to build than the game is to play. **Phase 2 must be playable
end to end or the project has quietly become something else.** This is the most
likely failure mode by a wide margin.

**Improv-budget immersion break.** You know how the machine works. When the
engine gracefully refuses your free-text action in-fiction, you'll know exactly
why, and the illusion breaks in a way it wouldn't for a stranger. Mitigation is
a generous budget and rare refusals — affordable, since cost isn't a constraint.

**Scope creep via Flint.** Flint is portfolio infrastructure, so there's
constant temptation to build capability Lantern doesn't need. Rule: **Flint work
is justified by a Lantern phase or it waits.** The whole value of this
arrangement is building against a real consumer instead of imagination.

---

## Content and licensing

Mechanics derive from **SRD 5.1 and SRD 5.2**, both under
[CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode). SRD 5.2
supplies 222 creatures, 326 spells, 8 species and 4 backgrounds, parsed by
`tools/import-srd52.mjs`; the SRD 5.1 subset was hand-transcribed and is
retained where 5.2 has no matching entry. Attribution in
`packages/srd/ATTRIBUTION.md` and `docs/ATTRIBUTION.md`, and surfaced in-app
in the header.

Private tool, undistributed. If that changes: Phase 5 is deleted, all art
provenance gets documented, branding never says "Dungeons & Dragons," and the
whole licensing posture gets rebuilt before anything ships.

---

## The finish line

Every numbered phase is built. What follows is the complete list of what
stands between the current state and *done*, written so nothing new appears
later. Each item states what "finished" means for it, so it can be checked off
rather than argued about.

The rule for this list: **if it is not here, it is not required to ship.**
Anything discovered later goes in "Standing risks" or the cut list, not here.

### Where the app actually is

| | |
|---|---|
| Adventures | 79 generated + 4 ingested, all lint-clean, all finish on ten seeds |
| Campaigns | 2, multi-book, both complete with advancement |
| Rules | SRD 5.1 + 5.2 — 222 creatures, 326 spells, levels 1→20 |
| Characters | 4 pregens, or make your own: 8 species, 4 backgrounds, 4 classes |
| Engine | deterministic, seeded, 88 tests |
| Gate | linter (0 errors, 0 warnings), 568 tests, boundary guard, playability sweep |
| Session | plays end to end in the browser — choices, free text, combat, spells, rest, death |

### F1 — A session survives closing the tab — *done*

**Was the one real hole.** The API persists every session to the database and
serves `GET /session/:id`. The web client never stores the id, so a reload
loses the game. For a solo game meant to be played in sittings, that is the
difference between a toy and a thing you use.

Finished when: reopening the app offers to resume an unfinished session or
campaign, resuming restores party, flags, beat, and combat exactly, and there
is a way to abandon a run and start fresh. Covered by a web test.

### F2 — Offline play — *done*

**Built.** `manifest.webmanifest` named two icons and `public/icons/` was
empty, so the install prompt never appeared — a manifest whose icons 404 is
not installable. `tools/generate-icons.mjs` draws both, deterministically and
with no dependencies. A service worker now precaches the shell, serves
content-hashed build output and art cache-first, and reads the API
network-first with a cache fallback, so the app opens with no network and
shows the library, the art, and the beat a session was on.

A request that never reached the server now raises `OfflineError` — "you are
offline", distinct from a rules refusal, which calls for a completely
different reaction from the player.

**Taking a turn offline is cut.** Offline means the app opens, the library is
there, and you can read where you are. Playing needs the server. That is the
current state, it is coherent, and it is what ships.

The reason is not that it is impossible — it is that it is a phase, and the
finish line exists to stop phases arriving disguised as polish. Recorded here
so that reversing it starts from a design rather than from scratch:

> **If it is ever built, build it as replay, not as sync.** The engine is
> deterministic and seeded, so the honest unit of offline play is the *input
> log*, not the state. The client appends option ids and free-text strings to
> a local log; on reconnect it posts the log and the server replays it through
> the same engine and arrives at the same state, byte for byte. That is the
> existing invariant — every mechanical outcome persists its inputs — read
> forwards, not an exception to it. There is no conflict resolution, because
> there is only ever one writer.
>
> What it costs: extracting `apps/api/src/services/game.ts` into a package the
> web app can run; a local append-only log; a replay endpoint. What stays
> broken offline regardless: DM narration and free-text intent parsing, both
> of which need the model. Free text would have to be refused offline the way
> an exhausted improv budget is refused now — in fiction, and closed.

**Verified in real Chrome** (151), not just in tests. `tools/check-service-worker.mjs`
launches headless Chrome with a throwaway profile, drives it over the DevTools
protocol, and reports what actually happened — no new dependencies, re-runnable
any time:

```bash
pnpm --filter @lantern/web build && (cd apps/web && npx next start -p 3100 &)
node tools/check-service-worker.mjs http://localhost:3100
```

It confirms the worker registers and activates, takes control on the next
load, fills all three caches, and precaches the shell. Then it puts Chrome
itself offline and confirms the page still renders, art already seen is still
served, and a write fails as a `TypeError` — which is what `OfflineError`
turns into the message a player sees.

Art the player has *not* reached is not cached, because runtime caching cannot
cache what was never fetched. That is coherent rather than a gap: taking a turn
needs the engine, so a beat they cannot reach offline is a beat whose picture
they do not need.

The first attempt at this reported that registration was impossible to test.
That was wrong — the finding was a stale dev server, and the reason it took an
afternoon to see is that the registration call swallowed its own errors. It
warns now.

### F3 — Art — *decided: the placeholders are the art*

**The decision.** Generated frames are moved to the cut list. The placeholders
are what ships. They are deterministic, they re-render identically from the
slot id, and they cost nothing to keep. `BeatArt`'s fallback chain is
unchanged — png, then svg, then a per-slot gradient — so if real frames are
ever made, dropping `<slot>.png` into `apps/web/public/art/` makes them win
with no code change at all. This is reversible; leaving it undecided was the
thing that was not.

Two things were fixed on the way to deciding, because the placeholders were
not actually finished:

- **Coverage.** 1,247 of 1,285 slots had a file. The 38 without were every
  beat of every ingested module, which played on bare gradients while
  generated adventures had frames — the generator read a manifest directory,
  and nobody writes a manifest for an adventure that did not exist until a PDF
  was read. It now reads art slots from the adventure graphs as well, which
  are the authority and cannot drift. 1,285 of 1,285.
- **Variety.** The scene chooser had hand-written rules for the four authored
  adventures and dropped everything else onto the same town skyline, so a beer
  cellar and a drowned crypt were the same row of rooftops. Generic keyword
  rules now cover 70% of slots — cellars and crypts get columns, tunnels get
  pillars, tide and causeway get a causeway, bells get a bell — and the rest
  still land on the skyline, which is a reasonable thing for an unknown place
  to look like.

### F4 — Phase 0, the fun test — *played twice; the verdict is yours*

Sessions were played end to end through the real API with narration live: the
ingested module (*A Most Potent Brew*, twice, the second time to an ending),
the authored one-shot (*The Bell at Saltmire*), and the first book of *The
Drowned Lamp Cycle*. Reading the prose and choosing deliberately, not driving
the sweep.

**Playing found seven defects that 578 tests and a ten-seed sweep did not.**
Every one is about what a player experiences rather than what the engine
computes, which is exactly why no automated check saw them.

1. **No healing outside combat, and no rest at all.** The spell panel rendered
   only on a caster's turn in a fight, and nothing in the app ever called the
   rest endpoint — both had been in the API since Phase 2. A party that won a
   fight with two of four at nought hit points walked on bleeding out and
   stayed that way. The sweep never noticed because it heals through the API
   directly; only someone looking at the screen would see there was no button.
2. **The narrator was never told what the player typed.** Free text resolves
   to `interact / automatic / no effects`, so the model invented a plausible
   action for the scene. Asking a cleric to shout across the water produced a
   paragraph about the party walking onto the causeway.
3. **The linter's guarantee was "you can always lose."** `checkNoGuaranteedEnding`
   counted an encounter's `onDefeat` as a route to an ending. In the ingested
   module the first fight's defeat route led back to the entry, the only beat
   that could reach the walk-away ending — so nine of eleven beats had no way
   to finish and the linter reported nothing. **The worst of the seven**: the
   gate that exists to prevent walking forever was passing a graph where a
   winning party does exactly that.
4. **One adventure genuinely stranded a winning party**, found the moment (3)
   was fixed. *Four Wounds of the Corrun Vale* now offers the downriver boat
   at the campfire every victory routes to.
5. **Searching a room produced nothing.** A flag and no outcome, which is a
   false choice however well it satisfies the linter. It rolls Investigation
   DC 13 now — deliberately not the Perception 12 that "press on quickly"
   already rolls.
6. **"Toward Calling it"** as option two on an opening scene.
7. **The refusal lines were about Saltmire**, in all eighty-three adventures.
   Being told the salt air swallows half-made plans in a wizard's tower
   basement is worse than a plain refusal.

All seven are fixed and covered by tests.

**What playing was actually like.** The authored and campaign content is
strong: a natural 18 on an investigation produced narration naming the
specific thing found and carried it into the next beat, and the read-aloud has
a voice. The engine was correct everywhere it was watched — death saves,
downed characters, healing, slots, a level-1 party in book one. Eight giant
rats in the ingested module's first room killed the wizard outright, which is
harsh for room one and is also D&D. The ingested module is recognizably itself
and noticeably plainer, which is what faithful mapping of a plain module
should look like.

**Known fidelity limits of ingestion**, observed rather than inferred:

- A module's riddle survives as *text* and not as a puzzle. The mosaic
  corridor prints its verse and offers three exits; nothing engages with it,
  and free text is refused because the intent parser has nothing to bind to.
- A module's own stated DCs are not extracted. The lab says "a character who
  searches the room and makes a DC 13 Wisdom (Perception) check notices one
  book" and the generic search padder rolls its own check instead.

Both are mapper depth rather than bugs, and both are honest to write down.

**The verdict is not mine to give.** Kill condition 1 asks whether solo play
is fun, and that is a question about the person playing. What can be reported
is that it works, it reads well, and those seven are gone. Play it, and write
the answer here.

### F5 — Does ingestion generalise? — *done for what can be tested here*

The worry was never "three modules is better than two". It was that every
decision in the pipeline was made while looking at two small keyed dungeons —
seven and twenty-five areas, a spine with short branches, nothing with more
than six connections — which is exactly the condition under which code quietly
stops working on anything else.

Both halves were tested against the shape those two modules are not, and both
were broken:

**The mapper.** `apps/api/src/sandbox-shape.test.ts` builds a nineteen-region
hex field — no spine, four to six connections per region, three endings, two
of them gated — and runs it through the real mapper, linter, and engine. It
maps clean, keeps every region, splits hubs with more than three exits, leaves
an ending reachable from anywhere, and plays to an ending on all ten seeds.
The mapper generalises.

**Extraction.** It did not. A dungeon numbers its rooms — "1. Beer Cellar" —
and the heading patterns were written while looking at exactly that. A
hexcrawl keys its areas by coordinate, and *none* of the three patterns
matched `Hex 0304:`, `Hex 0305 —`, `0402  Broken Aqueduct`, or `Area 7:`. A
whole hexcrawl arrived as **one chunk with no area boundaries in it at all**,
so every location in the book would have extracted, if at all, as part of
whatever came first. Two patterns added, four tests, and the two real modules
chunk to exactly the same 6 and 22 as before.

**What is still not tested, and cannot be here:** an unfamiliar document's
*prose* — sidebars, stat blocks in two columns, tables mixed into room text,
a voice the extractor has never seen. Only a real module tests that, and a
module written to be a test case is written by someone who knows what the
extractor expects, which is not a test. If a third module ever gets ingested,
this is what to watch. It is no longer a gap in the pipeline; it is the
residual risk of reading documents at all, and the repair surface
(`--map-only`, `tools/review-ingest.mjs`) exists for exactly that.

### Explicitly not on this list

Deployment, hosting, accounts, payments, multiplayer, voice, AR, app stores,
homebrew rule configuration, and a marketplace. The cut list covers why. This
is a private tool for one player; "finished" means the player can play it,
not that anyone else can reach it.

### Order

F1 first — it is the only thing that makes the app usable across sittings,
and everything else is more pleasant to evaluate once a session can be picked
back up. Then F4, because it can invalidate the rest. F2, F3, and F5 in any
order after that.

