#!/usr/bin/env node
// PreToolUse(Read|Edit|Write|MultiEdit|NotebookEdit): secrets protection, CLI-only state writes,
// re-approval on approved artifacts, and the phase gate on production code.
import { currentBranch, decideFile, toRepoRelative } from '../../scripts/aidlc/lib.mjs';
import { emitPreToolUse, failOpen, readInput } from './_io.mjs';

try {
  const input = await readInput();
  const ti = input.tool_input || {};
  const target = ti.file_path || ti.notebook_path || ti.path;
  const rel = toRepoRelative(target);
  emitPreToolUse(decideFile({ tool: input.tool_name, rel, branch: currentBranch() }));
} catch (e) {
  failOpen(e);
}
