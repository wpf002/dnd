import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The creation screen, and getting off it into a session.
 *
 * This is the one part of the app with no coverage below it, and it shipped a
 * bug that no test in any other package could have caught: finishing creation
 * set the character in state and launched in the same tick, so the launch
 * still saw the previous value and every character a player made was quietly
 * replaced by a pregen. The API was fine. The client threw the character away.
 */

const started = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    adventures: async () => ({
      adventures: [
        {
          id: 'a-most-potent-brew',
          playable: true,
          title: 'A Most Potent Brew',
          premise: 'Rats in the beer cellar.',
          tone: ['exploration'],
          tier: 'local',
          provenance: 'ingested',
          partyLevel: 1,
          beats: 11,
          encounters: 3,
          endings: 1,
        },
      ],
    }),
    campaignGraphs: async () => ({ campaigns: [] }),
    creationOptions: async () => ({
      classes: [
        {
          id: 'fighter',
          name: 'Fighter',
          hitDie: 10,
          caster: false,
          skills: ['athletics', 'perception', 'survival'],
          skillCount: 2,
        },
      ],
      lineages: [{ id: 'human', name: 'Human', speed: 30, size: 'medium' }],
      backgrounds: [
        { id: 'soldier', name: 'Soldier', abilities: ['str', 'dex', 'con'], skills: ['athletics'] },
      ],
      standardArray: [15, 14, 13, 12, 10, 8],
    }),
    previewCharacter: async (choices: { name: string }) => ({
      character: { name: choices.name, hpMax: 12 },
    }),
    rollAbilities: async () => ({
      seed: 'a-seed',
      scores: [
        { dice: [6, 5, 4, 1], score: 15 },
        { dice: [5, 5, 4, 2], score: 14 },
        { dice: [5, 4, 4, 3], score: 13 },
        { dice: [4, 4, 4, 2], score: 12 },
        { dice: [4, 3, 3, 1], score: 10 },
        { dice: [3, 3, 2, 1], score: 8 },
      ],
    }),
    start: async (adventure: string, character?: unknown) => {
      started(adventure, character);
      return {
        state: {
          sessionId: 's1',
          beat: { id: 'b1', title: 'The Brewery', body: 'Hops.', options: [], terminal: false },
          party: [{ id: 'pc', name: 'Wren Ashbound', hp: 12, hpMax: 12, ac: 18, conditions: [] }],
          flags: {},
          ended: false,
        },
      };
    },
  },
}));

// Imported after the mock so the component picks it up.
const { Game } = await import('./Game');

beforeEach(() => started.mockClear());
afterEach(cleanup);

async function openCreator() {
  const user = userEvent.setup();
  render(<Game />);
  await screen.findByText('A Most Potent Brew');
  await user.click(screen.getByText('A Most Potent Brew'));
  await user.click(await screen.findByText(/Make your own character/));
  await screen.findByPlaceholderText('Who are you?');
  return user;
}

/** The six ability dropdowns, in str-dex-con-int-wis-cha order. */
function abilitySelect(ability: string) {
  const label = screen
    .getAllByText(ability)
    .map((node) => node.closest('label'))
    .find((l): l is HTMLLabelElement => Boolean(l?.querySelector('select.w-full.bg-transparent')));
  return label!.querySelector('select') as HTMLSelectElement;
}

function abilityScores() {
  return ['str', 'dex', 'con', 'int', 'wis', 'cha'].map((a) => abilitySelect(a).value);
}

describe('making a character', () => {
  it('sends the character the player just made, not the one in state', async () => {
    const user = await openCreator();
    await user.type(screen.getByPlaceholderText('Who are you?'), 'Wren Ashbound');
    await user.click(screen.getByText('Play as this character'));

    await waitFor(() => expect(started).toHaveBeenCalled());
    const [adventure, character] = started.mock.calls[0]!;
    expect(adventure).toBe('a-most-potent-brew');
    expect((character as { name: string }).name).toBe('Wren Ashbound');
  });

  it('keeps the six scores a permutation when one is reassigned', async () => {
    const user = await openCreator();
    expect(abilityScores()).toEqual(['15', '14', '13', '12', '10', '8']);

    // Give strength the 8. Whoever had the 8 takes strength's 15.
    await user.selectOptions(abilitySelect('str'), '8');

    expect(abilityScores()).toEqual(['8', '14', '13', '12', '10', '15']);
    expect([...abilityScores()].sort()).toEqual(['10', '12', '13', '14', '15', '8'].sort());
  });

  it('will not let a player take more skills than the class allows', async () => {
    const user = await openCreator();
    await user.click(screen.getByText('athletics'));
    await user.click(screen.getByText('perception'));

    expect(screen.getByText(/2 chosen/)).toBeDefined();
    expect((screen.getByText('survival') as HTMLButtonElement).disabled).toBe(true);
  });

  it('rolls, shows every die, and carries the seed that proves them', async () => {
    const user = await openCreator();
    await user.click(screen.getByText('Roll 4d6'));

    await screen.findByText(/lowest die dropped/);
    expect(screen.getByText(/15 \(6 5 4 1\)/)).toBeDefined();

    await user.type(screen.getByPlaceholderText('Who are you?'), 'Rolled');
    await user.click(screen.getByText('Play as this character'));

    await waitFor(() => expect(started).toHaveBeenCalled());
    expect((started.mock.calls[0]![1] as { rollSeed?: string }).rollSeed).toBe('a-seed');
  });
});
