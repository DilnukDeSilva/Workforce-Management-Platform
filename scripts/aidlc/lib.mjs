// AI-DLC core library — the single source of truth for the lifecycle model.
// Used by the `aidlc` CLI, the Claude Code hooks in .claude/hooks/, and the harness tests.
// Zero dependencies (Node >= 20). Pure functions are exported for testing.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const FEATURES_DIR = 'docs/features';
export const TEMPLATES_DIR = 'docs/aidlc/templates';
export const TEMPLATE_MARKER = '<!-- aidlc:template -->';
export const SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Lifecycle model
// ---------------------------------------------------------------------------

/**
 * Tracks are "adaptive depth": a feature gets the full lifecycle, a fix or chore a light one.
 * Each gate is a HUMAN approval checkpoint. `artifacts` must exist and be filled in
 * (template marker removed) before the AI may mark the gate ready for review.
 * `unlocksConstruction` marks the gate after which production code may be edited.
 */
export const TRACKS = {
  feature: {
    branchPrefix: 'feat',
    gates: [
      { id: 'requirements', artifacts: ['intent.md', 'requirements.md', 'use-cases.md'] },
      { id: 'design', artifacts: ['design.md', 'test-cases.md', 'plan.md'], unlocksConstruction: true, trace: true },
      { id: 'release', artifacts: ['review.md'], requiresUnitsDone: true },
    ],
  },
  fix: {
    branchPrefix: 'fix',
    gates: [
      { id: 'plan', artifacts: ['intent.md', 'plan.md'], unlocksConstruction: true },
      { id: 'release', artifacts: ['review.md'], requiresUnitsDone: true },
    ],
  },
  chore: {
    branchPrefix: 'chore',
    gates: [
      { id: 'plan', artifacts: ['intent.md', 'plan.md'], unlocksConstruction: true },
      { id: 'release', artifacts: ['review.md'], requiresUnitsDone: true },
    ],
  },
};

export const GATE_STATUSES = ['pending', 'ready', 'approved', 'changes-requested'];
export const UNIT_STATUSES = ['pending', 'in-progress', 'done', 'failed', 'blocked'];
export const CHECK_RESULTS = ['pass', 'fail', 'warn', 'skip'];

/** Production code: editing it requires an active work item whose construction is unlocked. */
const PRODUCTION_PATTERNS = [
  /^client\/src\//,
  /^client\/public\//,
  /^client\/index\.html$/,
  /^client\/vite\.config\.[cm]?js$/,
  /^server\/(?!node_modules\/)(?!\.env\.example$).+/,
];

const SECRET_FILE = /(^|\/)\.env(\.(?!example$|sample$|template$)[^/]+)?$/;

export function isProductionPath(rel) {
  return PRODUCTION_PATTERNS.some((re) => re.test(rel));
}

export function isSecretPath(rel) {
  return SECRET_FILE.test(rel);
}

export function isStatePath(rel) {
  return new RegExp(`^${FEATURES_DIR}/[^/]+/state\\.json$`).test(rel);
}

// ---------------------------------------------------------------------------
// Git helpers
// ---------------------------------------------------------------------------

export function git(args, cwd = REPO_ROOT) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

export function currentBranch(cwd = REPO_ROOT) {
  return git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
}

export function gitUser(cwd = REPO_ROOT) {
  return git(['config', 'user.name'], cwd) || process.env.USER || 'unknown';
}

/** `feat/time-off` -> { prefix: 'feat', slug: 'time-off' } */
export function parseBranch(branch) {
  const m = /^(feat|fix|chore)\/([a-z0-9][a-z0-9-]*)$/.exec(branch || '');
  return m ? { prefix: m[1], slug: m[2] } : null;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export function featureDir(slug, root = REPO_ROOT) {
  return join(root, FEATURES_DIR, slug);
}

export function statePath(slug, root = REPO_ROOT) {
  return join(featureDir(slug, root), 'state.json');
}

export function loadState(slug, root = REPO_ROOT) {
  const p = statePath(slug, root);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

export function saveState(state, root = REPO_ROOT) {
  const p = statePath(state.slug, root);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(state, null, 2) + '\n');
}

export function listSlugs(root = REPO_ROOT) {
  const dir = join(root, FEATURES_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, 'state.json')))
    .map((d) => d.name)
    .sort();
}

