import {
  BeatGraph,
  type Ability,
  type Beat,
  type BeatOption,
  type Character,
  type Encounter,
  type FlagValue,
  type Resolution,
  type Skill,
  type TurnRecord,
} from '@lantern/schema';
import {
  applyDamage,
  applyMutations,
  applyRest,
  castAtTarget,
  castHealing,
  characterAttackModifiers,
  evaluateGuard,
  passivePerception,
  resolveAttack,
  resolveCheck,
  resolveDeathSave,
  rollInitiative,
  type Flags,
} from '@lantern/engine';
import {
  ARMOR,
  MONSTERS,
  PREGENS,
  SPELLS,
  WEAPONS,
  type ArmorInput,
  type MonsterInput,
  type SpellInput,
  type WeaponInput,
} from '@lantern/srd';

/**
 * The Lantern game loop. App logic — the engine stays pure and this service
 * orchestrates it: guard evaluation, beat transitions, encounter execution,
 * improv budget accounting, and the turn log.
 *
 * Every mechanical outcome that happens here is a `Resolution` produced by
 * the engine and appended to the turn log with its inputs (invariant 5).
 */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface MonsterState {
  combatantId: string;
  statblock: string;
  name: string;
  hp: number;
  hpMax: number;
  ac: number;
}

export interface CombatState {
  encounterId: string;
  round: number;
  /** Initiative order of ids (party + monsters), fixed at combat start. */
  order: string[];
  /** Whose turn within `order`. */
  turnIndex: number;
  monsters: MonsterState[];
  fled: boolean;
}

export interface GameSession {
  id: string;
  graph: BeatGraph;
  party: Character[];
  flags: Flags;
  currentBeat: string;
  /** Improv spend per beat id. */
  improvSpent: Record<string, number>;
  combat: CombatState | null;
  turns: TurnRecord[];
  ended: boolean;
  seedCounter: number;
  /**
   * Defeats per encounter. A module writes no defeat ending, so an ingested
   * graph routes a loss straight back to the fight that caused it — a party
   * that cannot win one encounter loses it forever.
   */
  defeats: Record<string, number>;
}

/**
 * How many times the party may lose the same fight before the graph stops
 * sending them back to it. Chosen high enough that a bad-luck loss and a
 * regroup are ordinary, low enough that a genuinely unwinnable encounter
 * ends the session instead of grinding.
 */
export const DEFEAT_LIMIT = 3;

