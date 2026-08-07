// Side-effect import: must precede anything that reads configuration —
// Prisma binds DATABASE_URL at construction, Flint decides live-vs-fallback
// on the presence of a provider key.
import { env, hasProviderKey } from './env.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { loadGraph, registerSessionRoutes, sessions } from './routes/session.js';
import { registerCampaignRoutes } from './routes/campaign.js';
import { registerGenerateRoutes } from './routes/generate.js';

const app = Fastify({ logger: true });

app.log.info(
  { envFile: env.loaded ? env.path : 'none', provider: hasProviderKey() ? 'live' : 'fallback-only' },
  env.loaded
    ? `loaded ${env.path}`
    : 'no .env found — using process env only (cp .env.example .env to configure)',
);
if (!hasProviderKey()) {
  app.log.warn(
    'no ANTHROPIC_API_KEY or OPENAI_API_KEY: narration falls back to templated prose, ' +
      'intent parsing to deterministic refusal, and /generate + /benchmark are unavailable',
  );
}

await app.register(cors, { origin: true });

app.get('/health', async () => ({ ok: true }));

registerSessionRoutes(app);
registerGenerateRoutes(app, sessions);
registerCampaignRoutes(app, sessions, loadGraph);

const port = Number(process.env.API_PORT ?? 3001);
const host = process.env.API_HOST ?? '0.0.0.0';

await app.listen({ port, host });
