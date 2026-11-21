#!/usr/bin/env node
// PostToolUse(Edit|Write|MultiEdit): fast feedback on the file just edited.
// server JS -> `node --check` (syntax). client JS/JSX -> oxlint on that file.
// Exit 2 sends the error back to Claude so it fixes it before moving on.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, toRepoRelative } from '../../scripts/aidlc/lib.mjs';
import { readInput } from './_io.mjs';

try {
  const input = await readInput();
  const rel = toRepoRelative(input.tool_input?.file_path);
  let res = null;
  if (/^server\/(?!node_modules\/).+\.(c|m)?js$/.test(rel)) {
    res = spawnSync(process.execPath, ['--check', rel], { cwd: REPO_ROOT, encoding: 'utf8' });
  } else if (/^client\/src\/.+\.(js|jsx)$/.test(rel)) {
    const bin = [join(REPO_ROOT, 'node_modules/.bin/oxlint'), join(REPO_ROOT, 'client/node_modules/.bin/oxlint')].find(existsSync);
    if (bin) res = spawnSync(bin, [rel.replace(/^client\//, '')], { cwd: join(REPO_ROOT, 'client'), encoding: 'utf8' });
  }
  if (res && res.status !== 0) {
    process.stderr.write(`[aidlc post-edit] ${rel} failed checks — fix before continuing:\n${(res.stdout || '') + (res.stderr || '')}`.slice(0, 4000));
    process.exit(2);
  }
} catch (e) {
  process.stderr.write(`[aidlc post-edit] internal error (ignored): ${e?.message || e}\n`);
}
process.exit(0);
