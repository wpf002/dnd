import type { BeatGraph } from '@lantern/schema';
import { MONSTERS, PREGENS, type MonsterInput } from '@lantern/srd';
import { levelParty, proficiencyBonus } from '@lantern/engine';
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

/**
 * Statblocks close to a name that did not resolve.
 *
 * This used to list every available id. That was helpful at sixteen and
 * useless at two hundred and thirty — an error message nobody reads is an
 * error message that does not work. Suggestions are ranked by shared word,
 * then by prefix, which is what actually goes wrong: 'goblin' for
 * 'goblin-boss', 'wolf' for 'winter-wolf'.
 */
function suggestStatblocks(wanted: string): string {
  const needle = wanted.toLowerCase();
  const words = needle.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const ids = Object.keys(MONSTERS);

  const scored = ids
    .map((id) => {
      let score = 0;
      for (const word of words) if (id.includes(word)) score += 10;
      if (id.startsWith(needle.slice(0, 4))) score += 3;
      return { id, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((s) => s.id);

  return scored.length > 0
    ? `Did you mean: ${scored.join(', ')}?`
    : `There are ${ids.length} statblocks available; none resemble that name.`;
}

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
 * Attacks-per-round multiplier by level.
 *
 * Both halves of the party scale at roughly the same breakpoints: martials
 * gain Extra Attack at 5 and 11, casters' cantrips gain a die at 5, 11, and
 * 17. Modelling it as one shared multiplier is coarse, and deliberately so —
 * the question this rule answers is "is this mathematically hopeless", not
 * "what is the DPR". It does not model resources, action economy, magic item
 * scaling, or spell damage beyond cantrips, all of which favour the party;
 * the model therefore errs toward calling things harder than they are.
 */
function attacksPerRound(level: number): number {
  if (level < 5) return 1;
  if (level < 11) return 2;
  if (level < 17) return 3;
  return 4;
}

/**
 * Party offense model: each pregen contributes a weapon-or-cantrip DPR against
 * the encounter's median AC.
 */
function partyDpr(targetAc: number, level: number): number {
  // Primary ability climbs from +3 at level 3 to +5 once ASIs land (level 8).
  const abilityMod = level >= 8 ? 5 : 3;
  const toHit = abilityMod + proficiencyBonus(level);
  const hitChance = Math.min(0.95, Math.max(0.05, (21 + toHit - targetAc) / 20));
  const perAttack = 4.5 + abilityMod;
  return PREGENS.length * hitChance * perAttack * attacksPerRound(level);
}

/** Average hit points restored by spending one spell slot on healing. */
const HP_PER_HEALING_SLOT = 7;

/**
 * Party durability at a level: real levelled HP from the engine's advancement
 * rules, plus a healing allowance drawn from the party's best healer.
 *
 * Neither number is estimated. The HP is what `levelUp` would actually write
 * to the sheet, and the allowance is the healer's real slot count from the
 * progression table — at level 3 that is the cleric's 4+2 slots, the same 42
 * hp this model has always assumed, now derived instead of hardcoded.
 *
 * Only the single best caster contributes, because the wizard's slots buy
 * damage and control rather than healing; counting every caster's slots as
 * cure spells would roughly double the party's apparent durability.
 */
function partyEffectiveHp(level: number): number {
  const party = levelParty(PREGENS, level).map((r) => r.character);
  const hp = party.reduce((sum, c) => sum + c.hpMax, 0);
  const healingSlots = Math.max(
    0,
    ...party.map((c) => (c.spellcasting?.slotsMax ?? []).reduce((a, b) => a + b, 0)),
  );
  return hp + healingSlots * HP_PER_HEALING_SLOT;
}

/**
 * @param level The party level the graph is balanced for. Defaults to 3 (the
 *   pregens as authored); a campaign book passes its own level band instead.
 */
export function checkSolvability(graph: BeatGraph, level = 3): Finding[] {
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
          message:
            `encounter '${enc.id}' uses statblock '${combatant.statblock}', which is not in the ` +
            `SRD data. ${suggestStatblocks(combatant.statblock)}`,
          at: enc.id,
        });
        unknown = true;
        continue;
      }
      // A hostile with no attack does nothing on its turn — the fight cannot
      // be lost, and the encounter is theatre. The importer leaves such a
      // stat block empty on purpose rather than inventing numbers, so this is
      // where that shows up.
      if ((statblock.attacks?.length ?? 0) === 0) {
        findings.push({
          severity: 'error',
          code: 'monster-cannot-act',
          message:
            `encounter '${enc.id}' uses '${combatant.statblock}', whose stat block carries no ` +
            `attack the engine can resolve — it would stand there. Choose a different creature`,
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
    }
    if (unknown || monsterHpTotal === 0) continue;

    // The kill-race only models a fight the party has to win by killing.
    //
    // `destroy` needs one target dead, not the room; racing the room's total
    // HP called five shipped encounters unwinnable that are won by breaking a
    // single idol. Everything else — escape, survive, reach a place, protect
    // someone, set a flag — is won without killing at all.
    let hpToBeat = monsterHpTotal;
    // Hoisted so the narrowing survives into the callback below.
    const victory = enc.victory;
    if (victory.kind === 'destroy') {
      const target = enc.combatants.find((c) => c.id === victory.target);
      if (!target) continue;
      const statblock = (MONSTERS as Record<string, MonsterInput>)[target.statblock];
      if (!statblock) continue;
      hpToBeat = (target.hpOverride ?? statblock.hp) * target.count;
    } else if (victory.kind !== 'defeat-all') {
      continue;
    }

    const roundsToKill = hpToBeat / Math.max(1, partyDpr(maxAc, level));
    const roundsToDie = partyEffectiveHp(level) / Math.max(1, monsterDprTotal);

    // If the party is expected to fall before the encounter does, it is not a
    // hard fight, it is a loss — and an ingested module routes a loss straight
    // back to the fight, so the party grinds it forever.
    //
    // The old threshold fired only when the party died four times over, which
    // let through a real module's seven-on-four fight the party lost every
    // single time. Across all 79 shipped adventures the worst defeat-all
    // encounter sits at 0.81, so 1.0 separates cleanly without touching them.
    if (roundsToKill > roundsToDie) {
      findings.push({
        severity: 'error',
        code: 'encounter-unwinnable',
        message:
          `encounter '${enc.id}' is unwinnable for a level-${level} party: ` +
          `~${roundsToKill.toFixed(1)} rounds to defeat it, but only ~${roundsToDie.toFixed(1)} rounds ` +
          `until a party wipe — they fall first, every time. Reduce combatant count/HP, lower the ` +
          `CR mix, or change the victory condition to escape/survive`,
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
