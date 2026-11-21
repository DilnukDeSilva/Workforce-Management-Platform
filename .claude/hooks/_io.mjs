// Shared stdin/stdout plumbing for AI-DLC hooks. Hooks must never crash Claude Code:
// on any internal error they fail OPEN (no decision) and log to stderr.

export async function readInput() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

export function emitPreToolUse(result) {
  if (!result) process.exit(0);
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: result.decision,
        permissionDecisionReason: result.reason,
      },
    }),
  );
  process.exit(0);
}

export function failOpen(err) {
  process.stderr.write(`[aidlc hook] internal error (allowing): ${err?.stack || err}\n`);
  process.exit(0);
}
