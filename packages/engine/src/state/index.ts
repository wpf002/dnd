import type { ActiveCondition, Character, Condition, Effect, RestKind, SpellLevel } from '@lantern/schema';

/**
 * Conditions, HP, spell slots. Pure state transitions — every function takes
 * a value and returns a new value; nothing mutates.
 */

// ---------------------------------------------------------------------------
// HP
// ---------------------------------------------------------------------------

/**
 * Apply damage. Temp HP is consumed first and does not carry negative.
 * Dropping to 0 applies `unconscious`; a character already at 0 is untouched
 * here — death-save escalation is combat's job, not generic state's.
 */
export function applyDamage(character: Character, amount: number): Character {
  if (amount <= 0) return character;

  const fromTemp = Math.min(character.tempHp, amount);
  const remainder = amount - fromTemp;
  const newHp = Math.max(0, character.hp - remainder);

  let conditions = character.conditions;
  if (newHp === 0 && character.hp > 0) {
    conditions = addCondition(conditions, { condition: 'unconscious' });
  }

  return { ...character, tempHp: character.tempHp - fromTemp, hp: newHp, conditions };
}

/**
 * Heal. Capped at max. Healing from 0 removes `unconscious` and resets death
 * saves — any healing at all brings a dying creature back.
 */
export function applyHealing(character: Character, amount: number): Character {
  if (amount <= 0) return character;
  // Ordinary healing does not raise the dead. Only resurrection clears `dead`,
  // and nothing in the SRD subset grants it yet.
  if (character.dead) return character;
  const wasDown = character.hp === 0;
  const newHp = Math.min(character.hpMax, character.hp + amount);

  return {
    ...character,
    hp: newHp,
    conditions: wasDown
      ? removeCondition(character.conditions, 'unconscious')
      : character.conditions,
    deathSaveSuccesses: wasDown ? 0 : character.deathSaveSuccesses,
    deathSaveFailures: wasDown ? 0 : character.deathSaveFailures,
  };
}

export function grantTempHp(character: Character, amount: number): Character {
  // Temp HP does not stack; take the larger grant.
  return { ...character, tempHp: Math.max(character.tempHp, amount) };
}

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

export function hasCondition(conditions: readonly ActiveCondition[], c: Condition): boolean {
  return conditions.some((a) => a.condition === c);
}

export function addCondition(
  conditions: readonly ActiveCondition[],
  next: ActiveCondition,
): ActiveCondition[] {
  // Exhaustion stacks by level; everything else is idempotent.
  if (next.condition === 'exhaustion') {
    const existing = conditions.find((c) => c.condition === 'exhaustion');
    if (existing) {
      const level = Math.min(6, (existing.level ?? 1) + (next.level ?? 1));
      return conditions.map((c) => (c.condition === 'exhaustion' ? { ...c, level } : c));
    }
    return [...conditions, { ...next, level: next.level ?? 1 }];
  }
  if (hasCondition(conditions, next.condition)) return [...conditions];
  return [...conditions, next];
}

export function removeCondition(
  conditions: readonly ActiveCondition[],
  c: Condition,
): ActiveCondition[] {
  return conditions.filter((a) => a.condition !== c);
}

/** Decrement round-scoped durations; drop what expires. */
export function tickConditions(conditions: readonly ActiveCondition[]): ActiveCondition[] {
  const out: ActiveCondition[] = [];
  for (const c of conditions) {
    if (c.remaining === undefined) {
      out.push(c);
    } else if (c.remaining > 1) {
      out.push({ ...c, remaining: c.remaining - 1 });
    }
    // remaining === 1 → expires, not carried forward
  }
  return out;
}

/**
 * Roll-affecting consequences of current conditions, per SRD.
 * The combat layer reads these when constructing attack rolls.
 */
