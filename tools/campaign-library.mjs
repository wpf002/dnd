#!/usr/bin/env node
/**
 * Campaign library generator.
 *
 * Builds one ORIGINAL playable adventure per entry in
 * docs/reference/great-campaigns.md — 75 of them, spanning the official and
 * community canon.
 *
 * ── What this is NOT ──────────────────────────────────────────────────────
 * These are not adaptations, ports, or reconstructions of the listed works.
 * The listed titles are copyrighted products by Wizards of the Coast and by
 * named community creators, and their plots, characters, and locations are
 * not reproduced here.
 *
 * The ONLY thing taken from each entry is its factual metadata — the setting
 * type and the theme — which is why `sourceTitle` is deliberately never
 * placed into the generation prompt. `buildRequest` composes from `biome`
 * and `tone` alone. An entry whose theme is "gothic horror, vampires,
 * tragedy" yields an original gothic vampire tragedy; it does not yield
 * Barovia, and the model is never told Barovia is what inspired it.
 *
 * `inspiredBy` is recorded in the sidecar index for attribution only, after
 * generation, and never round-trips into a prompt.
 *
 * To actually play a module you own, use the Phase 5 ingestion route
 * (`POST /ingest`) with that module's text. That is the supported path.
 *
 * ── Usage ────────────────────────────────────────────────────────────────
 *   node tools/campaign-library.mjs            # all pending entries
 *   LIMIT=2 node tools/campaign-library.mjs    # smoke test
 *   CONCURRENCY=3 node tools/campaign-library.mjs
 *
 * Resumable: entries already written to content/adventures/ are skipped.
 * Also doubles as the Phase 3 benchmark — it reports first-attempt linter
 * pass rate across every run, which is a far larger sample than a bespoke
 * benchmark script.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const { loadEnv } = await import(join(root, 'apps/api/dist/env.js'));
loadEnv();
const { generateAdventure } = await import(join(root, 'apps/api/dist/services/generator.js'));
const { createLanternFlint, NdjsonTelemetry } = await import(join(root, 'packages/flint/dist/index.js'));
const { lintGraph } = await import(join(root, 'packages/linter/dist/index.js'));

const ADVENTURES = join(root, 'content/adventures');
const MANIFESTS = join(root, 'content/art/manifest');
const INDEX = join(root, 'content/library-index.json');

/**
 * The canon, reduced to the two facts that drive generation: a biome/place
 * type and tone tags from the closed vocabulary. `t` = title (attribution
 * only, never prompted). `lvl` varies so the library isn't all level 3.
 */
const E = (t, biome, tone, lvl = 3, src = 'official') => ({ t, biome, tone, lvl, src });

