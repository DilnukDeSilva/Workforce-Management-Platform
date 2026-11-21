#!/usr/bin/env node
// PreToolUse(Bash): enforce git policy (human commits), human-only gate approval,
// secrets protection, and confirmation for destructive commands / new dependencies.
import { decideBash } from '../../scripts/aidlc/lib.mjs';
import { emitPreToolUse, failOpen, readInput } from './_io.mjs';

try {
  const input = await readInput();
  emitPreToolUse(decideBash(input.tool_input?.command));
} catch (e) {
  failOpen(e);
}
