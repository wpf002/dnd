import Fastify from 'fastify';
import cors from '@fastify/cors';
import { loadGraph, registerSessionRoutes, sessions } from './routes/session.js';
import { registerCampaignRoutes } from './routes/campaign.js';
import { registerGenerateRoutes } from './routes/generate.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.get('/health', async () => ({ ok: true }));

registerSessionRoutes(app);
registerGenerateRoutes(app, sessions);
registerCampaignRoutes(app, sessions, loadGraph);

const port = Number(process.env.API_PORT ?? 3001);
const host = process.env.API_HOST ?? '0.0.0.0';

await app.listen({ port, host });
