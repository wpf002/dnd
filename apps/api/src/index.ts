import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerSessionRoutes, sessions } from './routes/session.js';
import { registerGenerateRoutes } from './routes/generate.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.get('/health', async () => ({ ok: true }));

registerSessionRoutes(app);
registerGenerateRoutes(app, sessions);

const port = Number(process.env.API_PORT ?? 3001);
const host = process.env.API_HOST ?? '0.0.0.0';

await app.listen({ port, host });
