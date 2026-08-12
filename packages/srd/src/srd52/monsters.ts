/**
 * Monsters from SRD 5.2. GENERATED — do not edit by hand.
 *
 * Regenerate with: node tools/import-srd52.mjs
 *
 * This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the
 * Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 */

import type { MonsterInput } from '../types.js';

export const SRD52_MONSTERS: Record<string, MonsterInput> = {
  "aboleth": {
    "id": "aboleth",
    "name": "Aboleth",
    "size": "large",
    "type": "aberration",
    "ac": 17,
    "hp": 150,
    "hitDice": "20d10+40",
    "speed": 10,
    "abilities": {
      "str": 21,
      "dex": 9,
      "con": 15,
      "int": 18,
      "wis": 15,
      "cha": 18
    },
    "cr": 10,
    "xp": 5900,
    "attacks": [
      {
        "name": "Tentacle",
        "toHit": 9,
        "reach": 15,
        "damage": "2d6+5",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 120 ft.; Passive Perception 20"
    ],
    "traits": []
  },
  "adult-black-dragon": {
    "id": "adult-black-dragon",
    "name": "Adult Black Dragon",
    "size": "huge",
    "type": "dragon",
    "ac": 19,
    "hp": 195,
    "hitDice": "17d12+85",
    "speed": 40,
    "abilities": {
      "str": 23,
      "dex": 14,
      "con": 21,
      "int": 14,
      "wis": 13,
      "cha": 19
    },
    "cr": 14,
    "xp": 11500,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 11,
        "reach": 10,
        "damage": "2d6+6",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "adult-blue-dragon": {
    "id": "adult-blue-dragon",
    "name": "Adult Blue Dragon",
    "size": "huge",
    "type": "dragon",
    "ac": 19,
    "hp": 212,
    "hitDice": "17d12+102",
    "speed": 40,
    "abilities": {
      "str": 25,
      "dex": 10,
      "con": 23,
      "int": 16,
      "wis": 15,
      "cha": 20
    },
    "cr": 16,
    "xp": 15000,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 12,
        "reach": 10,
        "damage": "2d8+7",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "adult-brass-dragon": {
    "id": "adult-brass-dragon",
    "name": "Adult Brass Dragon",
    "size": "huge",
    "type": "dragon",
    "ac": 18,
    "hp": 172,
    "hitDice": "15d12+75",
    "speed": 40,
    "abilities": {
      "str": 23,
      "dex": 10,
      "con": 21,
      "int": 14,
      "wis": 13,
      "cha": 17
    },
    "cr": 13,
    "xp": 10000,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 11,
        "reach": 10,
        "damage": "2d10+6",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "adult-bronze-dragon": {
    "id": "adult-bronze-dragon",
    "name": "Adult Bronze Dragon",
    "size": "huge",
    "type": "dragon",
    "ac": 18,
    "hp": 212,
    "hitDice": "17d12+102",
    "speed": 40,
    "abilities": {
      "str": 25,
      "dex": 10,
      "con": 23,
      "int": 16,
      "wis": 15,
      "cha": 20
    },
    "cr": 15,
    "xp": 13000,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 12,
        "reach": 10,
        "damage": "2d8+7",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "adult-copper-dragon": {
    "id": "adult-copper-dragon",
    "name": "Adult Copper Dragon",
    "size": "huge",
    "type": "dragon",
    "ac": 18,
    "hp": 184,
    "hitDice": "16d12+80",
    "speed": 40,
    "abilities": {
      "str": 23,
      "dex": 12,
      "con": 21,
      "int": 18,
      "wis": 15,
      "cha": 18
    },
    "cr": 14,
    "xp": 11500,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 11,
        "reach": 10,
        "damage": "2d10+6",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "adult-gold-dragon": {
    "id": "adult-gold-dragon",
    "name": "Adult Gold Dragon",
    "size": "huge",
    "type": "dragon",
    "ac": 19,
    "hp": 243,
    "hitDice": "18d12+126",
    "speed": 40,
    "abilities": {
      "str": 27,
      "dex": 14,
      "con": 25,
      "int": 16,
      "wis": 15,
      "cha": 24
    },
    "cr": 17,
    "xp": 18000,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 14,
        "reach": 10,
        "damage": "2d8+8",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "adult-green-dragon": {
    "id": "adult-green-dragon",
    "name": "Adult Green Dragon",
    "size": "huge",
    "type": "dragon",
    "ac": 19,
    "hp": 207,
    "hitDice": "18d12+90",
    "speed": 40,
    "abilities": {
      "str": 23,
      "dex": 12,
      "con": 21,
      "int": 18,
      "wis": 15,
      "cha": 18
    },
    "cr": 15,
    "xp": 13000,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 11,
        "reach": 10,
        "damage": "2d8+6",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "adult-red-dragon": {
    "id": "adult-red-dragon",
    "name": "Adult Red Dragon",
    "size": "huge",
    "type": "dragon",
    "ac": 19,
    "hp": 256,
    "hitDice": "19d12+133",
    "speed": 40,
    "abilities": {
      "str": 27,
      "dex": 10,
      "con": 25,
      "int": 16,
      "wis": 13,
      "cha": 23
    },
    "cr": 17,
    "xp": 18000,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 14,
        "reach": 10,
        "damage": "1d10+8",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "adult-silver-dragon": {
    "id": "adult-silver-dragon",
    "name": "Adult Silver Dragon",
    "size": "huge",
    "type": "dragon",
    "ac": 19,
    "hp": 216,
    "hitDice": "16d12+112",
    "speed": 40,
    "abilities": {
      "str": 27,
      "dex": 10,
      "con": 25,
      "int": 16,
      "wis": 13,
      "cha": 22
    },
    "cr": 16,
    "xp": 15000,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 13,
        "reach": 10,
        "damage": "2d8+8",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "air-elemental": {
    "id": "air-elemental",
    "name": "Air Elemental",
    "size": "large",
    "type": "elemental",
    "ac": 15,
    "hp": 90,
    "hitDice": "12d10+24",
    "speed": 10,
    "abilities": {
      "str": 14,
      "dex": 20,
      "con": 14,
      "int": 6,
      "wis": 10,
      "cha": 6
    },
    "cr": 5,
    "xp": 1800,
    "attacks": [
      {
        "name": "Thunderous Slam",
        "toHit": 8,
        "reach": 10,
        "damage": "2d8+5",
        "damageType": "thunder"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "allosaurus": {
    "id": "allosaurus",
    "name": "Allosaurus",
    "size": "large",
    "type": "beast",
    "ac": 13,
    "hp": 51,
    "hitDice": "6d10+18",
    "speed": 60,
    "abilities": {
      "str": 19,
      "dex": 13,
      "con": 17,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 6,
        "reach": 5,
        "damage": "2d10+4",
        "damageType": "piercing"
      },
      {
        "name": "Claws",
        "toHit": 6,
        "reach": 5,
        "damage": "1d8+4",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 15"
    ],
    "traits": []
  },
  "ancient-blue-dragon": {
    "id": "ancient-blue-dragon",
    "name": "Ancient Blue Dragon",
    "size": "gargantuan",
    "type": "dragon",
    "ac": 22,
    "hp": 481,
    "hitDice": "26d20+208",
    "speed": 40,
    "abilities": {
      "str": 29,
      "dex": 10,
      "con": 27,
      "int": 18,
      "wis": 17,
      "cha": 25
    },
    "cr": 23,
    "xp": 50000,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 16,
        "reach": 15,
        "damage": "2d8+9",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "ancient-brass-dragon": {
    "id": "ancient-brass-dragon",
    "name": "Ancient Brass Dragon",
    "size": "gargantuan",
    "type": "dragon",
    "ac": 20,
    "hp": 332,
    "hitDice": "19d20+133",
    "speed": 40,
    "abilities": {
      "str": 27,
      "dex": 10,
      "con": 25,
      "int": 16,
      "wis": 15,
      "cha": 22
    },
    "cr": 20,
    "xp": 25000,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 14,
        "reach": 15,
        "damage": "2d10+8",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "ancient-green-dragon": {
    "id": "ancient-green-dragon",
    "name": "Ancient Green Dragon",
    "size": "gargantuan",
    "type": "dragon",
    "ac": 21,
    "hp": 402,
    "hitDice": "23d20+161",
    "speed": 40,
    "abilities": {
      "str": 27,
      "dex": 12,
      "con": 25,
      "int": 20,
      "wis": 17,
      "cha": 22
    },
    "cr": 22,
    "xp": 41000,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 15,
        "reach": 15,
        "damage": "2d8+8",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "ancient-red-dragon": {
    "id": "ancient-red-dragon",
    "name": "Ancient Red Dragon",
    "size": "gargantuan",
    "type": "dragon",
    "ac": 22,
    "hp": 507,
    "hitDice": "26d20+234",
    "speed": 40,
    "abilities": {
      "str": 30,
      "dex": 10,
      "con": 29,
      "int": 18,
      "wis": 15,
      "cha": 27
    },
    "cr": 24,
    "xp": 62000,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 17,
        "reach": 15,
        "damage": "2d8+10",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "ancient-silver-dragon": {
    "id": "ancient-silver-dragon",
    "name": "Ancient Silver Dragon",
    "size": "gargantuan",
    "type": "dragon",
    "ac": 22,
    "hp": 468,
    "hitDice": "24d20+216",
    "speed": 40,
    "abilities": {
      "str": 30,
      "dex": 10,
      "con": 29,
      "int": 18,
      "wis": 15,
      "cha": 26
    },
    "cr": 23,
    "xp": 50000,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 17,
        "reach": 15,
        "damage": "2d8+10",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "ancient-white-dragon": {
    "id": "ancient-white-dragon",
    "name": "Ancient White Dragon",
    "size": "gargantuan",
    "type": "dragon",
    "ac": 20,
    "hp": 333,
    "hitDice": "18d20+144",
    "speed": 40,
    "abilities": {
      "str": 26,
      "dex": 10,
      "con": 26,
      "int": 10,
      "wis": 13,
      "cha": 18
    },
    "cr": 20,
    "xp": 25000,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 14,
        "reach": 15,
        "damage": "2d8+8",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "animated-armor": {
    "id": "animated-armor",
    "name": "Animated Armor",
    "size": "medium",
    "type": "construct",
    "ac": 18,
    "hp": 33,
    "hitDice": "6d8+6",
    "speed": 25,
    "abilities": {
      "str": 14,
      "dex": 11,
      "con": 13,
      "int": 1,
      "wis": 3,
      "cha": 1
    },
    "cr": 1,
    "xp": 200,
    "attacks": [
      {
        "name": "Slam",
        "toHit": 4,
        "reach": 5,
        "damage": "1d6+2",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft.; Passive Perception 6"
    ],
    "traits": []
  },
  "animated-rug-of-smothering": {
    "id": "animated-rug-of-smothering",
    "name": "Animated Rug of Smothering",
    "size": "large",
    "type": "construct",
    "ac": 12,
    "hp": 27,
    "hitDice": "5d10",
    "speed": 10,
    "abilities": {
      "str": 17,
      "dex": 14,
      "con": 10,
      "int": 1,
      "wis": 3,
      "cha": 1
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Smother",
        "toHit": 5,
        "reach": 5,
        "damage": "2d6+3",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft.; Passive Perception 6"
    ],
    "traits": []
  },
  "ankylosaurus": {
    "id": "ankylosaurus",
    "name": "Ankylosaurus",
    "size": "huge",
    "type": "beast",
    "ac": 15,
    "hp": 68,
    "hitDice": "8d12+16",
    "speed": 30,
    "abilities": {
      "str": 19,
      "dex": 11,
      "con": 15,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "cr": 3,
    "xp": 700,
    "attacks": [
      {
        "name": "Tail",
        "toHit": 6,
        "reach": 10,
        "damage": "1d10+4",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 11"
    ],
    "traits": []
  },
  "ape": {
    "id": "ape",
    "name": "Ape",
    "size": "medium",
    "type": "beast",
    "ac": 12,
    "hp": 19,
    "hitDice": "3d8+6",
    "speed": 30,
    "abilities": {
      "str": 16,
      "dex": 14,
      "con": 14,
      "int": 6,
      "wis": 12,
      "cha": 7
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Fist",
        "toHit": 5,
        "reach": 5,
        "damage": "1d4+3",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 13"
    ],
    "traits": []
  },
  "awakened-shrub": {
    "id": "awakened-shrub",
    "name": "Awakened Shrub",
    "size": "small",
    "type": "plant",
    "ac": 9,
    "hp": 10,
    "hitDice": "3d6",
    "speed": 20,
    "abilities": {
      "str": 3,
      "dex": 8,
      "con": 11,
      "int": 10,
      "wis": 10,
      "cha": 6
    },
    "cr": 0,
    "xp": 10,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 10"
    ],
    "traits": []
  },
  "awakened-tree": {
    "id": "awakened-tree",
    "name": "Awakened Tree",
    "size": "huge",
    "type": "plant",
    "ac": 13,
    "hp": 59,
    "hitDice": "7d12+14",
    "speed": 20,
    "abilities": {
      "str": 19,
      "dex": 6,
      "con": 15,
      "int": 10,
      "wis": 10,
      "cha": 7
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Slam",
        "toHit": 6,
        "reach": 10,
        "damage": "3d6+4",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 10"
    ],
    "traits": []
  },
  "axe-beak": {
    "id": "axe-beak",
    "name": "Axe Beak",
    "size": "large",
    "type": "monstrosity",
    "ac": 11,
    "hp": 19,
    "hitDice": "3d10+3",
    "speed": 50,
    "abilities": {
      "str": 14,
      "dex": 12,
      "con": 12,
      "int": 2,
      "wis": 10,
      "cha": 5
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Beak",
        "toHit": 4,
        "reach": 5,
        "damage": "1d8+2",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 10"
    ],
    "traits": []
  },
  "azer-sentinel": {
    "id": "azer-sentinel",
    "name": "Azer Sentinel",
    "size": "medium",
    "type": "elemental",
    "ac": 17,
    "hp": 39,
    "hitDice": "6d8+12",
    "speed": 30,
    "abilities": {
      "str": 17,
      "dex": 12,
      "con": 15,
      "int": 12,
      "wis": 13,
      "cha": 10
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Burning Hammer",
        "toHit": 5,
        "reach": 5,
        "damage": "1d10+3",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 11"
    ],
    "traits": []
  },
  "baboon": {
    "id": "baboon",
    "name": "Baboon",
    "size": "small",
    "type": "beast",
    "ac": 12,
    "hp": 3,
    "hitDice": "1d6",
    "speed": 30,
    "abilities": {
      "str": 8,
      "dex": 14,
      "con": 11,
      "int": 4,
      "wis": 12,
      "cha": 6
    },
    "cr": 0,
    "xp": 10,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 1,
        "reach": 5,
        "damage": "1d4",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 11"
    ],
    "traits": []
  },
  "badger": {
    "id": "badger",
    "name": "Badger",
    "size": "tiny",
    "type": "beast",
    "ac": 11,
    "hp": 5,
    "hitDice": "1d4+3",
    "speed": 20,
    "abilities": {
      "str": 10,
      "dex": 11,
      "con": 16,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "cr": 0,
    "xp": 10,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 30 ft.; Passive Perception 13"
    ],
    "traits": []
  },
  "balor": {
    "id": "balor",
    "name": "Balor",
    "size": "huge",
    "type": "fiend",
    "ac": 19,
    "hp": 287,
    "hitDice": "23d12+138",
    "speed": 40,
    "abilities": {
      "str": 26,
      "dex": 15,
      "con": 22,
      "int": 20,
      "wis": 16,
      "cha": 22
    },
    "cr": 19,
    "xp": 22000,
    "attacks": [
      {
        "name": "Flame Whip",
        "toHit": 14,
        "reach": 30,
        "damage": "3d6+8",
        "damageType": "force"
      },
      {
        "name": "Lightning Blade",
        "toHit": 14,
        "reach": 10,
        "damage": "3d8+8",
        "damageType": "force"
      },
      {
        "name": "Scimitar",
        "toHit": 3,
        "reach": 5,
        "damage": "1d6+1",
        "damageType": "slashing"
      },
      {
        "name": "Scimitar",
        "toHit": 5,
        "reach": 5,
        "damage": "1d6+3",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Truesight 120 ft.; Passive Perception 19"
    ],
    "traits": []
  },
  "barbed-devil": {
    "id": "barbed-devil",
    "name": "Barbed Devil",
    "size": "medium",
    "type": "fiend",
    "ac": 15,
    "hp": 110,
    "hitDice": "13d8+52",
    "speed": 30,
    "abilities": {
      "str": 16,
      "dex": 17,
      "con": 18,
      "int": 12,
      "wis": 14,
      "cha": 14
    },
    "cr": 5,
    "xp": 1800,
    "attacks": [
      {
        "name": "Claws",
        "toHit": 6,
        "reach": 5,
        "damage": "2d6+3",
        "damageType": "piercing"
      },
      {
        "name": "Tail",
        "toHit": 6,
        "reach": 10,
        "damage": "2d10+3",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 120 ft. (unimpeded by magical"
    ],
    "traits": []
  },
  "basilisk": {
    "id": "basilisk",
    "name": "Basilisk",
    "size": "medium",
    "type": "monstrosity",
    "ac": 15,
    "hp": 52,
    "hitDice": "8d8+16",
    "speed": 20,
    "abilities": {
      "str": 16,
      "dex": 8,
      "con": 15,
      "int": 2,
      "wis": 8,
      "cha": 7
    },
    "cr": 3,
    "xp": 700,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 5,
        "reach": 5,
        "damage": "2d6+3",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 9"
    ],
    "traits": []
  },
  "bat": {
    "id": "bat",
    "name": "Bat",
    "size": "tiny",
    "type": "beast",
    "ac": 12,
    "hp": 1,
    "hitDice": "1d4",
    "speed": 5,
    "abilities": {
      "str": 2,
      "dex": 15,
      "con": 8,
      "int": 2,
      "wis": 12,
      "cha": 4
    },
    "cr": 0,
    "xp": 10,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft.; Passive Perception 11"
    ],
    "traits": []
  },
  "bearded-devil": {
    "id": "bearded-devil",
    "name": "Bearded Devil",
    "size": "medium",
    "type": "fiend",
    "ac": 13,
    "hp": 58,
    "hitDice": "9d8+18",
    "speed": 30,
    "abilities": {
      "str": 16,
      "dex": 15,
      "con": 15,
      "int": 9,
      "wis": 11,
      "cha": 14
    },
    "cr": 3,
    "xp": 700,
    "attacks": [
      {
        "name": "Beard",
        "toHit": 5,
        "reach": 5,
        "damage": "1d8+3",
        "damageType": "piercing"
      },
      {
        "name": "Infernal Glaive",
        "toHit": 5,
        "reach": 10,
        "damage": "1d10+3",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 120 ft. (unimpeded by magical"
    ],
    "traits": []
  },
  "black-dragon-wyrmling": {
    "id": "black-dragon-wyrmling",
    "name": "Black Dragon Wyrmling",
    "size": "medium",
    "type": "dragon",
    "ac": 17,
    "hp": 33,
    "hitDice": "6d8+6",
    "speed": 30,
    "abilities": {
      "str": 15,
      "dex": 14,
      "con": 13,
      "int": 10,
      "wis": 11,
      "cha": 13
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 4,
        "reach": 5,
        "damage": "1d6+2",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 10 ft., Darkvision 60 ft.;"
    ],
    "traits": []
  },
  "black-pudding": {
    "id": "black-pudding",
    "name": "Black Pudding",
    "size": "large",
    "type": "ooze",
    "ac": 7,
    "hp": 68,
    "hitDice": "8d10+24",
    "speed": 20,
    "abilities": {
      "str": 16,
      "dex": 5,
      "con": 16,
      "int": 1,
      "wis": 6,
      "cha": 1
    },
    "cr": 4,
    "xp": 1100,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft.; Passive Perception 8"
    ],
    "traits": []
  },
  "blink-dog": {
    "id": "blink-dog",
    "name": "Blink Dog",
    "size": "medium",
    "type": "fey",
    "ac": 13,
    "hp": 22,
    "hitDice": "4d8+4",
    "speed": 40,
    "abilities": {
      "str": 12,
      "dex": 17,
      "con": 12,
      "int": 10,
      "wis": 13,
      "cha": 11
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 5,
        "reach": 5,
        "damage": "1d4+3",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 15"
    ],
    "traits": []
  },
  "blood-hawk": {
    "id": "blood-hawk",
    "name": "Blood Hawk",
    "size": "small",
    "type": "beast",
    "ac": 12,
    "hp": 7,
    "hitDice": "2d6",
    "speed": 10,
    "abilities": {
      "str": 6,
      "dex": 14,
      "con": 10,
      "int": 3,
      "wis": 14,
      "cha": 5
    },
    "cr": 0.125,
    "xp": 25,
    "attacks": [
      {
        "name": "Beak",
        "toHit": 4,
        "reach": 5,
        "damage": "1d4+2",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 16"
    ],
    "traits": []
  },
  "blue-dragon-wyrmling": {
    "id": "blue-dragon-wyrmling",
    "name": "Blue Dragon Wyrmling",
    "size": "medium",
    "type": "dragon",
    "ac": 17,
    "hp": 65,
    "hitDice": "10d8+20",
    "speed": 30,
    "abilities": {
      "str": 17,
      "dex": 10,
      "con": 15,
      "int": 12,
      "wis": 11,
      "cha": 15
    },
    "cr": 3,
    "xp": 700,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 5,
        "reach": 5,
        "damage": "1d10+3",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 10 ft., Darkvision 60 ft.;"
    ],
    "traits": []
  },
  "boar": {
    "id": "boar",
    "name": "Boar",
    "size": "medium",
    "type": "beast",
    "ac": 11,
    "hp": 13,
    "hitDice": "2d8+4",
    "speed": 40,
    "abilities": {
      "str": 13,
      "dex": 11,
      "con": 14,
      "int": 2,
      "wis": 9,
      "cha": 5
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Gore",
        "toHit": 3,
        "reach": 5,
        "damage": "1d6+1",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 9"
    ],
    "traits": []
  },
  "brown-bear": {
    "id": "brown-bear",
    "name": "Brown Bear",
    "size": "large",
    "type": "beast",
    "ac": 11,
    "hp": 22,
    "hitDice": "3d10+6",
    "speed": 40,
    "abilities": {
      "str": 17,
      "dex": 12,
      "con": 15,
      "int": 2,
      "wis": 13,
      "cha": 7
    },
    "cr": 1,
    "xp": 200,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 5,
        "reach": 5,
        "damage": "1d8+3",
        "damageType": "piercing"
      },
      {
        "name": "Claw",
        "toHit": 5,
        "reach": 5,
        "damage": "1d4+3",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 13"
    ],
    "traits": []
  },
  "bugbear-stalker": {
    "id": "bugbear-stalker",
    "name": "Bugbear Stalker",
    "size": "medium",
    "type": "fey",
    "ac": 15,
    "hp": 65,
    "hitDice": "10d8+20",
    "speed": 30,
    "abilities": {
      "str": 17,
      "dex": 14,
      "con": 14,
      "int": 11,
      "wis": 12,
      "cha": 11
    },
    "cr": 3,
    "xp": 700,
    "attacks": [
      {
        "name": "Morningstar",
        "toHit": 5,
        "reach": 10,
        "damage": "2d8+3",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 11"
    ],
    "traits": []
  },
  "bulette": {
    "id": "bulette",
    "name": "Bulette",
    "size": "large",
    "type": "monstrosity",
    "ac": 17,
    "hp": 94,
    "hitDice": "9d10+45",
    "speed": 40,
    "abilities": {
      "str": 19,
      "dex": 11,
      "con": 21,
      "int": 2,
      "wis": 10,
      "cha": 5
    },
    "cr": 5,
    "xp": 1800,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 7,
        "reach": 5,
        "damage": "2d12+4",
        "damageType": "piercing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft., Tremorsense 120 ft.;"
    ],
    "traits": []
  },
  "camel": {
    "id": "camel",
    "name": "Camel",
    "size": "large",
    "type": "beast",
    "ac": 10,
    "hp": 17,
    "hitDice": "2d10+6",
    "speed": 50,
    "abilities": {
      "str": 15,
      "dex": 8,
      "con": 17,
      "int": 2,
      "wis": 11,
      "cha": 5
    },
    "cr": 0.125,
    "xp": 25,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 4,
        "reach": 5,
        "damage": "1d4+2",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "cat": {
    "id": "cat",
    "name": "Cat",
    "size": "tiny",
    "type": "beast",
    "ac": 12,
    "hp": 2,
    "hitDice": "1d4",
    "speed": 40,
    "abilities": {
      "str": 3,
      "dex": 15,
      "con": 10,
      "int": 3,
      "wis": 12,
      "cha": 7
    },
    "cr": 0,
    "xp": 10,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 13"
    ],
    "traits": []
  },
  "centaur-trooper": {
    "id": "centaur-trooper",
    "name": "Centaur Trooper",
    "size": "large",
    "type": "fey",
    "ac": 16,
    "hp": 45,
    "hitDice": "6d10+12",
    "speed": 50,
    "abilities": {
      "str": 18,
      "dex": 14,
      "con": 14,
      "int": 9,
      "wis": 13,
      "cha": 11
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Pike",
        "toHit": 6,
        "reach": 10,
        "damage": "1d10+4",
        "damageType": "piercing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 13"
    ],
    "traits": []
  },
  "chain-devil": {
    "id": "chain-devil",
    "name": "Chain Devil",
    "size": "medium",
    "type": "fiend",
    "ac": 15,
    "hp": 85,
    "hitDice": "10d8+40",
    "speed": 30,
    "abilities": {
      "str": 18,
      "dex": 15,
      "con": 18,
      "int": 11,
      "wis": 12,
      "cha": 14
    },
    "cr": 8,
    "xp": 3900,
    "attacks": [
      {
        "name": "Chain",
        "toHit": 7,
        "reach": 10,
        "damage": "2d6+4",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 120 ft. (unimpeded by magical"
    ],
    "traits": []
  },
  "chimera": {
    "id": "chimera",
    "name": "Chimera",
    "size": "large",
    "type": "monstrosity",
    "ac": 14,
    "hp": 114,
    "hitDice": "12d10+48",
    "speed": 30,
    "abilities": {
      "str": 19,
      "dex": 11,
      "con": 19,
      "int": 3,
      "wis": 14,
      "cha": 10
    },
    "cr": 6,
    "xp": 2300,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 7,
        "reach": 5,
        "damage": "2d6+4",
        "damageType": "piercing"
      },
      {
        "name": "Claw",
        "toHit": 7,
        "reach": 5,
        "damage": "1d6+4",
        "damageType": "slashing"
      },
      {
        "name": "Ram",
        "toHit": 7,
        "reach": 5,
        "damage": "1d12+4",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 18"
    ],
    "traits": []
  },
  "clay-golem": {
    "id": "clay-golem",
    "name": "Clay Golem",
    "size": "large",
    "type": "construct",
    "ac": 14,
    "hp": 123,
    "hitDice": "13d10+52",
    "speed": 30,
    "abilities": {
      "str": 20,
      "dex": 9,
      "con": 18,
      "int": 3,
      "wis": 8,
      "cha": 1
    },
    "cr": 9,
    "xp": 5000,
    "attacks": [
      {
        "name": "Slam",
        "toHit": 9,
        "reach": 5,
        "damage": "1d10+5",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 9"
    ],
    "traits": []
  },
  "cloud-giant": {
    "id": "cloud-giant",
    "name": "Cloud Giant",
    "size": "huge",
    "type": "giant",
    "ac": 14,
    "hp": 200,
    "hitDice": "16d12+96",
    "speed": 40,
    "abilities": {
      "str": 27,
      "dex": 10,
      "con": 22,
      "int": 12,
      "wis": 16,
      "cha": 16
    },
    "cr": 9,
    "xp": 5000,
    "attacks": [
      {
        "name": "Thunderous Mace",
        "toHit": 12,
        "reach": 10,
        "damage": "3d8+8",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 21"
    ],
    "traits": []
  },
  "cockatrice": {
    "id": "cockatrice",
    "name": "Cockatrice",
    "size": "small",
    "type": "monstrosity",
    "ac": 11,
    "hp": 22,
    "hitDice": "5d6+5",
    "speed": 20,
    "abilities": {
      "str": 6,
      "dex": 12,
      "con": 12,
      "int": 2,
      "wis": 13,
      "cha": 5
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Petrifying Bite",
        "toHit": 3,
        "reach": 5,
        "damage": "1d4+1",
        "damageType": "piercing"
      },
      {
        "name": "Club",
        "toHit": 2,
        "reach": 5,
        "damage": "1d4",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 11"
    ],
    "traits": []
  },
  "constrictor-snake": {
    "id": "constrictor-snake",
    "name": "Constrictor Snake",
    "size": "large",
    "type": "beast",
    "ac": 13,
    "hp": 13,
    "hitDice": "2d10+2",
    "speed": 30,
    "abilities": {
      "str": 15,
      "dex": 14,
      "con": 12,
      "int": 1,
      "wis": 10,
      "cha": 3
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 4,
        "reach": 5,
        "damage": "1d8+2",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 10 ft.; Passive Perception 12"
    ],
    "traits": []
  },
  "crab": {
    "id": "crab",
    "name": "Crab",
    "size": "tiny",
    "type": "beast",
    "ac": 11,
    "hp": 3,
    "hitDice": "1d4+1",
    "speed": 20,
    "abilities": {
      "str": 6,
      "dex": 11,
      "con": 12,
      "int": 1,
      "wis": 8,
      "cha": 2
    },
    "cr": 0,
    "xp": 10,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 30 ft.; Passive Perception 9"
    ],
    "traits": []
  },
  "crocodile": {
    "id": "crocodile",
    "name": "Crocodile",
    "size": "large",
    "type": "beast",
    "ac": 12,
    "hp": 13,
    "hitDice": "2d10+2",
    "speed": 20,
    "abilities": {
      "str": 15,
      "dex": 10,
      "con": 13,
      "int": 2,
      "wis": 10,
      "cha": 5
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 4,
        "reach": 5,
        "damage": "1d8+2",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 10"
    ],
    "traits": []
  },
  "darkmantle": {
    "id": "darkmantle",
    "name": "Darkmantle",
    "size": "small",
    "type": "aberration",
    "ac": 11,
    "hp": 22,
    "hitDice": "5d6+5",
    "speed": 10,
    "abilities": {
      "str": 16,
      "dex": 12,
      "con": 13,
      "int": 2,
      "wis": 10,
      "cha": 5
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Crush",
        "toHit": 5,
        "reach": 5,
        "damage": "1d6+3",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "death-dog": {
    "id": "death-dog",
    "name": "Death Dog",
    "size": "medium",
    "type": "monstrosity",
    "ac": 12,
    "hp": 39,
    "hitDice": "6d8+12",
    "speed": 40,
    "abilities": {
      "str": 15,
      "dex": 14,
      "con": 14,
      "int": 3,
      "wis": 13,
      "cha": 6
    },
    "cr": 1,
    "xp": 200,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 4,
        "reach": 5,
        "damage": "1d4+2",
        "damageType": "piercing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 120 ft.; Passive Perception 15"
    ],
    "traits": []
  },
  "deer": {
    "id": "deer",
    "name": "Deer",
    "size": "medium",
    "type": "beast",
    "ac": 13,
    "hp": 4,
    "hitDice": "1d8",
    "speed": 50,
    "abilities": {
      "str": 11,
      "dex": 16,
      "con": 11,
      "int": 2,
      "wis": 14,
      "cha": 5
    },
    "cr": 0,
    "xp": 10,
    "attacks": [
      {
        "name": "Ram",
        "toHit": 2,
        "reach": 5,
        "damage": "1d4",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 14"
    ],
    "traits": []
  },
  "deva": {
    "id": "deva",
    "name": "Deva",
    "size": "medium",
    "type": "celestial",
    "ac": 17,
    "hp": 229,
    "hitDice": "27d8+108",
    "speed": 30,
    "abilities": {
      "str": 18,
      "dex": 18,
      "con": 18,
      "int": 17,
      "wis": 20,
      "cha": 20
    },
    "cr": 10,
    "xp": 5900,
    "attacks": [
      {
        "name": "Holy Mace",
        "toHit": 8,
        "reach": 5,
        "damage": "1d6+4",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 120 ft.; Passive Perception 19"
    ],
    "traits": []
  },
  "dire-wolf": {
    "id": "dire-wolf",
    "name": "Dire Wolf",
    "size": "large",
    "type": "beast",
    "ac": 14,
    "hp": 22,
    "hitDice": "3d10+6",
    "speed": 50,
    "abilities": {
      "str": 17,
      "dex": 15,
      "con": 15,
      "int": 3,
      "wis": 12,
      "cha": 7
    },
    "cr": 1,
    "xp": 200,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 5,
        "reach": 5,
        "damage": "1d10+3",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 15"
    ],
    "traits": []
  },
  "djinni": {
    "id": "djinni",
    "name": "Djinni",
    "size": "large",
    "type": "elemental",
    "ac": 17,
    "hp": 218,
    "hitDice": "19d10+114",
    "speed": 30,
    "abilities": {
      "str": 21,
      "dex": 15,
      "con": 22,
      "int": 15,
      "wis": 16,
      "cha": 20
    },
    "cr": 11,
    "xp": 7200,
    "attacks": [],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 120 ft.; Passive Perception 13"
    ],
    "traits": []
  },
  "doppelganger": {
    "id": "doppelganger",
    "name": "Doppelganger",
    "size": "medium",
    "type": "monstrosity",
    "ac": 14,
    "hp": 52,
    "hitDice": "8d8+16",
    "speed": 30,
    "abilities": {
      "str": 11,
      "dex": 18,
      "con": 14,
      "int": 11,
      "wis": 12,
      "cha": 14
    },
    "cr": 3,
    "xp": 700,
    "attacks": [
      {
        "name": "Slam",
        "toHit": 6,
        "reach": 5,
        "damage": "2d6+4",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 11"
    ],
    "traits": []
  },
  "draft-horse": {
    "id": "draft-horse",
    "name": "Draft Horse",
    "size": "large",
    "type": "beast",
    "ac": 10,
    "hp": 15,
    "hitDice": "2d10+4",
    "speed": 40,
    "abilities": {
      "str": 18,
      "dex": 10,
      "con": 15,
      "int": 2,
      "wis": 11,
      "cha": 7
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Hooves",
        "toHit": 6,
        "reach": 5,
        "damage": "1d4+4",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 10"
    ],
    "traits": []
  },
  "dragon-turtle": {
    "id": "dragon-turtle",
    "name": "Dragon Turtle",
    "size": "gargantuan",
    "type": "dragon",
    "ac": 20,
    "hp": 356,
    "hitDice": "23d20+115",
    "speed": 20,
    "abilities": {
      "str": 25,
      "dex": 10,
      "con": 20,
      "int": 10,
      "wis": 12,
      "cha": 12
    },
    "cr": 17,
    "xp": 18000,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 13,
        "reach": 15,
        "damage": "3d10+7",
        "damageType": "piercing"
      },
      {
        "name": "Tail",
        "toHit": 13,
        "reach": 15,
        "damage": "2d10+7",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 120 ft.; Passive Perception 11"
    ],
    "traits": []
  },
  "dretch": {
    "id": "dretch",
    "name": "Dretch",
    "size": "small",
    "type": "fiend",
    "ac": 11,
    "hp": 18,
    "hitDice": "4d6+4",
    "speed": 20,
    "abilities": {
      "str": 12,
      "dex": 11,
      "con": 12,
      "int": 5,
      "wis": 8,
      "cha": 3
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 3,
        "reach": 5,
        "damage": "1d6+1",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 9"
    ],
    "traits": []
  },
  "drider": {
    "id": "drider",
    "name": "Drider",
    "size": "large",
    "type": "monstrosity",
    "ac": 19,
    "hp": 123,
    "hitDice": "13d10+52",
    "speed": 30,
    "abilities": {
      "str": 16,
      "dex": 19,
      "con": 18,
      "int": 13,
      "wis": 16,
      "cha": 12
    },
    "cr": 6,
    "xp": 2300,
    "attacks": [
      {
        "name": "Foreleg",
        "toHit": 7,
        "reach": 10,
        "damage": "2d8+4",
        "damageType": "piercing"
      },
      {
        "name": "Vine Staff",
        "toHit": 5,
        "reach": 5,
        "damage": "1d8+3",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 120 ft.; Passive Perception 16"
    ],
    "traits": []
  },
  "dryad": {
    "id": "dryad",
    "name": "Dryad",
    "size": "medium",
    "type": "fey",
    "ac": 16,
    "hp": 22,
    "hitDice": "5d8",
    "speed": 30,
    "abilities": {
      "str": 10,
      "dex": 12,
      "con": 11,
      "int": 14,
      "wis": 15,
      "cha": 18
    },
    "cr": 1,
    "xp": 200,
    "attacks": [
      {
        "name": "Vine Lash",
        "toHit": 6,
        "reach": 10,
        "damage": "1d8+4",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 14"
    ],
    "traits": []
  },
  "dust-mephit": {
    "id": "dust-mephit",
    "name": "Dust Mephit",
    "size": "small",
    "type": "elemental",
    "ac": 12,
    "hp": 17,
    "hitDice": "5d6",
    "speed": 30,
    "abilities": {
      "str": 5,
      "dex": 14,
      "con": 10,
      "int": 9,
      "wis": 11,
      "cha": 10
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Claw",
        "toHit": 4,
        "reach": 5,
        "damage": "1d4+2",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 12"
    ],
    "traits": []
  },
  "eagle": {
    "id": "eagle",
    "name": "Eagle",
    "size": "small",
    "type": "beast",
    "ac": 12,
    "hp": 4,
    "hitDice": "1d6+1",
    "speed": 10,
    "abilities": {
      "str": 6,
      "dex": 15,
      "con": 12,
      "int": 2,
      "wis": 14,
      "cha": 7
    },
    "cr": 0,
    "xp": 10,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 16"
    ],
    "traits": []
  },
  "earth-elemental": {
    "id": "earth-elemental",
    "name": "Earth Elemental",
    "size": "large",
    "type": "elemental",
    "ac": 17,
    "hp": 147,
    "hitDice": "14d10+70",
    "speed": 30,
    "abilities": {
      "str": 20,
      "dex": 8,
      "con": 20,
      "int": 5,
      "wis": 10,
      "cha": 5
    },
    "cr": 5,
    "xp": 1800,
    "attacks": [
      {
        "name": "Slam",
        "toHit": 8,
        "reach": 10,
        "damage": "2d8+5",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft., Tremorsense 60 ft.;"
    ],
    "traits": []
  },
  "efreeti": {
    "id": "efreeti",
    "name": "Efreeti",
    "size": "large",
    "type": "elemental",
    "ac": 17,
    "hp": 212,
    "hitDice": "17d10+119",
    "speed": 40,
    "abilities": {
      "str": 22,
      "dex": 12,
      "con": 24,
      "int": 16,
      "wis": 15,
      "cha": 19
    },
    "cr": 11,
    "xp": 7200,
    "attacks": [
      {
        "name": "Heated Blade",
        "toHit": 10,
        "reach": 5,
        "damage": "2d6+6",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 120 ft.; Passive Perception 12"
    ],
    "traits": []
  },
  "elephant": {
    "id": "elephant",
    "name": "Elephant",
    "size": "huge",
    "type": "beast",
    "ac": 12,
    "hp": 76,
    "hitDice": "8d12+24",
    "speed": 40,
    "abilities": {
      "str": 22,
      "dex": 9,
      "con": 17,
      "int": 3,
      "wis": 11,
      "cha": 6
    },
    "cr": 4,
    "xp": 1100,
    "attacks": [
      {
        "name": "Gore",
        "toHit": 8,
        "reach": 5,
        "damage": "2d8+6",
        "damageType": "piercing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 10"
    ],
    "traits": []
  },
  "elk": {
    "id": "elk",
    "name": "Elk",
    "size": "large",
    "type": "beast",
    "ac": 10,
    "hp": 11,
    "hitDice": "2d10",
    "speed": 50,
    "abilities": {
      "str": 16,
      "dex": 10,
      "con": 11,
      "int": 2,
      "wis": 10,
      "cha": 6
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Ram",
        "toHit": 5,
        "reach": 5,
        "damage": "1d6+3",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 12"
    ],
    "traits": []
  },
  "erinyes": {
    "id": "erinyes",
    "name": "Erinyes",
    "size": "medium",
    "type": "fiend",
    "ac": 18,
    "hp": 178,
    "hitDice": "21d8+84",
    "speed": 30,
    "abilities": {
      "str": 18,
      "dex": 16,
      "con": 18,
      "int": 14,
      "wis": 14,
      "cha": 18
    },
    "cr": 12,
    "xp": 8400,
    "attacks": [
      {
        "name": "Withering Sword",
        "toHit": 8,
        "reach": 5,
        "damage": "2d8+4",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Truesight 120 ft.; Passive Perception 16"
    ],
    "traits": []
  },
  "ettercap": {
    "id": "ettercap",
    "name": "Ettercap",
    "size": "medium",
    "type": "monstrosity",
    "ac": 13,
    "hp": 44,
    "hitDice": "8d8+8",
    "speed": 30,
    "abilities": {
      "str": 14,
      "dex": 15,
      "con": 13,
      "int": 7,
      "wis": 12,
      "cha": 8
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 4,
        "reach": 5,
        "damage": "1d6+2",
        "damageType": "piercing"
      },
      {
        "name": "Claw",
        "toHit": 4,
        "reach": 5,
        "damage": "2d4+2",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 13"
    ],
    "traits": []
  },
  "ettin": {
    "id": "ettin",
    "name": "Ettin",
    "size": "large",
    "type": "giant",
    "ac": 12,
    "hp": 85,
    "hitDice": "10d10+30",
    "speed": 40,
    "abilities": {
      "str": 21,
      "dex": 8,
      "con": 17,
      "int": 6,
      "wis": 10,
      "cha": 8
    },
    "cr": 4,
    "xp": 1100,
    "attacks": [
      {
        "name": "Battleaxe",
        "toHit": 7,
        "reach": 5,
        "damage": "2d8+5",
        "damageType": "slashing"
      },
      {
        "name": "Morningstar",
        "toHit": 7,
        "reach": 5,
        "damage": "2d8+5",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 14"
    ],
    "traits": []
  },
  "fire-elemental": {
    "id": "fire-elemental",
    "name": "Fire Elemental",
    "size": "large",
    "type": "elemental",
    "ac": 13,
    "hp": 93,
    "hitDice": "11d10+33",
    "speed": 50,
    "abilities": {
      "str": 10,
      "dex": 17,
      "con": 16,
      "int": 6,
      "wis": 10,
      "cha": 7
    },
    "cr": 5,
    "xp": 1800,
    "attacks": [
      {
        "name": "Burn",
        "toHit": 6,
        "reach": 5,
        "damage": "2d6+3",
        "damageType": "fire"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "flesh-golem": {
    "id": "flesh-golem",
    "name": "Flesh Golem",
    "size": "medium",
    "type": "construct",
    "ac": 9,
    "hp": 127,
    "hitDice": "15d8+60",
    "speed": 30,
    "abilities": {
      "str": 19,
      "dex": 9,
      "con": 18,
      "int": 6,
      "wis": 10,
      "cha": 5
    },
    "cr": 5,
    "xp": 1800,
    "attacks": [
      {
        "name": "Slam",
        "toHit": 7,
        "reach": 5,
        "damage": "2d8+4",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "flying-snake": {
    "id": "flying-snake",
    "name": "Flying Snake",
    "size": "tiny",
    "type": "monstrosity",
    "ac": 14,
    "hp": 5,
    "hitDice": "2d4",
    "speed": 30,
    "abilities": {
      "str": 4,
      "dex": 15,
      "con": 11,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "cr": 0.125,
    "xp": 25,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 10 ft.; Passive Perception 11"
    ],
    "traits": []
  },
  "frog": {
    "id": "frog",
    "name": "Frog",
    "size": "tiny",
    "type": "beast",
    "ac": 11,
    "hp": 1,
    "hitDice": "1d4",
    "speed": 20,
    "abilities": {
      "str": 1,
      "dex": 13,
      "con": 8,
      "int": 1,
      "wis": 8,
      "cha": 3
    },
    "cr": 0,
    "xp": 10,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 30 ft.; Passive Perception 11"
    ],
    "traits": []
  },
  "frost-giant": {
    "id": "frost-giant",
    "name": "Frost Giant",
    "size": "huge",
    "type": "giant",
    "ac": 15,
    "hp": 149,
    "hitDice": "13d12+65",
    "speed": 40,
    "abilities": {
      "str": 23,
      "dex": 9,
      "con": 21,
      "int": 9,
      "wis": 10,
      "cha": 12
    },
    "cr": 8,
    "xp": 3900,
    "attacks": [
      {
        "name": "Frost Axe",
        "toHit": 9,
        "reach": 10,
        "damage": "2d12+6",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 13"
    ],
    "traits": []
  },
  "gargoyle": {
    "id": "gargoyle",
    "name": "Gargoyle",
    "size": "medium",
    "type": "elemental",
    "ac": 15,
    "hp": 67,
    "hitDice": "9d8+27",
    "speed": 30,
    "abilities": {
      "str": 15,
      "dex": 11,
      "con": 16,
      "int": 6,
      "wis": 11,
      "cha": 7
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Claw",
        "toHit": 4,
        "reach": 5,
        "damage": "2d4+2",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "gelatinous-cube": {
    "id": "gelatinous-cube",
    "name": "Gelatinous Cube",
    "size": "large",
    "type": "ooze",
    "ac": 6,
    "hp": 63,
    "hitDice": "6d10+30",
    "speed": 15,
    "abilities": {
      "str": 14,
      "dex": 3,
      "con": 20,
      "int": 1,
      "wis": 6,
      "cha": 1
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Pseudopod",
        "toHit": 4,
        "reach": 5,
        "damage": "3d6+2",
        "damageType": "acid"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft.; Passive Perception 8"
    ],
    "traits": []
  },
  "ghast": {
    "id": "ghast",
    "name": "Ghast",
    "size": "medium",
    "type": "undead",
    "ac": 13,
    "hp": 36,
    "hitDice": "8d8",
    "speed": 30,
    "abilities": {
      "str": 16,
      "dex": 17,
      "con": 10,
      "int": 11,
      "wis": 10,
      "cha": 8
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 5,
        "reach": 5,
        "damage": "1d8+3",
        "damageType": "piercing"
      },
      {
        "name": "Claw",
        "toHit": 5,
        "reach": 5,
        "damage": "2d6+3",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "ghost": {
    "id": "ghost",
    "name": "Ghost",
    "size": "medium",
    "type": "undead",
    "ac": 11,
    "hp": 45,
    "hitDice": "10d8",
    "speed": 5,
    "abilities": {
      "str": 7,
      "dex": 13,
      "con": 10,
      "int": 10,
      "wis": 12,
      "cha": 17
    },
    "cr": 4,
    "xp": 1100,
    "attacks": [
      {
        "name": "Withering Touch",
        "toHit": 5,
        "reach": 5,
        "damage": "3d10+3",
        "damageType": "necrotic"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 11"
    ],
    "traits": []
  },
  "giant-badger": {
    "id": "giant-badger",
    "name": "Giant Badger",
    "size": "medium",
    "type": "beast",
    "ac": 13,
    "hp": 15,
    "hitDice": "2d8+6",
    "speed": 30,
    "abilities": {
      "str": 13,
      "dex": 10,
      "con": 17,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 3,
        "reach": 5,
        "damage": "2d4+1",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 13"
    ],
    "traits": []
  },
  "giant-bat": {
    "id": "giant-bat",
    "name": "Giant Bat",
    "size": "large",
    "type": "beast",
    "ac": 13,
    "hp": 22,
    "hitDice": "4d10",
    "speed": 10,
    "abilities": {
      "str": 15,
      "dex": 16,
      "con": 11,
      "int": 2,
      "wis": 12,
      "cha": 6
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 5,
        "reach": 5,
        "damage": "1d6+3",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 120 ft.; Passive Perception 11"
    ],
    "traits": []
  },
  "giant-boar": {
    "id": "giant-boar",
    "name": "Giant Boar",
    "size": "large",
    "type": "beast",
    "ac": 13,
    "hp": 42,
    "hitDice": "5d10+15",
    "speed": 40,
    "abilities": {
      "str": 17,
      "dex": 10,
      "con": 16,
      "int": 2,
      "wis": 7,
      "cha": 5
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Gore",
        "toHit": 5,
        "reach": 5,
        "damage": "2d6+3",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 8"
    ],
    "traits": []
  },
  "giant-centipede": {
    "id": "giant-centipede",
    "name": "Giant Centipede",
    "size": "small",
    "type": "beast",
    "ac": 14,
    "hp": 9,
    "hitDice": "2d6+2",
    "speed": 30,
    "abilities": {
      "str": 5,
      "dex": 14,
      "con": 12,
      "int": 1,
      "wis": 7,
      "cha": 3
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 4,
        "reach": 5,
        "damage": "1d4+2",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 30 ft.; Passive Perception 8"
    ],
    "traits": []
  },
  "giant-crab": {
    "id": "giant-crab",
    "name": "Giant Crab",
    "size": "medium",
    "type": "beast",
    "ac": 15,
    "hp": 13,
    "hitDice": "3d8",
    "speed": 30,
    "abilities": {
      "str": 13,
      "dex": 13,
      "con": 11,
      "int": 1,
      "wis": 9,
      "cha": 3
    },
    "cr": 0.125,
    "xp": 25,
    "attacks": [
      {
        "name": "Claw",
        "toHit": 3,
        "reach": 5,
        "damage": "1d6+1",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 30 ft.; Passive Perception 9"
    ],
    "traits": []
  },
  "giant-crocodile": {
    "id": "giant-crocodile",
    "name": "Giant Crocodile",
    "size": "huge",
    "type": "beast",
    "ac": 14,
    "hp": 85,
    "hitDice": "9d12+27",
    "speed": 30,
    "abilities": {
      "str": 21,
      "dex": 9,
      "con": 17,
      "int": 2,
      "wis": 10,
      "cha": 7
    },
    "cr": 5,
    "xp": 1800,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 8,
        "reach": 5,
        "damage": "3d10+5",
        "damageType": "piercing"
      },
      {
        "name": "Tail",
        "toHit": 8,
        "reach": 10,
        "damage": "3d8+5",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 10"
    ],
    "traits": []
  },
  "giant-eagle": {
    "id": "giant-eagle",
    "name": "Giant Eagle",
    "size": "large",
    "type": "celestial",
    "ac": 13,
    "hp": 26,
    "hitDice": "4d10+4",
    "speed": 10,
    "abilities": {
      "str": 16,
      "dex": 17,
      "con": 13,
      "int": 8,
      "wis": 14,
      "cha": 10
    },
    "cr": 1,
    "xp": 200,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 5,
        "reach": 5,
        "damage": "1d4+3",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 16"
    ],
    "traits": []
  },
  "giant-fire-beetle": {
    "id": "giant-fire-beetle",
    "name": "Giant Fire Beetle",
    "size": "small",
    "type": "beast",
    "ac": 13,
    "hp": 4,
    "hitDice": "1d6+1",
    "speed": 30,
    "abilities": {
      "str": 8,
      "dex": 10,
      "con": 12,
      "int": 1,
      "wis": 7,
      "cha": 3
    },
    "cr": 0,
    "xp": 10,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 30 ft.; Passive Perception 8"
    ],
    "traits": []
  },
  "giant-fly": {
    "id": "giant-fly",
    "name": "Giant Fly",
    "size": "large",
    "type": "beast",
    "ac": 11,
    "hp": 19,
    "hitDice": "3d10+3",
    "speed": 30,
    "abilities": {
      "str": 14,
      "dex": 13,
      "con": 13,
      "int": 2,
      "wis": 10,
      "cha": 3
    },
    "cr": 0,
    "xp": 0,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft., Passive Perception 10"
    ],
    "traits": []
  },
  "giant-frog": {
    "id": "giant-frog",
    "name": "Giant Frog",
    "size": "medium",
    "type": "beast",
    "ac": 11,
    "hp": 18,
    "hitDice": "4d8",
    "speed": 30,
    "abilities": {
      "str": 12,
      "dex": 13,
      "con": 11,
      "int": 2,
      "wis": 10,
      "cha": 3
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 3,
        "reach": 5,
        "damage": "1d6+2",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 30 ft.; Passive Perception 12"
    ],
    "traits": []
  },
  "giant-lizard": {
    "id": "giant-lizard",
    "name": "Giant Lizard",
    "size": "large",
    "type": "beast",
    "ac": 12,
    "hp": 19,
    "hitDice": "3d10+3",
    "speed": 40,
    "abilities": {
      "str": 15,
      "dex": 12,
      "con": 13,
      "int": 2,
      "wis": 10,
      "cha": 5
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 4,
        "reach": 5,
        "damage": "1d8+2",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "giant-octopus": {
    "id": "giant-octopus",
    "name": "Giant Octopus",
    "size": "large",
    "type": "beast",
    "ac": 11,
    "hp": 45,
    "hitDice": "7d10+7",
    "speed": 10,
    "abilities": {
      "str": 17,
      "dex": 13,
      "con": 13,
      "int": 5,
      "wis": 10,
      "cha": 4
    },
    "cr": 1,
    "xp": 200,
    "attacks": [
      {
        "name": "Tentacles",
        "toHit": 5,
        "reach": 10,
        "damage": "2d6+3",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 14"
    ],
    "traits": []
  },
  "giant-scorpion": {
    "id": "giant-scorpion",
    "name": "Giant Scorpion",
    "size": "large",
    "type": "beast",
    "ac": 15,
    "hp": 52,
    "hitDice": "7d10+14",
    "speed": 40,
    "abilities": {
      "str": 16,
      "dex": 13,
      "con": 15,
      "int": 1,
      "wis": 9,
      "cha": 3
    },
    "cr": 3,
    "xp": 700,
    "attacks": [
      {
        "name": "Claw",
        "toHit": 5,
        "reach": 5,
        "damage": "1d6+3",
        "damageType": "bludgeoning"
      },
      {
        "name": "Sting",
        "toHit": 5,
        "reach": 5,
        "damage": "1d8+3",
        "damageType": "piercing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft.; Passive Perception 9"
    ],
    "traits": []
  },
  "giant-seahorse": {
    "id": "giant-seahorse",
    "name": "Giant Seahorse",
    "size": "large",
    "type": "beast",
    "ac": 14,
    "hp": 16,
    "hitDice": "3d10",
    "speed": 5,
    "abilities": {
      "str": 15,
      "dex": 12,
      "con": 11,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Ram",
        "toHit": 4,
        "reach": 5,
        "damage": "2d6+2",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 11"
    ],
    "traits": []
  },
  "giant-shark": {
    "id": "giant-shark",
    "name": "Giant Shark",
    "size": "huge",
    "type": "beast",
    "ac": 13,
    "hp": 92,
    "hitDice": "8d12+40",
    "speed": 5,
    "abilities": {
      "str": 23,
      "dex": 11,
      "con": 21,
      "int": 1,
      "wis": 10,
      "cha": 5
    },
    "cr": 5,
    "xp": 1800,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 9,
        "reach": 5,
        "damage": "3d10+6",
        "damageType": "piercing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft.; Passive Perception 13"
    ],
    "traits": []
  },
  "giant-spider": {
    "id": "giant-spider",
    "name": "Giant Spider",
    "size": "large",
    "type": "beast",
    "ac": 14,
    "hp": 26,
    "hitDice": "4d10+4",
    "speed": 30,
    "abilities": {
      "str": 14,
      "dex": 16,
      "con": 12,
      "int": 2,
      "wis": 11,
      "cha": 4
    },
    "cr": 1,
    "xp": 200,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 5,
        "reach": 5,
        "damage": "1d8+3",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 14"
    ],
    "traits": []
  },
  "giant-toad": {
    "id": "giant-toad",
    "name": "Giant Toad",
    "size": "large",
    "type": "beast",
    "ac": 11,
    "hp": 39,
    "hitDice": "6d10+6",
    "speed": 30,
    "abilities": {
      "str": 15,
      "dex": 13,
      "con": 13,
      "int": 2,
      "wis": 10,
      "cha": 3
    },
    "cr": 1,
    "xp": 200,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 4,
        "reach": 5,
        "damage": "1d6+2",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "giant-vulture": {
    "id": "giant-vulture",
    "name": "Giant Vulture",
    "size": "large",
    "type": "monstrosity",
    "ac": 10,
    "hp": 25,
    "hitDice": "3d10+9",
    "speed": 10,
    "abilities": {
      "str": 15,
      "dex": 10,
      "con": 16,
      "int": 6,
      "wis": 12,
      "cha": 7
    },
    "cr": 1,
    "xp": 200,
    "attacks": [
      {
        "name": "Gouge",
        "toHit": 4,
        "reach": 5,
        "damage": "2d6+2",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 13"
    ],
    "traits": []
  },
  "giant-wasp": {
    "id": "giant-wasp",
    "name": "Giant Wasp",
    "size": "medium",
    "type": "beast",
    "ac": 13,
    "hp": 22,
    "hitDice": "5d8",
    "speed": 10,
    "abilities": {
      "str": 10,
      "dex": 14,
      "con": 10,
      "int": 1,
      "wis": 10,
      "cha": 3
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Sting",
        "toHit": 4,
        "reach": 5,
        "damage": "1d6+2",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 10"
    ],
    "traits": []
  },
  "giant-weasel": {
    "id": "giant-weasel",
    "name": "Giant Weasel",
    "size": "medium",
    "type": "beast",
    "ac": 13,
    "hp": 9,
    "hitDice": "2d8",
    "speed": 40,
    "abilities": {
      "str": 11,
      "dex": 17,
      "con": 10,
      "int": 4,
      "wis": 12,
      "cha": 5
    },
    "cr": 0.125,
    "xp": 25,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 5,
        "reach": 5,
        "damage": "1d4+3",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 13"
    ],
    "traits": []
  },
  "giant-wolf-spider": {
    "id": "giant-wolf-spider",
    "name": "Giant Wolf Spider",
    "size": "medium",
    "type": "beast",
    "ac": 13,
    "hp": 11,
    "hitDice": "2d8+2",
    "speed": 40,
    "abilities": {
      "str": 12,
      "dex": 16,
      "con": 13,
      "int": 3,
      "wis": 12,
      "cha": 4
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 5,
        "reach": 5,
        "damage": "1d4+3",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 10 ft., Darkvision 60 ft.;"
    ],
    "traits": []
  },
  "gibbering-mouther": {
    "id": "gibbering-mouther",
    "name": "Gibbering Mouther",
    "size": "medium",
    "type": "aberration",
    "ac": 9,
    "hp": 52,
    "hitDice": "7d8+21",
    "speed": 20,
    "abilities": {
      "str": 10,
      "dex": 8,
      "con": 16,
      "int": 3,
      "wis": 10,
      "cha": 6
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 2,
        "reach": 5,
        "damage": "2d6",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "glabrezu": {
    "id": "glabrezu",
    "name": "Glabrezu",
    "size": "large",
    "type": "fiend",
    "ac": 17,
    "hp": 189,
    "hitDice": "18d10+90",
    "speed": 40,
    "abilities": {
      "str": 20,
      "dex": 15,
      "con": 21,
      "int": 19,
      "wis": 17,
      "cha": 16
    },
    "cr": 9,
    "xp": 5000,
    "attacks": [
      {
        "name": "Pincer",
        "toHit": 9,
        "reach": 10,
        "damage": "2d10+5",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Truesight 120 ft.; Passive Perception 17"
    ],
    "traits": []
  },
  "goat": {
    "id": "goat",
    "name": "Goat",
    "size": "medium",
    "type": "beast",
    "ac": 10,
    "hp": 4,
    "hitDice": "1d8",
    "speed": 40,
    "abilities": {
      "str": 11,
      "dex": 10,
      "con": 11,
      "int": 2,
      "wis": 10,
      "cha": 5
    },
    "cr": 0,
    "xp": 10,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 12"
    ],
    "traits": []
  },
  "goblin-boss": {
    "id": "goblin-boss",
    "name": "Goblin Boss",
    "size": "small",
    "type": "fey",
    "ac": 17,
    "hp": 21,
    "hitDice": "6d6",
    "speed": 30,
    "abilities": {
      "str": 10,
      "dex": 15,
      "con": 10,
      "int": 10,
      "wis": 8,
      "cha": 10
    },
    "cr": 1,
    "xp": 200,
    "attacks": [
      {
        "name": "Scimitar",
        "toHit": 4,
        "reach": 5,
        "damage": "1d6+2",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 9"
    ],
    "traits": []
  },
  "goblin-warrior": {
    "id": "goblin-warrior",
    "name": "Goblin Warrior",
    "size": "small",
    "type": "fey",
    "ac": 15,
    "hp": 10,
    "hitDice": "3d6",
    "speed": 30,
    "abilities": {
      "str": 8,
      "dex": 15,
      "con": 10,
      "int": 10,
      "wis": 8,
      "cha": 8
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Scimitar",
        "toHit": 4,
        "reach": 5,
        "damage": "1d6+2",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 9"
    ],
    "traits": []
  },
  "gray-ooze": {
    "id": "gray-ooze",
    "name": "Gray Ooze",
    "size": "medium",
    "type": "ooze",
    "ac": 9,
    "hp": 22,
    "hitDice": "3d8+9",
    "speed": 10,
    "abilities": {
      "str": 12,
      "dex": 6,
      "con": 16,
      "int": 1,
      "wis": 6,
      "cha": 2
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Pseudopod",
        "toHit": 3,
        "reach": 5,
        "damage": "2d8+1",
        "damageType": "acid"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft.; Passive Perception 8"
    ],
    "traits": []
  },
  "green-dragon-wyrmling": {
    "id": "green-dragon-wyrmling",
    "name": "Green Dragon Wyrmling",
    "size": "medium",
    "type": "dragon",
    "ac": 17,
    "hp": 38,
    "hitDice": "7d8+7",
    "speed": 30,
    "abilities": {
      "str": 15,
      "dex": 12,
      "con": 13,
      "int": 14,
      "wis": 11,
      "cha": 13
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 4,
        "reach": 5,
        "damage": "1d10+2",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 10 ft., Darkvision 60 ft.;"
    ],
    "traits": []
  },
  "green-hag": {
    "id": "green-hag",
    "name": "Green Hag",
    "size": "medium",
    "type": "fey",
    "ac": 17,
    "hp": 82,
    "hitDice": "11d8+33",
    "speed": 30,
    "abilities": {
      "str": 18,
      "dex": 12,
      "con": 16,
      "int": 13,
      "wis": 14,
      "cha": 14
    },
    "cr": 3,
    "xp": 700,
    "attacks": [
      {
        "name": "Claw",
        "toHit": 6,
        "reach": 5,
        "damage": "1d8+4",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 14"
    ],
    "traits": []
  },
  "grick": {
    "id": "grick",
    "name": "Grick",
    "size": "medium",
    "type": "aberration",
    "ac": 14,
    "hp": 54,
    "hitDice": "12d8",
    "speed": 30,
    "abilities": {
      "str": 14,
      "dex": 14,
      "con": 11,
      "int": 3,
      "wis": 14,
      "cha": 5
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Beak",
        "toHit": 4,
        "reach": 5,
        "damage": "2d6+2",
        "damageType": "piercing"
      },
      {
        "name": "Tentacles",
        "toHit": 4,
        "reach": 5,
        "damage": "1d10+2",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 12"
    ],
    "traits": []
  },
  "griffon": {
    "id": "griffon",
    "name": "Griffon",
    "size": "large",
    "type": "monstrosity",
    "ac": 12,
    "hp": 59,
    "hitDice": "7d10+21",
    "speed": 30,
    "abilities": {
      "str": 18,
      "dex": 15,
      "con": 16,
      "int": 2,
      "wis": 13,
      "cha": 8
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 6,
        "reach": 5,
        "damage": "1d8+4",
        "damageType": "piercing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 15"
    ],
    "traits": []
  },
  "grimlock": {
    "id": "grimlock",
    "name": "Grimlock",
    "size": "medium",
    "type": "aberration",
    "ac": 11,
    "hp": 11,
    "hitDice": "2d8+2",
    "speed": 30,
    "abilities": {
      "str": 16,
      "dex": 12,
      "con": 12,
      "int": 9,
      "wis": 8,
      "cha": 6
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Bone Cudgel",
        "toHit": 5,
        "reach": 5,
        "damage": "1d6+3",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 30 ft.; Passive Perception 13"
    ],
    "traits": []
  },
  "guardian-naga": {
    "id": "guardian-naga",
    "name": "Guardian Naga",
    "size": "large",
    "type": "celestial",
    "ac": 18,
    "hp": 136,
    "hitDice": "16d10+48",
    "speed": 40,
    "abilities": {
      "str": 19,
      "dex": 18,
      "con": 16,
      "int": 16,
      "wis": 19,
      "cha": 18
    },
    "cr": 10,
    "xp": 5900,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 8,
        "reach": 10,
        "damage": "2d12+4",
        "damageType": "piercing"
      },
      {
        "name": "Longsword",
        "toHit": 6,
        "reach": 5,
        "damage": "2d10+4",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 14"
    ],
    "traits": []
  },
  "half-dragon": {
    "id": "half-dragon",
    "name": "Half-Dragon",
    "size": "medium",
    "type": "dragon",
    "ac": 18,
    "hp": 105,
    "hitDice": "14d8+42",
    "speed": 40,
    "abilities": {
      "str": 19,
      "dex": 14,
      "con": 16,
      "int": 10,
      "wis": 15,
      "cha": 14
    },
    "cr": 5,
    "xp": 1800,
    "attacks": [
      {
        "name": "Claw",
        "toHit": 7,
        "reach": 10,
        "damage": "1d4+4",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 10 ft., Darkvision 60 ft.;"
    ],
    "traits": []
  },
  "harpy": {
    "id": "harpy",
    "name": "Harpy",
    "size": "medium",
    "type": "monstrosity",
    "ac": 11,
    "hp": 38,
    "hitDice": "7d8+7",
    "speed": 20,
    "abilities": {
      "str": 12,
      "dex": 13,
      "con": 12,
      "int": 7,
      "wis": 10,
      "cha": 13
    },
    "cr": 1,
    "xp": 200,
    "attacks": [
      {
        "name": "Claw",
        "toHit": 3,
        "reach": 5,
        "damage": "2d4+1",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 10"
    ],
    "traits": []
  },
  "hawk": {
    "id": "hawk",
    "name": "Hawk",
    "size": "tiny",
    "type": "beast",
    "ac": 13,
    "hp": 1,
    "hitDice": "1d4",
    "speed": 10,
    "abilities": {
      "str": 5,
      "dex": 16,
      "con": 8,
      "int": 2,
      "wis": 14,
      "cha": 6
    },
    "cr": 0,
    "xp": 10,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 16"
    ],
    "traits": []
  },
  "hell-hound": {
    "id": "hell-hound",
    "name": "Hell Hound",
    "size": "medium",
    "type": "fiend",
    "ac": 15,
    "hp": 58,
    "hitDice": "9d8+18",
    "speed": 50,
    "abilities": {
      "str": 17,
      "dex": 12,
      "con": 14,
      "int": 6,
      "wis": 13,
      "cha": 6
    },
    "cr": 3,
    "xp": 700,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 5,
        "reach": 5,
        "damage": "1d8+3",
        "damageType": "piercing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 15"
    ],
    "traits": []
  },
  "hezrou": {
    "id": "hezrou",
    "name": "Hezrou",
    "size": "large",
    "type": "fiend",
    "ac": 18,
    "hp": 157,
    "hitDice": "15d10+75",
    "speed": 30,
    "abilities": {
      "str": 19,
      "dex": 17,
      "con": 20,
      "int": 5,
      "wis": 12,
      "cha": 13
    },
    "cr": 8,
    "xp": 3900,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 7,
        "reach": 5,
        "damage": "1d4+4",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 120 ft.; Passive Perception 11"
    ],
    "traits": []
  },
  "hippopotamus": {
    "id": "hippopotamus",
    "name": "Hippopotamus",
    "size": "large",
    "type": "beast",
    "ac": 14,
    "hp": 82,
    "hitDice": "11d10+22",
    "speed": 30,
    "abilities": {
      "str": 21,
      "dex": 7,
      "con": 15,
      "int": 2,
      "wis": 12,
      "cha": 4
    },
    "cr": 4,
    "xp": 1100,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 7,
        "reach": 5,
        "damage": "2d10+5",
        "damageType": "piercing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 13"
    ],
    "traits": []
  },
  "hobgoblin-warrior": {
    "id": "hobgoblin-warrior",
    "name": "Hobgoblin Warrior",
    "size": "medium",
    "type": "fey",
    "ac": 18,
    "hp": 11,
    "hitDice": "2d8+2",
    "speed": 30,
    "abilities": {
      "str": 13,
      "dex": 12,
      "con": 12,
      "int": 10,
      "wis": 10,
      "cha": 9
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Longsword",
        "toHit": 3,
        "reach": 5,
        "damage": "2d10+1",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "homunculus": {
    "id": "homunculus",
    "name": "Homunculus",
    "size": "tiny",
    "type": "construct",
    "ac": 13,
    "hp": 4,
    "hitDice": "1d4+2",
    "speed": 20,
    "abilities": {
      "str": 4,
      "dex": 15,
      "con": 14,
      "int": 10,
      "wis": 10,
      "cha": 7
    },
    "cr": 0,
    "xp": 10,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "horned-devil": {
    "id": "horned-devil",
    "name": "Horned Devil",
    "size": "large",
    "type": "fiend",
    "ac": 18,
    "hp": 199,
    "hitDice": "19d10+95",
    "speed": 30,
    "abilities": {
      "str": 22,
      "dex": 17,
      "con": 21,
      "int": 12,
      "wis": 16,
      "cha": 18
    },
    "cr": 11,
    "xp": 7200,
    "attacks": [
      {
        "name": "Searing Fork",
        "toHit": 10,
        "reach": 10,
        "damage": "2d8+6",
        "damageType": "piercing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 150 ft. (unimpeded by magical"
    ],
    "traits": []
  },
  "hydra": {
    "id": "hydra",
    "name": "Hydra",
    "size": "huge",
    "type": "monstrosity",
    "ac": 15,
    "hp": 184,
    "hitDice": "16d12+80",
    "speed": 40,
    "abilities": {
      "str": 20,
      "dex": 12,
      "con": 20,
      "int": 2,
      "wis": 10,
      "cha": 7
    },
    "cr": 8,
    "xp": 3900,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 8,
        "reach": 10,
        "damage": "1d10+5",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 16"
    ],
    "traits": []
  },
  "hyena": {
    "id": "hyena",
    "name": "Hyena",
    "size": "medium",
    "type": "beast",
    "ac": 11,
    "hp": 5,
    "hitDice": "1d8+1",
    "speed": 50,
    "abilities": {
      "str": 11,
      "dex": 13,
      "con": 12,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "cr": 0,
    "xp": 10,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 2,
        "reach": 5,
        "damage": "1d6",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 13"
    ],
    "traits": []
  },
  "ice-devil": {
    "id": "ice-devil",
    "name": "Ice Devil",
    "size": "large",
    "type": "fiend",
    "ac": 18,
    "hp": 228,
    "hitDice": "24d10+96",
    "speed": 40,
    "abilities": {
      "str": 21,
      "dex": 14,
      "con": 18,
      "int": 18,
      "wis": 15,
      "cha": 18
    },
    "cr": 14,
    "xp": 11500,
    "attacks": [
      {
        "name": "Tail",
        "toHit": 10,
        "reach": 10,
        "damage": "3d6+5",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 120 ft.; Passive Perception 17"
    ],
    "traits": []
  },
  "ice-mephit": {
    "id": "ice-mephit",
    "name": "Ice Mephit",
    "size": "small",
    "type": "elemental",
    "ac": 11,
    "hp": 21,
    "hitDice": "6d6",
    "speed": 30,
    "abilities": {
      "str": 7,
      "dex": 13,
      "con": 10,
      "int": 9,
      "wis": 11,
      "cha": 12
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Claw",
        "toHit": 3,
        "reach": 5,
        "damage": "1d4+1",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 12"
    ],
    "traits": []
  },
  "invisible-stalker": {
    "id": "invisible-stalker",
    "name": "Invisible Stalker",
    "size": "large",
    "type": "elemental",
    "ac": 14,
    "hp": 97,
    "hitDice": "13d10+26",
    "speed": 50,
    "abilities": {
      "str": 16,
      "dex": 19,
      "con": 14,
      "int": 10,
      "wis": 15,
      "cha": 11
    },
    "cr": 6,
    "xp": 2300,
    "attacks": [
      {
        "name": "Wind Swipe",
        "toHit": 7,
        "reach": 5,
        "damage": "2d6+4",
        "damageType": "force"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 18"
    ],
    "traits": []
  },
  "iron-golem": {
    "id": "iron-golem",
    "name": "Iron Golem",
    "size": "large",
    "type": "construct",
    "ac": 20,
    "hp": 252,
    "hitDice": "24d10+120",
    "speed": 30,
    "abilities": {
      "str": 24,
      "dex": 9,
      "con": 20,
      "int": 3,
      "wis": 11,
      "cha": 1
    },
    "cr": 16,
    "xp": 15000,
    "attacks": [
      {
        "name": "Bladed Arm",
        "toHit": 12,
        "reach": 10,
        "damage": "3d8+7",
        "damageType": "slashing"
      },
      {
        "name": "Greatsword",
        "toHit": 5,
        "reach": 5,
        "damage": "2d6+3",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 120 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "jackal": {
    "id": "jackal",
    "name": "Jackal",
    "size": "small",
    "type": "beast",
    "ac": 12,
    "hp": 3,
    "hitDice": "1d6",
    "speed": 40,
    "abilities": {
      "str": 8,
      "dex": 15,
      "con": 11,
      "int": 3,
      "wis": 12,
      "cha": 6
    },
    "cr": 0,
    "xp": 10,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 1,
        "reach": 5,
        "damage": "1d4",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 90 ft.; Passive Perception 15"
    ],
    "traits": []
  },
  "killer-whale": {
    "id": "killer-whale",
    "name": "Killer Whale",
    "size": "huge",
    "type": "beast",
    "ac": 12,
    "hp": 90,
    "hitDice": "12d12+12",
    "speed": 5,
    "abilities": {
      "str": 19,
      "dex": 14,
      "con": 13,
      "int": 3,
      "wis": 12,
      "cha": 7
    },
    "cr": 3,
    "xp": 700,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 6,
        "reach": 5,
        "damage": "5d6+4",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 120 ft.; Passive Perception 13"
    ],
    "traits": []
  },
  "lich": {
    "id": "lich",
    "name": "Lich",
    "size": "medium",
    "type": "undead",
    "ac": 20,
    "hp": 315,
    "hitDice": "42d8+126",
    "speed": 30,
    "abilities": {
      "str": 11,
      "dex": 16,
      "con": 16,
      "int": 21,
      "wis": 14,
      "cha": 16
    },
    "cr": 21,
    "xp": 33000,
    "attacks": [],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Truesight 120 ft.; Passive Perception 19"
    ],
    "traits": []
  },
  "lion": {
    "id": "lion",
    "name": "Lion",
    "size": "large",
    "type": "beast",
    "ac": 12,
    "hp": 22,
    "hitDice": "4d10",
    "speed": 50,
    "abilities": {
      "str": 17,
      "dex": 15,
      "con": 11,
      "int": 3,
      "wis": 12,
      "cha": 8
    },
    "cr": 1,
    "xp": 200,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 5,
        "reach": 5,
        "damage": "1d8+3",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 13"
    ],
    "traits": []
  },
  "lizard": {
    "id": "lizard",
    "name": "Lizard",
    "size": "tiny",
    "type": "beast",
    "ac": 10,
    "hp": 2,
    "hitDice": "1d4",
    "speed": 20,
    "abilities": {
      "str": 2,
      "dex": 11,
      "con": 10,
      "int": 1,
      "wis": 8,
      "cha": 3
    },
    "cr": 0,
    "xp": 10,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 30 ft.; Passive Perception 9"
    ],
    "traits": []
  },
  "magma-mephit": {
    "id": "magma-mephit",
    "name": "Magma Mephit",
    "size": "small",
    "type": "elemental",
    "ac": 11,
    "hp": 18,
    "hitDice": "4d6+4",
    "speed": 30,
    "abilities": {
      "str": 8,
      "dex": 12,
      "con": 12,
      "int": 7,
      "wis": 10,
      "cha": 10
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Claw",
        "toHit": 3,
        "reach": 5,
        "damage": "1d4+1",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "magmin": {
    "id": "magmin",
    "name": "Magmin",
    "size": "small",
    "type": "elemental",
    "ac": 14,
    "hp": 13,
    "hitDice": "3d6+3",
    "speed": 30,
    "abilities": {
      "str": 7,
      "dex": 15,
      "con": 12,
      "int": 8,
      "wis": 11,
      "cha": 10
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Touch",
        "toHit": 4,
        "reach": 5,
        "damage": "2d4+2",
        "damageType": "fire"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "mammoth": {
    "id": "mammoth",
    "name": "Mammoth",
    "size": "huge",
    "type": "beast",
    "ac": 13,
    "hp": 126,
    "hitDice": "11d12+55",
    "speed": 50,
    "abilities": {
      "str": 24,
      "dex": 9,
      "con": 21,
      "int": 3,
      "wis": 11,
      "cha": 6
    },
    "cr": 6,
    "xp": 2300,
    "attacks": [
      {
        "name": "Gore",
        "toHit": 10,
        "reach": 10,
        "damage": "2d10+7",
        "damageType": "piercing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 10"
    ],
    "traits": []
  },
  "manticore": {
    "id": "manticore",
    "name": "Manticore",
    "size": "large",
    "type": "monstrosity",
    "ac": 14,
    "hp": 68,
    "hitDice": "8d10+24",
    "speed": 30,
    "abilities": {
      "str": 17,
      "dex": 16,
      "con": 17,
      "int": 7,
      "wis": 12,
      "cha": 8
    },
    "cr": 3,
    "xp": 700,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 5,
        "reach": 5,
        "damage": "1d8+3",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 11"
    ],
    "traits": []
  },
  "mastiff": {
    "id": "mastiff",
    "name": "Mastiff",
    "size": "medium",
    "type": "beast",
    "ac": 12,
    "hp": 5,
    "hitDice": "1d8+1",
    "speed": 40,
    "abilities": {
      "str": 13,
      "dex": 14,
      "con": 12,
      "int": 3,
      "wis": 12,
      "cha": 7
    },
    "cr": 0.125,
    "xp": 25,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 3,
        "reach": 5,
        "damage": "1d6+1",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 15"
    ],
    "traits": []
  },
  "medusa": {
    "id": "medusa",
    "name": "Medusa",
    "size": "medium",
    "type": "monstrosity",
    "ac": 15,
    "hp": 127,
    "hitDice": "17d8+51",
    "speed": 30,
    "abilities": {
      "str": 10,
      "dex": 17,
      "con": 16,
      "int": 12,
      "wis": 13,
      "cha": 15
    },
    "cr": 6,
    "xp": 2300,
    "attacks": [
      {
        "name": "Claw",
        "toHit": 6,
        "reach": 5,
        "damage": "2d6+3",
        "damageType": "slashing"
      },
      {
        "name": "Snake Hair",
        "toHit": 6,
        "reach": 5,
        "damage": "1d4+3",
        "damageType": "piercing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 150 ft.; Passive Perception 14"
    ],
    "traits": []
  },
  "merfolk-skirmisher": {
    "id": "merfolk-skirmisher",
    "name": "Merfolk Skirmisher",
    "size": "medium",
    "type": "elemental",
    "ac": 11,
    "hp": 11,
    "hitDice": "2d8+2",
    "speed": 10,
    "abilities": {
      "str": 10,
      "dex": 13,
      "con": 12,
      "int": 11,
      "wis": 14,
      "cha": 12
    },
    "cr": 0.125,
    "xp": 25,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 12"
    ],
    "traits": []
  },
  "merrow": {
    "id": "merrow",
    "name": "Merrow",
    "size": "large",
    "type": "monstrosity",
    "ac": 13,
    "hp": 45,
    "hitDice": "6d10+12",
    "speed": 10,
    "abilities": {
      "str": 18,
      "dex": 15,
      "con": 15,
      "int": 8,
      "wis": 10,
      "cha": 9
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 6,
        "reach": 5,
        "damage": "1d4+4",
        "damageType": "piercing"
      },
      {
        "name": "Claw",
        "toHit": 6,
        "reach": 5,
        "damage": "2d4+4",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "mimic": {
    "id": "mimic",
    "name": "Mimic",
    "size": "medium",
    "type": "monstrosity",
    "ac": 12,
    "hp": 58,
    "hitDice": "9d8+18",
    "speed": 20,
    "abilities": {
      "str": 17,
      "dex": 12,
      "con": 15,
      "int": 5,
      "wis": 13,
      "cha": 8
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 5,
        "reach": 5,
        "damage": "1d8+3",
        "damageType": "piercing"
      },
      {
        "name": "Pseudopod",
        "toHit": 5,
        "reach": 5,
        "damage": "1d8+3",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 11"
    ],
    "traits": []
  },
  "minotaur-of-baphomet": {
    "id": "minotaur-of-baphomet",
    "name": "Minotaur of Baphomet",
    "size": "large",
    "type": "monstrosity",
    "ac": 14,
    "hp": 85,
    "hitDice": "10d10+30",
    "speed": 40,
    "abilities": {
      "str": 18,
      "dex": 11,
      "con": 16,
      "int": 6,
      "wis": 16,
      "cha": 9
    },
    "cr": 3,
    "xp": 700,
    "attacks": [
      {
        "name": "Abyssal Glaive",
        "toHit": 6,
        "reach": 10,
        "damage": "1d12+4",
        "damageType": "slashing"
      },
      {
        "name": "Rotting Fist",
        "toHit": 5,
        "reach": 5,
        "damage": "1d10+3",
        "damageType": "bludgeoning"
      },
      {
        "name": "Rotting Fist",
        "toHit": 9,
        "reach": 5,
        "damage": "2d10+4",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 17"
    ],
    "traits": []
  },
  "minotaur-skeleton": {
    "id": "minotaur-skeleton",
    "name": "Minotaur Skeleton",
    "size": "large",
    "type": "undead",
    "ac": 12,
    "hp": 45,
    "hitDice": "6d10+12",
    "speed": 40,
    "abilities": {
      "str": 18,
      "dex": 11,
      "con": 15,
      "int": 6,
      "wis": 8,
      "cha": 5
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Gore",
        "toHit": 6,
        "reach": 5,
        "damage": "2d6+4",
        "damageType": "piercing"
      },
      {
        "name": "Slam",
        "toHit": 6,
        "reach": 5,
        "damage": "2d10+4",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 9"
    ],
    "traits": []
  },
  "mule": {
    "id": "mule",
    "name": "Mule",
    "size": "medium",
    "type": "beast",
    "ac": 10,
    "hp": 11,
    "hitDice": "2d8+2",
    "speed": 40,
    "abilities": {
      "str": 14,
      "dex": 10,
      "con": 13,
      "int": 2,
      "wis": 10,
      "cha": 5
    },
    "cr": 0.125,
    "xp": 25,
    "attacks": [
      {
        "name": "Hooves",
        "toHit": 4,
        "reach": 5,
        "damage": "1d4+2",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 10"
    ],
    "traits": []
  },
  "nalfeshnee": {
    "id": "nalfeshnee",
    "name": "Nalfeshnee",
    "size": "large",
    "type": "fiend",
    "ac": 18,
    "hp": 184,
    "hitDice": "16d10+96",
    "speed": 20,
    "abilities": {
      "str": 21,
      "dex": 10,
      "con": 22,
      "int": 19,
      "wis": 12,
      "cha": 15
    },
    "cr": 13,
    "xp": 10000,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 10,
        "reach": 10,
        "damage": "2d10+5",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Truesight 120 ft.; Passive Perception 11"
    ],
    "traits": []
  },
  "ochre-jelly": {
    "id": "ochre-jelly",
    "name": "Ochre Jelly",
    "size": "large",
    "type": "ooze",
    "ac": 8,
    "hp": 52,
    "hitDice": "7d10+14",
    "speed": 20,
    "abilities": {
      "str": 15,
      "dex": 6,
      "con": 14,
      "int": 2,
      "wis": 6,
      "cha": 1
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Pseudopod",
        "toHit": 4,
        "reach": 5,
        "damage": "3d6+2",
        "damageType": "acid"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft.; Passive Perception 8"
    ],
    "traits": []
  },
  "ogre": {
    "id": "ogre",
    "name": "Ogre",
    "size": "large",
    "type": "giant",
    "ac": 11,
    "hp": 68,
    "hitDice": "8d10+24",
    "speed": 40,
    "abilities": {
      "str": 19,
      "dex": 8,
      "con": 16,
      "int": 5,
      "wis": 7,
      "cha": 7
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Greatclub",
        "toHit": 6,
        "reach": 5,
        "damage": "2d8+4",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 8"
    ],
    "traits": []
  },
  "ogre-zombie": {
    "id": "ogre-zombie",
    "name": "Ogre Zombie",
    "size": "large",
    "type": "undead",
    "ac": 8,
    "hp": 85,
    "hitDice": "9d10+36",
    "speed": 30,
    "abilities": {
      "str": 19,
      "dex": 6,
      "con": 18,
      "int": 3,
      "wis": 6,
      "cha": 5
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Slam",
        "toHit": 6,
        "reach": 5,
        "damage": "2d8+4",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 8"
    ],
    "traits": []
  },
  "oni": {
    "id": "oni",
    "name": "Oni",
    "size": "large",
    "type": "fiend",
    "ac": 17,
    "hp": 119,
    "hitDice": "14d10+42",
    "speed": 30,
    "abilities": {
      "str": 19,
      "dex": 11,
      "con": 16,
      "int": 14,
      "wis": 12,
      "cha": 15
    },
    "cr": 7,
    "xp": 2900,
    "attacks": [
      {
        "name": "Claw",
        "toHit": 7,
        "reach": 10,
        "damage": "1d12+4",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 14"
    ],
    "traits": []
  },
  "otyugh": {
    "id": "otyugh",
    "name": "Otyugh",
    "size": "large",
    "type": "aberration",
    "ac": 14,
    "hp": 104,
    "hitDice": "11d10+44",
    "speed": 30,
    "abilities": {
      "str": 16,
      "dex": 11,
      "con": 19,
      "int": 6,
      "wis": 13,
      "cha": 6
    },
    "cr": 5,
    "xp": 1800,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 6,
        "reach": 5,
        "damage": "2d8+3",
        "damageType": "piercing"
      },
      {
        "name": "Tentacle",
        "toHit": 6,
        "reach": 10,
        "damage": "2d8+3",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 120 ft.; Passive Perception 11"
    ],
    "traits": []
  },
  "owlbear": {
    "id": "owlbear",
    "name": "Owlbear",
    "size": "large",
    "type": "monstrosity",
    "ac": 13,
    "hp": 59,
    "hitDice": "7d10+21",
    "speed": 40,
    "abilities": {
      "str": 20,
      "dex": 12,
      "con": 17,
      "int": 3,
      "wis": 12,
      "cha": 7
    },
    "cr": 3,
    "xp": 700,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 7,
        "reach": 5,
        "damage": "2d8+5",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 15"
    ],
    "traits": []
  },
  "panther": {
    "id": "panther",
    "name": "Panther",
    "size": "medium",
    "type": "beast",
    "ac": 13,
    "hp": 13,
    "hitDice": "3d8",
    "speed": 50,
    "abilities": {
      "str": 14,
      "dex": 16,
      "con": 10,
      "int": 3,
      "wis": 14,
      "cha": 7
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 5,
        "reach": 5,
        "damage": "1d6+3",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 14"
    ],
    "traits": []
  },
  "pegasus": {
    "id": "pegasus",
    "name": "Pegasus",
    "size": "large",
    "type": "celestial",
    "ac": 12,
    "hp": 59,
    "hitDice": "7d10+21",
    "speed": 60,
    "abilities": {
      "str": 18,
      "dex": 15,
      "con": 16,
      "int": 10,
      "wis": 15,
      "cha": 13
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Hooves",
        "toHit": 6,
        "reach": 5,
        "damage": "1d6+4",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 16"
    ],
    "traits": []
  },
  "piranha": {
    "id": "piranha",
    "name": "Piranha",
    "size": "tiny",
    "type": "beast",
    "ac": 13,
    "hp": 1,
    "hitDice": "1d4",
    "speed": 5,
    "abilities": {
      "str": 2,
      "dex": 16,
      "con": 9,
      "int": 1,
      "wis": 7,
      "cha": 2
    },
    "cr": 0,
    "xp": 10,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 8"
    ],
    "traits": []
  },
  "pit-fiend": {
    "id": "pit-fiend",
    "name": "Pit Fiend",
    "size": "large",
    "type": "fiend",
    "ac": 21,
    "hp": 337,
    "hitDice": "27d10+189",
    "speed": 30,
    "abilities": {
      "str": 26,
      "dex": 14,
      "con": 24,
      "int": 22,
      "wis": 18,
      "cha": 24
    },
    "cr": 20,
    "xp": 25000,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 14,
        "reach": 10,
        "damage": "3d6+8",
        "damageType": "piercing"
      },
      {
        "name": "Devilish Claw",
        "toHit": 14,
        "reach": 10,
        "damage": "4d8+8",
        "damageType": "necrotic"
      },
      {
        "name": "Fiery Mace",
        "toHit": 14,
        "reach": 10,
        "damage": "4d6+8",
        "damageType": "force"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Truesight 120 ft.; Passive Perception 20"
    ],
    "traits": []
  },
  "planetar": {
    "id": "planetar",
    "name": "Planetar",
    "size": "large",
    "type": "celestial",
    "ac": 19,
    "hp": 262,
    "hitDice": "21d10+147",
    "speed": 40,
    "abilities": {
      "str": 24,
      "dex": 20,
      "con": 24,
      "int": 19,
      "wis": 22,
      "cha": 25
    },
    "cr": 16,
    "xp": 15000,
    "attacks": [
      {
        "name": "Radiant Sword",
        "toHit": 12,
        "reach": 10,
        "damage": "2d6+7",
        "damageType": "slashing"
      },
      {
        "name": "Mace",
        "toHit": 4,
        "reach": 5,
        "damage": "1d6+2",
        "damageType": "bludgeoning"
      },
      {
        "name": "Mace",
        "toHit": 5,
        "reach": 5,
        "damage": "1d6+3",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Truesight 120 ft.; Passive Perception 21"
    ],
    "traits": []
  },
  "plesiosaurus": {
    "id": "plesiosaurus",
    "name": "Plesiosaurus",
    "size": "large",
    "type": "beast",
    "ac": 13,
    "hp": 68,
    "hitDice": "8d10+24",
    "speed": 20,
    "abilities": {
      "str": 18,
      "dex": 15,
      "con": 16,
      "int": 2,
      "wis": 12,
      "cha": 5
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 6,
        "reach": 10,
        "damage": "2d6+4",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 13"
    ],
    "traits": []
  },
  "polar-bear": {
    "id": "polar-bear",
    "name": "Polar Bear",
    "size": "large",
    "type": "beast",
    "ac": 12,
    "hp": 42,
    "hitDice": "5d10+15",
    "speed": 40,
    "abilities": {
      "str": 20,
      "dex": 14,
      "con": 16,
      "int": 2,
      "wis": 13,
      "cha": 7
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 7,
        "reach": 5,
        "damage": "1d8+5",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 15"
    ],
    "traits": []
  },
  "pony": {
    "id": "pony",
    "name": "Pony",
    "size": "medium",
    "type": "beast",
    "ac": 10,
    "hp": 11,
    "hitDice": "2d8+2",
    "speed": 40,
    "abilities": {
      "str": 15,
      "dex": 10,
      "con": 13,
      "int": 2,
      "wis": 11,
      "cha": 7
    },
    "cr": 0.125,
    "xp": 25,
    "attacks": [
      {
        "name": "Hooves",
        "toHit": 4,
        "reach": 5,
        "damage": "1d4+2",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 10"
    ],
    "traits": []
  },
  "pseudodragon": {
    "id": "pseudodragon",
    "name": "Pseudodragon",
    "size": "tiny",
    "type": "dragon",
    "ac": 14,
    "hp": 10,
    "hitDice": "3d4+3",
    "speed": 15,
    "abilities": {
      "str": 6,
      "dex": 15,
      "con": 13,
      "int": 10,
      "wis": 12,
      "cha": 10
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 4,
        "reach": 5,
        "damage": "1d4+2",
        "damageType": "piercing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 10 ft., Darkvision 60 ft.;"
    ],
    "traits": []
  },
  "pteranodon": {
    "id": "pteranodon",
    "name": "Pteranodon",
    "size": "medium",
    "type": "beast",
    "ac": 13,
    "hp": 13,
    "hitDice": "3d8",
    "speed": 10,
    "abilities": {
      "str": 12,
      "dex": 15,
      "con": 10,
      "int": 2,
      "wis": 9,
      "cha": 5
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 4,
        "reach": 5,
        "damage": "1d8+2",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 11"
    ],
    "traits": []
  },
  "purple-worm": {
    "id": "purple-worm",
    "name": "Purple Worm",
    "size": "gargantuan",
    "type": "monstrosity",
    "ac": 18,
    "hp": 247,
    "hitDice": "15d20+90",
    "speed": 50,
    "abilities": {
      "str": 28,
      "dex": 7,
      "con": 22,
      "int": 1,
      "wis": 8,
      "cha": 4
    },
    "cr": 15,
    "xp": 13000,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 14,
        "reach": 10,
        "damage": "3d8+9",
        "damageType": "piercing"
      },
      {
        "name": "Tail Stinger",
        "toHit": 14,
        "reach": 10,
        "damage": "2d6+9",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 30 ft., Tremorsense 60 ft.;"
    ],
    "traits": []
  },
  "rat": {
    "id": "rat",
    "name": "Rat",
    "size": "tiny",
    "type": "beast",
    "ac": 10,
    "hp": 1,
    "hitDice": "1d4",
    "speed": 20,
    "abilities": {
      "str": 2,
      "dex": 11,
      "con": 9,
      "int": 2,
      "wis": 10,
      "cha": 4
    },
    "cr": 0,
    "xp": 10,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 30 ft.; Passive Perception 12"
    ],
    "traits": []
  },
  "raven": {
    "id": "raven",
    "name": "Raven",
    "size": "tiny",
    "type": "beast",
    "ac": 12,
    "hp": 2,
    "hitDice": "1d4",
    "speed": 10,
    "abilities": {
      "str": 2,
      "dex": 14,
      "con": 10,
      "int": 5,
      "wis": 13,
      "cha": 6
    },
    "cr": 0,
    "xp": 10,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 13"
    ],
    "traits": []
  },
  "reef-shark": {
    "id": "reef-shark",
    "name": "Reef Shark",
    "size": "medium",
    "type": "beast",
    "ac": 12,
    "hp": 22,
    "hitDice": "4d8+4",
    "speed": 5,
    "abilities": {
      "str": 14,
      "dex": 15,
      "con": 13,
      "int": 1,
      "wis": 10,
      "cha": 4
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 4,
        "reach": 5,
        "damage": "2d4+2",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 30 ft.; Passive Perception 12"
    ],
    "traits": []
  },
  "remorhaz": {
    "id": "remorhaz",
    "name": "Remorhaz",
    "size": "huge",
    "type": "monstrosity",
    "ac": 17,
    "hp": 195,
    "hitDice": "17d12+85",
    "speed": 40,
    "abilities": {
      "str": 24,
      "dex": 13,
      "con": 21,
      "int": 4,
      "wis": 10,
      "cha": 5
    },
    "cr": 11,
    "xp": 7200,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 11,
        "reach": 10,
        "damage": "2d10+7",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft., Tremorsense 60 ft.;"
    ],
    "traits": []
  },
  "rhinoceros": {
    "id": "rhinoceros",
    "name": "Rhinoceros",
    "size": "large",
    "type": "beast",
    "ac": 13,
    "hp": 45,
    "hitDice": "6d10+12",
    "speed": 40,
    "abilities": {
      "str": 21,
      "dex": 8,
      "con": 15,
      "int": 2,
      "wis": 12,
      "cha": 6
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Gore",
        "toHit": 7,
        "reach": 5,
        "damage": "2d8+5",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 11"
    ],
    "traits": []
  },
  "riding-horse": {
    "id": "riding-horse",
    "name": "Riding Horse",
    "size": "large",
    "type": "beast",
    "ac": 11,
    "hp": 13,
    "hitDice": "2d10+2",
    "speed": 60,
    "abilities": {
      "str": 16,
      "dex": 13,
      "con": 12,
      "int": 2,
      "wis": 11,
      "cha": 7
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Hooves",
        "toHit": 5,
        "reach": 5,
        "damage": "1d8+3",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 10"
    ],
    "traits": []
  },
  "roc": {
    "id": "roc",
    "name": "Roc",
    "size": "gargantuan",
    "type": "monstrosity",
    "ac": 15,
    "hp": 248,
    "hitDice": "16d20+80",
    "speed": 20,
    "abilities": {
      "str": 28,
      "dex": 10,
      "con": 20,
      "int": 3,
      "wis": 10,
      "cha": 9
    },
    "cr": 11,
    "xp": 7200,
    "attacks": [
      {
        "name": "Beak",
        "toHit": 13,
        "reach": 10,
        "damage": "3d12+9",
        "damageType": "piercing"
      },
      {
        "name": "Talons",
        "toHit": 13,
        "reach": 5,
        "damage": "4d6+9",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 18"
    ],
    "traits": []
  },
  "roper": {
    "id": "roper",
    "name": "Roper",
    "size": "large",
    "type": "aberration",
    "ac": 20,
    "hp": 93,
    "hitDice": "11d10+33",
    "speed": 10,
    "abilities": {
      "str": 18,
      "dex": 8,
      "con": 17,
      "int": 7,
      "wis": 16,
      "cha": 6
    },
    "cr": 5,
    "xp": 1800,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 7,
        "reach": 5,
        "damage": "3d8+4",
        "damageType": "piercing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 16"
    ],
    "traits": []
  },
  "rust-monster": {
    "id": "rust-monster",
    "name": "Rust Monster",
    "size": "medium",
    "type": "monstrosity",
    "ac": 14,
    "hp": 33,
    "hitDice": "6d8+6",
    "speed": 40,
    "abilities": {
      "str": 13,
      "dex": 12,
      "con": 13,
      "int": 2,
      "wis": 13,
      "cha": 6
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 3,
        "reach": 5,
        "damage": "1d8+1",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 11"
    ],
    "traits": []
  },
  "saber-toothed-tiger": {
    "id": "saber-toothed-tiger",
    "name": "Saber-Toothed Tiger",
    "size": "large",
    "type": "beast",
    "ac": 13,
    "hp": 52,
    "hitDice": "7d10+14",
    "speed": 40,
    "abilities": {
      "str": 18,
      "dex": 17,
      "con": 15,
      "int": 3,
      "wis": 12,
      "cha": 8
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 6,
        "reach": 5,
        "damage": "2d6+4",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 15"
    ],
    "traits": []
  },
  "sahuagin-warrior": {
    "id": "sahuagin-warrior",
    "name": "Sahuagin Warrior",
    "size": "medium",
    "type": "fiend",
    "ac": 12,
    "hp": 22,
    "hitDice": "4d8+4",
    "speed": 30,
    "abilities": {
      "str": 13,
      "dex": 11,
      "con": 12,
      "int": 12,
      "wis": 13,
      "cha": 9
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Claw",
        "toHit": 3,
        "reach": 5,
        "damage": "1d6+1",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 120 ft.; Passive Perception 15"
    ],
    "traits": []
  },
  "scorpion": {
    "id": "scorpion",
    "name": "Scorpion",
    "size": "tiny",
    "type": "beast",
    "ac": 11,
    "hp": 1,
    "hitDice": "1d4",
    "speed": 10,
    "abilities": {
      "str": 2,
      "dex": 11,
      "con": 8,
      "int": 1,
      "wis": 8,
      "cha": 2
    },
    "cr": 0,
    "xp": 10,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 10 ft.; Passive Perception 9"
    ],
    "traits": []
  },
  "seahorse": {
    "id": "seahorse",
    "name": "Seahorse",
    "size": "tiny",
    "type": "beast",
    "ac": 12,
    "hp": 1,
    "hitDice": "1d4",
    "speed": 5,
    "abilities": {
      "str": 1,
      "dex": 12,
      "con": 8,
      "int": 1,
      "wis": 10,
      "cha": 2
    },
    "cr": 0,
    "xp": 0,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 12"
    ],
    "traits": []
  },
  "shadow": {
    "id": "shadow",
    "name": "Shadow",
    "size": "medium",
    "type": "undead",
    "ac": 12,
    "hp": 27,
    "hitDice": "5d8+5",
    "speed": 40,
    "abilities": {
      "str": 6,
      "dex": 14,
      "con": 13,
      "int": 6,
      "wis": 10,
      "cha": 8
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Draining Swipe",
        "toHit": 4,
        "reach": 5,
        "damage": "1d6+2",
        "damageType": "necrotic"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "shambling-mound": {
    "id": "shambling-mound",
    "name": "Shambling Mound",
    "size": "large",
    "type": "plant",
    "ac": 15,
    "hp": 110,
    "hitDice": "13d10+39",
    "speed": 30,
    "abilities": {
      "str": 18,
      "dex": 8,
      "con": 16,
      "int": 5,
      "wis": 10,
      "cha": 5
    },
    "cr": 5,
    "xp": 1800,
    "attacks": [
      {
        "name": "Charged Tendril",
        "toHit": 7,
        "reach": 10,
        "damage": "1d6+4",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 60 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "shield-guardian": {
    "id": "shield-guardian",
    "name": "Shield Guardian",
    "size": "large",
    "type": "construct",
    "ac": 17,
    "hp": 142,
    "hitDice": "15d10+60",
    "speed": 30,
    "abilities": {
      "str": 18,
      "dex": 8,
      "con": 18,
      "int": 7,
      "wis": 10,
      "cha": 3
    },
    "cr": 7,
    "xp": 2900,
    "attacks": [
      {
        "name": "Fist",
        "toHit": 7,
        "reach": 10,
        "damage": "2d6+4",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 10 ft., Darkvision 60 ft.;"
    ],
    "traits": []
  },
  "shrieker-fungus": {
    "id": "shrieker-fungus",
    "name": "Shrieker Fungus",
    "size": "medium",
    "type": "plant",
    "ac": 5,
    "hp": 13,
    "hitDice": "3d8",
    "speed": 5,
    "abilities": {
      "str": 1,
      "dex": 1,
      "con": 10,
      "int": 1,
      "wis": 3,
      "cha": 1
    },
    "cr": 0,
    "xp": 0,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 30 ft.; Passive Perception 6"
    ],
    "traits": []
  },
  "skeleton": {
    "id": "skeleton",
    "name": "Skeleton",
    "size": "medium",
    "type": "undead",
    "ac": 14,
    "hp": 13,
    "hitDice": "2d8+4",
    "speed": 30,
    "abilities": {
      "str": 10,
      "dex": 16,
      "con": 15,
      "int": 6,
      "wis": 8,
      "cha": 5
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Shortsword",
        "toHit": 5,
        "reach": 5,
        "damage": "1d6+3",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 9"
    ],
    "traits": []
  },
  "solar": {
    "id": "solar",
    "name": "Solar",
    "size": "large",
    "type": "celestial",
    "ac": 21,
    "hp": 297,
    "hitDice": "22d10+176",
    "speed": 50,
    "abilities": {
      "str": 26,
      "dex": 22,
      "con": 26,
      "int": 25,
      "wis": 25,
      "cha": 30
    },
    "cr": 21,
    "xp": 33000,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Truesight 120 ft.; Passive Perception 24"
    ],
    "traits": []
  },
  "specter": {
    "id": "specter",
    "name": "Specter",
    "size": "medium",
    "type": "undead",
    "ac": 12,
    "hp": 22,
    "hitDice": "5d8",
    "speed": 30,
    "abilities": {
      "str": 1,
      "dex": 14,
      "con": 11,
      "int": 10,
      "wis": 10,
      "cha": 11
    },
    "cr": 1,
    "xp": 200,
    "attacks": [
      {
        "name": "Life Drain",
        "toHit": 4,
        "reach": 5,
        "damage": "2d6",
        "damageType": "necrotic"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "sphinx-of-lore": {
    "id": "sphinx-of-lore",
    "name": "Sphinx of Lore",
    "size": "large",
    "type": "celestial",
    "ac": 17,
    "hp": 170,
    "hitDice": "20d10+60",
    "speed": 40,
    "abilities": {
      "str": 18,
      "dex": 15,
      "con": 16,
      "int": 18,
      "wis": 18,
      "cha": 18
    },
    "cr": 11,
    "xp": 7200,
    "attacks": [
      {
        "name": "Claw",
        "toHit": 8,
        "reach": 5,
        "damage": "3d6+4",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Truesight 120 ft.; Passive Perception 18"
    ],
    "traits": []
  },
  "sphinx-of-valor": {
    "id": "sphinx-of-valor",
    "name": "Sphinx of Valor",
    "size": "large",
    "type": "celestial",
    "ac": 17,
    "hp": 199,
    "hitDice": "19d10+95",
    "speed": 40,
    "abilities": {
      "str": 22,
      "dex": 10,
      "con": 20,
      "int": 16,
      "wis": 23,
      "cha": 18
    },
    "cr": 17,
    "xp": 18000,
    "attacks": [
      {
        "name": "Claw",
        "toHit": 12,
        "reach": 5,
        "damage": "4d6+6",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Truesight 120 ft.; Passive Perception 22"
    ],
    "traits": []
  },
  "sphinx-of-wonder": {
    "id": "sphinx-of-wonder",
    "name": "Sphinx of Wonder",
    "size": "tiny",
    "type": "celestial",
    "ac": 13,
    "hp": 24,
    "hitDice": "7d4+7",
    "speed": 20,
    "abilities": {
      "str": 6,
      "dex": 17,
      "con": 13,
      "int": 15,
      "wis": 12,
      "cha": 11
    },
    "cr": 1,
    "xp": 200,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 5,
        "reach": 5,
        "damage": "1d4+3",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 11"
    ],
    "traits": []
  },
  "spider": {
    "id": "spider",
    "name": "Spider",
    "size": "tiny",
    "type": "beast",
    "ac": 12,
    "hp": 1,
    "hitDice": "1d4",
    "speed": 20,
    "abilities": {
      "str": 2,
      "dex": 14,
      "con": 8,
      "int": 1,
      "wis": 10,
      "cha": 2
    },
    "cr": 0,
    "xp": 10,
    "attacks": [
      {
        "name": "Bites",
        "toHit": 4,
        "reach": 5,
        "damage": "2d4",
        "damageType": "piercing"
      },
      {
        "name": "Bites",
        "toHit": 3,
        "reach": 5,
        "damage": "2d4+1",
        "damageType": "poison"
      },
      {
        "name": "Bites",
        "toHit": 5,
        "reach": 5,
        "damage": "2d4+3",
        "damageType": "piercing"
      },
      {
        "name": "Bites",
        "toHit": 2,
        "reach": 5,
        "damage": "2d4",
        "damageType": "piercing"
      },
      {
        "name": "Beaks",
        "toHit": 4,
        "reach": 5,
        "damage": "1d6+2",
        "damageType": "piercing"
      },
      {
        "name": "Bites",
        "toHit": 6,
        "reach": 5,
        "damage": "1d8+4",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 30 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "spirit-naga": {
    "id": "spirit-naga",
    "name": "Spirit Naga",
    "size": "large",
    "type": "fiend",
    "ac": 17,
    "hp": 135,
    "hitDice": "18d10+36",
    "speed": 40,
    "abilities": {
      "str": 18,
      "dex": 17,
      "con": 14,
      "int": 16,
      "wis": 15,
      "cha": 16
    },
    "cr": 8,
    "xp": 3900,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 7,
        "reach": 10,
        "damage": "1d6+4",
        "damageType": "piercing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 12"
    ],
    "traits": []
  },
  "sprite": {
    "id": "sprite",
    "name": "Sprite",
    "size": "tiny",
    "type": "fey",
    "ac": 15,
    "hp": 10,
    "hitDice": "4d4",
    "speed": 10,
    "abilities": {
      "str": 3,
      "dex": 18,
      "con": 10,
      "int": 14,
      "wis": 13,
      "cha": 11
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Needle Sword",
        "toHit": 6,
        "reach": 5,
        "damage": "1d4+4",
        "damageType": "piercing"
      },
      {
        "name": "Shortsword",
        "toHit": 4,
        "reach": 5,
        "damage": "1d6+2",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 13"
    ],
    "traits": []
  },
  "steam-mephit": {
    "id": "steam-mephit",
    "name": "Steam Mephit",
    "size": "small",
    "type": "elemental",
    "ac": 10,
    "hp": 17,
    "hitDice": "5d6",
    "speed": 30,
    "abilities": {
      "str": 5,
      "dex": 11,
      "con": 10,
      "int": 11,
      "wis": 10,
      "cha": 12
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Claw",
        "toHit": 2,
        "reach": 5,
        "damage": "1d4",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "stirge": {
    "id": "stirge",
    "name": "Stirge",
    "size": "tiny",
    "type": "monstrosity",
    "ac": 13,
    "hp": 5,
    "hitDice": "2d4",
    "speed": 10,
    "abilities": {
      "str": 4,
      "dex": 16,
      "con": 11,
      "int": 2,
      "wis": 8,
      "cha": 6
    },
    "cr": 0.125,
    "xp": 25,
    "attacks": [
      {
        "name": "Proboscis",
        "toHit": 5,
        "reach": 5,
        "damage": "1d6+3",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 9"
    ],
    "traits": []
  },
  "stone-giant": {
    "id": "stone-giant",
    "name": "Stone Giant",
    "size": "huge",
    "type": "giant",
    "ac": 17,
    "hp": 126,
    "hitDice": "11d12+55",
    "speed": 40,
    "abilities": {
      "str": 23,
      "dex": 15,
      "con": 20,
      "int": 10,
      "wis": 12,
      "cha": 9
    },
    "cr": 7,
    "xp": 2900,
    "attacks": [
      {
        "name": "Stone Club",
        "toHit": 9,
        "reach": 15,
        "damage": "3d10+6",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 14"
    ],
    "traits": []
  },
  "stone-golem": {
    "id": "stone-golem",
    "name": "Stone Golem",
    "size": "large",
    "type": "construct",
    "ac": 18,
    "hp": 220,
    "hitDice": "21d10+105",
    "speed": 30,
    "abilities": {
      "str": 22,
      "dex": 9,
      "con": 20,
      "int": 3,
      "wis": 11,
      "cha": 1
    },
    "cr": 10,
    "xp": 5900,
    "attacks": [
      {
        "name": "Slam",
        "toHit": 10,
        "reach": 5,
        "damage": "2d8+6",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 120 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "storm-giant": {
    "id": "storm-giant",
    "name": "Storm Giant",
    "size": "huge",
    "type": "giant",
    "ac": 16,
    "hp": 230,
    "hitDice": "20d12+100",
    "speed": 50,
    "abilities": {
      "str": 29,
      "dex": 14,
      "con": 20,
      "int": 16,
      "wis": 20,
      "cha": 18
    },
    "cr": 13,
    "xp": 10000,
    "attacks": [
      {
        "name": "Storm Sword",
        "toHit": 14,
        "reach": 10,
        "damage": "4d6+9",
        "damageType": "slashing"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 120 ft., Truesight 30 ft.;"
    ],
    "traits": []
  },
  "succubus": {
    "id": "succubus",
    "name": "Succubus",
    "size": "medium",
    "type": "fiend",
    "ac": 15,
    "hp": 71,
    "hitDice": "13d8+13",
    "speed": 30,
    "abilities": {
      "str": 8,
      "dex": 17,
      "con": 13,
      "int": 15,
      "wis": 12,
      "cha": 20
    },
    "cr": 4,
    "xp": 1100,
    "attacks": [
      {
        "name": "Fiendish Touch",
        "toHit": 7,
        "reach": 5,
        "damage": "2d10+5",
        "damageType": "psychic"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 15"
    ],
    "traits": []
  },
  "tarrasque": {
    "id": "tarrasque",
    "name": "Tarrasque",
    "size": "gargantuan",
    "type": "monstrosity",
    "ac": 25,
    "hp": 697,
    "hitDice": "34d20+340",
    "speed": 60,
    "abilities": {
      "str": 30,
      "dex": 11,
      "con": 30,
      "int": 3,
      "wis": 11,
      "cha": 11
    },
    "cr": 30,
    "xp": 155000,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 19,
        "reach": 15,
        "damage": "4d12+10",
        "damageType": "piercing"
      },
      {
        "name": "Claw",
        "toHit": 19,
        "reach": 15,
        "damage": "4d8+10",
        "damageType": "slashing"
      },
      {
        "name": "Tail",
        "toHit": 19,
        "reach": 30,
        "damage": "3d8+10",
        "damageType": "bludgeoning"
      },
      {
        "name": "Mace",
        "toHit": 4,
        "reach": 5,
        "damage": "1d6+2",
        "damageType": "bludgeoning"
      },
      {
        "name": "Warhammer",
        "toHit": 5,
        "reach": 5,
        "damage": "2d8+3",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 120 ft.; Passive Perception 19"
    ],
    "traits": []
  },
  "tiger": {
    "id": "tiger",
    "name": "Tiger",
    "size": "large",
    "type": "beast",
    "ac": 13,
    "hp": 30,
    "hitDice": "4d10+8",
    "speed": 40,
    "abilities": {
      "str": 17,
      "dex": 16,
      "con": 14,
      "int": 3,
      "wis": 12,
      "cha": 8
    },
    "cr": 1,
    "xp": 200,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 5,
        "reach": 5,
        "damage": "2d6+3",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 13"
    ],
    "traits": []
  },
  "treant": {
    "id": "treant",
    "name": "Treant",
    "size": "huge",
    "type": "plant",
    "ac": 16,
    "hp": 138,
    "hitDice": "12d12+60",
    "speed": 30,
    "abilities": {
      "str": 23,
      "dex": 8,
      "con": 21,
      "int": 12,
      "wis": 16,
      "cha": 12
    },
    "cr": 9,
    "xp": 5000,
    "attacks": [
      {
        "name": "Slam",
        "toHit": 10,
        "reach": 5,
        "damage": "3d6+6",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 2,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 13"
    ],
    "traits": []
  },
  "troll": {
    "id": "troll",
    "name": "Troll",
    "size": "large",
    "type": "giant",
    "ac": 15,
    "hp": 94,
    "hitDice": "9d10+45",
    "speed": 30,
    "abilities": {
      "str": 18,
      "dex": 13,
      "con": 20,
      "int": 7,
      "wis": 9,
      "cha": 7
    },
    "cr": 5,
    "xp": 1800,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 7,
        "reach": 10,
        "damage": "2d6+4",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 15"
    ],
    "traits": []
  },
  "troll-limb": {
    "id": "troll-limb",
    "name": "Troll Limb",
    "size": "small",
    "type": "giant",
    "ac": 13,
    "hp": 14,
    "hitDice": "4d6",
    "speed": 20,
    "abilities": {
      "str": 18,
      "dex": 12,
      "con": 10,
      "int": 1,
      "wis": 9,
      "cha": 1
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 6,
        "reach": 5,
        "damage": "2d4+4",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 9"
    ],
    "traits": []
  },
  "tyrannosaurus-rex": {
    "id": "tyrannosaurus-rex",
    "name": "Tyrannosaurus Rex",
    "size": "huge",
    "type": "beast",
    "ac": 13,
    "hp": 136,
    "hitDice": "13d12+52",
    "speed": 50,
    "abilities": {
      "str": 25,
      "dex": 10,
      "con": 19,
      "int": 2,
      "wis": 12,
      "cha": 9
    },
    "cr": 8,
    "xp": 3900,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 10,
        "reach": 10,
        "damage": "4d12+7",
        "damageType": "piercing"
      },
      {
        "name": "Tail",
        "toHit": 10,
        "reach": 15,
        "damage": "4d8+7",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 14"
    ],
    "traits": []
  },
  "unicorn": {
    "id": "unicorn",
    "name": "Unicorn",
    "size": "large",
    "type": "celestial",
    "ac": 12,
    "hp": 97,
    "hitDice": "13d10+26",
    "speed": 50,
    "abilities": {
      "str": 18,
      "dex": 14,
      "con": 15,
      "int": 11,
      "wis": 17,
      "cha": 16
    },
    "cr": 5,
    "xp": 1800,
    "attacks": [
      {
        "name": "Hooves",
        "toHit": 7,
        "reach": 5,
        "damage": "2d6+4",
        "damageType": "bludgeoning"
      },
      {
        "name": "Radiant Horn",
        "toHit": 7,
        "reach": 5,
        "damage": "1d10+4",
        "damageType": "radiant"
      },
      {
        "name": "Claw",
        "toHit": 6,
        "reach": 5,
        "damage": "2d4+3",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 13"
    ],
    "traits": []
  },
  "venomous-snake": {
    "id": "venomous-snake",
    "name": "Venomous Snake",
    "size": "tiny",
    "type": "beast",
    "ac": 12,
    "hp": 5,
    "hitDice": "2d4",
    "speed": 30,
    "abilities": {
      "str": 2,
      "dex": 15,
      "con": 11,
      "int": 1,
      "wis": 10,
      "cha": 3
    },
    "cr": 0.125,
    "xp": 25,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 4,
        "reach": 5,
        "damage": "1d4+2",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 10 ft.; Passive Perception 10"
    ],
    "traits": []
  },
  "violet-fungus": {
    "id": "violet-fungus",
    "name": "Violet Fungus",
    "size": "medium",
    "type": "plant",
    "ac": 5,
    "hp": 18,
    "hitDice": "4d8",
    "speed": 5,
    "abilities": {
      "str": 3,
      "dex": 1,
      "con": 10,
      "int": 1,
      "wis": 3,
      "cha": 1
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Rotting Touch",
        "toHit": 2,
        "reach": 10,
        "damage": "1d8",
        "damageType": "necrotic"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 30 ft.; Passive Perception 6"
    ],
    "traits": []
  },
  "vulture": {
    "id": "vulture",
    "name": "Vulture",
    "size": "medium",
    "type": "beast",
    "ac": 10,
    "hp": 5,
    "hitDice": "1d8+1",
    "speed": 10,
    "abilities": {
      "str": 7,
      "dex": 10,
      "con": 13,
      "int": 2,
      "wis": 12,
      "cha": 4
    },
    "cr": 0,
    "xp": 10,
    "attacks": [
      {
        "name": "Beak",
        "toHit": 2,
        "reach": 5,
        "damage": "1d4",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 13"
    ],
    "traits": []
  },
  "warhorse": {
    "id": "warhorse",
    "name": "Warhorse",
    "size": "large",
    "type": "beast",
    "ac": 11,
    "hp": 19,
    "hitDice": "3d10+3",
    "speed": 60,
    "abilities": {
      "str": 18,
      "dex": 12,
      "con": 13,
      "int": 2,
      "wis": 12,
      "cha": 7
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Hooves",
        "toHit": 6,
        "reach": 5,
        "damage": "2d4+4",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 11"
    ],
    "traits": []
  },
  "warhorse-skeleton": {
    "id": "warhorse-skeleton",
    "name": "Warhorse Skeleton",
    "size": "large",
    "type": "undead",
    "ac": 13,
    "hp": 22,
    "hitDice": "3d10+6",
    "speed": 60,
    "abilities": {
      "str": 18,
      "dex": 12,
      "con": 15,
      "int": 2,
      "wis": 8,
      "cha": 5
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Hooves",
        "toHit": 6,
        "reach": 5,
        "damage": "1d6+4",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 9"
    ],
    "traits": []
  },
  "weasel": {
    "id": "weasel",
    "name": "Weasel",
    "size": "tiny",
    "type": "beast",
    "ac": 13,
    "hp": 1,
    "hitDice": "1d4",
    "speed": 30,
    "abilities": {
      "str": 3,
      "dex": 16,
      "con": 8,
      "int": 2,
      "wis": 12,
      "cha": 3
    },
    "cr": 0,
    "xp": 10,
    "attacks": [],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 13"
    ],
    "traits": []
  },
  "will-o-wisp": {
    "id": "will-o-wisp",
    "name": "Will-o’-Wisp",
    "size": "tiny",
    "type": "undead",
    "ac": 19,
    "hp": 27,
    "hitDice": "11d4",
    "speed": 5,
    "abilities": {
      "str": 1,
      "dex": 28,
      "con": 10,
      "int": 13,
      "wis": 14,
      "cha": 11
    },
    "cr": 2,
    "xp": 450,
    "attacks": [
      {
        "name": "Shock",
        "toHit": 4,
        "reach": 5,
        "damage": "2d8+2",
        "damageType": "lightning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 120 ft.; Passive Perception 12"
    ],
    "traits": []
  },
  "winter-wolf": {
    "id": "winter-wolf",
    "name": "Winter Wolf",
    "size": "large",
    "type": "monstrosity",
    "ac": 13,
    "hp": 75,
    "hitDice": "10d10+20",
    "speed": 50,
    "abilities": {
      "str": 18,
      "dex": 13,
      "con": 14,
      "int": 7,
      "wis": 12,
      "cha": 8
    },
    "cr": 3,
    "xp": 700,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 6,
        "reach": 5,
        "damage": "2d6+4",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Passive Perception 15"
    ],
    "traits": []
  },
  "wolf": {
    "id": "wolf",
    "name": "Wolf",
    "size": "medium",
    "type": "beast",
    "ac": 12,
    "hp": 11,
    "hitDice": "2d8+2",
    "speed": 40,
    "abilities": {
      "str": 14,
      "dex": 15,
      "con": 12,
      "int": 3,
      "wis": 12,
      "cha": 6
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 4,
        "reach": 5,
        "damage": "1d6+2",
        "damageType": "piercing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 15"
    ],
    "traits": []
  },
  "worg": {
    "id": "worg",
    "name": "Worg",
    "size": "large",
    "type": "fey",
    "ac": 13,
    "hp": 26,
    "hitDice": "4d10+4",
    "speed": 50,
    "abilities": {
      "str": 16,
      "dex": 13,
      "con": 13,
      "int": 7,
      "wis": 11,
      "cha": 8
    },
    "cr": 0.5,
    "xp": 100,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 5,
        "reach": 5,
        "damage": "1d8+3",
        "damageType": "piercing"
      },
      {
        "name": "Life Drain",
        "toHit": 6,
        "reach": 5,
        "damage": "4d8+3",
        "damageType": "necrotic"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 14"
    ],
    "traits": []
  },
  "xorn": {
    "id": "xorn",
    "name": "Xorn",
    "size": "medium",
    "type": "elemental",
    "ac": 19,
    "hp": 84,
    "hitDice": "8d8+48",
    "speed": 20,
    "abilities": {
      "str": 17,
      "dex": 10,
      "con": 22,
      "int": 11,
      "wis": 10,
      "cha": 11
    },
    "cr": 5,
    "xp": 1800,
    "attacks": [
      {
        "name": "Bite",
        "toHit": 6,
        "reach": 5,
        "damage": "4d6+3",
        "damageType": "piercing"
      },
      {
        "name": "Claw",
        "toHit": 6,
        "reach": 5,
        "damage": "1d10+3",
        "damageType": "slashing"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft., Tremorsense 60 ft.;"
    ],
    "traits": []
  },
  "young-brass-dragon": {
    "id": "young-brass-dragon",
    "name": "Young Brass Dragon",
    "size": "large",
    "type": "dragon",
    "ac": 17,
    "hp": 110,
    "hitDice": "13d10+39",
    "speed": 40,
    "abilities": {
      "str": 19,
      "dex": 10,
      "con": 17,
      "int": 12,
      "wis": 11,
      "cha": 15
    },
    "cr": 6,
    "xp": 2300,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 7,
        "reach": 10,
        "damage": "2d10+4",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 30 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "young-bronze-dragon": {
    "id": "young-bronze-dragon",
    "name": "Young Bronze Dragon",
    "size": "large",
    "type": "dragon",
    "ac": 17,
    "hp": 142,
    "hitDice": "15d10+60",
    "speed": 40,
    "abilities": {
      "str": 21,
      "dex": 10,
      "con": 19,
      "int": 14,
      "wis": 13,
      "cha": 17
    },
    "cr": 8,
    "xp": 3900,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 8,
        "reach": 10,
        "damage": "2d10+5",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 30 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "young-green-dragon": {
    "id": "young-green-dragon",
    "name": "Young Green Dragon",
    "size": "large",
    "type": "dragon",
    "ac": 18,
    "hp": 136,
    "hitDice": "16d10+48",
    "speed": 40,
    "abilities": {
      "str": 19,
      "dex": 12,
      "con": 17,
      "int": 16,
      "wis": 13,
      "cha": 15
    },
    "cr": 8,
    "xp": 3900,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 7,
        "reach": 10,
        "damage": "2d6+4",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 30 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "young-red-dragon": {
    "id": "young-red-dragon",
    "name": "Young Red Dragon",
    "size": "large",
    "type": "dragon",
    "ac": 18,
    "hp": 178,
    "hitDice": "17d10+85",
    "speed": 40,
    "abilities": {
      "str": 23,
      "dex": 10,
      "con": 21,
      "int": 14,
      "wis": 11,
      "cha": 19
    },
    "cr": 10,
    "xp": 5900,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 10,
        "reach": 10,
        "damage": "2d6+6",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 30 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "young-silver-dragon": {
    "id": "young-silver-dragon",
    "name": "Young Silver Dragon",
    "size": "large",
    "type": "dragon",
    "ac": 18,
    "hp": 168,
    "hitDice": "16d10+80",
    "speed": 40,
    "abilities": {
      "str": 23,
      "dex": 10,
      "con": 21,
      "int": 14,
      "wis": 11,
      "cha": 19
    },
    "cr": 9,
    "xp": 5000,
    "attacks": [
      {
        "name": "Rend",
        "toHit": 10,
        "reach": 10,
        "damage": "2d8+6",
        "damageType": "slashing"
      }
    ],
    "multiattack": 3,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Blindsight 30 ft., Darkvision 120 ft.;"
    ],
    "traits": []
  },
  "zombie": {
    "id": "zombie",
    "name": "Zombie",
    "size": "medium",
    "type": "undead",
    "ac": 8,
    "hp": 15,
    "hitDice": "2d8+6",
    "speed": 20,
    "abilities": {
      "str": 13,
      "dex": 6,
      "con": 16,
      "int": 3,
      "wis": 6,
      "cha": 5
    },
    "cr": 0.25,
    "xp": 50,
    "attacks": [
      {
        "name": "Slam",
        "toHit": 3,
        "reach": 5,
        "damage": "1d8+1",
        "damageType": "bludgeoning"
      }
    ],
    "multiattack": 1,
    "skills": [],
    "damageResistances": [],
    "damageImmunities": [],
    "conditionImmunities": [],
    "senses": [
      "Darkvision 60 ft.; Passive Perception 8"
    ],
    "traits": []
  }
} as unknown as Record<string, MonsterInput>;
