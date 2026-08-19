#!/usr/bin/env node
/**
 * One command, everything checked, one screen of output.
 *
 * Why this exists: every tool call in a Claude session re-reads the whole
 * conversation, so running eleven browser suites as eleven separate commands cost
 * about eleven times what running them together costs — for identical coverage.
 * This builds the standalone demo, copies it where the browser tests look for it,
 * runs the unit tests and every browser suite, and prints one line per suite.
 *
 *   npm run verify              everything
 *   npm run verify -- reco      only suites whose name contains "reco"
 *   npm run verify -- --units   unit tests only (fast, no browser)
 *
 * Exit code is non-zero if anything failed, so it can gate a commit.
 */
import { execFile, execFileSync } from 'node:child_process';
import { readdirSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { promisify } from 'node:util';
import path from 'node:path';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
/* Staging lives inside the project. It used to be a fixed sandbox path, which meant the
   command only ran in the environment it was written in and crashed on a normal machine. */
const OUT = process.env.USC_BUILD_DIR || path.join(ROOT, '.build');
const args = process.argv.slice(2);
const unitsOnly = args.includes('--units');
const filter = args.filter((a) => !a.startsWith('--'))[0] || '';

const t0 = Date.now();
const line = (s) => process.stdout.write(s + '\n');

/* 1. build, and put the file where the browser suites expect it. Every past false
      pass came from testing a stale copy, so this is not optional. */
if (!unitsOnly) {
  execFileSync('python3', ['standalone/build.py'], { cwd: ROOT, stdio: 'pipe' });
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  for (const name of ['ai-guided-signup-demo.html', 'index.html']) {
    copyFileSync(path.join(ROOT, 'standalone/ai-guided-signup-demo.html'), path.join(OUT, name));
  }
  /* index.html at the repo root is the copy that gets published to GitHub Pages, so it is
     refreshed here too — a stale one there is a demo that shows yesterday's work. */
  copyFileSync(path.join(ROOT, 'standalone/ai-guided-signup-demo.html'), path.join(ROOT, 'index.html'));
  line('built and staged  standalone/ai-guided-signup-demo.html -> .build/ and index.html');
}

/* The browser suites need Playwright. It is not part of this project's zero-dependency
   promise, so when it is absent we say so and still run everything else, rather than
   failing the one command Karim relies on. */
const havePlaywright = (() => {
  try { execFileSync('python3', ['-c', 'import playwright'], { stdio: 'pipe' }); return true; }
  catch { return false; }
})();

/* 2. unit tests */
const results = [];
try {
  const unitFiles = readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).map((f) => `tests/${f}`);
  /* Pin the reporter. Newer Node defaults to "spec" ("i pass 58"), not TAP ("# pass 58"),
     and the counts below silently read as zero — a green run that tested nothing. */
  /* Serial on purpose. The domain-parity sweep runs both recommendation engines over every
     area x activity x frequency, which got ~3.6x heavier when the venue dataset grew to 193
     and starved journey.test.js's real HTTP server when the two ran concurrently — four
     tests failed once and then passed twice in a row. A verify command that fails one run in
     N teaches people to rerun it instead of reading it, so determinism beats a few seconds. */
  const { stdout } = await run('node', ['--no-warnings=ExperimentalWarning', '--test', '--test-concurrency=1', '--test-reporter=tap', ...unitFiles], { cwd: ROOT, maxBuffer: 1 << 24 });
  const pass = Number((stdout.match(/^# pass (\d+)/m) || [])[1] || 0);
  const fail = Number((stdout.match(/^# fail (\d+)/m) || [])[1] || 0);
  results.push({ name: 'unit tests', pass, fail, detail: [] });
} catch (err) {
  const out = String(err.stdout || '') + String(err.stderr || '');
  const pass = Number((out.match(/^# pass (\d+)/m) || [])[1] || 0);
  const fail = Number((out.match(/^# fail (\d+)/m) || [])[1] || 0);
  const detail = out.split('\n').filter((l) => /^not ok /.test(l)).slice(0, 6);
  results.push({ name: 'unit tests', pass, fail: fail || 1, detail });
}

/* 3. browser suites, a few at a time so one slow suite does not hold up the rest */
if (!unitsOnly && !havePlaywright) {
  line('');
  line('skipped  11 browser suites — Playwright is not installed on this machine.');
  line('         To run them too:  pip3 install playwright && python3 -m playwright install chromium');
}
if (!unitsOnly && havePlaywright) {
  const suites = readdirSync(path.join(ROOT, 'tests/browser'))
    .filter((f) => f.endsWith('.py'))
    .filter((f) => !filter || f.includes(filter))
    .sort();

  const CONCURRENCY = 3;
  const queue = [...suites];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const file = queue.shift();
      const name = file.replace(/\.py$/, '');
      try {
        const { stdout } = await run('python3', [`tests/browser/${file}`], {
          cwd: ROOT, maxBuffer: 1 << 24, timeout: 180000,
          env: { ...process.env, DEMO_URL: `file://${path.join(OUT, 'ai-guided-signup-demo.html')}`, SHOT_DIR: path.join(OUT, 'shots') }
        });
        const m = stdout.match(/=== (\d+) passed, (\d+) failed ===/);
        const detail = stdout.split('\n').filter((l) => l.startsWith('  !')).slice(0, 6);
        results.push({ name, pass: Number(m?.[1] || 0), fail: Number(m?.[2] || 0), detail });
      } catch (err) {
        const out = String(err.stdout || '') + String(err.stderr || '');
        const m = out.match(/=== (\d+) passed, (\d+) failed ===/);
        results.push({
          name, pass: Number(m?.[1] || 0), fail: Number(m?.[2] || 1),
          detail: m ? out.split('\n').filter((l) => l.startsWith('  !')).slice(0, 6)
                     : [(err.killed ? 'timed out' : String(err.message).split('\n')[0]).slice(0, 140)]
        });
      }
    }
  });
  await Promise.all(workers);
}

/* 4. one screen of output */
results.sort((a, b) => (a.name === 'unit tests' ? -1 : b.name === 'unit tests' ? 1 : a.name.localeCompare(b.name)));
let pass = 0, fail = 0;
line('');
for (const r of results) {
  pass += r.pass; fail += r.fail;
  line(`${r.fail ? 'FAIL' : 'ok  '}  ${r.name.padEnd(22)} ${String(r.pass).padStart(4)} passed${r.fail ? `, ${r.fail} failed` : ''}`);
  for (const d of r.detail) line(`        ${d.replace(/^\s*!\s*/, '')}`);
}
line('');
/* Zero assertions is not a pass. It means nothing ran, or the output could not be read —
   which once printed "all green" over a suite that had executed nothing at all. */
if (!pass && !fail) {
  line('FAILED — no assertions ran at all. Something is wrong with the test setup, not the demo.');
  process.exit(1);
}
line(`${fail ? 'FAILED' : 'all green'} — ${pass} assertions across ${results.length} suites in ${Math.round((Date.now() - t0) / 1000)}s`);
process.exit(fail ? 1 : 0);
