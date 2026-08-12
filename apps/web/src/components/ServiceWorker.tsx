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

    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // No worker means no offline. It does not mean no game.
    });
  }, []);

  return null;
}
