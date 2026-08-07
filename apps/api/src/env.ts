import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Load the repo-root `.env` into process.env.
 *
 * Imported for its side effect, before anything that reads configuration —
 * notably the Prisma client, which binds DATABASE_URL at construction, and
 * Flint, which decides live-vs-fallback on the presence of a provider key.
 *
 * Uses Node's built-in loader (20.12+), so there is no dotenv dependency.
 * Real environment variables always win: `process.loadEnvFile` does not
 * clobber existing values, which keeps `DATABASE_URL=... node dist/index.js`
 * and CI-injected secrets working exactly as before.
 *
 * Absent or unreadable `.env` is not an error. A private tool with no
 * provider key still runs — every Flint consumer has a deterministic
 * fallback, and persistence degrades to memory.
 */
const here = dirname(fileURLToPath(import.meta.url));
// dist/env.js and src/env.ts sit at the same depth relative to the repo root.
const repoRoot = join(here, '..', '..', '..');

export function loadEnv(): { loaded: boolean; path: string } {
  const path = join(repoRoot, '.env');
  if (!existsSync(path)) return { loaded: false, path };
  try {
    process.loadEnvFile(path);
    return { loaded: true, path };
  } catch {
    // Malformed file, or a Node without loadEnvFile. Neither is fatal.
    return { loaded: false, path };
  }
}

export const env = loadEnv();

/** True when a provider credential exists, i.e. Flint will make real calls. */
export function hasProviderKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}