const CAMPAIGNS = [
  // ── Official ──────────────────────────────────────────────────────────
  E('Curse of Strahd', 'a mist-sealed valley of failing villages under a castle', ['gothic-horror', 'mystery'], 4),
  E('Baldur\'s Gate: Descent into Avernus', 'a river city and the burning warfront beneath it', ['infernal-war', 'political-fantasy'], 6),
  E('Storm King\'s Thunder', 'a northern frontier of steadings and giant-holds', ['high-adventure', 'exploration'], 5),
  E('Tomb of Annihilation', 'a fever-green jungle peninsula over a buried tomb', ['jungle-survival', 'megadungeon'], 5),
  E('Waterdeep: Dragon Heist', 'a great mercantile port of guilds and rooftops', ['urban-intrigue', 'heist'], 3),
  E('The Wild Beyond the Witchlight', 'a travelling carnival at the edge of a fey realm', ['whimsical-fey', 'mystery'], 3),
  E('Out of the Abyss', 'lightless caverns beneath a hostile underland', ['survival-horror', 'exploration'], 4),
  E('Lost Mine of Phandelver', 'a frontier mining town and the old workings below', ['beginner-classic'], 2),
  E('Princes of the Apocalypse', 'a broad river valley riddled with elemental cults', ['sandbox', 'exploration'], 4),
  E('Icewind Dale: Rime of the Frostmaiden', 'ten frozen settlements under permanent night', ['arctic-survival', 'mystery'], 4),
  E('Tyranny of Dragons', 'a war-threatened realm of muster and cult', ['high-adventure', 'epic-finale'], 6),
  E('Hoard of the Dragon Queen', 'a raided river road and a cult\'s baggage train', ['high-adventure', 'mystery'], 3),
  E('Rise of Tiamat', 'a besieged council seat on the eve of a summoning', ['epic-finale', 'political-fantasy'], 8),
  E('Ghosts of Saltmarsh', 'a fishing port with smugglers under its docks', ['nautical', 'mystery'], 3),
  E('Call of the Netherdeep', 'a sunken deep beneath a desert trade city', ['exploration', 'mystery'], 5),
  E('Keys from the Golden Vault', 'a sequence of impossible strongrooms', ['heist', 'urban-intrigue'], 4),
  E('Journeys Through the Radiant Citadel', 'a waystation city linking distant lands', ['anthology', 'exploration'], 4),
  E('Candlekeep Mysteries', 'a cliff-top library fortress of dangerous books', ['mystery', 'anthology'], 3),
  E('Tales from the Yawning Portal', 'a tavern built over a famous dungeon shaft', ['megadungeon', 'anthology'], 4),
  E('Vecna: Eve of Ruin', 'a fraying seam between several worlds', ['epic-finale', 'cosmic-horror'], 10),
  E('Dungeon of the Mad Mage', 'an endless wizard-built undercity', ['megadungeon', 'exploration'], 6),
  E('Phandelver and Below: The Shattered Obelisk', 'a mining town where something older stirs', ['beginner-classic', 'cosmic-horror'], 3),
  E('Dragon of Icespire Peak', 'a frontier hold under a wyrm\'s shadow', ['sandbox', 'beginner-classic'], 2),
  E('Dragons of Stormwreck Isle', 'a storm-wrecked island of drakes and wrecks', ['beginner-classic', 'nautical'], 1),
  E('The Shattered Obelisk Campaign', 'a farming valley above an aberrant vault', ['cosmic-horror', 'mystery'], 4),

  // ── Community / actual play ───────────────────────────────────────────
  E('Critical Role: Vox Machina', 'a coastal republic of guilds and old ruins', ['high-adventure', 'political-fantasy'], 5, 'community'),
  E('Critical Role: The Mighty Nein', 'a wartime empire of border towns and spies', ['political-fantasy', 'mystery'], 4, 'community'),
  E('Critical Role: Bells Hells', 'a desert crown-city under a divided moon', ['exploration', 'cosmic-horror'], 5, 'community'),
  E('Dimension 20: Fantasy High', 'a school for young adventurers', ['beginner-classic', 'mystery'], 2, 'community'),
  E('Dimension 20: The Unsleeping City', 'a sleepless modern metropolis with a dreaming twin', ['urban-intrigue', 'whimsical-fey'], 4, 'community'),
  E('Dimension 20: Escape from the Bloodkeep', 'a dark lord\'s fortress after the dark lord dies', ['political-fantasy', 'gothic-horror'], 6, 'community'),
  E('Dimension 20: A Crown of Candy', 'a confectionery kingdom in dynastic collapse', ['political-fantasy', 'epic-finale'], 5, 'community'),
  E('Dimension 20: Neverafter', 'a nightmare version of a storybook country', ['gothic-horror', 'whimsical-fey'], 5, 'community'),
  E('Dimension 20: Starstruck Odyssey', 'a debt-ridden freighter crew among strange ports', ['exploration', 'heist'], 4, 'community'),
  E('Dimension 20: Mentopolis', 'a noir city that is the inside of one mind', ['urban-intrigue', 'mystery'], 4, 'community'),
  E('High Rollers: Aerois', 'a stitched-together world of grafted continents', ['exploration', 'high-adventure'], 5, 'community'),
  E('High Rollers: Lightfall', 'a sunless land lit by failing beacons', ['survival-horror', 'exploration'], 5, 'community'),
  E('The Adventure Zone: Balance', 'a world quietly eaten by seven relics', ['high-adventure', 'mystery'], 5, 'community'),
  E('The Adventure Zone: Amnesty', 'a mountain town hiding a refugee world', ['mystery', 'whimsical-fey'], 4, 'community'),
  E('The Adventure Zone: Ethersea', 'a drowned world of pressurised undersea holds', ['nautical', 'exploration'], 4, 'community'),
  E('The Adventure Zone: Steeplechase', 'a resort city that never lets guests leave', ['heist', 'mystery'], 4, 'community'),
  E('NADDPOD: Bahumia', 'a bright realm of adventuring guilds', ['high-adventure', 'beginner-classic'], 3, 'community'),
  E('NADDPOD: Eldermourne', 'an old continent of feuding baronies', ['political-fantasy', 'exploration'], 5, 'community'),
  E('NADDPOD: Trinyvale', 'a river-valley league of trading towns', ['exploration', 'mystery'], 4, 'community'),
  E('Dungeons of Drakkenheim', 'a quarantined city struck by a falling stone', ['survival-horror', 'urban-intrigue'], 4, 'community'),
  E('Shadows of Drakkenheim', 'a contaminated cathedral quarter', ['gothic-horror', 'survival-horror'], 5, 'community'),
  E('Fate of Drakkenheim', 'the ruined heart of a poisoned capital', ['epic-finale', 'cosmic-horror'], 8, 'community'),
  E('Acquisitions Incorporated', 'a franchised adventuring corporation', ['heist', 'high-adventure'], 4, 'community'),
  E('Acquisitions Incorporated: The C Team', 'a hopeless branch office on a bad contract', ['heist', 'beginner-classic'], 3, 'community'),
  E('Oxventure', 'a shabby duchy where crime pays badly', ['heist', 'urban-intrigue'], 3, 'community'),
  E('Relics and Rarities', 'a curiosity shop that commissions retrievals', ['mystery', 'anthology'], 4, 'community'),
  E('Into the Mother Lands', 'a settled frontier on a world not ours', ['exploration', 'political-fantasy'], 4, 'community'),
  E('RollPlay: Court of Swords', 'a purgatorial waste ruled by a card-court', ['survival-horror', 'gothic-horror'], 5, 'community'),
  E('RollPlay: Blades', 'a haunted industrial city of crews and scores', ['heist', 'urban-intrigue'], 4, 'community'),
  E('The Black Dice Society', 'a secret society in a mist-choked city', ['gothic-horror', 'urban-intrigue'], 4, 'community'),
  E('Girls, Guts, Glory', 'a raucous frontier of gods and grudges', ['high-adventure', 'exploration'], 4, 'community'),
  E('Rivals of Waterdeep', 'a great city\'s underrepresented wards', ['urban-intrigue', 'political-fantasy'], 4, 'community'),
  E('Dice, Camera, Action!', 'a cursed domain reached by accident', ['gothic-horror', 'high-adventure'], 4, 'community'),
  E('LA by Night', 'a modern city divided among night courts', ['urban-intrigue', 'gothic-horror'], 5, 'community'),
  E('Dungeons & Daddies', 'a suburban world crossed with a hell-realm', ['whimsical-fey', 'infernal-war'], 3, 'community'),
  E('Worlds Beyond Number', 'an old world of wizards, wilds, and war', ['exploration', 'political-fantasy'], 5, 'community'),
  E('Three Black Halflings: Outlaws & Obelisks', 'a desert road of outlaws and standing stones', ['exploration', 'mystery'], 4, 'community'),
  E('Legends of Avantris', 'a bright kingdom with an unquiet past', ['high-adventure', 'mystery'], 4, 'community'),
  E('Venture Maidens', 'a wilderness of covens and old bargains', ['whimsical-fey', 'exploration'], 4, 'community'),
  E('Critical Role: Exandria Unlimited', 'a frontier town on the edge of ruin country', ['exploration', 'high-adventure'], 4, 'community'),
  E('Critical Role: Calamity', 'a golden city in its last days', ['epic-finale', 'political-fantasy'], 10, 'community'),
  E('Critical Role: Downfall', 'a doomed capital seen from the inside', ['epic-finale', 'cosmic-horror'], 9, 'community'),
  E('Critical Role: Candela Obscura', 'a gaslit city investigating a bleeding dark', ['cosmic-horror', 'mystery'], 4, 'community'),
  E('Fools Gold: Into the Bellowing Wilds', 'a gold-rush wilderness of loud magic', ['exploration', 'whimsical-fey'], 4, 'community'),
  E('Heroes & Halfwits', 'a slapdash realm of unqualified heroes', ['beginner-classic', 'high-adventure'], 2, 'community'),
  E('The Lucky Die', 'a fate-haunted land where luck is currency', ['mystery', 'high-adventure'], 4, 'community'),
  E('TablePop', 'a bright anthology world of short journeys', ['anthology', 'exploration'], 3, 'community'),
  E('HyperRPG: Kollok', 'a town where a sealed rift is thinning', ['cosmic-horror', 'mystery'], 4, 'community'),
  E('The Chain of Acheron', 'a mercenary company in a broken duchy', ['political-fantasy', 'high-adventure'], 6, 'community'),
  E('The West Marches Campaign', 'an unmapped wilderness beyond the last safe town', ['west-marches', 'exploration'], 3, 'community'),
];

