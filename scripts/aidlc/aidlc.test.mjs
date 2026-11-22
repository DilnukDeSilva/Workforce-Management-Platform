// Tests for the AI-DLC harness itself: guardrail decisions, lifecycle derivation,
// traceability and plan parsing. Run with `node --test scripts/aidlc/` (part of `npm run verify`).

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import {
  TEMPLATE_MARKER,
  decideBash,
  decideFile,
  derivePhase,
  gateReadinessProblems,
  isProductionPath,
  isSecretPath,
  newState,
  parseBranch,
  parsePlanUnits,
  saveState,
  traceGaps,
  waveConflicts,
} from './lib.mjs';

const ON = { AIDLC_ENFORCE: '1' };
const OFF = { AIDLC_ENFORCE: 'off' };

describe('decideBash', () => {
  const deny = (cmd) => assert.equal(decideBash(cmd, ON)?.decision, 'deny', cmd);
  const ask = (cmd) => assert.equal(decideBash(cmd, ON)?.decision, 'ask', cmd);
  const pass = (cmd) => assert.equal(decideBash(cmd, ON), null, cmd);

  test('humans commit and push', () => {
    deny('git commit -m "feat(api): x"');
    deny('git add server/db.js && git commit -m x');
    deny('git -C /repo commit --amend');
    deny('git push origin feat/x');
    pass('git status && git diff --stat');
    pass('git log --oneline -5');
  });

  test('gate approval is human-only', () => {
    deny('npm run aidlc -- approve design');
    deny('node scripts/aidlc/cli.mjs reject requirements --note no');
    pass('npm run aidlc -- ready design');
    pass('npm run aidlc -- status');
  });

  test('secret files are never read', () => {
    deny('cat server/.env');
    deny('grep MONGODB server/.env');
    deny('source .env.local');
    pass('cat server/.env.example');
    pass('git check-ignore server/.env');
    pass('cd /repo && git check-ignore server/.env && grep -q ^PORT= server/.env.example');
    deny('git check-ignore server/.env && cat server/.env');
    deny('git status $(cat server/.env)');
    deny('ls `cat .env`');
    deny("cat ';ls' server/.env");
    deny('ls & cat server/.env');
    deny('ls <(cat server/.env)');
    deny('cat server/.env>out');
    deny('cat server/.env</dev/null');
    deny('cat server/{.env,x}');
    pass('ls -la server');
  });

  test('destructive commands and new dependencies need confirmation', () => {
    ask('git reset --hard HEAD~1');
    ask('git clean -fd');
    ask('rm -rf client/dist');
    ask('npm install zod --workspace server');
    ask('npm i -D vitest -w client');
    pass('npm install');
    pass('npm install --workspace server');
    pass('npm ci');
  });

  test('AIDLC_ENFORCE=off relaxes asks but never hard policy', () => {
    assert.equal(decideBash('git reset --hard', OFF), null);
    assert.equal(decideBash('git commit -m x', OFF)?.decision, 'deny');
    assert.equal(decideBash('cat server/.env', OFF)?.decision, 'deny');
  });
});

describe('path classification', () => {
  test('production paths', () => {
    for (const p of ['server/index.js', 'server/db.js', 'server/test/db.test.js', 'server/package.json', 'client/src/App.jsx', 'client/index.html'])
      assert.ok(isProductionPath(p), p);
    for (const p of ['server/.env.example', 'docs/PRD.md', '.claude/agents/x.md', 'scripts/verify.mjs', 'client/README.md', 'server/node_modules/x/index.js'])
      assert.ok(!isProductionPath(p), p);
  });

  test('secret paths', () => {
    for (const p of ['server/.env', '.env', '.env.local', 'client/.env.production']) assert.ok(isSecretPath(p), p);
    for (const p of ['server/.env.example', '.env.sample', 'docs/env.md']) assert.ok(!isSecretPath(p), p);
  });

  test('branch parsing', () => {
    assert.deepEqual(parseBranch('feat/time-off'), { prefix: 'feat', slug: 'time-off' });
    assert.equal(parseBranch('main'), null);
    assert.equal(parseBranch('feature/x'), null);
  });
});

