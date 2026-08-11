#!/usr/bin/env node
/**
 * Run a command with the repo-root `.env` loaded.
 *
 * The API loads that file itself via `process.loadEnvFile`, but a CLI spawned
 * by a workspace script (prisma, most obviously) starts in its own package
 * directory and never sees it — `prisma db push` failed with "Environment
 * variable not found: DATABASE_URL" while the app was reading the same
 * database fine. This closes that gap without adding a dotenv dependency.
 *
 *   node tools/with-env.mjs prisma db push
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = join(root, '.env');

if (existsSync(envFile)) process.loadEnvFile(envFile);

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('usage: node tools/with-env.mjs <command> [args...]');
  process.exit(2);
}

const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
