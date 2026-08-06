import type { FlagValue, Guard, StateMutation } from '@lantern/schema';

/**
 * Guard evaluation over campaign flags. Deterministic, total, and tiny —
 * the linter statically enumerates this same language, the engine evaluates it.
 *
 * Semantics, fixed here and nowhere else:
 *  - `set`:   the flag is present AND truthy. Writing `false` to a flag
 *             makes it `unset` again — which is what lets an option like
 *             "dry off by the fire" clear `soaked` by writing false.
 *  - `unset`: absent, or present and falsy.
 *  - `eq`/`neq`: strict comparison against the stored value; an absent flag
 *             equals nothing (so `neq` on an absent flag is true).
 *  - `gte`/`lte`: numeric comparison; absent or non-numeric flags fail.
 */

export type Flags = Readonly<Record<string, FlagValue>>;

export function evaluateGuard(guard: Guard, flags: Flags): boolean {
  switch (guard.op) {
    case 'always':
      return true;
    case 'never':
      return false;
    case 'set':
      return Boolean(flags[guard.flag]);
    case 'unset':
      return !flags[guard.flag];
    case 'eq':
      return guard.flag in flags && flags[guard.flag] === guard.value;
    case 'neq':
      return !(guard.flag in flags) || flags[guard.flag] !== guard.value;
    case 'gte': {
      const v = flags[guard.flag];
      return typeof v === 'number' && v >= guard.value;
    }
    case 'lte': {
      const v = flags[guard.flag];
      return typeof v === 'number' && v <= guard.value;
    }
    case 'and':
      return guard.clauses.every((c) => evaluateGuard(c, flags));
    case 'or':
      return guard.clauses.some((c) => evaluateGuard(c, flags));
    case 'not':
      return !evaluateGuard(guard.clause, flags);
  }
}

export function applyMutations(flags: Flags, mutations: readonly StateMutation[]): Flags {
  if (mutations.length === 0) return flags;
  const next = { ...flags };
  for (const m of mutations) next[m.flag] = m.value;
  return next;
}