describe('lifecycle with a temp repo', () => {
  const root = mkdtempSync(join(tmpdir(), 'aidlc-'));
  after(() => rmSync(root, { recursive: true, force: true }));
  const dir = join(root, 'docs/features/time-off');
  mkdirSync(dir, { recursive: true });
  const write = (name, text) => writeFileSync(join(dir, name), text);

  const state = newState({ slug: 'time-off', title: 'Time off', track: 'feature', branch: 'feat/time-off' });
  saveState(state, root);

  test('code edits are blocked in inception and on non-work branches', () => {
    const d = decideFile({ tool: 'Edit', rel: 'server/index.js', branch: 'feat/time-off', env: ON, root });
    assert.equal(d.decision, 'deny');
    assert.match(d.reason, /design/);
    assert.equal(decideFile({ tool: 'Edit', rel: 'server/index.js', branch: 'dev', env: ON, root }).decision, 'deny');
    assert.equal(decideFile({ tool: 'Edit', rel: 'server/index.js', branch: 'feat/unknown', env: ON, root }).decision, 'deny');
    assert.equal(decideFile({ tool: 'Read', rel: 'server/index.js', branch: 'dev', env: ON, root }), null);
    assert.equal(decideFile({ tool: 'Edit', rel: 'docs/features/time-off/plan.md', branch: 'feat/time-off', env: ON, root }), null);
  });

  test('state.json and .env are protected even with enforcement off', () => {
    assert.equal(decideFile({ tool: 'Write', rel: 'docs/features/time-off/state.json', branch: 'x', env: OFF, root }).decision, 'deny');
    assert.equal(decideFile({ tool: 'Read', rel: 'server/.env', branch: 'x', env: OFF, root }).decision, 'deny');
    assert.equal(decideFile({ tool: 'Edit', rel: 'server/index.js', branch: 'dev', env: OFF, root }), null);
  });

  test('readiness requires filled artifacts and full traceability', () => {
    write('intent.md', `${TEMPLATE_MARKER}\n# Intent`);
    write('requirements.md', '# R');
    write('use-cases.md', '## UC-1: Submit\n- **UC-1-E1: bad dates**\n## UC-2: Approve\n');
    assert.match(gateReadinessProblems(state, 'requirements', root).join(), /template marker/);
    write('intent.md', '# Intent');
    assert.deepEqual(gateReadinessProblems(state, 'requirements', root), []);

    assert.match(gateReadinessProblems(state, 'design', root).join(), /Earlier gate "requirements"/);
    state.gates.requirements = { status: 'approved', approvedBy: 't' };
    write('design.md', '# D');
    write('test-cases.md', '| 1 | UC-1 | x |');
    write('plan.md', '### U1: Submit\n- **Wave:** 1\n- **Use cases:** UC-1, UC-1-E1\n');
    const problems = gateReadinessProblems(state, 'design', root).join('\n');
    assert.match(problems, /no test case: UC-1-E1, UC-2/);
    assert.match(problems, /not covered by any unit in plan.md: UC-2/);
  });

  test('phase derivation', () => {
    const s = newState({ slug: 'x', title: 'x', track: 'fix', branch: 'fix/x' });
    assert.equal(derivePhase(s), 'inception');
    s.gates.plan = { status: 'approved', approvedBy: 't' };
    assert.equal(derivePhase(s), 'construction');
    s.units = [{ id: 'U1', status: 'done', wave: 1 }];
    assert.equal(derivePhase(s), 'operations');
    s.gates.release = { status: 'approved', approvedBy: 't' };
    assert.equal(derivePhase(s), 'done');
  });
});

describe('plan parsing', () => {
  const plan = `# Plan
### U1: Connection module
- **Wave:** 1
- **Files:** \`server/db.js\` [new], \`server/test/db.test.js\` [new]
### U2 — Health endpoint
- **Wave:** 2
- **Files:** \`server/index.js\`
### U3: Startup gating
- **Wave:** 2
- **Files:** \`server/index.js\`, \`server/test/startup.test.js\`
## Risks
- **Wave:** 9 (not a unit)
`;
  test('extracts units, waves and files', () => {
    const units = parsePlanUnits(plan);
    assert.deepEqual(
      units.map((u) => [u.id, u.wave, u.files.length]),
      [['U1', 1, 2], ['U2', 2, 1], ['U3', 2, 2]],
    );
  });
  test('detects same-wave file conflicts', () => {
    assert.deepEqual(waveConflicts(parsePlanUnits(plan)), ['Wave 2: U2 and U3 both touch server/index.js']);
  });
  test('traceGaps on a clean set', () => {
    const g = traceGaps({ useCases: '## UC-1: A\n**UC-1-A1**', testCases: 'UC-1 UC-1-A1', plan: 'UC-1-A1' });
    assert.deepEqual([g.untested, g.unplanned], [[], []]);
  });
});
