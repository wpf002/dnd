# Lantern — Roadmap

A rules-authoritative solo tabletop RPG engine, built as the forcing function
for **Flint** (AI seam layer).

Private project. Single user. Not distributed.

> **Terminology.** "Davis" throughout this repo means the `davis` **consumer on
> Flint** — a prompt configuration plus an output schema. It is not a separate
> system and has no separate codebase.

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
| 3 | **Davis** — campaign generator | v3 — routing, tiering, telemetry | 3–4 weeks |
| 4 | State ledger + multi-session | v4 — streaming, context compaction | 4–5 weeks |
| 5 | Module ingestion (PDF → beat-graph) | — | open-ended |

Solo, part-time. Treat estimates as sequencing, not commitments.

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
  becomes Davis's retry context in Phase 3)

**5. `packages/flint` v1** — the seam, minimal.

- Typed call interface: `flint.call(consumerId, input) → Result`
- Provider adapters: Anthropic primary, OpenAI stubbed
- **Per-consumer config registry** — each consumer (`dm-narration`,
  `npc-dialogue`, `intent-parse`, `davis`) owns its own system block, model
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
- Validation-failure feedback loop (used by Davis in Phase 3, built here)
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

## Phase 3 — Davis

**Goal:** content generation becomes the product. This is where a private tool
stops starving.

Davis is **not** a peer of Flint. Davis is a prompt configuration plus an output
schema that runs *on* Flint, and its output passes through the same linter a
human author's does. Davis inherits the schema, so Davis inherits every rules
guarantee. That is the entire point of Phase 1 landing first.

### Flow

1. User answers 5–6 prompts: tone, setting, length, party level, a premise
   sentence, content limits
2. Davis emits a 10–16 beat `BeatGraph` JSON
3. Linter validates
4. On failure: retry with linter errors as context, **max 3 attempts**, then
   fail loudly. It's behind a loading screen — latency is free here, unlike
   intent parsing.
5. Art assigned from a pre-rendered library tagged by biome and mood

### Flint v3 — routing and telemetry

- Model routing per consumer (cheap for intent parsing, frontier for Davis and
  scene openers)
- Prompt caching for campaign bible / system blocks
- **Telemetry: ndjson call log** — latency, tokens, provider, consumer, outcome

### The Flint benchmark

**First-attempt linter pass rate is the metric.**

Binary. Objective. No judge model, no vibes eval, no human scoring. Trackable
across model routing changes, prompt revisions, and Flint versions — you can
know whether a change improved something.

This alone justifies building Lantern on Flint. None of the rest of the
portfolio produces a scorable generation benchmark this clean.

Secondary metrics from the same log: p50/p95 intent-parse latency, rejection
rate, tokens per session.

### Exit criteria

- Davis produces a playable one-shot from a premise sentence
- **First-attempt linter pass rate ≥ 70%**, ≥ 95% within 3 attempts
- You play a Davis one-shot and finish it
- Blind comparison: you can't reliably tell Davis output from *Saltmire*

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

## Flint build-out summary

| Version | Capability | Driven by | Phase |
|---|---|---|---|
| v1 | Typed call interface, provider adapters, per-consumer config registry | Narration needs a seam at all | 1 |
| v2 | Schema-constrained output, validation-feedback retry, per-consumer retry policy | Intent parsing must fail closed | 2 |
| v3 | Routing/tiering, prompt caching, ndjson telemetry | Davis needs a scorable benchmark | 3 |
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

- **AR** — a demo, not a product. Nobody plays three hours holding a phone at
  arm's length.
- **Multiplayer** — the whole premise is solo play
- **Voice** — later, if ever
- **Native app / app stores** — PWA covers it, zero review overhead
- **Character creator** — four pregens until Phase 4 at the earliest
- **Full spell list** — ~30, chosen to make the content work
- **Homebrew rules** — the engine is the authority; don't make it configurable
- **UGC / marketplace** — n=1
- **Runtime image generation in the core loop** — Phase 4, not before

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
| 4 | Davis first-attempt linter pass ≥ 70% | 3 | Content engine is you writing graphs by hand. Project starves. |
| 5 | A campaign survives three sessions coherently | 4 | Ship one-shots only; drop the ledger. |

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

Mechanics derive from **SRD 5.1** under
[CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode). Attribution
in `packages/srd/ATTRIBUTION.md` and surfaced in-app.

Private tool, undistributed. If that changes: Phase 5 is deleted, all art
provenance gets documented, branding never says "Dungeons & Dragons," and the
whole licensing posture gets rebuilt before anything ships.

---

## Immediate next steps

1. ~~Phase 0~~ — closed, waived by decision.
2. ~~Bootstrap, push, CI~~ — done.
3. ~~`packages/schema`~~ — done, with engine/srd/linter/flint v1 (Phase 1 complete).
4. Phase 2 in flight: Saltmire + game loop + PWA surface.
