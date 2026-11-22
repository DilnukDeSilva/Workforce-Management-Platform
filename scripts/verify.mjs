#!/usr/bin/env node
// `npm run verify` — the single quality command for humans, agents, hooks and CI.
// Each step is detected from the repo: steps whose tooling is not configured yet are
// reported as SKIP (with the reason) instead of failing, so the harness works today and
// tightens automatically as test runners are added.
//
//   npm run verify            all steps
//   npm run verify -- --quick skip the production build

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './aidlc/lib.mjs';

const quick = process.argv.includes('--quick');
const pkg = (ws) => JSON.parse(readFileSync(join(REPO_ROOT, ws, 'package.json'), 'utf8'));
const isStub = (script) => !script || /no test specified/.test(script);

function run(cmd, args, cwd = REPO_ROOT) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
  return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}`.trim() };
}

function jsFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e.startsWith('.')) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...jsFiles(p));
    else if (/\.(c|m)?js$/.test(e)) out.push(p);
  }
  return out;
}

const server = pkg('server');
const client = pkg('client');
const root = pkg('.');

const steps = [
  { name: 'harness: tests', run: () => run(process.execPath, ['--test', 'scripts/aidlc/*.test.mjs']) },
  { name: 'harness: work items', run: () => run(process.execPath, ['scripts/aidlc/cli.mjs', 'check']) },
  {
    name: 'server: syntax',
    run: () => {
      const bad = jsFiles(join(REPO_ROOT, 'server'))
        .map((f) => ({ f, r: run(process.execPath, ['--check', f]) }))
        .filter((x) => !x.r.ok);
      return { ok: bad.length === 0, out: bad.map((x) => x.r.out).join('\n') };
    },
  },
  {
    name: 'server: lint',
    skip: !server.scripts?.lint && 'no lint script',
    run: () => run('npm', ['run', 'lint', '--workspace', 'server']),
  },
  {
    name: 'format: check',
    skip: !root.scripts?.['format:check'] && 'no format:check script',
    run: () => run('npm', ['run', 'format:check']),
  },
  {
    name: 'server: tests',
    skip: isStub(server.scripts?.test) && 'no test runner configured (server "test" script is the npm stub)',
    run: () => run('npm', ['test', '--workspace', 'server']),
  },
  { name: 'client: lint', skip: !client.scripts?.lint && 'no lint script', run: () => run('npm', ['run', 'lint', '--workspace', 'client']) },
  {
    name: 'client: tests',
    skip: isStub(client.scripts?.test) && 'no test runner configured (client has no "test" script)',
    run: () => run('npm', ['test', '--workspace', 'client']),
  },
  {
    name: 'client: build',
    skip: (quick && '--quick') || (!client.scripts?.build && 'no build script'),
    run: () => run('npm', ['run', 'build', '--workspace', 'client']),
  },
];

let failed = 0;
const rows = [];
for (const s of steps) {
  if (s.skip) {
    rows.push([s.name, 'SKIP', s.skip]);
    continue;
  }
  const t0 = Date.now();
  const r = s.run();
  const secs = ((Date.now() - t0) / 1000).toFixed(1) + 's';
  rows.push([s.name, r.ok ? 'PASS' : 'FAIL', secs]);
  if (!r.ok) {
    failed++;
    console.error(`\n── ${s.name} FAILED ──\n${r.out.split('\n').slice(-60).join('\n')}\n`);
  }
}

console.log('\nverify summary');
for (const [n, st, info] of rows) console.log(`  ${st.padEnd(4)}  ${n.padEnd(22)} ${info}`);
console.log(`\nOverall: ${failed ? `FAIL (${failed} step${failed > 1 ? 's' : ''})` : 'PASS'}`);
process.exit(failed ? 1 : 0);