export interface TurnOutcome {
  session: GameSession;
  resolutions: Resolution[];
  /** Templated narration fallback lines, one per resolution. */
  narration: string[];
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

let sessionCounter = 0;

/**
 * @param party Carried party, for a campaign that spans books. Omitted for a
 *   standalone session, which starts from the level-3 pregens.
 */
export function createSession(
  graphInput: unknown,
  sessionSeed?: string,
  party?: readonly Character[],
): GameSession {
  const graph = BeatGraph.parse(graphInput);
  const id = sessionSeed ?? `session-${++sessionCounter}-${graph.id}`;
  const session: GameSession = {
    id,
    graph,
    party: (party ?? PREGENS).map((p) => structuredClone(p)),
    flags: {},
    currentBeat: graph.entry,
    improvSpent: {},
    combat: null,
    turns: [],
    ended: false,
    seedCounter: 0,
    defeats: {},
  };
  // Entering the entry beat may start a combat or apply entry mutations.
  return enterBeat(session, graph.entry).session;
}

function nextSeed(session: GameSession): string {
  session.seedCounter++;
  return `${session.id}:turn-${session.seedCounter}`;
}

function beatById(session: GameSession, id: string): Beat {
  const beat = session.graph.beats.find((b) => b.id === id);
  if (!beat) throw new Error(`beat '${id}' not in graph`);
  return beat;
}

function encounterById(session: GameSession, id: string): Encounter {
  const enc = session.graph.encounters.find((e) => e.id === id);
  if (!enc) throw new Error(`encounter '${id}' not in graph`);
  return enc;
}

// ---------------------------------------------------------------------------
// Templated narration — the fallback the turn never blocks on
// ---------------------------------------------------------------------------

export function templateNarration(res: Resolution): string {
  const roll = res.roll;
  if (!roll) return 'It happens without ceremony.';
  const margin = res.margin ?? 0;
  const closeness = Math.abs(margin) <= 2 ? 'barely ' : '';
  switch (res.outcome) {
    case 'critical-success':
      return `A natural ${roll.natural} — it could not have gone better.`;
    case 'critical-failure':
      return `A natural 1. It goes wrong in the way you will remember.`;
    case 'success':
      return `The ${roll.natural} holds: ${res.total} against ${res.dc ?? res.ac} — ${closeness}enough.`;
    case 'failure':
      return `The ${roll.natural} is not enough: ${res.total} against ${res.dc ?? res.ac}, ${closeness}short.`;
    default:
      return 'It resolves.';
  }
}

// ---------------------------------------------------------------------------
// Beat transitions
// ---------------------------------------------------------------------------

/**
 * Edge redirects are bounded. A graph whose edges cycle would otherwise hang
 * the turn; the linter cannot always prove termination, so the runtime refuses
 * rather than spins.
 */
const MAX_EDGE_REDIRECTS = 8;

function enterBeat(session: GameSession, beatId: string, redirects = 0): TurnOutcome {
  const beat = beatById(session, beatId);
  session.currentBeat = beatId;
  session.flags = applyMutations(session.flags, beat.onEntry);

  // Edges: "transitions not owned by an option — timed events, state-triggered
  // moves". Evaluated BEFORE the encounter starts, so a fight the party has
  // already won does not run a second time when they walk back through.
  //
  // These were declared in the schema and enumerated by the linter from the
  // beginning, and never evaluated here. Neither was `entryWhen` — an
  // authored ending guarded on a flag has been silently reachable all along.
  const edge = session.graph.edges.find(
    (e) => e.from === beatId && evaluateGuard(e.when, session.flags),
  );
  if (edge) {
    if (redirects >= MAX_EDGE_REDIRECTS) {
      throw new Error(
        `edge redirects from '${beatId}' exceeded ${MAX_EDGE_REDIRECTS} — the graph has an edge cycle`,
      );
    }
    return enterBeat(session, edge.to, redirects + 1);
  }

  if (beat.terminal) {
    session.ended = true;
    session.combat = null;
    return { session, resolutions: [], narration: [] };
  }

  if (beat.encounter) {
    return startCombat(session, beat.encounter);
  }

  session.combat = null;
  return { session, resolutions: [], narration: [] };
}

/** Options currently visible given the flags. */
export function visibleOptions(session: GameSession): BeatOption[] {
  const beat = beatById(session, session.currentBeat);
  return beat.options.filter((o) => {
    if (o.visibleWhen && !evaluateGuard(o.visibleWhen, session.flags)) return false;
    // `entryWhen` is the target's own condition: "must hold for this beat to
    // be enterable". An option leading somewhere unenterable is not offered.
    const target = session.graph.beats.find((b) => b.id === o.target);
    return !target || evaluateGuard(target.entryWhen, session.flags);
  });
}

export function chooseOption(session: GameSession, optionId: string): TurnOutcome {
  if (session.ended) throw new Error('the adventure has ended');
  if (session.combat) throw new Error('resolve the combat first');

  const beat = beatById(session, session.currentBeat);
  const option = visibleOptions(session).find((o) => o.id === optionId);
  if (!option) throw new Error(`option '${optionId}' is not available on beat '${beat.id}'`);

  session.flags = applyMutations(session.flags, option.effects);

  const resolutions: Resolution[] = [];
  let destination = option.target;

  if (option.requiresCheck) {
    const check = option.requiresCheck;
    // The most capable party member attempts it — solo-play convention.
    const actor = bestAtCheck(session.party, check.ability, check.skill);
    const res = resolveCheck({
      seed: nextSeed(session),
      character: actor,
      dc: check.dc,
      ability: check.ability,
      ...(check.skill ? { skill: check.skill } : {}),
    });
    resolutions.push(res);
    session.turns.push({ index: session.turns.length, resolution: res });
    if (res.outcome === 'failure' || res.outcome === 'critical-failure') {
      destination = check.onFailure;
    }
  }

  session.flags = applyMutations(session.flags, beat.onExit);
  const entry = enterBeat(session, destination);
  return {
    session,
    resolutions: [...resolutions, ...entry.resolutions],
    narration: [...resolutions.map(templateNarration), ...entry.narration],
  };
}

function bestAtCheck(party: Character[], ability: Ability, skill?: Skill): Character {
  // The dead attempt nothing. Fall back to the whole party only when everyone
  // is down, so the check still resolves rather than throwing mid-turn.
  const able = party.filter((p) => p.hp > 0 && !p.dead);
  const pool = able.length > 0 ? able : party;
  return [...pool].sort((a, b) => {
    const score = (c: Character) => {
      const abilityScore = c.abilities[ability];
      const prof = skill && c.skillProficiencies.includes(skill) ? 10 : 0;
      const expert = skill && c.skillExpertise.includes(skill) ? 10 : 0;
      return abilityScore + prof + expert;
    };
    return score(b) - score(a);
  })[0]!;
}

// ---------------------------------------------------------------------------
// Free text — the improv budget
// ---------------------------------------------------------------------------

export interface FreeTextOutcome extends TurnOutcome {
  accepted: boolean;
  /** In-fiction constraint line when the action could not be absorbed. */
  refusal?: string;
}

/**
 * Free-text handling, pre-Flint: without a parse into a valid Action the
 * engine cannot execute anything, so the fail-closed path *is* the path.
 * When ANTHROPIC_API_KEY is present, the route layer upgrades this by calling
 * intent-parse first; on any parse failure it lands back here.
 *
 * What is implemented now: budget accounting and the in-fiction refusal —
 * invariant 7. When the budget is spent, constraint, never silent override.
 */
export function freeTextConstraint(session: GameSession, rawInput: string): FreeTextOutcome {
  const beat = beatById(session, session.currentBeat);
  const spent = session.improvSpent[beat.id] ?? 0;

  if (spent >= beat.improvBudget) {
    return {
      session,
      resolutions: [],
      narration: [],
      accepted: false,
      refusal:
        'The moment closes around you like the tide around a stone — whatever you intended, ' +
        'the village has its own idea of what happens next. The paths before you remain.',
    };
  }

  session.improvSpent[beat.id] = spent + 1;
  const res: Resolution = {
    actionType: 'interact',
    checkKind: 'none',
    modifiers: [],
    outcome: 'automatic',
    effects: [],
  };
  session.turns.push({ index: session.turns.length, rawInput, resolution: res });
  return {
    session,
    resolutions: [res],
    narration: [
      'You act off the written path. The world bends to absorb it — this time.',
    ],
    accepted: true,
  };
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

function startCombat(session: GameSession, encounterId: string): TurnOutcome {
  const enc = encounterById(session, encounterId);
  const monsters: MonsterState[] = [];
  for (const combatant of enc.combatants) {
    const statblock = (MONSTERS as Record<string, MonsterInput>)[combatant.statblock];
    if (!statblock) throw new Error(`unknown statblock '${combatant.statblock}'`);
    for (let i = 0; i < combatant.count; i++) {
      monsters.push({
        combatantId: combatant.count > 1 ? `${combatant.id}-${i + 1}` : combatant.id,
        statblock: combatant.statblock,
        name: statblock.name,
        hp: combatant.hpOverride ?? statblock.hp,
        hpMax: combatant.hpOverride ?? statblock.hp,
        ac: statblock.ac,
      });
    }
  }

  const order = rollInitiative(nextSeed(session), [
    ...session.party.filter((p) => p.hp > 0).map((p) => ({ id: p.id, dexScore: p.abilities.dex })),
    ...monsters.map((m) => ({
      id: m.combatantId,
      dexScore: (MONSTERS as Record<string, MonsterInput>)[m.statblock]!.abilities.dex,
    })),
  ]);

  session.combat = {
    encounterId,
    round: 1,
    order: order.map((o) => o.id),
    turnIndex: 0,
    monsters,
    fled: false,
  };
  // Monsters at the top of the order act immediately so the player never
  // faces a stale "whose turn is it" state.
  return advanceMonsters(session);
}

function livingMonsters(combat: CombatState): MonsterState[] {
  return combat.monsters.filter((m) => m.hp > 0);
}

function combatOver(session: GameSession): 'victory' | 'defeat' | null {
  const combat = session.combat!;
  if (livingMonsters(combat).length === 0) return 'victory';
  if (session.party.every((p) => p.hp <= 0)) return 'defeat';
  return null;
}

function finishCombat(session: GameSession, outcome: 'victory' | 'defeat' | 'flee'): TurnOutcome {
  const enc = encounterById(session, session.combat!.encounterId);
  session.combat = null;
  // Defeat never dead-ends: the graph authors where failure leads (Ch8 §VII).
  const destination =
    outcome === 'victory' ? enc.onVictory : outcome === 'defeat' ? enc.onDefeat : (enc.onFlee ?? enc.onDefeat);
  if (outcome === 'defeat') {
    const lost = (session.defeats[enc.id] ?? 0) + 1;
    session.defeats[enc.id] = lost;

    // Losing the same fight over and over is not a story, it is a loop. The
    // graph has nowhere else to send them — a module does not write a defeat
    // ending — so the session ends here rather than grinding.
    if (lost >= DEFEAT_LIMIT) {
      session.ended = true;
      session.combat = null;
      return {
        session,
        resolutions: [],
        narration: [
          `The party has been beaten back at ${enc.title} ${lost} times. They do not try a ${lost + 1}th.`,
        ],
      };
    }

    // Everyone dead is the end of the story, whatever the graph says next.
    // An adventure ingested from a module has no defeat ending — modules do
    // not write one — so without this the session has nowhere to stop.
    if (session.party.every((p) => p.dead)) {
      session.ended = true;
      return { session, resolutions: [], narration: ['The party does not rise again.'] };
    }
    // Otherwise the party wakes wherever the graph says, at 1 HP — beaten,
    // not erased. Anyone who actually died stays dead; defeat is not a reset.
    session.party = session.party.map((p) =>
      p.hp <= 0 && !p.dead
        ? { ...p, hp: 1, deathSaveSuccesses: 0, deathSaveFailures: 0, conditions: [] }
        : p,
    );
  }
  return enterBeat(session, destination);
}

/** Run monster turns until it is a living PC's turn or combat ends. */
function advanceMonsters(session: GameSession): TurnOutcome {
  const resolutions: Resolution[] = [];
  const narration: string[] = [];
  const combat = session.combat!;

  for (let guard = 0; guard < 100; guard++) {
    const over = combatOver(session);
    if (over) {
      const finished = finishCombat(session, over);
      return {
        session,
        resolutions: [...resolutions, ...finished.resolutions],
        narration: [...narration, ...finished.narration],
      };
    }

    const currentId = combat.order[combat.turnIndex]!;
    const pc = session.party.find((p) => p.id === currentId);

    if (pc && pc.hp > 0) {
      return { session, resolutions, narration }; // player's turn
    }

    if (pc && pc.hp <= 0 && pc.dead) {
      // The dead do not act and do not roll. Skip their slot in the order.
      combat.turnIndex = (combat.turnIndex + 1) % combat.order.length;
      if (combat.turnIndex === 0) combat.round++;
      continue;
    }

    if (pc && pc.hp <= 0) {
      // Downed PCs roll death saves on their turn.
      const r = resolveDeathSave(nextSeed(session), pc);
      session.party = session.party.map((p) => (p.id === pc.id ? r.character : p));
      session.turns.push({ index: session.turns.length, resolution: r.resolution });
      resolutions.push(r.resolution);
      narration.push(templateNarration(r.resolution));
    } else {
      const monster = combat.monsters.find((m) => m.combatantId === currentId);
      if (monster && monster.hp > 0) {
        const statblock = (MONSTERS as Record<string, MonsterInput>)[monster.statblock]!;
        const target = [...session.party].filter((p) => p.hp > 0).sort((a, b) => a.hp - b.hp)[0];
        if (target) {
          const attack = statblock.attacks![0]!;
          const res = resolveAttack({
            seed: nextSeed(session),
            attackerId: monster.combatantId,
            targetId: target.id,
            targetAc: acOf(target),
            attackModifiers: [{ source: 'statblock', value: attack.toHit }],
            damage: attack.damage,
            damageType: attack.damageType,
          });
          for (const e of res.effects) {
            if (e.kind === 'damage' && e.target === target.id) {
              session.party = session.party.map((p) => (p.id === target.id ? applyDamage(p, e.amount) : p));
            }
          }
          session.turns.push({ index: session.turns.length, resolution: res });
          resolutions.push(res);
          narration.push(`${monster.name} strikes at ${target.name}: ${templateNarration(res)}`);
        }
      }
    }

    combat.turnIndex = (combat.turnIndex + 1) % combat.order.length;
    if (combat.turnIndex === 0) combat.round++;
  }
  throw new Error('combat failed to converge');
}

/** Derived AC: armor + capped dex + shield. Derived on read, never stored. */
export function acOf(character: Character): number {
  const dexMod = Math.floor((character.abilities.dex - 10) / 2);
  let ac = 10 + dexMod;
  let shield = 0;
  for (const item of character.inventory) {
    if (!item.equipped) continue;
    const armor = (ARMOR as Record<string, ArmorInput>)[item.item];
    if (!armor) continue;
    if (armor.category === 'shield') shield = armor.baseAc;
    else {
      const dexPart = armor.maxDexBonus === null ? dexMod : Math.min(dexMod, armor.maxDexBonus);
      ac = armor.baseAc + dexPart;
    }
  }
  return ac + shield;
}

export function combatAttack(session: GameSession, actorId: string, targetId: string): TurnOutcome {
  const combat = session.combat;
  if (!combat) throw new Error('no combat in progress');
  const currentId = combat.order[combat.turnIndex]!;
  if (currentId !== actorId) throw new Error(`it is not ${actorId}'s turn`);
  const pc = session.party.find((p) => p.id === actorId);
  if (!pc || pc.hp <= 0) throw new Error(`${actorId} cannot act`);
  const monster = combat.monsters.find((m) => m.combatantId === targetId && m.hp > 0);
  if (!monster) throw new Error(`no living target '${targetId}'`);

  const weapon = equippedWeapon(pc);
  const mods = characterAttackModifiers(pc, {
    finesse: ((weapon.properties ?? []) as readonly string[]).includes('finesse'),
  });
  const res = resolveAttack({
    seed: nextSeed(session),
    attackerId: pc.id,
    targetId: monster.combatantId,
    targetAc: monster.ac,
    attackModifiers: mods.attack,
    damage: weapon.damage,
    damageType: weapon.damageType,
    damageModifiers: mods.damage,
  });
  for (const e of res.effects) {
    if (e.kind === 'damage' && e.target === monster.combatantId) {
      monster.hp = Math.max(0, monster.hp - e.amount);
    }
  }
  session.turns.push({ index: session.turns.length, resolution: res });

  combat.turnIndex = (combat.turnIndex + 1) % combat.order.length;
  if (combat.turnIndex === 0) combat.round++;

  const after = advanceMonsters(session);
  return {
    session,
    resolutions: [res, ...after.resolutions],
    narration: [templateNarration(res), ...after.narration],
  };
}

/**
 * Cast a spell.
 *
 * The target decides which kind of casting this is: a party member means
 * healing, a combatant in the current fight means an attack, a save, or a
 * control effect. Healing works out of combat too — a party that just lost a
 * fight patches itself up before the next beat.
 *
 * In combat this consumes the caster's turn, exactly like an attack.
 */
export function castSpell(
  session: GameSession,
  casterId: string,
  spellId: string,
  targetId: string,
  slotLevel?: number,
): TurnOutcome {
  const caster = session.party.find((p) => p.id === casterId);
  if (!caster) throw new Error(`no such character '${casterId}'`);
  if (caster.hp <= 0 || caster.dead) throw new Error(`${casterId} cannot act`);

  const spell = (SPELLS as Record<string, SpellInput>)[spellId];
  if (!spell) throw new Error(`no such spell '${spellId}'`);

  if (session.combat) {
    const currentId = session.combat.order[session.combat.turnIndex]!;
    if (currentId !== casterId) throw new Error(`it is not ${casterId}'s turn`);
  }

  const ally = session.party.find((p) => p.id === targetId);
  const monster = session.combat?.monsters.find((m) => m.combatantId === targetId);
  if (!ally && !monster) throw new Error(`no such target '${targetId}'`);

  let resolution: Resolution;

  if (monster) {
    const statblock = (MONSTERS as Record<string, MonsterInput>)[monster.statblock]!;
    const result = castAtTarget({
      seed: nextSeed(session),
      caster,
      spell,
      slotLevel: slotLevel ?? spell.level,
      target: {
        id: monster.combatantId,
        ac: monster.ac,
        hp: monster.hp,
        abilities: statblock.abilities,
      },
    });
    monster.hp = Math.max(0, monster.hp - result.damage);
    session.party = session.party.map((p) => (p.id === casterId ? result.caster : p));
    resolution = result.resolution;
  } else {
    const result = castHealing({
      seed: nextSeed(session),
      caster,
      spell,
      target: ally!,
      slotLevel: slotLevel ?? spell.level,
    });
    session.party = session.party.map((p) =>
      p.id === casterId ? result.caster : p.id === targetId ? result.target : p,
    );
    // Healing yourself: both writes above target the same person, so re-apply
    // the healed sheet on top of the spent one.
    if (casterId === targetId) {
      session.party = session.party.map((p) =>
        p.id === casterId ? { ...result.target, spellcasting: result.caster.spellcasting } : p,
      );
    }
    resolution = result.resolution;
  }

  session.turns.push({ index: session.turns.length, resolution });

  if (!session.combat) {
    return { session, resolutions: [resolution], narration: [templateNarration(resolution)] };
  }

  session.combat.turnIndex = (session.combat.turnIndex + 1) % session.combat.order.length;
  if (session.combat.turnIndex === 0) session.combat.round++;
  const after = advanceMonsters(session);
  return {
    session,
    resolutions: [resolution, ...after.resolutions],
    narration: [templateNarration(resolution), ...after.narration],
  };
}

export function combatFlee(session: GameSession): TurnOutcome {
  if (!session.combat) throw new Error('no combat in progress');
  return finishCombat(session, 'flee');
}

function equippedWeapon(character: Character): WeaponInput {
  for (const item of character.inventory) {
    if (!item.equipped) continue;
    const weapon = (WEAPONS as Record<string, WeaponInput>)[item.item];
    if (weapon) return weapon;
  }
  return WEAPONS.dagger; // unarmed fallback: everyone has hands and spite
}

// ---------------------------------------------------------------------------
// View model
// ---------------------------------------------------------------------------

export interface CastableSpell {
  id: string;
  name: string;
  level: number;
  /** Lowest slot that can pay for it. 0 for a cantrip. */
  slot: number;
  /** 'heal' targets an ally; 'attack' targets a combatant. */
  kind: 'heal' | 'attack';
}

/** What a character can cast right now, given prepared spells and slots. */
export function castableSpells(character: Character): CastableSpell[] {
  const sc = character.spellcasting;
  if (!sc) return [];
  const out: CastableSpell[] = [];
  for (const id of sc.prepared) {
    const spell = (SPELLS as Record<string, SpellInput>)[id];
    if (!spell) continue;
    // Utility spells have no resolution at a target; offering them would be
    // offering a button that throws.
    if (!spell.damage && !spell.healing && !spell.appliesCondition) continue;

    let slot = spell.level;
    if (spell.level > 0) {
      slot = sc.slotsRemaining.findIndex((n, level) => level >= spell.level && n > 0);
      if (slot < 1) continue;
    }
    out.push({
      id,
      name: spell.name,
      level: spell.level,
      slot,
      kind: spell.healing ? 'heal' : 'attack',
    });
  }
  return out.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

export function sessionView(session: GameSession) {
  const beat = beatById(session, session.currentBeat);
  return {
    id: session.id,
    title: session.graph.metadata.title,
    ended: session.ended,
    beat: {
      id: beat.id,
      kind: beat.kind,
      title: beat.title,
      prose: beat.prose,
      readAloud: beat.readAloud,
      art: beat.art,
      improvRemaining: Math.max(0, beat.improvBudget - (session.improvSpent[beat.id] ?? 0)),
      options: session.ended || session.combat ? [] : visibleOptions(session).map((o) => ({
        id: o.id,
        label: o.label,
        check: o.requiresCheck
          ? { ability: o.requiresCheck.ability, skill: o.requiresCheck.skill, dc: o.requiresCheck.dc }
          : undefined,
      })),
    },
    party: session.party.map((p) => ({
      id: p.id,
      name: p.name,
      class: p.characterClass,
      hp: p.hp,
      hpMax: p.hpMax,
      dead: p.dead,
      ac: acOf(p),
      passivePerception: passivePerception(p),
      conditions: p.conditions.map((c) => c.condition),
      slots: p.spellcasting
        ? { remaining: p.spellcasting.slotsRemaining, max: p.spellcasting.slotsMax }
        : undefined,
      prepared: p.spellcasting?.prepared,
      /**
       * Spells this character can cast at this moment, already filtered by
       * slots and by what the engine can resolve. The client renders a list;
       * it does not decide what is castable.
       */
      castable: castableSpells(p),
    })),
    combat: session.combat
      ? {
          round: session.combat.round,
          currentTurn: session.combat.order[session.combat.turnIndex],
          order: session.combat.order,
          monsters: session.combat.monsters.map((m) => ({
            id: m.combatantId,
            name: m.name,
            hp: m.hp,
            hpMax: m.hpMax,
          })),
        }
      : null,
    lastTurns: session.turns.slice(-8),
  };
}

export function restParty(session: GameSession, kind: 'short' | 'long'): void {
  session.party = session.party.map((p) => applyRest(p, kind));
}
