---
id: the-shattered-vale
title: "The Shattered Vale"
status: in-progress
role: active-campaign
tone: [high-fantasy, moral-gray, divine-mystery]
themes: [memory-vs-history, faith-vs-truth, identity-vs-destiny, power-vs-humanity, resurrection-of-the-forgotten]
protagonist: Lucen Marr
party-level: 5
current-objective: Vhal Sereph — the Heart Fragment
---

# The Shattered Vale

> **Why this file exists.** This is the live campaign. Unlike Emberfall, it has
> no ending yet, which makes it the primary test case for the Phase 4 state
> ledger: an in-flight campaign with tracked relationships, a numeric corruption
> stat, three competing factions, and unresolved threads.

## Premise

The Shattered Vale is a high-fantasy campaign set in a world where the gods did
not die in battle—they were shattered when mortal faith fractured. Their
memories, personalities, and divine power were scattered across the land as
living relics known as Echoes.

The player takes the role of Lucen Marr, a Tiefling rogue whose life changes
after coming into possession of relic fragments belonging to Veyra, the
forgotten Goddess of Memory, Secrets, and Shadow.

What begins as a simple investigation into missing miners quickly becomes a race
to determine whether the gods should be restored… or allowed to remain forgotten
forever.

## Setting

The campaign takes place in The Shattered Vale, a land filled with:

* Ancient ruined temples
* Buried divine technology
* Living relics
* Warring factions
* Hidden gods whose memories refuse to die

At the center of the world stands the Hollowspire, a colossal broken tower that
once served as the meeting place of the gods. It now acts as the repository of
divine consciousness.

Whoever controls the Hollowspire controls reality itself.

## Main Character

**Lucen Marr**
Race: Tiefling (Echo-Touched)
Class: Phantom Rogue
Background: Urchin

Lucen survived on the streets of Greyhaven Crossing until he unknowingly stole a
divine relic.

Instead of becoming corrupted immediately, he became something almost unheard
of: A stable vessel capable of carrying multiple divine Echoes.

Throughout the campaign he evolves from thief… to relic hunter… to the living
archive of forgotten gods.

## Companions

**Seren Dorran** — Human Paladin
Originally a loyal member of the Dawnward Circle. Over time his unwavering faith
begins to crack as he discovers his order has hidden the truth about the gods.
He slowly becomes Lucen's moral compass.

**Tessa Quill** — Half-Elf Scholar / Wizard
A relic researcher fascinated by divine resonance. Initially she sees Lucen as a
research subject. Eventually she becomes one of his closest allies and the
campaign's intellectual center.

## Main Factions

**Dawnward Circle**
Officially dedicated to protecting humanity from relics. Secretly attempting to
rewrite divine history through controlled resurrection.

**Black Anvil Syndicate**
Weapons merchants and relic traffickers. They believe divine power should become
a commodity.

**Ashen Covenant**
Religious zealots. They seek the complete resurrection of the old gods
regardless of the cost.

## Major Story Events

### Chapter 1 — Echoes in the Dust

Lucen arrives in Greyhaven Crossing.
He investigates disappearing miners.
He discovers his first Shadowglass Fragment.
He kills Black Anvil smugglers transporting another fragment.
He infiltrates the Dawnward Circle.
He escapes after awakening Veyra's Echo.
He meets Elder Meren.

### Elder Meren

The final priest who still remembers Veyra.

He reveals:

* The gods shattered because humanity forgot them.
* Relics are fragments of divine memory.
* Lucen has become a Vessel.

He teaches Lucen how to temporarily stabilize his growing corruption.

### Party Formation

Lucen recruits:

* Seren
* Tessa

The three begin traveling east toward the Hollowspire.

### The Listening Vault

An ancient communication facility once used by the gods.

The party learns:

* Divine relics communicate through resonance.
* The Vaults were later turned into surveillance systems.
* The Dawnward Circle is monitoring relic activity.

Lucen communes directly with Veyra. He gains the Echo Mark.

### Aurelion's Gate

The party infiltrates the ruined divine archive beneath Aurelion's Gate.

There they discover: The gods stored living minds, not information.

Lucen chooses to accept the burden of the Mind Fragment despite being warned of
its curse. He escapes the collapsing Gate after using divine foresight to find a
hidden exit.

### The Null Shrine

Lucen nearly loses himself after carrying multiple Echoes.

At a forgotten shrine designed to silence divine influence he performs a ritual.
His Echo Resonance stabilizes. He regains control of himself without abandoning
the relics.

## Divine Relics Collected

**Shadowglass Fragment** — Echo of Veyra
Grants:

* Shadow manipulation
* Teleportation
* Memory resonance

**Mind Fragment** — Echo of Aurelion
Grants:

* Limited foresight
* Enhanced intellect
* Divine perception

## Echo Resonance Score (ERS)

ERS measures how deeply Lucen is fused with divine Echoes.

Higher ERS grants greater power.
Higher ERS also risks possession by the gods.

Lucen learned that ERS can be stabilized—but never permanently eliminated.

Current status:
**ERS: 5 (Stable)**

## Themes

The campaign explores:

* Memory versus history
* Faith versus truth
* Identity versus destiny
* Power versus humanity
* Whether forgotten things deserve resurrection

Unlike a traditional "good versus evil" campaign, nearly every major decision
exists in a moral gray area.

## Current Party

* Lucen Marr — Tiefling Phantom Rogue (Level 5)
* Seren Dorran — Human Paladin
* Tessa Quill — Half-Elf Wizard and relic scholar

## Current Objective

The party has survived Aurelion's Gate and stabilized Lucen's connection to the
divine Echoes.

Their next destination is the drowned city of Vhal Sereph, where the Heart
Fragment lies beneath the inland sea.

The Dawnward Circle, the Ashen Covenant, and the Black Anvil Syndicate are all
racing toward the same destination, each seeking to shape the fate of the
gods—and the world—in their own image.

The campaign has progressed from a local mystery into a continent-spanning
struggle over the future of creation itself.

---

## Playable graph

**[`content/adventures/the-shattered-vale.json`](../the-shattered-vale.json)** — linted, art-covered, and play-tested
end to end. The **next** chapter — Vhal Sereph and the Heart Fragment — picking up exactly where the live campaign stands (Lucen at level 5, ERS 5, stable). Echo Resonance is a real numeric flag the graph gates on.

Start it from the app's adventure picker, or:

```bash
curl -X POST localhost:3001/session -H 'content-type: application/json' -d '{"adventure":"the-shattered-vale"}'
```

---

## Engine notes

Inferred mappings, not source material.

- **Echo Resonance Score is a first-class ledger stat**, not flavor. It is a
  numeric `flag` with thresholds that gate content and carry a possession risk —
  the closest thing in the corpus to a mechanical resource the engine must own
  deterministically. generated graphs should be able to declare a
  campaign-scoped scalar like this.
- **Three factions racing to one location** is the reference case for Phase 4
  `faction_clock`: all three advance on session boundaries toward Vhal Sereph,
  and which arrives first must visibly change available content.
- **Seren's cracking faith** is a slow `npc_disposition` drift along a
  faith/doubt axis rather than a single flip — a harder ledger case than
  Varrin's turn in Emberfall, and a good stress test.
- **"Nearly every major decision exists in a moral gray area"** constrains beat
  authoring: options must not resolve to one correct choice plus decoys.
