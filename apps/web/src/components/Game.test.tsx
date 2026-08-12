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
const fetchedSession = vi.fn();

/** What GET /session/:id returns. Set per test. */
let sessionOnServer: { id: string; title: string; ended: boolean } | null = null;

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
    session: async (id: string) => {
      fetchedSession(id);
      if (!sessionOnServer) throw new Error('no such session');
      return {
        state: {
          sessionId: sessionOnServer.id,
          id: sessionOnServer.id,
          title: sessionOnServer.title,
          ended: sessionOnServer.ended,
          beat: {
            id: 'b9',
            title: 'Where you left off',
            prose: 'The bell is still ringing.',
            options: [],
            terminal: false,
          },
          party: [{ id: 'pc', name: 'Wren', hp: 9, hpMax: 12, ac: 18, conditions: [] }],
          flags: {},
        },
      };
    },
    campaignRecap: async () => ({ recap: { title: 'A campaign', sessions: 1, clocks: [], promises: [] } }),
    start: async (adventure: string, character?: unknown) => {
      started(adventure, character);
      return {
        state: {
          sessionId: 's1',
          id: 's1',
          ended: false,
          beat: { id: 'b1', title: 'The Brewery', body: 'Hops.', options: [], terminal: false },
          party: [{ id: 'pc', name: 'Wren Ashbound', hp: 12, hpMax: 12, ac: 18, conditions: [] }],
          flags: {},
        },
      };
    },
  },
}));

// Imported after the mock so the component picks it up.
const { Game } = await import('./Game');

beforeEach(() => {
  started.mockClear();
  fetchedSession.mockClear();
  sessionOnServer = null;
  window.localStorage.clear();
});
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

/**
 * Closing the tab used to lose the game. The state was in the database the
 * whole time; nothing on the client remembered which row it was.
 */
describe('picking a run back up', () => {
  const remember = (run: object) =>
    window.localStorage.setItem(
      'lantern.run.v1',
      JSON.stringify({ savedAt: new Date().toISOString(), ...run }),
    );

  it('offers the run the server still has', async () => {
    remember({ sessionId: 's-77', title: 'The Bell at Saltmire' });
    sessionOnServer = { id: 's-77', title: 'The Bell at Saltmire', ended: false };

    render(<Game />);
    await screen.findByText('Where you left off');
    expect(screen.getByText('The Bell at Saltmire')).toBeDefined();
    expect(fetchedSession).toHaveBeenCalledWith('s-77');
  });

  it('carries on into the session it was in', async () => {
    remember({ sessionId: 's-77', title: 'The Bell at Saltmire' });
    sessionOnServer = { id: 's-77', title: 'The Bell at Saltmire', ended: false };
    const user = userEvent.setup();

    render(<Game />);
    await user.click(await screen.findByText('Carry on'));

    await screen.findByText('The bell is still ringing.');
  });

  it('says nothing about a session the server has lost', async () => {
    remember({ sessionId: 's-gone', title: 'A run from another machine' });
    sessionOnServer = null;

    render(<Game />);
    await screen.findByText('A Most Potent Brew');
    expect(screen.queryByText('Where you left off')).toBeNull();
    expect(window.localStorage.getItem('lantern.run.v1')).toBeNull();
  });

  it('does not offer to resume a one-shot that already ended', async () => {
    remember({ sessionId: 's-done', title: 'A finished adventure' });
    sessionOnServer = { id: 's-done', title: 'A finished adventure', ended: true };

    render(<Game />);
    await screen.findByText('A Most Potent Brew');
    expect(screen.queryByText('Where you left off')).toBeNull();
  });

  it('offers a campaign back even when its last session ended', async () => {
    remember({ sessionId: 's-book2', title: 'Book Two', campaignId: 'c-1' });
    sessionOnServer = { id: 's-book2', title: 'Book Two', ended: true };

    render(<Game />);
    await screen.findByText('Where you left off');
  });

  it('forgets the run when the player starts something else', async () => {
    remember({ sessionId: 's-77', title: 'The Bell at Saltmire' });
    sessionOnServer = { id: 's-77', title: 'The Bell at Saltmire', ended: false };
    const user = userEvent.setup();

    render(<Game />);
    await user.click(await screen.findByText('Start something else'));

    expect(screen.queryByText('Where you left off')).toBeNull();
    expect(window.localStorage.getItem('lantern.run.v1')).toBeNull();
  });

  it('remembers a run the moment it starts, before any turn is taken', async () => {
    const user = await openCreator();
    await user.type(screen.getByPlaceholderText('Who are you?'), 'Wren');
    await user.click(screen.getByText('Play as this character'));

    await waitFor(() => expect(started).toHaveBeenCalled());
    await waitFor(() => {
      const raw = window.localStorage.getItem('lantern.run.v1');
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!).sessionId).toBe('s1');
    });
  });
});