const slug = (s) =>
  s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/**
 * Compose the generation request from biome + tone ONLY.
 * `entry.t` is intentionally absent — see the header note.
 */
function buildRequest(entry) {
  const [primary] = entry.tone;
  const hook = {
    'gothic-horror': 'an old wrong that will not stay buried, and the people still paying for it',
    'survival-horror': 'a place where the way out closes behind you a little more each hour',
    'arctic-survival': 'a cold that is deliberate, and something using it',
    'jungle-survival': 'a green country that digests what enters it',
    'urban-intrigue': 'three powers who each need the same small thing, quietly',
    heist: 'one object, one night, and a building designed by someone who thought of this',
    'political-fantasy': 'a succession, a treaty, or a debt that cannot be paid honestly',
    'infernal-war': 'a bargain coming due on a front nobody at home admits exists',
    'high-adventure': 'a threat large enough that ignoring it is itself a choice',
    exploration: 'a route nobody has come back from, and a reason to try again',
    megadungeon: 'a descent whose levels disagree about what the place was for',
    'cosmic-horror': 'a fact about the world that is true and should not be knowable',
    'whimsical-fey': 'a bargain whose terms were charming and are now literal',
    mystery: 'a disappearance whose evidence contradicts itself',
    anthology: 'a single strange commission with no obvious connection to anything',
    nautical: 'a wreck, a cargo, and a crew who disagree about which matters',
    'epic-finale': 'the last hours before something irreversible, with one lever left',
    'beginner-classic': 'a local trouble that turns out to have a room at the bottom of it',
    sandbox: 'a region with four problems and time to address maybe two',
    'west-marches': 'a frontier where the map ends and the rumours start',
  }[primary] ?? 'a situation that will not resolve itself';

  return {
    premise: `An original adventure set in ${entry.biome}. The situation turns on ${hook}. Invent all names, factions, and characters from scratch; do not use any pre-existing published setting, character, or plot.`,
    setting: entry.biome,
    tone: entry.tone,
    partyLevel: entry.lvl,
    length: 'standard',
    contentLimits: ['harm to children depicted on-screen'],
  };
}

