#!/usr/bin/env node
/**
 * Does the service worker actually register, in an actual browser?
 *
 *   pnpm --filter @lantern/web build && (cd apps/web && npx next start -p 3100 &)
 *   node tools/check-service-worker.mjs http://localhost:3100
 *
 * The worker's logic is unit-tested against public/sw.js directly, but nothing
 * in a test environment can tell you whether a browser will accept it — and
 * the registration call swallows its own errors by design, so a failure is
 * invisible from inside the app. This launches real Chrome headless with a
 * throwaway profile, drives it over the DevTools protocol, and reports what
 * actually happened. No new dependencies.
 *
 * Serve a PRODUCTION build. `next dev` deliberately unregisters the worker.
 */
import { spawn } from 'node:child_process';
import { rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const profile = mkdtempSync(join(tmpdir(), 'sw-check-'));

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--disable-gpu',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function version() {
  for (let i = 0; i < 40; i++) {
    try {
      return await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
    } catch { await sleep(250); }
  }
  throw new Error('chrome never came up');
}

const info = await version();
console.log('browser:', info.Browser);

const ws = new WebSocket(info.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};
const send = (method, params = {}, sessionId) =>
  new Promise((resolve) => {
    const mid = ++id;
    pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

const { result: target } = await send('Target.createTarget', { url: 'about:blank' });
const { result: attached } = await send('Target.attachToTarget', {
  targetId: target.targetId,
  flatten: true,
});
const s = attached.sessionId;

await send('Page.enable', {}, s);
await send('Runtime.enable', {}, s);
await send('Page.navigate', { url: process.argv[2] ?? 'http://localhost:3100' }, s);
await sleep(6000);

const evaluate = async (expression) => {
  const r = await send(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
    s,
  );
  return r.result?.result?.value ?? r.result?.exceptionDetails?.text ?? r.result;
};

console.log('url         :', await evaluate('location.href'));
console.log('sw support  :', await evaluate(`'serviceWorker' in navigator`));
console.log(
  'registered  :',
  await evaluate(
    `navigator.serviceWorker.getRegistrations().then(r => r.map(x => x.scope + ' [' + (x.active ? x.active.state : x.installing ? 'installing' : 'waiting') + ']').join(', ') || 'NONE')`,
  ),
);
console.log('controller  :', await evaluate(`navigator.serviceWorker.controller ? 'yes' : 'no (first load — controls the next one)'`));
console.log('caches      :', await evaluate(`caches.keys().then(k => k.join(', ') || 'NONE')`));

console.log('manual register:', await evaluate(
  `navigator.serviceWorker.register('/sw.js').then(r => 'OK ' + r.scope).catch(e => 'FAILED ' + e.name + ': ' + e.message)`
));
console.log('sw.js fetch    :', await evaluate(
  `fetch('/sw.js').then(r => r.status + ' ' + r.headers.get('content-type')).catch(e => 'ERR ' + e.message)`
));

// Reload so the worker takes control, then confirm it is serving.
await send('Page.navigate', { url: process.argv[2] ?? 'http://localhost:3100' }, s);
await sleep(4000);
console.log('after reload:');
console.log('  controller:', await evaluate(`navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL : 'none'`));
console.log('  caches    :', await evaluate(`caches.keys().then(k => k.join(', ') || 'NONE')`));
console.log('  shell     :', await evaluate(`caches.open('lantern-v1-shell').then(c => c.keys()).then(k => k.map(r=>r.url).join(', ') || 'empty')`));

// Look at a picture while online, so there is something in the asset cache to
// find later. Runtime caching cannot cache what was never fetched — art for a
// beat the player has not reached yet will not be there, which is fine: they
// cannot reach it offline either, since taking a turn needs the engine.
const ART = '/art/art-tideline.svg';
console.log('warm the asset cache:', await evaluate(`fetch('${ART}').then(r => r.status)`));

// The point of all this: does anything still work with the network gone?
// Network.emulateNetworkConditions makes Chrome itself refuse every request,
// which is a truer test than stopping the server — the fetch fails the way it
// fails on a train.
await send('Network.enable', {}, s);
await send(
  'Network.emulateNetworkConditions',
  { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
  s,
);
await send('Page.navigate', { url: process.argv[2] ?? 'http://localhost:3100' }, s);
await sleep(4000);

console.log('\nwith the network off:');
const title = await evaluate('document.title');
const bodyLength = await evaluate('document.body.innerText.length');
console.log('  page renders :', title === 'Lantern' && bodyLength > 0 ? `yes ("${title}", ${bodyLength} chars)` : `NO (title=${title}, ${bodyLength} chars)`);
console.log('  seen art     :', await evaluate(
  `fetch('${ART}').then(r => r.ok ? 'yes, served from cache' : 'no: ' + r.status).catch(e => 'NO: ' + e.message)`,
));
console.log('  a write fails:', await evaluate(
  `fetch('http://localhost:3021/session/x/choose', {method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(() => 'no — it succeeded?!').catch(e => 'yes (' + e.name + ') — the app shows the offline message')`,
));

await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, s);

ws.close();
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
