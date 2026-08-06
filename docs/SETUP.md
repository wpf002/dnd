# Lantern — repo setup

Scaffold only. Nothing here writes application code.

> **Adapted from the original setup notes.** Two things differ from that
> document and are reflected below: the repo is **`wpf002/dnd`**, not
> `wpf002/lantern`, and this machine has **no `gh` CLI and no local Postgres**.
> Both alternatives are given.

---

## Status on this machine

| Requirement | Status |
|---|---|
| Node ≥ 20.11 | ✅ v24.15.0 |
| pnpm 9 | ✅ 9.12.0 (matches `packageManager` exactly) |
| git | ✅ 2.50.1 |
| `gh` CLI | ❌ not installed — use the web flow below |
| Database | ✅ SQLite via Prisma — `data/lantern.db`, no server needed |

Persistence runs on **SQLite** (`data/lantern.db`) — durable, file-based, zero
ops, integration-tested. Sessions and campaigns survive API restarts; turns
persist as queryable audit rows. If this ever deploys, the swap to hosted
Postgres is: change the provider in `packages/db/prisma/schema.prisma`, restore
Json column types, and point `DATABASE_URL` at the instance.

---

## 1. The GitHub repo

The remote `https://github.com/wpf002/dnd.git` already exists and is empty —
which is what the bootstrap wants. A pre-initialized repo (with README,
`.gitignore`, or license) would force a merge on first push.

If you ever need to recreate it:

**Via web:** github.com/new → owner `wpf002`, name `dnd`, Private, leave every
initialization checkbox unchecked.

**Via `gh`** (requires installing it first — `brew install gh`):

```bash
gh repo create wpf002/dnd --private --description "Rules-authoritative solo tabletop RPG engine"
```

## 2. Bootstrap

Already run. The scaffold is in place: pnpm workspace, Turborepo, `apps/web`
(Next.js 14 PWA), `apps/api` (Fastify 5), the six packages, the boundary guard,
the Prisma skeleton, and CI.

Note that `bootstrap.sh` refuses to run into a non-empty directory. If you
re-run it, target an empty path and copy the result in — do not disable the
check.

## 3. Install and verify

```bash
pnpm install
```

```bash
cp .env.example .env
```

Fill in `.env`:

- `DATABASE_URL` — defaults to the local SQLite file. Set it (or leave the
  example value) and the API persists sessions/campaigns; unset it and the API
  runs memory-only.
- `ANTHROPIC_API_KEY` — Flint's primary provider. Not needed until Flint v1.
- `OPENAI_API_KEY` — secondary; leave empty until Flint v3 routing exists.

Then verify the parts that don't need a database:

```bash
pnpm guard
```

Must print `Boundaries clean.` A failure at this stage means the scaffold wrote
something wrong — there is no application code yet to violate anything.

```bash
pnpm typecheck
```

### Database setup

```bash
pnpm db:generate
```

```bash
pnpm --filter @lantern/db push
```

`push` creates/syncs the SQLite file at `data/lantern.db`. No server, no
migration ceremony — appropriate for a single-user local tool.

## 4. Git

Already initialized on `main`. To connect the remote:

```bash
git remote add origin https://github.com/wpf002/dnd.git
```

```bash
git push -u origin main
```

Use `git@github.com:wpf002/dnd.git` instead if you prefer SSH.

## 5. Branch protection (optional, worth it)

CI runs `pnpm guard` on every PR. Protecting `main` against direct pushes is
what makes that guard load-bearing rather than decorative — the engine/model
boundary is the one thing here that must not erode.

Requires `gh`:

```bash
gh api -X PUT repos/wpf002/dnd/branches/main/protection -F required_status_checks.strict=true -F 'required_status_checks.contexts[]=verify' -F enforce_admins=false -F required_pull_request_reviews.required_approving_review_count=0 -F restrictions=null
```

Zero required reviewers — solo project. The point is the status check, not
review.

Without `gh`: Settings → Branches → Add rule → require the `verify` status
check.

## 6. Deployment

Deferred. Nothing is deployable until Phase 2, and the roadmap is explicit that
Phase 2 must be playable before infrastructure matters. Revisit then.

---

## Verification checklist

- [ ] `pnpm install` completes
- [ ] `pnpm guard` prints `Boundaries clean.`
- [ ] `pnpm typecheck` passes across all packages
- [ ] `pnpm dev` starts web on `:3000` and api on `:3001`
- [ ] `curl localhost:3001/health` returns `{"ok":true}`
- [ ] `.env` is untracked (`git status --ignored | grep .env`)
- [ ] CI green on first push

---

## What comes next

**Phase 0 first** — play a one-shot manually, no code, and answer whether solo
45-minute play is actually fun. That question costs a weekend and invalidates
everything downstream if the answer is no. See [ROADMAP.md](ROADMAP.md).

Then Phase 1, in this order:

1. `packages/schema` — `Action`, `Beat`, `Edge`, `BeatGraph` zod schemas.
   Everything else depends on this contract, so it lands first.
2. `packages/srd` — dice notation, ability scores, ~30 spells, a handful of
   monsters, four level-3 pregens.
3. `packages/engine` — dice → checks → combat → conditions, in that order.
4. `packages/linter` — reachability, encounter solvability, orphaned flags.
5. `packages/flint` v1 — typed call interface and provider adapters.
