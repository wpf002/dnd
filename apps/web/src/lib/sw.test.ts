import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The service worker, exercised directly.
 *
 * Registration itself cannot be driven from the test environment, and the
 * embedded browser used for visual checks refuses to register any worker at
 * all — a one-line worker fails the same way. What can be tested is the part
 * that was actually written here: which strategy each kind of request gets,
 * and what happens when the network is gone. That is where the bugs would be.
 */

const SOURCE = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8');

/** A Cache the worker can talk to, backed by a Map keyed on URL. */
class FakeCache {
  readonly store = new Map<string, Response>();
  async match(request: { url: string } | string) {
    return this.store.get(typeof request === 'string' ? request : request.url);
  }
  async put(request: { url: string } | string, response: Response) {
    this.store.set(typeof request === 'string' ? request : request.url, response);
  }
  async addAll(urls: string[]) {
    for (const url of urls) this.store.set(new URL(url, 'https://lantern.test').href, body(url));
  }
}

const body = (text: string) => new Response(text, { status: 200 });

interface Worker {
  listeners: Map<string, (event: unknown) => void>;
  caches: Map<string, FakeCache>;
  fetch: ReturnType<typeof vi.fn>;
}

function bootWorker(): Worker {
  const listeners = new Map<string, (event: unknown) => void>();
  const cacheStore = new Map<string, FakeCache>();
  const fetchMock = vi.fn(async (request: { url: string }) => body(`network:${request.url}`));

  const caches = {
    open: async (name: string) => {
      if (!cacheStore.has(name)) cacheStore.set(name, new FakeCache());
      return cacheStore.get(name)!;
    },
    keys: async () => [...cacheStore.keys()],
    delete: async (name: string) => cacheStore.delete(name),
  };

  const self = {
    addEventListener: (type: string, fn: (event: unknown) => void) => listeners.set(type, fn),
    skipWaiting: () => undefined,
    clients: { claim: async () => undefined },
    location: new URL('https://lantern.test/'),
    caches,
  };

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function('self', 'caches', 'fetch', 'Response', 'URL', SOURCE)(
    self,
    caches,
    fetchMock,
    Response,
    URL,
  );

  return { listeners, caches: cacheStore, fetch: fetchMock as Worker['fetch'] };
}

/** Fire a fetch event and return whatever the worker responded with. */
async function request(
  worker: Worker,
  url: string,
  init: { method?: string; mode?: string } = {},
) {
  let responded: Promise<Response> | undefined;
  // `mode` is read-only on a real Request, so the worker gets a plain object
  // with the three fields it actually reads.
  const event = {
    request: { url, method: init.method ?? 'GET', mode: init.mode ?? 'cors' },
    respondWith: (value: Promise<Response>) => {
      responded = value;
    },
    waitUntil: (value: Promise<unknown>) => value,
  };
  worker.listeners.get('fetch')!(event);
  return responded;
}

let worker: Worker;
beforeEach(() => {
  worker = bootWorker();
});

describe('what the worker caches', () => {
  it('serves a hashed build asset from the cache without asking the network twice', async () => {
    const url = 'https://lantern.test/_next/static/chunks/main-abc123.js';
    await request(worker, url);
    expect(worker.fetch).toHaveBeenCalledTimes(1);

    await request(worker, url);
    expect(worker.fetch).toHaveBeenCalledTimes(1);
  });

  it('serves art from the cache the same way', async () => {
    const url = 'https://lantern.test/art/art-beer-cellar.svg';
    await request(worker, url);
    await request(worker, url);
    expect(worker.fetch).toHaveBeenCalledTimes(1);
  });

  it('prefers the network for API reads, so a fresh answer wins', async () => {
    const url = 'https://api.lantern.test/adventures';
    await request(worker, url);
    await request(worker, url);
    expect(worker.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('when the network is gone', () => {
  it('falls back to the cached copy of an API read', async () => {
    const url = 'https://api.lantern.test/adventures';
    const fresh = await (await request(worker, url))!.text();
    expect(fresh).toBe(`network:${url}`);

    worker.fetch.mockRejectedValue(new TypeError('offline'));
    const stale = await (await request(worker, url))!.text();
    expect(stale).toBe(`network:${url}`);
  });

  it('still renders the app shell for a navigation', async () => {
    // Install precaches the shell, which is what makes this possible.
    let installed: Promise<unknown> | undefined;
    worker.listeners.get('install')!({
      waitUntil: (value: Promise<unknown>) => {
        installed = value;
      },
    });
    await installed;

    worker.fetch.mockRejectedValue(new TypeError('offline'));
    const response = await request(worker, 'https://lantern.test/', { mode: 'navigate' });
    expect(await response!.text()).toBe('/');
  });

  it('never answers a write from the cache — a turn that did not reach the engine did not happen', async () => {
    const response = await request(worker, 'https://api.lantern.test/session/s1/choose', {
      method: 'POST',
    });
    expect(response).toBeUndefined();
  });
});

describe('activate', () => {
  it('drops caches from an older version and keeps its own', async () => {
    worker.caches.set('lantern-v0-assets', new FakeCache());
    await worker.caches.get('lantern-v0-assets')!.put('https://old', body('old'));
    await worker.caches.set('lantern-v1-assets', new FakeCache());

    let done: Promise<unknown> | undefined;
    worker.listeners.get('activate')!({
      waitUntil: (value: Promise<unknown>) => {
        done = value;
      },
    });
    await done;

    expect([...worker.caches.keys()]).not.toContain('lantern-v0-assets');
    expect([...worker.caches.keys()]).toContain('lantern-v1-assets');
  });
});