/** Art slots are one flat namespace across the whole corpus — prefix them. */
function namespaceGraph(graph, id, entry) {
  graph.id = id;
  const map = new Map();
  for (const beat of graph.beats) {
    const short = beat.art.replace(/^art-/, '');
    const next = `art-${id}-${short}`.slice(0, 80);
    map.set(beat.art, next);
    beat.art = next;
  }
  graph.metadata.provenance = 'flint';
  return { graph, slots: [...map.values()] };
}

function writeManifest(id, entry, graph) {
  const manifest = {
    adventure: id,
    style: {
      promptPrefix: `TO BE LOCKED: choose one prefix and seed before generating any frame. Register should follow the tone tags: ${entry.tone.join(', ')}.`,
      seed: null,
      note: 'Generated adventure. Drop finished PNGs into apps/web/public/art/<slot>.png — BeatArt falls back png → svg → gradient.',
    },
    slots: graph.beats.map((b) => ({ slot: b.art, beat: b.id, brief: `${b.title} — ${b.prose.slice(0, 150)}` })),
  };
  writeFileSync(join(MANIFESTS, `${id}.json`), JSON.stringify(manifest, null, 2) + '\n');
}

mkdirSync(ADVENTURES, { recursive: true });
mkdirSync(MANIFESTS, { recursive: true });

