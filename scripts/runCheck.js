import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const diagnostics = [];
let totalFiles = 0;
let errorCount = 0;
let warningCount = 0;
let filesWithProblems = 0;

// 1. Run svelte-check with --output machine
let svelteCheckOutput = '';
let svelteCheckExit = 0;
try {
  svelteCheckOutput = execSync('npx svelte-check --tsconfig ./tsconfig.app.json --output machine', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  });
} catch (e) {
  svelteCheckExit = e.status || 1;
  svelteCheckOutput = e.stdout ? e.stdout.toString() : '';
}

const lines = svelteCheckOutput.split('\n');
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;

  const matchErrWarn = trimmed.match(/^\d+\s+(ERROR|WARNING)\s+"([^"]+)"\s+(\d+):(\d+)\s+"([\s\S]*)"$/);
  if (matchErrWarn) {
    const [, severity, filename, lineStr, charStr, rawMsg] = matchErrWarn;
    const message = rawMsg.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    diagnostics.push({
      filename,
      line: Number(lineStr),
      character: Number(charStr),
      type: severity === 'ERROR' ? 'error' : 'warning',
      message
    });
    continue;
  }

  const matchCompleted = trimmed.match(/^\d+\s+COMPLETED\s+(\d+)\s+FILES\s+(\d+)\s+ERRORS\s+(\d+)\s+WARNINGS\s+(\d+)\s+FILES_WITH_PROBLEMS$/);
  if (matchCompleted) {
    totalFiles = Number(matchCompleted[1]);
    errorCount = Number(matchCompleted[2]);
    warningCount = Number(matchCompleted[3]);
    filesWithProblems = Number(matchCompleted[4]);
  }
}

// 2. Run tsc for node config
let tscExit = 0;
let tscOutput = '';
try {
  tscOutput = execSync('npx tsc -p tsconfig.node.json', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  });
} catch (e) {
  tscExit = e.status || 1;
  tscOutput = e.stdout ? e.stdout.toString() : (e.message || '');
}

if (tscOutput) {
  const tscLines = tscOutput.split('\n');
  for (const line of tscLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const tscMatch = trimmed.match(/^(.+)\((\d+),(\d+)\):\s+(error|warning)\s+TS\d+:\s+(.*)$/);
    if (tscMatch) {
      const [, filename, lineStr, charStr, severity, message] = tscMatch;
      diagnostics.push({
        filename,
        line: Number(lineStr),
        character: Number(charStr),
        type: severity === 'error' ? 'error' : 'warning',
        message
      });
      if (severity === 'error') {
        errorCount++;
      } else {
        warningCount++;
      }
    }
  }
}

const success = svelteCheckExit === 0 && tscExit === 0 && errorCount === 0;

const result = {
  totalFiles,
  errorCount,
  warningCount,
  filesWithProblems,
  diagnostics,
  success
};

const outputPath = resolve(import.meta.dirname, '../check-results.json');
writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');

// Also output stdout text output as normal
if (svelteCheckOutput) {
  // Re-run human-readable svelte-check & tsc output or format nicely
}

if (!success) {
  process.exit(1);
}
