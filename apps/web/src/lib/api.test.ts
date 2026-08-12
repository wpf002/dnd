import { afterEach, describe, expect, it, vi } from 'vitest';
import { OfflineError, api } from './api';

/**
 * A turn that never reached the engine did not happen.
 *
 * The service worker can serve a cached beat, so an offline app still shows
 * where the party is standing. It cannot resolve a die roll — the rules run on
 * the server and every outcome persists its inputs there. What matters is that
 * the failure reads as "you are offline" rather than as a rules refusal, since
 * the two call for completely different reactions from the player.
 */
afterEach(() => vi.unstubAllGlobals());

describe('when the network is gone', () => {
  it('says so, rather than surfacing a fetch error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    await expect(api.choose('s1', 'opt')).rejects.toBeInstanceOf(OfflineError);
    await expect(api.choose('s1', 'opt')).rejects.toThrow(/offline/i);
  });

  it('says so for reads too', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    await expect(api.adventures()).rejects.toBeInstanceOf(OfflineError);
  });

  it('does not mistake a rules refusal for being offline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'no such option' }),
        } as Response),
      ),
    );
    await expect(api.choose('s1', 'nope')).rejects.not.toBeInstanceOf(OfflineError);
    await expect(api.choose('s1', 'nope')).rejects.toThrow('no such option');
  });
});
