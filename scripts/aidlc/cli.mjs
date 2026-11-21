#!/usr/bin/env node
// AI-DLC command-line interface. The only writer of docs/features/<slug>/state.json.
// Run via `npm run aidlc -- <command>`. `approve` and `reject` are human-only (blocked for agents by hooks).

import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CHECK_RESULTS,
  FEATURES_DIR,
  REPO_ROOT,
  TEMPLATES_DIR,
  TRACKS,
  UNIT_STATUSES,
  artifactHashes,
  currentBranch,
  derivePhase,
  driftedArtifacts,
  featureDir,
  gateDefs,
  gateReadinessProblems,
  git,
  gitUser,
  listSlugs,
  loadState,
  newState,
  nextAction,
  parsePlanUnits,
  resolveSlug,
  saveState,
  summarize,
  validateState,
  waveConflicts,
} from './lib.mjs';

const HELP = `AI-DLC — AI-Driven Development Lifecycle

Usage: npm run aidlc -- <command> [args] [--slug <slug>]

  start <feature|fix|chore> <slug> --title "..." [--no-branch]
                         Create a work item (docs/features/<slug>/) and its branch
  status [--json]        Show the active work item (from the branch) or all items
  next                   Print the single next action
  list                   List all work items with phase
  ready <gate>           (AI) Validate artifacts + traceability and mark a gate ready for human review
  approve <gate> [--note "..."]      (HUMAN ONLY) Approve a gate; records reviewer and artifact hashes
  reject <gate> --note "..."         (HUMAN ONLY) Request changes on a gate
  units sync             Register units from plan.md (### U1: <title>, - **Wave:** n)
  unit <id> <${UNIT_STATUSES.join('|')}> [--note "..."]
  record <check> <${CHECK_RESULTS.join('|')}> [--note "..."]   Record a quality-gate result
  log "<message>"        Append a decision/blocker note to the work item history
  check                  Validate every work item (schema, drift, wave conflicts); exit 1 on problems

The slug defaults to the one in the current branch name (feat|fix|chore/<slug>).`;

function parseArgs(argv) {
  const pos = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      flags[key] = val;
    } else pos.push(a);
  }
  return { pos, flags };
}

function fail(msg, code = 1) {
  console.error(`aidlc: ${msg}`);
  process.exit(code);
}

function requireState(flags) {
  const slug = resolveSlug(flags.slug);
  if (!slug) fail('No active work item: not on a feat/fix/chore/<slug> branch. Pass --slug or run `start`.');
  const state = loadState(slug);
  if (!state) {
    const others = listSlugs();
    const hint = flags.slug || !others.length
      ? 'Run `npm run aidlc -- start`.'
      : `The current branch has no work item. Existing work items: ${others.join(', ')}.\n` +
        `Re-run with --slug, e.g.: npm run aidlc -- ${process.argv.slice(2).join(' ')} --slug ${others[0]}`;
    fail(`No work item "${slug}" (expected ${FEATURES_DIR}/${slug}/state.json). ${hint}`);
  }
  return state;
}

function event(state, evt, note) {
  state.history.push({ at: new Date().toISOString(), by: gitUser(), event: evt, ...(note ? { note } : {}) });
}

