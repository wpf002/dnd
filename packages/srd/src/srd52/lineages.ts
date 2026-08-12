/**
 * Species from SRD 5.2. GENERATED — do not edit by hand.
 *
 * Regenerate with: node tools/import-srd52.mjs
 *
 * This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the
 * Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 */

import type { LineageInput } from '../types.js';

export const SRD52_LINEAGES: Record<string, LineageInput> = {
  "dragonborn": {
    "id": "dragonborn",
    "name": "Dragonborn",
    "size": "medium",
    "speed": 30,
    "traits": [
      {
        "name": "Draconic Ancestry",
        "text": "Your lineage stems from a dragon progenitor. Choose the kind of dragon from the Draconic Ancestors table. Your choice affects your Breath Weapon and Damage Resistance traits as well as your appearance."
      },
      {
        "name": "Breath Weapon",
        "text": "When you take the Attack action on your turn, you can replace one of your attacks"
      },
      {
        "name": "Damage Resistance",
        "text": "You have Resistance to the damage type determined by your Draconic Ances- try trait."
      },
      {
        "name": "Darkvision",
        "text": "You have Darkvision with a range of 60 feet."
      },
      {
        "name": "Draconic Flight",
        "text": "When you reach character level 5, you can channel draconic magic to give yourself temporary flight. As a Bonus Action, you sprout spectral wings on your back that last for 10 minutes or until you retract the wings (no action required) or have the Incapacitated condition. During that time, you have a Fly Speed equal to your Speed. Your wings appear to be made of the same energy as your it. Breath W"
      }
    ]
  },
  "dwarf": {
    "id": "dwarf",
    "name": "Dwarf",
    "size": "medium",
    "speed": 30,
    "traits": [
      {
        "name": "Darkvision",
        "text": "You have Darkvision with a range of"
      },
      {
        "name": "Dwarven Resilience",
        "text": "You have Resistance to"
      },
      {
        "name": "Poison damage",
        "text": "You also have Advantage on sav- ing throws you make to avoid or end the Poisoned condition."
      },
      {
        "name": "Dwarven Toughness",
        "text": "Your Hit Point maximum increases by 1, and it increases by 1 again whenever you gain a level."
      },
      {
        "name": "Stonecunning",
        "text": "As a Bonus Action, you gain Trem- orsense with a range of 60 feet for 10 minutes. You must be on a stone surface or touching a stone sur- face to use this Tremorsense. The stone can be natu-"
      },
      {
        "name": "Darkvision",
        "text": "You have Darkvision with a range of 60 feet."
      },
      {
        "name": "Elven Lineage",
        "text": "You are part of a lineage that grants you supernatural abilities. Choose a lineage from the Elven Lineages table. You gain the level 1 benefit of that lineage. When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table."
      },
      {
        "name": "You always have that spell prepared",
        "text": "You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. You can also cast the spell using any spell slots you have of the appropriate level."
      }
    ]
  },
  "elf": {
    "id": "elf",
    "name": "Elf",
    "size": "medium",
    "speed": 30,
    "traits": [
      {
        "name": "Darkvision",
        "text": "You have Darkvision with a range of 60 feet."
      },
      {
        "name": "Elven Lineage",
        "text": "You are part of a lineage that grants you supernatural abilities. Choose a lineage from the Elven Lineages table. You gain the level 1 benefit of that lineage. When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table."
      },
      {
        "name": "You always have that spell prepared",
        "text": "You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. You can also cast the spell using any spell slots you have of the appropriate level."
      },
      {
        "name": "You also know the Dancing Lights cantrip",
        "text": "High Elf You know the Prestidigitation cantrip. Whenever you finish Detect Magic Misty Step a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list. Wood Elf Your Speed increases to 35 feet. You also know the Longstrider Pass without Trace"
      },
      {
        "name": "Druidcraft cantrip",
        "text": "Intelligence, Wisdom, or Charisma is your spell- effect whenever you or another creature takes a casting ability for the spells you cast with this trait Bonus Action to activate it with a touch. If the cho- (choose the ability when you select the lineage). sen effect has options within it, you choose one of"
      },
      {
        "name": "Fey Ancestry",
        "text": "You have Advantage on saving those options for the device when you create it. throws you make to avoid or end the Charmed For example, if you choose the spell’s ignite-extin- condition. guish effect, you determine whether the device"
      },
      {
        "name": "Keen Senses",
        "text": "You have proficiency in the Insight, ignites or extinguishes fire; the device doesn’t do Perception, or Survival skill. both. You can have three such devices in existence"
      },
      {
        "name": "Trance",
        "text": "You don’t need to sleep, and magic can’t at a time, and each falls apart 8 hours after its put you to sleep. You can finish a Long Rest in 4 creation or when you dismantle it with a touch as hours if you spend those hours in a trancelike medi- a Utilize action. tation, during which you retain consciousness. Goliath Gnome Creature Type: Humanoid Creature Type: Humanoid Size: Medium (about 7–8 feet "
      }
    ]
  },
  "goliath": {
    "id": "goliath",
    "name": "Goliath",
    "size": "small",
    "speed": 30,
    "traits": [
      {
        "name": "Darkvision",
        "text": "You have Darkvision with a range of Choose one of the following benefits—a supernatu- 60 feet. ral boon from your ancestry; you can use the chosen"
      },
      {
        "name": "Gnomish Cunning",
        "text": "You have Advantage on Intelli- benefit a number of times equal to your Proficiency gence, Wisdom, and Charisma saving throws. Bonus, and you regain all expended uses when you"
      },
      {
        "name": "Gnomish Lineage",
        "text": "You are part of a lineage that finish a Long Rest: grants you supernatural abilities. Choose one of the Cloud’s Jaunt (Cloud Giant). As a Bonus Action, you following options; whichever one you choose, Intel- magically teleport up to 30 feet to an unoccupied ligence, Wisdom, or Charisma is your spellcasting space you can see. ability for the spells you cast with this trait (choose Fire’s Burn (Fire"
      },
      {
        "name": "Forest Gnome",
        "text": "You know the Minor Illusion cantrip. also deal 1d10 Fire damage to that target. You also always have the Speak with Animals spell Frost’s Chill (Frost Giant). When you hit a target prepared. You can cast it without a spell slot a with an attack roll and deal damage to it, you number of times equal to your Proficiency Bonus, can also deal 1d6 Cold damage to that target and and you regain all expend"
      },
      {
        "name": "Rock Gnome",
        "text": "You know the Mending and Presti- or smaller creature with an attack roll and deal digitation cantrips. In addition, you can spend 10 damage to it, you can give that target the Prone minutes casting Prestidigitation to create a Tiny condition. clockwork device (AC 5, 1 HP), such as a toy, fire Stone’s Endurance (Stone Giant). When you take starter, or music box. When you create the device, damage, "
      },
      {
        "name": "Large Form",
        "text": "Starting at character level 5, you can"
      }
    ]
  },
  "halfling": {
    "id": "halfling",
    "name": "Halfling",
    "size": "small",
    "speed": 30,
    "traits": [
      {
        "name": "Brave",
        "text": "You have Advantage on saving throws you make to avoid or end the Frightened condition."
      },
      {
        "name": "Halfling Nimbleness",
        "text": "You can move through the"
      },
      {
        "name": "Luck",
        "text": "When you roll a 1 on the d20 of a D20 Test,"
      },
      {
        "name": "Naturally Stealthy",
        "text": "You can take the Hide action"
      },
      {
        "name": "Resourceful",
        "text": "You gain Heroic Inspiration when- ever you finish a Long Rest."
      },
      {
        "name": "Skillful",
        "text": "You gain proficiency in one skill of your choice."
      },
      {
        "name": "Versatile",
        "text": "You gain an Origin feat of your choice (see “Feats”). Skilled is recommended."
      },
      {
        "name": "You also know the Poison Spray cantrip",
        "text": "Chthonic You have Resistance to Necrotic damage."
      }
    ]
  },
  "human": {
    "id": "human",
    "name": "Human",
    "size": "medium",
    "speed": 30,
    "traits": [
      {
        "name": "Resourceful",
        "text": "You gain Heroic Inspiration when- ever you finish a Long Rest."
      },
      {
        "name": "Skillful",
        "text": "You gain proficiency in one skill of your choice."
      },
      {
        "name": "Versatile",
        "text": "You gain an Origin feat of your choice (see “Feats”). Skilled is recommended."
      },
      {
        "name": "You also know the Poison Spray cantrip",
        "text": "Chthonic You have Resistance to Necrotic damage."
      },
      {
        "name": "You also know the Chill Touch cantrip",
        "text": "Infernal You have Resistance to Fire damage."
      },
      {
        "name": "You also know the Fire Bolt cantrip",
        "text": "86 System Reference Document 5.2"
      },
      {
        "name": "Adrenaline Rush",
        "text": "You can take the Dash action as"
      },
      {
        "name": "Bonus",
        "text": "You can use this trait a number of times equal"
      }
    ]
  },
  "orc": {
    "id": "orc",
    "name": "Orc",
    "size": "medium",
    "speed": 30,
    "traits": [
      {
        "name": "Adrenaline Rush",
        "text": "You can take the Dash action as"
      },
      {
        "name": "Bonus",
        "text": "You can use this trait a number of times equal"
      },
      {
        "name": "Darkvision",
        "text": "You have Darkvision with a range of"
      },
      {
        "name": "Relentless Endurance",
        "text": "When you are reduced to"
      },
      {
        "name": "Darkvision",
        "text": "You have Darkvision with a range of"
      },
      {
        "name": "Fiendish Legacy",
        "text": "You are the recipient of a legacy"
      },
      {
        "name": "You always have that spell prepared",
        "text": "You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. You can also cast the spell using any spell slots you have of the appropriate level."
      }
    ]
  },
  "tiefling": {
    "id": "tiefling",
    "name": "Tiefling",
    "size": "medium",
    "speed": 30,
    "traits": [
      {
        "name": "Darkvision",
        "text": "You have Darkvision with a range of"
      },
      {
        "name": "Fiendish Legacy",
        "text": "You are the recipient of a legacy"
      },
      {
        "name": "You always have that spell prepared",
        "text": "You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. You can also cast the spell using any spell slots you have of the appropriate level."
      },
      {
        "name": "Otherworldly Presence",
        "text": "You know the Thauma- turgy cantrip. When you cast it with this trait, the spell uses the same spellcasting ability you use for your Fiendish Legacy trait."
      }
    ]
  }
} as unknown as Record<string, LineageInput>;
