import type {
  ArmorClass,
  Character,
  DiceNotation,
  DamageType,
  Effect,
  Modifier,
  Outcome,
  Resolution,
  RollMode,
  Seed,
} from '@lantern/schema';
import { rollD20, rollDamage, createRng, rollDie } from '../dice/index.js';
import { abilityModifier, proficiencyBonus } from '../checks/index.js';

/**
 * Initiative, attack rolls vs AC, damage, death saves.
 */

// ---------------------------------------------------------------------------
// Initiative
// ---------------------------------------------------------------------------

export interface InitiativeEntry {
  id: string;
  roll: number;
  dexScore: number;
}

/**
 * Roll initiative for a set of combatants. Ties break by Dex score, then by
 * a deterministic coin from the seed — never by insertion order, which would
 * make replay depend on array construction.
 */
export function rollInitiative(
  seed: Seed,
  combatants: ReadonlyArray<{ id: string; dexScore: number }>,
): InitiativeEntry[] {
  const entries = combatants.map((c) => {
    const record = rollD20(`${seed}:init:${c.id}`);
    return { id: c.id, roll: record.natural + abilityModifier(c.dexScore), dexScore: c.dexScore };
  });

  return entries.sort((a, b) => {
    if (b.roll !== a.roll) return b.roll - a.roll;
    if (b.dexScore !== a.dexScore) return b.dexScore - a.dexScore;
    // Deterministic tiebreak from the seed, stable across replays.
    const coin = createRng(`${seed}:tie:${a.id}:${b.id}`)();
    return coin < 0.5 ? -1 : 1;
  });
}

// ---------------------------------------------------------------------------
// Attacks
// ---------------------------------------------------------------------------

export interface AttackInput {
  seed: Seed;
  attackerId: string;
  targetId: string;
  targetAc: ArmorClass;
  /** Broken out by source so the tray can show why. */
  attackModifiers: Modifier[];
  damage: DiceNotation;
  damageType: DamageType;
  /** Flat damage bonus attributed by source (usually the ability mod). */
  damageModifiers?: Modifier[];
  mode?: RollMode;
}

/**
 * One attack roll against AC, with damage on hit.
 *
 * Nat 20 always hits and doubles damage dice; nat 1 always misses. Between
 * those, total vs AC decides. The Resolution carries everything: both d20
 * faces under advantage, each modifier by name, the AC, the margin, and the
 * damage dice individually.
 */
export function resolveAttack(input: AttackInput): Resolution {
  const mode = input.mode ?? 'normal';
  const record = rollD20(`${input.seed}:attack`, mode);
  const attackTotal = record.natural + input.attackModifiers.reduce((s, m) => s + m.value, 0);

  const isCrit = record.natural === 20;
  const isFumble = record.natural === 1;
  const hits = isCrit || (!isFumble && attackTotal >= input.targetAc);

  let outcome: Outcome;
  if (isCrit) outcome = 'critical-success';
  else if (isFumble) outcome = 'critical-failure';
  else outcome = hits ? 'success' : 'failure';

  const effects: Effect[] = [];
  if (hits) {
    const dmg = rollDamage(`${input.seed}:damage`, input.damage, isCrit);
    const flatBonus =
      dmg.modifier + (input.damageModifiers ?? []).reduce((s, m) => s + m.value, 0);
    const amount = Math.max(0, dmg.record.natural + flatBonus);
    effects.push({
      kind: 'damage',
      target: input.targetId,
      amount,
      damageType: input.damageType,
      roll: dmg.record,
    });
  }

  return {
    actionType: 'attack',
    checkKind: 'attack-roll',
    roll: record,
    modifiers: input.attackModifiers,
    total: attackTotal,
    ac: input.targetAc,
    margin: attackTotal - input.targetAc,
    outcome,
    effects,
  };
}

/** Attack modifiers for a character wielding a weapon. */
export function characterAttackModifiers(
  character: Character,
  options: { finesse?: boolean; ranged?: boolean; proficient?: boolean },
): { attack: Modifier[]; damage: Modifier[] } {
  const useDex = options.ranged || (options.finesse && character.abilities.dex > character.abilities.str);
  const ability = useDex ? 'dex' : 'str';
  const abilityMod = abilityModifier(character.abilities[ability]);
  const attack: Modifier[] = [{ source: ability, value: abilityMod }];
  if (options.proficient !== false) {
    attack.push({ source: 'proficiency', value: proficiencyBonus(character.level) });
  }
  return { attack, damage: [{ source: ability, value: abilityMod }] };
}

// ---------------------------------------------------------------------------
// Death saves
// ---------------------------------------------------------------------------

export interface DeathSaveResult {
  resolution: Resolution;
  character: Character;
  /** Set when the save sequence has concluded. */
  final?: 'stable' | 'dead' | 'conscious';
}

/**
 * dnd-101 §11. Straight d20, no modifiers: 10+ succeeds, nat 20 restores 1 HP,
 * nat 1 counts as two failures. Three successes stabilize; three failures kill.
 */
export function resolveDeathSave(seed: Seed, character: Character): DeathSaveResult {
  const record = rollD20(`${seed}:death-save`);
  const face = record.natural;

  let successes = character.deathSaveSuccesses;
  let failures = character.deathSaveFailures;
  let outcome: 'success' | 'failure' | 'critical-success' | 'critical-failure';
  let final: DeathSaveResult['final'];
  let next: Character = character;

  if (face === 20) {
    outcome = 'critical-success';
    next = {
      ...character,
      hp: 1,
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
      conditions: character.conditions.filter((c) => c.condition !== 'unconscious'),
    };
    final = 'conscious';
  } else if (face === 1) {
    outcome = 'critical-failure';
    failures = Math.min(3, failures + 2);
    next = { ...character, deathSaveFailures: failures };
    if (failures >= 3) final = 'dead';
  } else if (face >= 10) {
    outcome = 'success';
    successes = Math.min(3, successes + 1);
    next = { ...character, deathSaveSuccesses: successes };
    if (successes >= 3) final = 'stable';
  } else {
    outcome = 'failure';
    failures = Math.min(3, failures + 1);
    next = { ...character, deathSaveFailures: failures };
    if (failures >= 3) final = 'dead';
  }

  const resolution: Resolution = {
    actionType: 'death-save',
    checkKind: 'death-save',
    roll: record,
    modifiers: [],
    total: face,
    dc: 10,
    margin: face - 10,
    outcome,
    effects: [
      {
        kind: 'death-save',
        target: character.id,
        outcome,
        successes: next.deathSaveSuccesses,
        failures: next.deathSaveFailures,
      },
    ],
  };

  return final !== undefined ? { resolution, character: next, final } : { resolution, character: next };
}

// ---------------------------------------------------------------------------
// Monster save vs a DC (for spells that force saves)
// ---------------------------------------------------------------------------

export function resolveMonsterSave(
  seed: Seed,
  monster: { id: string; scores: Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number> },
  ability: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha',
  dc: number,
): Resolution {
  const record = rollD20(`${seed}:save:${monster.id}`);
  const mod = abilityModifier(monster.scores[ability]);
  const total = record.natural + mod;
  return {
    actionType: 'saving-throw',
    checkKind: 'saving-throw',
    roll: record,
    modifiers: [{ source: ability, value: mod }],
    total,
    dc,
    margin: total - dc,
    outcome: total >= dc ? 'success' : 'failure',
    effects: [],
  };
}

export { rollDie };