export function conditionEffects(conditions: readonly ActiveCondition[]): {
  attackDisadvantage: boolean;
  attackedAdvantage: boolean;
  cannotAct: boolean;
  autoFailStrDex: boolean;
} {
  const has = (c: Condition) => hasCondition(conditions, c);
  const incapacitated =
    has('incapacitated') || has('paralyzed') || has('petrified') || has('stunned') || has('unconscious');
  return {
    attackDisadvantage: has('blinded') || has('frightened') || has('poisoned') || has('prone') || has('restrained'),
    attackedAdvantage:
      has('blinded') || has('paralyzed') || has('petrified') || has('restrained') || has('stunned') || has('unconscious'),
    cannotAct: incapacitated,
    autoFailStrDex: has('paralyzed') || has('petrified') || has('stunned') || has('unconscious'),
  };
}

// ---------------------------------------------------------------------------
// Spell slots
// ---------------------------------------------------------------------------

export function hasSlot(character: Character, level: SpellLevel): boolean {
  if (level === 0) return true; // cantrips
  return (character.spellcasting?.slotsRemaining[level] ?? 0) > 0;
}

/** Spend a slot. Throws if none remain — the caller must check `hasSlot` first. */
export function spendSlot(character: Character, level: SpellLevel): Character {
  if (level === 0) return character;
  const sc = character.spellcasting;
  if (!sc) throw new Error(`${character.id} has no spellcasting`);
  const remaining = sc.slotsRemaining[level] ?? 0;
  if (remaining <= 0) throw new Error(`${character.id} has no level-${level} slots`);
  const slotsRemaining = [...sc.slotsRemaining];
  slotsRemaining[level] = remaining - 1;
  return { ...character, spellcasting: { ...sc, slotsRemaining } };
}

// ---------------------------------------------------------------------------
// Rest
// ---------------------------------------------------------------------------

/**
 * dnd-101 §12. Short rest: hit-dice healing is a player choice made elsewhere;
 * this handles what recovers automatically. Long rest: full HP, all slots,
 * half of max hit dice back (minimum 1), one exhaustion level, conditions with
 * durations cleared.
 */
export function applyRest(character: Character, kind: RestKind): Character {
  if (kind === 'short') return character;
  // A long rest used to reset deathSaveFailures and heal to hpMax, which
  // silently resurrected anyone who had died. The dead rest no better than
  // they fought.
  if (character.dead) return character;

  const sc = character.spellcasting;
  const maxHitDice = character.level;
  const exhaustion = character.conditions.find((c) => c.condition === 'exhaustion');
  let conditions = character.conditions.filter((c) => c.remaining === undefined && c.condition !== 'exhaustion');
  if (exhaustion && (exhaustion.level ?? 1) > 1) {
    conditions = [...conditions, { ...exhaustion, level: (exhaustion.level ?? 1) - 1 }];
  }

  return {
    ...character,
    hp: character.hpMax,
    tempHp: 0,
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    hitDiceRemaining: Math.min(maxHitDice, character.hitDiceRemaining + Math.max(1, Math.floor(maxHitDice / 2))),
    conditions,
    spellcasting: sc ? { ...sc, slotsRemaining: [...sc.slotsMax] } : undefined,
  } as Character;
}

// ---------------------------------------------------------------------------
// Effect application — the bridge from Resolution back onto state
// ---------------------------------------------------------------------------

/**
 * Apply a Resolution's effects to a character (matching by target id).
 * Effects addressed to other combatants pass through untouched here — the
 * encounter loop routes them.
 */
export function applyEffectToCharacter(character: Character, effect: Effect): Character {
  switch (effect.kind) {
    case 'damage':
      return effect.target === character.id ? applyDamage(character, effect.amount) : character;
    case 'heal':
      return effect.target === character.id ? applyHealing(character, effect.amount) : character;
    case 'condition-applied':
      return effect.target === character.id
        ? {
            ...character,
            conditions: addCondition(character.conditions, {
              condition: effect.condition,
              ...(effect.duration !== undefined ? { remaining: effect.duration } : {}),
            }),
          }
        : character;
    case 'condition-removed':
      return effect.target === character.id
        ? { ...character, conditions: removeCondition(character.conditions, effect.condition) }
        : character;
    case 'slot-spent':
      return hasSlot(character, effect.level) && effect.level > 0
        ? spendSlot(character, effect.level)
        : character;
    default:
      return character;
  }
}