const commands = {
  help() {
    console.log(HELP);
  },

  start({ pos, flags }) {
    const [track, slug] = pos;
    if (!TRACKS[track]) fail(`track must be one of: ${Object.keys(TRACKS).join(', ')}`);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug || '')) fail('slug must be kebab-case, e.g. time-off-approval');
    if (loadState(slug)) fail(`work item "${slug}" already exists`);
    const title = typeof flags.title === 'string' ? flags.title : slug;
    const branch = `${TRACKS[track].branchPrefix}/${slug}`;

    if (!flags['no-branch'] && currentBranch() !== branch) {
      if (git(['status', '--porcelain', '--untracked-files=no'])) fail('working tree has uncommitted changes — commit/stash first or pass --no-branch');
      const exists = git(['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]);
      git(exists ? ['switch', branch] : ['switch', '-c', branch]);
      if (currentBranch() !== branch) fail(`could not switch to ${branch}`);
      console.log(`Switched to ${exists ? '' : 'new '}branch ${branch} (based on ${exists ? 'existing branch' : 'previous HEAD'})`);
    }

    const dir = featureDir(slug);
    mkdirSync(dir, { recursive: true });
    const artifacts = new Set(gateDefs({ track }).flatMap((g) => g.artifacts));
    artifacts.add('journal.md');
    for (const name of artifacts) {
      const tpl = join(REPO_ROOT, TEMPLATES_DIR, track === 'feature' ? name : templateFor(track, name));
      if (existsSync(tpl) && !existsSync(join(dir, name))) copyFileSync(tpl, join(dir, name));
    }
    const state = newState({ slug, title, track, branch, by: gitUser() });
    saveState(state);
    console.log(`Created ${FEATURES_DIR}/${slug}/ (${[...artifacts].join(', ')})\n`);
    console.log(summarize(state));
  },

  status({ flags }) {
    const slug = resolveSlug(flags.slug);
    const slugs = slug && loadState(slug) ? [slug] : listSlugs();
    if (flags.json) {
      console.log(JSON.stringify(slugs.map((s) => ({ ...loadState(s), phase: derivePhase(loadState(s)) })), null, 2));
      return;
    }
    if (!slugs.length) {
      console.log('No work items yet. Start one: npm run aidlc -- start <feature|fix|chore> <slug> --title "..."');
      return;
    }
    if (!slug) console.log(`Branch ${currentBranch()} has no work item. All items:\n`);
    for (const s of slugs) console.log(summarize(loadState(s)) + '\n');
  },

  next({ flags }) {
    console.log(nextAction(requireState(flags)));
  },

  list() {
    for (const s of listSlugs()) {
      const st = loadState(s);
      console.log(`${derivePhase(st).padEnd(12)} ${st.track.padEnd(8)} ${s} — ${st.title}`);
    }
  },

  ready({ pos, flags }) {
    const state = requireState(flags);
    const gate = pos[0];
    if (!state.gates[gate]) fail(`unknown gate "${gate}" for ${state.track} track (${Object.keys(state.gates).join(', ')})`);
    if (state.gates[gate].status === 'approved') fail(`gate "${gate}" is already approved`);
    const problems = gateReadinessProblems(state, gate);
    if (problems.length) fail(`gate "${gate}" is not ready:\n  - ${problems.join('\n  - ')}`);
    state.gates[gate] = { status: 'ready', readyAt: new Date().toISOString() };
    event(state, `ready:${gate}`);
    saveState(state);
    console.log(`Gate "${gate}" is READY for human review. Artifacts:`);
    for (const a of gateDefs(state).find((g) => g.id === gate).artifacts) console.log(`  - ${FEATURES_DIR}/${state.slug}/${a}`);
    console.log(`\nThe user approves with: npm run aidlc -- approve ${gate}   (or: reject ${gate} --note "...")`);
  },

  approve({ pos, flags }) {
    const state = requireState(flags);
    const gate = pos[0];
    const rec = state.gates[gate];
    if (!rec) fail(`unknown gate "${gate}"`);
    if (rec.status !== 'ready' && !flags.force) fail(`gate "${gate}" is "${rec.status}", not "ready". Have the agent run \`ready ${gate}\` first (or pass --force).`);
    const problems = gateReadinessProblems(state, gate);
    if (problems.length && !flags.force) fail(`gate "${gate}" no longer passes readiness checks:\n  - ${problems.join('\n  - ')}`);
    state.gates[gate] = {
      status: 'approved',
      approvedBy: gitUser(),
      approvedAt: new Date().toISOString(),
      hashes: artifactHashes(state, gate),
      ...(typeof flags.note === 'string' ? { note: flags.note } : {}),
    };
    event(state, `approved:${gate}`, typeof flags.note === 'string' ? flags.note : undefined);
    if (gateDefs(state).find((g) => g.id === gate).unlocksConstruction) syncUnits(state, true);
    saveState(state);
    console.log(`Approved "${gate}". Phase is now ${derivePhase(state).toUpperCase()}.\nNext: ${nextAction(state)}`);
  },

  reject({ pos, flags }) {
    const state = requireState(flags);
    const gate = pos[0];
    if (!state.gates[gate]) fail(`unknown gate "${gate}"`);
    if (typeof flags.note !== 'string') fail('reject needs --note "what to change"');
    state.gates[gate] = { status: 'changes-requested', note: flags.note, at: new Date().toISOString(), by: gitUser() };
    event(state, `changes-requested:${gate}`, flags.note);
    saveState(state);
    console.log(`Changes requested on "${gate}": ${flags.note}`);
  },

  units({ pos, flags }) {
    if (pos[0] !== 'sync') fail('usage: units sync');
    const state = requireState(flags);
    syncUnits(state, false);
    saveState(state);
    console.log(summarize(state));
  },

  unit({ pos, flags }) {
    const state = requireState(flags);
    const [id, status] = pos;
    const unit = (state.units || []).find((u) => u.id === id);
    if (!unit) fail(`unknown unit "${id}" — run \`units sync\``);
    if (!UNIT_STATUSES.includes(status)) fail(`status must be one of ${UNIT_STATUSES.join(', ')}`);
    if (derivePhase(state) === 'inception') fail('construction is locked until the construction gate is approved');
    unit.status = status;
    if (typeof flags.note === 'string') unit.note = flags.note;
    event(state, `unit:${id}:${status}`, typeof flags.note === 'string' ? flags.note : undefined);
    saveState(state);
    console.log(`${id} → ${status}. ${nextAction(state)}`);
  },

  record({ pos, flags }) {
    const state = requireState(flags);
    const [check, result] = pos;
    if (!check || !CHECK_RESULTS.includes(result)) fail(`usage: record <check> <${CHECK_RESULTS.join('|')}> [--note]`);
    state.checks[check] = { result, at: new Date().toISOString(), ...(typeof flags.note === 'string' ? { note: flags.note } : {}) };
    event(state, `check:${check}:${result}`);
    saveState(state);
    console.log(`Recorded ${check}=${result}`);
  },

  log({ pos, flags }) {
    const state = requireState(flags);
    if (!pos[0]) fail('usage: log "<message>"');
    event(state, 'note', pos.join(' '));
    saveState(state);
    console.log('Logged.');
  },

  check() {
    let bad = 0;
    for (const slug of listSlugs()) {
      let state;
      try {
        state = loadState(slug);
      } catch (e) {
        console.error(`✗ ${slug}: state.json is not valid JSON (${e.message})`);
        bad++;
        continue;
      }
      const errs = validateState(state);
      for (const d of driftedArtifacts(state)) errs.push(`${d.artifact} changed after "${d.gate}" approval — needs re-approval`);
      const planPath = join(featureDir(slug), 'plan.md');
      if (existsSync(planPath)) errs.push(...waveConflicts(parsePlanUnits(readFileSync(planPath, 'utf8'))));
      if (errs.length) {
        bad++;
        console.error(`✗ ${slug}\n  - ${errs.join('\n  - ')}`);
      } else console.log(`✓ ${slug} (${derivePhase(state)})`);
    }
    if (bad) process.exit(1);
  },
};

function templateFor(track, name) {
  // fix/chore use lighter templates for intent and plan.
  return ['intent.md', 'plan.md'].includes(name) ? name.replace('.md', `.${track === 'chore' ? 'fix' : track}.md`) : name;
}

function syncUnits(state, quiet) {
  const planPath = join(featureDir(state.slug), 'plan.md');
  if (!existsSync(planPath)) fail('plan.md not found');
  const parsed = parsePlanUnits(readFileSync(planPath, 'utf8'));
  const prev = new Map((state.units || []).map((u) => [u.id, u]));
  state.units = parsed.map((u) => ({ id: u.id, title: u.title, wave: u.wave, status: prev.get(u.id)?.status || 'pending', ...(prev.get(u.id)?.note ? { note: prev.get(u.id).note } : {}) }));
  if (!quiet) event(state, 'units-synced', `${state.units.length} units`);
}

const { pos, flags } = parseArgs(process.argv.slice(2));
const cmd = pos.shift() || 'help';
if (!commands[cmd]) fail(`unknown command "${cmd}"\n\n${HELP}`);
commands[cmd]({ pos, flags });