/** Resolve the active work item from an explicit slug or from the current branch. */
export function resolveSlug(explicit, root = REPO_ROOT) {
  if (explicit) return explicit;
  const parsed = parseBranch(currentBranch(root));
  return parsed ? parsed.slug : null;
}

export function newState({ slug, title, track, branch, now = new Date().toISOString(), by = 'unknown' }) {
  const def = TRACKS[track];
  if (!def) throw new Error(`Unknown track "${track}". Use one of: ${Object.keys(TRACKS).join(', ')}`);
  return {
    schema: SCHEMA_VERSION,
    slug,
    title,
    track,
    branch,
    createdAt: now,
    gates: Object.fromEntries(def.gates.map((g) => [g.id, { status: 'pending' }])),
    units: [],
    checks: {},
    history: [{ at: now, by, event: 'started', note: `${track}: ${title}` }],
  };
}

export function gateDefs(state) {
  return TRACKS[state.track].gates;
}

export function constructionGate(state) {
  return gateDefs(state).find((g) => g.unlocksConstruction);
}

export function isConstructionUnlocked(state) {
  const g = constructionGate(state);
  return state.gates[g.id]?.status === 'approved';
}

/** Phase is derived from gates and units — never stored — so it cannot drift. */
export function derivePhase(state) {
  const gates = gateDefs(state);
  const last = gates[gates.length - 1];
  if (state.gates[last.id]?.status === 'approved') return 'done';
  if (!isConstructionUnlocked(state)) return 'inception';
  const units = state.units || [];
  if (units.length > 0 && units.every((u) => u.status === 'done')) return 'operations';
  return 'construction';
}

/** The first gate that is not yet approved, in order. */
export function currentGate(state) {
  return gateDefs(state).find((g) => state.gates[g.id]?.status !== 'approved') || null;
}

// ---------------------------------------------------------------------------
// Artifacts, traceability and drift
// ---------------------------------------------------------------------------

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

export function artifactHashes(state, gateId, root = REPO_ROOT) {
  const gate = gateDefs(state).find((g) => g.id === gateId);
  const out = {};
  for (const name of gate.artifacts) {
    const p = join(featureDir(state.slug, root), name);
    out[name] = existsSync(p) ? sha256(readFileSync(p, 'utf8')) : null;
  }
  return out;
}

