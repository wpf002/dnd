'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker, and only in a production build.
 *
 * `next dev` serves modules it expects to recompile on demand; a worker
 * caching them turns every edit into a mystery. Development gets no worker,
 * and any worker left over from a production build on the same origin is
 * unregistered so localhost:3000 does not serve yesterday's bundle.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker
        .getRegistrations()
        .then((all) => all.forEach((r) => void r.unregister()))
        .catch(() => undefined);
      return;
    }

    // Say why it failed. Swallowing this silently cost an afternoon: the
    // worker was not registering, the app looked fine, and there was nothing
    // anywhere to say so. No worker means no offline; it does not mean no
    // game, so this warns rather than throws.
    void navigator.serviceWorker.register('/sw.js').catch((err: unknown) => {
      console.warn('Lantern: service worker did not register, so offline is off.', err);
    });
  }, []);

  return null;
}
