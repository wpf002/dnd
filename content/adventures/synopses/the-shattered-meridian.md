---
id: the-shattered-meridian
title: "The Shattered Meridian"
status: concept
role: planned-campaign
tone: [high-fantasy, temporal-mystery, political-conflict]
themes: [memory, destiny, identity, prophecy-vs-history, rewriting-the-past]
party-origin: strangers marked by Temporal Scars
central-mystery: thirty missing days
---

# The Shattered Meridian

> **Why this file exists.** Unlike Emberfall (finished) and Shattered Vale
> (running), this one exists only as a premise. That makes it the natural first
> the generator target: a premise sentence and a tone in, a linted `BeatGraph` out. If
> the generator can produce a playable Meridian one-shot, Phase 3's exit criteria are
> within reach.

## Synopsis

Long ago, an attempt to master time shattered reality itself. The resulting
cataclysm split the continent into two civilizations living out of sync with one
another: the Dawnbound Realms, which exist slightly ahead in time and shape
their society around prophecy and foresight, and the Duskhollow Dominion, which
lingers behind, preserving memory, history, and forgotten truths. Between them
lies the Meridian Scar, a vast temporal fracture where the laws of time no
longer behave predictably.

For centuries, an uneasy peace endured under the Treaty of Shadows, preventing
either side from exploiting its temporal advantage. That peace ends when time
itself comes to a halt for exactly one hour.

When the world begins moving again, thirty days have vanished.

Everyone remembers yesterday, but the calendar has advanced by an entire month.
Kingdoms have changed, people have died, cities have been altered, and political
alliances have shifted—but no one remembers how. It is as though an entire
chapter of history has been stolen.

The only people left with fragments of the truth are a handful of strangers—the
player characters. Each awakens marked by a mysterious Temporal Scar, haunted by
vivid visions from the missing month: battles they never fought, loved ones they
never met, betrayals they never committed, and futures that somehow already
happened.

As they investigate the impossible, they uncover a conspiracy reaching far
beyond a missing month. A secret organization known as the Chronosepters has
begun stealing pieces of time itself, led by the enigmatic Unmade Regent—a ruler
who once existed during the erased month but was written out of history when
time was stolen. Determined to reclaim a life the world has forgotten, the
Regent intends to replace reality with the lost timeline, regardless of the
cost.

To stop them, the heroes must cross fractured landscapes where time bends,
bargain in black markets that trade in stolen memories and forgotten days,
navigate the political conflict between prophecy and history, and ultimately
venture into the Absent Month—a hidden realm containing the thirty missing days
of history. There, they will confront alternate versions of themselves, uncover
the truth behind the world's greatest catastrophe, and decide whether history
should be restored, rewritten, or destroyed forever.

At its heart, The Shattered Meridian is a campaign about memory, destiny, and
identity. Every decision forces the characters to ask difficult questions: Is
the future something to be discovered or created? Are memories more important
than possibilities? And if you had the power to rewrite history, would you
preserve the world as it was—or build a better one, even if it meant erasing the
life you once knew?

## Structural elements

**The two civilizations** — Dawnbound Realms (ahead in time, prophecy-oriented)
and Duskhollow Dominion (behind in time, memory-oriented). Compendium Vol II
Part VIII, "Political Axes," applies directly: this is a *legitimacy* conflict
(prophecy vs. history) rather than a good/evil one.

**The Meridian Scar** — the borderland between them. Vol II Part VI,
"Borderlands," lists exactly what such a region generates: conflicting laws,
mixed cultures, smuggling, weak authority, competing maps.

**The Treaty of Shadows** — the collapsed status quo. The historical wound in
Vol II Part VII terms.

**The Chronosepters / the Unmade Regent** — the antagonist satisfies all four
Vol III Ch3 villain questions: wants to reclaim an erased life; believes the
erasure was the true injustice; cannot stop because he does not exist unless the
lost timeline is restored; would surrender only to proof the timeline cannot be
recovered.

**The Absent Month** — the sanctum, in Vol III Ch1's five-layer terms. It holds
the campaign's meaning, not merely its strongest enemy.

**The final choice** — restore, rewrite, or destroy history. Same three-branch
terminal shape as Emberfall's Ember's Heart.

---

## Engine notes

Inferred. This campaign is unwritten, so these are design constraints for
whoever (or whatever) writes it.

- **This is the generation benchmark candidate.** The premise reduces to a single
  sentence, which is exactly the Phase 3 input contract: tone, setting, length,
  party level, premise, content limits.
- **Party of strangers with shared Temporal Scars** solves the solo-play problem
  neatly — the scar is a per-character hook that justifies why *this* character
  is involved without requiring party cohesion backstory.
- **Time-bending landscapes** are a genuine schema stress test: if beats can
  only be traversed forward, a campaign about revisiting a stolen month will
  expose it. Worth building the `Edge` guard system against this case
  deliberately rather than discovering the limit later.
- **Confronting alternate versions of the party** requires the graph to
  reference character state from an earlier point. That is a ledger read, not a
  beat property — and it is the strongest argument in the corpus for the Phase 4
  ledger being structured and queryable rather than a transcript.
