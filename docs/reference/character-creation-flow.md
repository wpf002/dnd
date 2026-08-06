# Character Creation Flow

The build decision tree. Drives the character-builder UI in `apps/web` and the
`Character` schema in `packages/schema`.

> **Roadmap note.** The Lantern cut list defers a full character creator until
> Phase 4 ("four pregens until Phase 4 at the earliest"). This document is the
> *specification* for that surface, captured now so the `Character` schema is
> shaped correctly from the start. The four SRD pregens in `packages/srd` are
> concrete instances of this tree, not a separate model.

---

```
START
  │
  ▼
🎭 CONCEPT
("Who am I?")
  ├─ Motivation (Justice | Power | Curiosity | Freedom | Chaos)
  ├─ Origin (City | Village | Temple | Wilderness | Underdark)
  └─ Role Fantasy (Warrior | Healer | Caster | Trickster | Leader)
  │
  ▼
🧬 RACE / LINEAGE
("What am I?")
  ├─ Human → versatile, adaptive
  ├─ Elf → agile, magical, long-lived
  ├─ Dwarf → tough, disciplined
  ├─ Halfling → lucky, stealthy
  ├─ Gnome → inventive, curious
  ├─ Half-Orc → fierce, resilient
  ├─ Tiefling → infernal, charismatic
  ├─ Dragonborn → proud, draconic
  ├─ Exotic → Aasimar | Tabaxi | Goliath | Warforged | etc.
  │
  ▼
⚔️ CLASS
("What do I do?")
  ├─ Barbarian → Rage-fueled warrior
  ├─ Bard → Charismatic performer
  ├─ Cleric → Divine agent
  ├─ Druid → Shapeshifting nature mage
  ├─ Fighter → Master of arms
  ├─ Monk → Martial artist
  ├─ Paladin → Holy knight
  ├─ Ranger → Hunter and scout
  ├─ Rogue → Stealth expert
  ├─ Sorcerer → Innate spellcaster
  ├─ Warlock → Pact-bound caster
  ├─ Wizard → Arcane scholar
  └─ Artificer → Magical engineer
  │
  ▼
🧩 SUBCLASS / PATH
("How do I specialize?")
  ├─ Choose 1 at Lv.2–3 based on Class
  ├─ Examples:
  │     • Barbarian → Totem Warrior / Wild Magic
  │     • Paladin → Oath of Vengeance / Devotion
  │     • Wizard → Evocation / Divination / Illusion
  │     • Warlock → Fiend / Great Old One / Hexblade
  │     • Rogue → Assassin / Arcane Trickster / Swashbuckler
  │
  ▼
📜 BACKGROUND
("What shaped me?")
  ├─ Acolyte → temple service
  ├─ Soldier → military training
  ├─ Sage → scholar or researcher
  ├─ Outlander → raised in wilderness
  ├─ Criminal → underworld contact
  ├─ Noble → family privilege
  └─ Custom → hybrid of any two
  │
  ▼
🎲 ABILITY SCORES
("What are my strengths?")
  ├─ Strength → physical power
  ├─ Dexterity → agility / reflexes
  ├─ Constitution → endurance
  ├─ Intelligence → logic / knowledge
  ├─ Wisdom → perception / insight
  └─ Charisma → presence / influence
  │
  ▼
🛡️ EQUIPMENT & GEAR
("What do I carry?")
  ├─ Weapon Proficiencies (from Class)
  ├─ Armor Type (Light / Medium / Heavy)
  ├─ Tools or Instruments (from Background)
  └─ Pack (Explorer / Dungeoneer / Scholar)
  │
  ▼
🔮 SPELLS (if applicable)
("What powers do I wield?")
  ├─ Arcane → Wizard / Sorcerer / Warlock
  ├─ Divine → Cleric / Paladin
  ├─ Primal → Druid / Ranger
  └─ Infused → Artificer
  │
  ▼
⚖️ ALIGNMENT
("What guides my choices?")
  ├─ Lawful Good – The noble hero
  ├─ Neutral Good – The helper
  ├─ Chaotic Good – The rebel
  ├─ Lawful Neutral – The disciplined
  ├─ True Neutral – The balanced
  ├─ Chaotic Neutral – The free spirit
  ├─ Lawful Evil – The tyrant
  ├─ Neutral Evil – The opportunist
  └─ Chaotic Evil – The destroyer
  │
  ▼
🌍 STORY CONNECTION
("Where do I fit in the world?")
  ├─ Faith or Deity
  ├─ Faction or Guild
  ├─ Nemesis or Ally
  ├─ Signature Relic
  └─ Personal Quest
  │
  ▼
🏁 FINALIZE CHARACTER SHEET
("Bring them to life!")
  ├─ Name / Age / Appearance
  ├─ Personality Traits / Flaws / Bonds
  ├─ Hit Points / AC / Equipment
  ├─ Spells / Features / Notes
  └─ Ready for Session 0
```

---

## Schema implications

Each stage maps to a field group on `Character`:

| Stage | Schema surface |
|---|---|
| Concept | `concept: { motivation, origin, roleFantasy }` — narrative only, no mechanics |
| Race / Lineage | `lineage` — carries ability adjustments, senses, speed, traits |
| Class | `class` — hit die, proficiencies, save proficiencies |
| Subclass | `subclass` — gated on `level >= subclassLevel` for the chosen class |
| Background | `background` — skill/tool proficiencies, starting equipment |
| Ability Scores | `abilities: Record<Ability, number>` — modifiers derived, never stored |
| Equipment | `inventory`, `equipped` |
| Spells | `spellcasting: { source, known, prepared, slots }` — absent for non-casters |
| Alignment | `alignment` — descriptive, carries no mechanical weight |
| Story Connection | `ties: { deity, faction, nemesis, relic, quest }` — Davis + ledger hooks |

Derived values (modifiers, proficiency bonus, AC, passive Perception, spell save
DC) are **computed by `@lantern/engine`, never persisted on the character**.
This keeps the engine the sole rules authority — invariant 1.

The "Story Connection" stage is the bridge into the Phase 4 ledger: `faction`
seeds `faction_clock` entries, `nemesis` and `deity` seed `npc_disposition`,
and `quest` seeds a `promise`.
