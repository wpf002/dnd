import type { BeatGraph } from '@lantern/schema';
import { MONSTERS, PREGENS, type MonsterInput } from '@lantern/srd';
import { abilityModifier } from '@lantern/engine';
import type { Finding } from '../errors.js';

/**
 * Solvability: no encounter the pregens mathematically cannot win.
 *
 * This is an expected-value model, not a simulation — deliberately. The
 * linter's job is to reject content that is *mathematically* hopeless (party
 * expected rounds-to-die shorter than expected rounds-to-kill by a wide
 * margin), not to fine-tune difficulty. Vol III Ch2 §XI: difficulty is about
 * what victory costs; unwinnable is a different category from Deadly.
 */

/** Expected damage per round for one side, hit-chance weighted. */
function monsterDpr(monster: MonsterInput, targetAc: number): number {
  let best = 0;
  for (const attack of monster.attacks ?? []) {
    const hitChance = Math.min(0.95, Math.max(0.05, (21 + attack.toHit - targetAc) / 20));
    const avg = averageDice(attack.damage);
    best = Math.max(best, hitChance * avg);
  }
  return best * (monster.multiattack ?? 1);
}

function averageDice(notation: string): number {
  const m = /^\s*(\d+)d(\d+)\s*(?:([+-])\s*(\d+))?\s*$/i.exec(notation);
  if (!m) return 0;
  const count = Number(m[1]);
  const size = Number(m[2]);
  const mod = m[3] ? (m[3] === '-' ? -1 : 1) * Number(m[4]) : 0;
  return count * ((size + 1) / 2) + mod;
}

/**
 * Party offense model: each pregen contributes a weapon-or-cantrip DPR against
 * the encounter's median AC. Coarse on purpose.
 */
function partyDpr(targetAc: number): number {
  let total = 0;
  for (const pc of PREGENS) {
    // Level-3 baseline: +5 to hit (mod 3 + prof 2), ~1d8+3 damage.
    const toHit = 5;
    const hitChance = Math.min(0.95, Math.max(0.05, (21 + toHit - targetAc) / 20));
    total += hitChance * (4.5 + 3);
    void pc;
  }
  return total;
}

function partyEffectiveHp(): number {
  // HP plus a healing allowance for the cleric's slots (6 × ~7).
  return PREGENS.reduce((sum, p) => sum + p.hpMax, 0) + 42;
}

export function checkSolvability(graph: BeatGraph): Finding[] {
  const findings: Finding[] = [];

  for (const enc of graph.encounters) {
    let monsterHpTotal = 0;
    let monsterDprTotal = 0;
    let maxAc = 10;
    let unknown = false;

    for (const combatant of enc.combatants) {
      if (!combatant.hostile) continue;
      const statblock: MonsterInput | undefined =
        (MONSTERS as Record<string, MonsterInput>)[combatant.statblock];
      if (!statblock) {
        findings.push({
          severity: 'error',
          code: 'monster-unknown',
          message: `encounter '${enc.id}' uses statblock '${combatant.statblock}', which is not in the SRD data — available: ${Object.keys(MONSTERS).join(', ')}`,
          at: enc.id,
        });
        unknown = true;
        continue;
      }
      const hp = combatant.hpOverride ?? statblock.hp;
      monsterHpTotal += hp * combatant.count;
      // Assume monsters focus a mid-AC target (15).
      monsterDprTotal += monsterDpr(statblock, 15) * combatant.count;
      maxAc = Math.max(maxAc, statblock.ac);
      void abilityModifier; // engine linkage kept for future refinement
    }
    if (unknown || monsterHpTotal === 0) continue;

    // Survive-N-rounds and escape encounters are winnable by definition of
    // their victory condition; only attrition-style conditions get the math.
    if (enc.victory.kind === 'escape' || enc.victory.kind === 'survive-rounds') continue;

    const roundsToKill = monsterHpTotal / Math.max(1, partyDpr(maxAc));
    const roundsToDie = partyEffectiveHp() / Math.max(1, monsterDprTotal);

    // Hopeless threshold: the party dies twice over before the encounter is
    // half dead. Deadly-but-possible passes; mathematically absurd does not.
    if (roundsToDie * 2 < roundsToKill * 0.5) {
      findings.push({
        severity: 'error',
        code: 'encounter-unwinnable',
        message:
          `encounter '${enc.id}' is mathematically unwinnable for the level-3 pregens: ` +
          `~${roundsToKill.toFixed(1)} rounds to defeat it vs ~${roundsToDie.toFixed(1)} rounds until a party wipe. ` +
          `Reduce combatant count/HP, lower the CR mix, or change the victory condition to escape/survive`,
        at: enc.id,
      });
    }
  }

  // Vol III Ch2 §XIV: an all-defeat-all graph is thin. Warning only.
  if (
    graph.encounters.length >= 2 &&
    graph.encounters.every((e) => e.victory.kind === 'defeat-all')
  ) {
    findings.push({
      severity: 'warning',
      code: 'all-encounters-defeat-all',
      message: `every encounter's victory condition is 'defeat-all' — consider objectives beyond killing (protect, escape, destroy, survive-rounds) for tactical variety`,
    });
  }

  return findings;
}
