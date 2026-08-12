import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCharacter } from '@lantern/engine';
import {
  chooseOption,
  combatAttack,
  combatFlee,
  createSession,
  partyWith,
  restParty,
  visibleOptions,
} from './services/game.js';

/**
 * A character the player made has to be a real character: it plays the same
 * adventures, in the same party, under the same rules. Making one that the
 * engine then cannot run is worse than not offering it.
 */

const here = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(here, '..', '..', '..', 'content');
const adventure = (id: string) =>
  JSON.parse(readFileSync(join(CONTENT, 'adventures', `${id}.json`), 'utf8')) as unknown;

const wren = {
  name: 'Wren Ashdown',
  lineage: 'dwarf',
  characterClass: 'cleric' as const,
  background: 'acolyte',
  // The standard array, arranged for a cleric. Anything else is refused now:
  // the six numbers have to be six numbers the player was actually given.
  abilities: { str: 12, dex: 10, con: 14, int: 8, wis: 15, cha: 13 },
  improvements: { plusTwo: 'wis' as const, plusOne: 'int' as const },
  skills: ['insight' as const, 'medicine' as const],
};

describe('a made character joins the party', () => {
  it('takes the place of the pregen of their class, keeping the party at four', () => {
    const party = partyWith(createCharacter(wren));
    expect(party).toHaveLength(4);
    expect(party.filter((p) => p.characterClass === 'cleric')).toHaveLength(1);
    expect(party.find((p) => p.characterClass === 'cleric')!.name).toBe('Wren Ashdown');
    // Nobody else was displaced.
    expect(party.map((p) => p.characterClass).sort()).toEqual(['cleric', 'fighter', 'rogue', 'wizard']);
  });

  it('takes the first slot when no pregen shares the class', () => {
    const party = partyWith({ ...createCharacter(wren), characterClass: 'bard' as never });
    expect(party).toHaveLength(4);
    expect(party[0]!.name).toBe('Wren Ashdown');
  });
});

describe('a made character plays', () => {
  it('finishes an adventure alongside the pregens', () => {
    const session = createSession(adventure('the-bell-at-saltmire'), 'made-pc', partyWith(createCharacter(wren)));
    expect(session.party.some((p) => p.name === 'Wren Ashdown')).toBe(true);

    const visits = new Map<string, number>();
    let rests = 0;
    for (let i = 0; i < 400 && !session.ended; i++) {
      if (session.combat) {
        const up = session.combat.order[session.combat.turnIndex]!;
        const actor = session.party.find((p) => p.id === up && p.hp > 0 && !p.dead);
        const target = session.combat.monsters.find((m) => m.hp > 0);
        if (actor && target) combatAttack(session, actor.id, target.combatantId);
        else combatFlee(session);
        continue;
      }
      if (rests < 20 && session.party.some((p) => p.hp < p.hpMax / 2 && !p.dead)) {
        restParty(session, 'long');
        rests++;
        continue;
      }
      const options = visibleOptions(session);
      if (options.length === 0) break;
      visits.set(session.currentBeat, (visits.get(session.currentBeat) ?? 0) + 1);
      const pick = [...options].sort(
        (a, b) => (visits.get(a.target) ?? 0) - (visits.get(b.target) ?? 0),
      )[0]!;
      chooseOption(session, pick.id);
    }

    expect(session.ended).toBe(true);
    // And they were actually there for it, not a passenger on the sheet.
    expect(session.party.find((p) => p.name === 'Wren Ashdown')).toBeDefined();
  });
});