const telemetry = new NdjsonTelemetry();
const flint = createLanternFlint({ telemetry });

const index = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, 'utf8')) : { generated: [] };
const done = new Set(index.generated.map((g) => g.inspiredBy));

const LIMIT = Number(process.env.LIMIT ?? 0);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 3);
let queue = CAMPAIGNS.filter((e) => !done.has(e.t)).map((e) => ({ e }));
if (LIMIT > 0) queue = queue.slice(0, LIMIT);

console.log(`library: ${CAMPAIGNS.length} entries, ${done.size} already built, ${queue.length} to generate\n`);

const stats = { pass: 0, firstAttempt: 0, lintFail: 0, callFail: 0 };
let cursor = 0;

async function worker() {
  while (cursor < queue.length) {
    const { e } = queue[cursor++];
    let id = `pending-${cursor}`;
    const t0 = Date.now();
    try {
      const result = await generateAdventure(flint, telemetry, buildRequest(e));
      const secs = ((Date.now() - t0) / 1000).toFixed(0);
      if (!result.ok) {
        if (result.kind === 'call-failed') stats.callFail++;
        else stats.lintFail++;
        console.log(`  FAIL  ${id}  (${result.kind}, ${result.attempts} attempt(s), ${secs}s)`);
        console.log(`        ${String(result.errors[0] ?? '').slice(0, 140)}`);
        continue;
      }
      // Name the file after the adventure that was actually generated.
      id = slug(result.graph.metadata.title);
      const { graph } = namespaceGraph(result.graph, id, e);
      const relint = lintGraph(graph);
      if (!relint.ok) {
        stats.lintFail++;
        console.log(`  FAIL  ${id}  (broke on namespacing: ${relint.errors[0]?.message.slice(0, 90)})`);
        continue;
      }
      writeFileSync(join(ADVENTURES, `${id}.json`), JSON.stringify(graph, null, 2) + '\n');
      writeManifest(id, e, graph);
      // Render this adventure's frames immediately. The library runs for
      // ~2 hours; a separate art pass afterwards means every intermediate
      // state has adventures whose art slots have no file, which is a real
      // gap (the app renders a bare gradient) and not merely a red test.
      try {
        execFileSync('node', [join(root, 'tools/generate-placeholder-art.mjs')], {
          cwd: root,
          stdio: 'ignore',
        });
      } catch {
        // Art is cosmetic and regenerable — never fail a built adventure on it.
      }
      index.generated.push({
        id,
        title: graph.metadata.title,
        inspiredBy: e.t, // attribution only — never used in a prompt
        source: e.src,
        tone: e.tone,
        partyLevel: e.lvl,
        beats: graph.beats.length,
      });
      writeFileSync(INDEX, JSON.stringify(index, null, 2) + '\n');
      stats.pass++;
      if (result.firstAttemptPassed) stats.firstAttempt++;
      console.log(
        `  ok    ${id}  ${graph.beats.length}b  attempt ${result.attempts}${result.firstAttemptPassed ? ' (1st)' : ''}  ${secs}s`,
      );
    } catch (err) {
      stats.callFail++;
      console.log(`  ERROR ${id}  ${String(err.message).slice(0, 140)}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const scored = stats.pass + stats.lintFail;
console.log(`\n=== library run complete ===`);
console.log(`  built            : ${stats.pass}`);
console.log(`  lint failures    : ${stats.lintFail}`);
console.log(`  transport errors : ${stats.callFail}  (excluded from scoring)`);
if (scored) {
  console.log(`\n=== Phase 3 benchmark (n=${scored}) ===`);
  console.log(`  first-attempt pass : ${((stats.firstAttempt / scored) * 100).toFixed(0)}%   [target >= 70%]`);
  console.log(`  passed within 3    : ${((stats.pass / scored) * 100).toFixed(0)}%   [target >= 95%]`);
}
console.log(`\n  total in library : ${index.generated.length}/${CAMPAIGNS.length}`);