/** Use-case IDs defined in use-cases.md: `## UC-1:` headings and `**UC-1-E2**` sub-scenarios. */
export function definedUseCaseIds(text) {
  const ids = new Set();
  for (const m of text.matchAll(/^#{2,3}\s+(UC-\d+)\b/gm)) ids.add(m[1]);
  for (const m of text.matchAll(/\*\*(UC-\d+(?:-[A-Z]+\d*)?)\b/g)) ids.add(m[1]);
  return [...ids].sort(compareUcIds);
}

export function referencedIds(text) {
  return new Set([...text.matchAll(/\bUC-\d+(?:-[A-Z]+\d*)?\b/g)].map((m) => m[0]));
}

function compareUcIds(a, b) {
  return a.localeCompare(b, 'en', { numeric: true });
}

/** Every defined scenario must have a test case; every top-level use case must be planned. */
export function traceGaps({ useCases, testCases, plan }) {
  const defined = definedUseCaseIds(useCases);
  const tested = referencedIds(testCases);
  const planned = referencedIds(plan);
  const topLevel = defined.filter((id) => /^UC-\d+$/.test(id));
  return {
    defined,
    untested: defined.filter((id) => !tested.has(id)),
    unplanned: topLevel.filter((id) => ![...planned].some((p) => p === id || p.startsWith(id + '-'))),
  };
}

/** Problems that block marking a gate ready. Returns [] when the gate's artifacts are complete. */
export function gateReadinessProblems(state, gateId, root = REPO_ROOT) {
  const gate = gateDefs(state).find((g) => g.id === gateId);
  if (!gate) return [`Gate "${gateId}" does not exist on the ${state.track} track`];
  const problems = [];
  const idx = gateDefs(state).indexOf(gate);
  for (const prev of gateDefs(state).slice(0, idx)) {
    if (state.gates[prev.id]?.status !== 'approved') problems.push(`Earlier gate "${prev.id}" is not approved yet`);
  }
  const dir = featureDir(state.slug, root);
  for (const name of gate.artifacts) {
    const p = join(dir, name);
    if (!existsSync(p)) problems.push(`Missing artifact ${FEATURES_DIR}/${state.slug}/${name}`);
    else if (readFileSync(p, 'utf8').includes(TEMPLATE_MARKER))
      problems.push(`${name} still contains the template marker — fill it in and remove "${TEMPLATE_MARKER}"`);
  }
  if (gate.trace && problems.length === 0) {
    const read = (n) => readFileSync(join(dir, n), 'utf8');
    const gaps = traceGaps({ useCases: read('use-cases.md'), testCases: read('test-cases.md'), plan: read('plan.md') });
    if (gaps.defined.length === 0) problems.push('use-cases.md defines no UC-n identifiers');
    if (gaps.untested.length) problems.push(`Use-case scenarios with no test case: ${gaps.untested.join(', ')}`);
    if (gaps.unplanned.length) problems.push(`Use cases not covered by any unit in plan.md: ${gaps.unplanned.join(', ')}`);
  }
  if (gate.unlocksConstruction && problems.length === 0) {
    const units = parsePlanUnits(readFileSync(join(dir, 'plan.md'), 'utf8'));
    if (units.length === 0) problems.push('plan.md defines no units (expected "### U1: <title>" headings)');
    problems.push(...waveConflicts(units));
  }
  if (gate.requiresUnitsDone) {
    const open = (state.units || []).filter((u) => u.status !== 'done');
    if ((state.units || []).length === 0) problems.push('No units registered — run `npm run aidlc -- units sync`');
    if (open.length) problems.push(`Units not done: ${open.map((u) => `${u.id} (${u.status})`).join(', ')}`);
    const failed = Object.entries(state.checks || {}).filter(([, c]) => c.result === 'fail');
    if (failed.length) problems.push(`Failing quality checks: ${failed.map(([k]) => k).join(', ')}`);
  }
  return problems;
}

/** Approved artifacts that changed since approval (the human approved something else). */
export function driftedArtifacts(state, root = REPO_ROOT) {
  const drift = [];
  for (const g of gateDefs(state)) {
    const rec = state.gates[g.id];
    if (rec?.status !== 'approved' || !rec.hashes) continue;
    const now = artifactHashes(state, g.id, root);
    for (const [name, h] of Object.entries(rec.hashes)) if (now[name] !== h) drift.push({ gate: g.id, artifact: name });
  }
  return drift;
}

/** Which approved gate (if any) owns this artifact path. */
export function approvedGateForArtifact(rel, root = REPO_ROOT) {
  const m = new RegExp(`^${FEATURES_DIR}/([^/]+)/([^/]+)$`).exec(rel);
  if (!m) return null;
  const state = loadState(m[1], root);
  if (!state) return null;
  for (const g of gateDefs(state)) {
    if (g.artifacts.includes(m[2]) && state.gates[g.id]?.status === 'approved') return { slug: m[1], gate: g.id };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Plan parsing
// ---------------------------------------------------------------------------

/**
 * Units are `### U<n>: <title>` headings in plan.md, each followed by bullet fields:
 *   - **Wave:** 1
 *   - **Files:** `server/db.js` [new], `server/test/db.test.js` [new]
 */
export function parsePlanUnits(text) {
  const units = [];
  let cur = null;
  for (const line of text.split('\n')) {
    const h = /^###\s+(U\d+)\s*[:—-]\s*(.+?)\s*$/.exec(line);
    if (h) {
      cur = { id: h[1], title: h[2], wave: 1, files: [] };
      units.push(cur);
      continue;
    }
    if (/^#{1,3}\s/.test(line)) cur = null;
    if (!cur) continue;
    const wave = /^\s*-\s+\*\*Wave:\*\*\s*(\d+)/.exec(line);
    if (wave) cur.wave = Number(wave[1]);
    const files = /^\s*-\s+\*\*Files:\*\*\s*(.+)$/.exec(line);
    if (files) cur.files = [...files[1].matchAll(/`([^`]+)`/g)].map((f) => f[1]);
  }
  return units;
}

/** Two units in the same wave must not touch the same file (they may run in parallel). */
export function waveConflicts(units) {
  const problems = [];
  const byWave = new Map();
  for (const u of units) {
    if (!byWave.has(u.wave)) byWave.set(u.wave, []);
    byWave.get(u.wave).push(u);
  }
  for (const [wave, list] of byWave) {
    const owner = new Map();
    for (const u of list) {
      for (const f of u.files) {
        const key = f.toLowerCase();
        if (owner.has(key)) problems.push(`Wave ${wave}: ${owner.get(key)} and ${u.id} both touch ${f}`);
        else owner.set(key, u.id);
      }
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Validation (used by `aidlc check` and `npm run verify`)
// ---------------------------------------------------------------------------

export function validateState(state) {
  const errs = [];
  if (state.schema !== SCHEMA_VERSION) errs.push(`schema must be ${SCHEMA_VERSION}`);
  if (!TRACKS[state.track]) errs.push(`unknown track "${state.track}"`);
  else {
    for (const g of gateDefs(state)) {
      const s = state.gates?.[g.id]?.status;
      if (!GATE_STATUSES.includes(s)) errs.push(`gate ${g.id}: invalid status "${s}"`);
      if (s === 'approved' && !state.gates[g.id].approvedBy) errs.push(`gate ${g.id}: approved without approvedBy`);
    }
  }
  for (const u of state.units || []) if (!UNIT_STATUSES.includes(u.status)) errs.push(`unit ${u.id}: invalid status "${u.status}"`);
  for (const [k, c] of Object.entries(state.checks || {}))
    if (!CHECK_RESULTS.includes(c.result)) errs.push(`check ${k}: invalid result "${c.result}"`);
  return errs;
}

// ---------------------------------------------------------------------------
// Hook decisions (pure — unit tested in aidlc.test.mjs)
// ---------------------------------------------------------------------------

export function toRepoRelative(p, root = REPO_ROOT) {
  if (!p) return '';
  const abs = resolve(root, p);
  const rel = relative(root, abs);
  return rel.split(sep).join('/');
}

export function enforcementEnabled(env = process.env) {
  return !['0', 'off', 'false'].includes(String(env.AIDLC_ENFORCE || '').toLowerCase());
}

const BASH_RULES = [
  {
    decision: 'deny',
    re: /\bgit\b(?:\s+-[cC]\s+\S+)*\s+(commit|push)\b/,
    why: 'Project policy: the human commits and pushes. Stage nothing; leave the change in the working tree and give the user a suggested conventional-commit message instead.',
  },
  {
    decision: 'deny',
    re: /(aidlc(\.mjs)?|scripts\/aidlc\/cli\.mjs)\b[^|;&]*\b(approve|reject)\b/,
    why: 'Gate approval is a human decision. Ask the user to run `npm run aidlc -- approve <gate>` (or `reject`) themselves after reviewing the artifacts.',
  },
  {
    decision: 'deny',
    test: (cmd) => readsSecretFile(cmd),
    why: 'Secrets policy: never read or print .env files. Use .env.example for variable names; ask the user if a real value matters.',
  },
  { decision: 'ask', re: /\bgit\s+reset\s+--hard\b/, why: 'Discards uncommitted work.' },
  { decision: 'ask', re: /\bgit\s+clean\s+-\w*f/, why: 'Deletes untracked files.' },
  { decision: 'ask', re: /\bgit\s+branch\s+-D\b/, why: 'Force-deletes a branch.' },
  { decision: 'ask', re: /\bgit\s+(checkout|restore)\s+(--\s+)?\.(\s|$)/, why: 'Discards working-tree changes.' },
  { decision: 'ask', re: /\bgit\s+stash\s+(drop|clear)\b/, why: 'Deletes stashed work.' },
  { decision: 'ask', re: /\brm\s+-\w*r\w*f|\brm\s+-\w*f\w*r/, why: 'Recursive force delete.' },
  {
    decision: 'ask',
    test: (cmd) => addsDependency(cmd),
    why: 'Adding a dependency is an escalation (error-recovery Rule 4) — the user decides.',
  },
];

// Checked per command segment, so `cd x && git check-ignore server/.env` is allowed
// while `git check-ignore server/.env && cat server/.env` is still denied.
function readsSecretFile(cmd) {
  return cmd.split(/&&|\|\||;|\||\n/).some((seg) => {
    if (/^\s*(git\s+(check-ignore|status|ls-files)|ls)\b/.test(seg)) return false;
    return /(^|[\s'"=<>/])\.env(?!\.(example|sample|template)\b)(\.[\w.-]+)?(?=$|[\s'";|&)])/.test(seg);
  });
}

function addsDependency(cmd) {
  for (const seg of cmd.split(/&&|\|\||;|\|/)) {
    const m = /\b(npm|pnpm|yarn)\s+(install|i|add)\b(.*)$/.exec(seg.trim());
    if (!m) continue;
    const args = m[3].split(/\s+/).filter(Boolean).filter((a) => !a.startsWith('-'));
    // `npm install --workspace server` has the workspace name as a value, not a package.
    const flagValues = new Set();
    const toks = m[3].split(/\s+/).filter(Boolean);
    toks.forEach((t, i) => {
      if (/^(-w|--workspace|--prefix)$/.test(t) && toks[i + 1]) flagValues.add(toks[i + 1]);
    });
    if (args.some((a) => !flagValues.has(a))) return true;
  }
  return false;
}

/** @returns {{decision:'deny'|'ask', reason:string} | null} null = no opinion (normal permission flow). */
export function decideBash(command, env = process.env) {
  const cmd = String(command || '');
  for (const rule of BASH_RULES) {
    const hit = rule.re ? rule.re.test(cmd) : rule.test(cmd);
    if (!hit) continue;
    if (rule.decision === 'ask' && !enforcementEnabled(env)) continue;
    return { decision: rule.decision, reason: `[aidlc] ${rule.why}` };
  }
  return null;
}

/**
 * @param {{tool:string, rel:string, branch:string, env?:object, root?:string}} ctx
 * @returns {{decision:'deny'|'ask', reason:string} | null}
 */
export function decideFile({ tool, rel, branch, env = process.env, root = REPO_ROOT }) {
  if (!rel || rel.startsWith('..')) return null;
  const writing = tool !== 'Read';

  if (isSecretPath(rel)) {
    return {
      decision: 'deny',
      reason: `[aidlc] ${rel} holds secrets. Agents never read or write .env files — document variables in .env.example and ask the user to set real values.`,
    };
  }
  if (!writing) return null;

  if (isStatePath(rel)) {
    return {
      decision: 'deny',
      reason: '[aidlc] state.json is written only by the CLI so approvals cannot be forged. Use `npm run aidlc -- <ready|unit|record|units sync> ...`.',
    };
  }

  if (!enforcementEnabled(env)) return null;

  const owner = approvedGateForArtifact(rel, root);
  if (owner) {
    return {
      decision: 'ask',
      reason: `[aidlc] ${rel} was approved at the "${owner.gate}" gate. Editing it means the human must re-approve — confirm this change is intended.`,
    };
  }

  if (isProductionPath(rel)) {
    const parsed = parseBranch(branch);
    if (!parsed) {
      return {
        decision: 'deny',
        reason: `[aidlc] Production code can only change on a work-item branch (feat/fix/chore/<slug>); current branch is "${branch || 'unknown'}". Start one with \`npm run aidlc -- start <feature|fix|chore> <slug> --title "..."\`.`,
      };
    }
    const state = loadState(parsed.slug, root);
    if (!state) {
      return {
        decision: 'deny',
        reason: `[aidlc] No work item for branch ${branch}. Run \`npm run aidlc -- start ${trackForPrefix(parsed.prefix)} ${parsed.slug} --title "..." --no-branch\` and complete inception first.`,
      };
    }
    if (!isConstructionUnlocked(state)) {
      const g = constructionGate(state);
      return {
        decision: 'deny',
        reason: `[aidlc] "${state.slug}" is in ${derivePhase(state)}: the "${g.id}" gate (${state.gates[g.id].status}) must be approved by the user before production code changes. Finish the inception artifacts, run \`npm run aidlc -- ready ${g.id}\`, and ask the user to review and approve.`,
      };
    }
  }
  return null;
}

function trackForPrefix(prefix) {
  return Object.entries(TRACKS).find(([, t]) => t.branchPrefix === prefix)?.[0] || 'feature';
}

// ---------------------------------------------------------------------------
// Human-readable summaries (CLI + SessionStart hook)
// ---------------------------------------------------------------------------

export function nextAction(state) {
  const phase = derivePhase(state);
  const gate = currentGate(state);
  if (phase === 'done') return 'Released. Run /retro to capture lessons, then start the next work item.';
  const rec = gate && state.gates[gate.id];
  if (rec?.status === 'ready') return `WAITING ON HUMAN: review the "${gate.id}" artifacts, then run \`npm run aidlc -- approve ${gate.id}\` or \`reject ${gate.id} --note "..."\`.`;
  if (rec?.status === 'changes-requested') return `Address the reviewer's notes on "${gate.id}" (${rec.note || 'see history'}), then \`npm run aidlc -- ready ${gate.id}\`.`;
  if (phase === 'inception') return state.track === 'feature' ? `Run /inception to produce the "${gate.id}" artifacts.` : `Run /fix to produce intent.md and plan.md for the "${gate.id}" gate.`;
  if (phase === 'construction') {
    const next = (state.units || []).find((u) => u.status !== 'done');
    if (!state.units?.length) return 'Run `npm run aidlc -- units sync` to register units from plan.md, then /construction.';
    return `Run /construction — next unit ${next.id} (wave ${next.wave}): ${next.title} [${next.status}].`;
  }
  if (phase === 'operations') return 'All units done. Run /merge-ready to run the quality gates and prepare the release review.';
  return 'Run /aidlc for status.';
}

export function summarize(state, root = REPO_ROOT) {
  const lines = [];
  lines.push(`${state.title} (${state.track}, slug ${state.slug}) — phase: ${derivePhase(state).toUpperCase()}`);
  lines.push(
    '  gates: ' +
      gateDefs(state)
        .map((g) => `${g.id}=${state.gates[g.id]?.status}`)
        .join(' → '),
  );
  if (state.units?.length) {
    const done = state.units.filter((u) => u.status === 'done').length;
    lines.push(`  units: ${done}/${state.units.length} done` + unitDetail(state.units));
  }
  const checks = Object.entries(state.checks || {});
  if (checks.length) lines.push('  checks: ' + checks.map(([k, c]) => `${k}=${c.result}`).join(', '));
  const drift = driftedArtifacts(state, root);
  if (drift.length) lines.push(`  ⚠ changed since approval: ${drift.map((d) => `${d.artifact} (${d.gate})`).join(', ')} — needs re-approval`);
  lines.push(`  next: ${nextAction(state)}`);
  return lines.join('\n');
}

function unitDetail(units) {
  const open = units.filter((u) => u.status !== 'done');
  if (!open.length) return '';
  return ' — open: ' + open.map((u) => `${u.id}[w${u.wave}:${u.status}]`).join(' ');
}
