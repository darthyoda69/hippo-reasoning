#!/usr/bin/env node

/**
 * hippo gate — CI/CD regression gate for agent reasoning
 *
 * Usage:
 *   npx hippo gate              Run all regression tests
 *   npx hippo gate --url URL    Point to custom instance
 *   npx hippo gate --verbose    Show detailed results
 *   npx hippo gate --help       Show help
 *
 * Exit codes:
 *   0  All tests passed (deploy authorized)
 *   1  One or more tests failed (deploy blocked)
 */

// ANSI color codes
const c = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
  yellow: '\x1b[33m',
};

// Parse args
const args = process.argv.slice(2);
const flags = {
  help: args.includes('--help') || args.includes('-h'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  url: (() => {
    const idx = args.indexOf('--url');
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : 'http://localhost:3000';
  })(),
};

// Help
if (flags.help) {
  console.log(`
${c.green}${c.bold}hippo gate${c.reset} ${c.dim}— agent regression gate${c.reset}

${c.cyan}USAGE${c.reset}
  npx hippo gate                  Run all regression tests
  npx hippo gate --url <url>      Target a specific instance
  npx hippo gate --verbose        Show detailed output
  npx hippo gate --help           Show this help

${c.cyan}EXIT CODES${c.reset}
  ${c.green}0${c.reset}  PASS — all tests passed, deploy authorized
  ${c.red}1${c.reset}  FAIL — regressions detected, deploy blocked

${c.cyan}CI/CD INTEGRATION${c.reset}
  ${c.dim}# GitHub Actions${c.reset}
  - name: Hippo Gate
    run: npx hippo gate --url \${{ secrets.HIPPO_URL }}

  ${c.dim}# Vercel Build${c.reset}
  "scripts": { "prebuild": "npx hippo gate" }

${c.dim}https://github.com/darthyoda69/hippo-reasoning${c.reset}
`);
  process.exit(0);
}

// Main
async function main() {
  const baseUrl = flags.url.replace(/\/$/, '');

  console.log('');
  console.log(`${c.green}${c.bold}  hippo gate${c.reset}`);
  console.log(`${c.dim}  agent regression gate${c.reset}`);
  console.log(`${c.dim}  ─────────────────────${c.reset}`);
  console.log(`${c.dim}  target: ${baseUrl}${c.reset}`);
  console.log('');

  let data;

  try {
    const res = await fetch(`${baseUrl}/api/regressions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'run_all' }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      if (errBody.gate === 'skip') {
        console.log(`${c.yellow}  [SKIP]${c.reset} No regression tests configured`);
        console.log(`${c.dim}  Create tests from the trace panel first${c.reset}`);
        console.log('');
        process.exit(0);
      }
      throw new Error(`HTTP ${res.status}: ${JSON.stringify(errBody)}`);
    }

    data = await res.json();
  } catch (err) {
    console.log(`${c.red}  [ERROR]${c.reset} Failed to connect to ${baseUrl}`);
    console.log(`${c.dim}  ${err.message}${c.reset}`);
    console.log('');
    console.log(`${c.dim}  Make sure the hippo server is running:${c.reset}`);
    console.log(`${c.green}  $ npm run dev${c.reset}`);
    console.log('');
    process.exit(1);
  }

  // Display results
  const { gate, results, summary } = data;
  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);

  // Individual results
  for (const r of results) {
    const status = r.passed
      ? `${c.green}[PASS]${c.reset}`
      : `${c.red}[FAIL]${c.reset}`;
    const score = r.passed
      ? `${c.green}${r.score}%${c.reset}`
      : `${c.red}${r.score}%${c.reset}`;

    console.log(`  ${status} ${r.name} ${c.dim}(${score}${c.dim})${c.reset}`);

    if (flags.verbose) {
      console.log(`${c.dim}         id: ${r.testId}${c.reset}`);
    }
  }

  console.log('');
  console.log(`${c.dim}  ─────────────────────${c.reset}`);

  // Gate verdict
  if (gate === 'PASS') {
    console.log(`${c.green}${c.bold}  GATE: PASS${c.reset}`);
    console.log(`${c.green}  >> deploy authorized${c.reset}`);
    console.log(`${c.dim}  ${summary}${c.reset}`);
  } else {
    console.log(`${c.red}${c.bold}  GATE: FAIL${c.reset}`);
    console.log(`${c.red}  >> BLOCKED — regressions detected${c.reset}`);
    console.log(`${c.dim}  ${summary}${c.reset}`);
  }

  console.log('');

  process.exit(gate === 'PASS' ? 0 : 1);
}

main().catch((err) => {
  console.error(`${c.red}  [FATAL]${c.reset} ${err.message}`);
  process.exit(1);
});
