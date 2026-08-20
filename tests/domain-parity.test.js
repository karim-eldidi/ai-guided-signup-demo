/**
 * The recommendation exists twice, and twice is one too many.
 *
 * `src/recommend.js` is what the Node server runs and what the rest of this suite
 * covers. `standalone/src/domain.js` is a hand-port of the same rules, and it is the
 * copy every reviewer actually sees, because the single-file demo is the presentation
 * artefact. A deterministic, traceable recommendation is a non-negotiable product
 * rule, and two copies that can quietly disagree break it: the server says Essential,
 * the demo says Classic, and neither can be called the answer.
 *
 * So this suite drives both engines over the real question set and fails when the
 * decision differs. It compares the decision, not the prose — see the note on
 * excluded fields below.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { recommend as serverRecommend } from '../src/recommend.js';
import { matchVenues as serverMatchVenues, AREAS, VENUES } from '../src/venues.js';
import { QUESTIONS, optionsFor } from '../src/questions.js';
import { groupById } from '../src/activities.js';
import { coverage as serverCoverage } from '../src/coverage.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(ROOT, ...parts), 'utf8');

/* `standalone/src/domain.js` has no exports: the browser build concatenates the
   modules in standalone/build.py's MODULES order into one <script>, so every file
   shares one top-level scope. A single vm context reproduces exactly that — running
   the modules in build order gives domain.js the same neighbours (`PLANS`, `VENUES`,
   `ACTIVITY_GROUPS`, `S`…) it has in the real demo. Importing it any other way would
   mean rebuilding its dependencies by hand, and then a parity failure would only
   prove the harness was wrong. This is the prefix of MODULES up to `state.js`, which
   is where `S` — the answers and the radius the matcher reads — comes from; the
   screens and event handlers after it are pure UI. */
const BUILD_PREFIX = ['icons.js', 'questions.js', 'domain.js', 'urby.js', 'state.js'];

function loadStandaloneDomain() {
  const context = vm.createContext({
    // The three values standalone/template.html defines before the modules run.
    DATA: {
      plans: JSON.parse(read('data', 'plans.json')),
      venues: JSON.parse(read('data', 'venues.json')),
      faqs: JSON.parse(read('data', 'faqs.json')),
      apps: JSON.parse(read('data', 'apps.json'))
    },
    IMG: {},
    VARIANT: 'guide-first',
    console
  });
  for (const mod of BUILD_PREFIX) {
    vm.runInContext(read('standalone', 'src', mod), context, { filename: `standalone/src/${mod}` });
  }
  for (const name of ['recommend', 'matchVenues', 'optionsFor', 'qById']) {
    assert.equal(
      vm.runInContext(`typeof ${name}`, context), 'function',
      `standalone/src/${name === 'recommend' || name === 'matchVenues' ? 'domain.js' : 'questions.js'} no longer defines ${name}() — this harness is out of date, not the engines`
    );
  }
  /* Results are JSON on the way out. A vm context is a separate realm, so an array
     built inside it is not an instance of this realm's Array and deepStrictEqual
     would fail on the prototype rather than on the numbers. */
  const call = vm.runInContext(`(answers, presetMatch) => {
    const match = presetMatch || matchVenues(answers);
    const rec = recommend(answers, match);
    return JSON.stringify({
      planId: rec.planId,
      appliedRules: rec.appliedRules,
      coverage: rec.coverage
        ? { nearby: rec.coverage.totals.nearby, included: rec.coverage.totals.included, groupsMissing: rec.coverage.totals.groupsMissing }
        : null,
      reasons: rec.reasons
    });
  }`, context);
  return {
    /** Driven the way standalone/src/state.js drives it: match, then recommend. */
    run: (answers, presetMatch) => JSON.parse(call(answers, presetMatch)),
    optionIds: (questionId) => JSON.parse(vm.runInContext(`JSON.stringify(optionsFor(qById(${JSON.stringify(questionId)})).map((o) => o.id))`, context)),
    compactAnswerLabel: (qid, v) => vm.runInContext(`compactAnswerLabel(${JSON.stringify(qid)}, ${JSON.stringify(v)})`, context)
  };
}

const standalone = loadStandaloneDomain();

/** Driven the way server.js drives it: matchVenues(answers), then recommend(answers, match). */
function serverRun(answers, presetMatch) {
  const match = presetMatch || serverMatchVenues(answers);
  const rec = serverRecommend(answers, match);
  return {
    planId: rec.planId,
    appliedRules: rec.appliedRules,
    coverage: rec.coverage
      ? { nearby: rec.coverage.totals.nearby, included: rec.coverage.totals.included, groupsMissing: rec.coverage.totals.groupsMissing }
      : null,
    reasons: rec.reasons
  };
}

/* What is compared, and what is not.
   COMPARED: planId, appliedRules (the rule trace both engines record so the UI can
   answer "why this plan?"), and coverage nearby/included/groupsMissing — the counted
   claims the page puts on screen.
   NOT COMPARED: reasons, notes and explanation. Both engines produce the same
   sentences for every input in this sweep bar two known wording drifts, so they are
   plainly meant to agree — but they are user-facing copy, and a parity suite that
   goes red on a contraction gets deleted rather than fixed. The two live drifts, both
   worth correcting in standalone/src/domain.js:
     - "so I did not put you on X" (src/recommend.js:123) vs "so I didn't put you on X"
       (standalone/src/domain.js:333). Load-bearing: each file's own stale-reason sweep
       (src/recommend.js:141, standalone/src/domain.js:349) matches only its own wording.
     - standalone/src/domain.js:7 ACTIVITY_LABELS has no `cycling` entry, so the demo
       says "we prioritised cycling near you" where the server says "indoor cycling"
       (src/venues.js:35). A missing label, not a rephrasing. */
const decisionOf = ({ planId, appliedRules, coverage }) => ({ planId, appliedRules, coverage });

/* The sweep is built from the question definitions, never from remembered option ids:
   a hardcoded list would keep passing while silently covering nothing after an option
   is renamed. */
const optionIds = (questionId) =>
  optionsFor(QUESTIONS.find((q) => q.id === questionId), AREAS).map((o) => o.id);

const GOALS = optionIds('goal');
const ACTIVITIES = optionIds('activities');
const AREA_IDS = optionIds('area');
const FREQUENCIES = optionIds('frequency');

/** Every non-empty subset of the three goals: 3 singles, 3 pairs, 1 triple. */
const GOAL_SETS = [
  ...GOALS.map((g) => [g]),
  ...GOALS.flatMap((g, i) => GOALS.slice(i + 1).map((h) => [g, h])),
  [...GOALS]
];

/* Eight activity groups have 255 non-empty subsets, and crossing all of them with
   goals, areas and frequencies would be over 200k runs. Singles and every pair is
   36 sets — enough to exercise multi-select and every "this group has nothing
   included nearby" path, and small enough that the whole sweep is under a second. */
const ACTIVITY_SETS = [
  ...ACTIVITIES.map((a) => [a]),
  ...ACTIVITIES.flatMap((a, i) => ACTIVITIES.slice(i + 1).map((b) => [a, b]))
];

/** One line a reader can paste straight back into either engine. */
const describe = (answers) => [
  `goal=${(answers.goal || []).join('+') || '(unanswered)'}`,
  `activities=${(answers.activities || []).join('+') || '(unanswered)'}`,
  `area=${answers.area || '(unanswered)'}`,
  `frequency=${answers.frequency || '(unanswered)'}`
].join(', ');

const report = (answers, server, demo) =>
  `${describe(answers)}\n` +
  `      src/recommend.js         -> ${server.planId} rules[${server.appliedRules}] coverage ${JSON.stringify(server.coverage)}\n` +
  `      standalone/src/domain.js -> ${demo.planId} rules[${demo.appliedRules}] coverage ${JSON.stringify(demo.coverage)}`;

function sweep(cases) {
  const mismatches = [];
  const plansSeen = new Set();
  const rulesSeen = new Set();
  for (const answers of cases) {
    const server = serverRun(answers);
    const demo = standalone.run(answers);
    plansSeen.add(server.planId);
    for (const rule of server.appliedRules) rulesSeen.add(rule);
    if (JSON.stringify(decisionOf(server)) !== JSON.stringify(decisionOf(demo))) {
      mismatches.push(report(answers, server, demo));
    }
  }
  return { mismatches, plansSeen, rulesSeen };
}

function assertAgreement(cases, { plans = 3, rules = 3 } = {}) {
  const { mismatches, plansSeen, rulesSeen } = sweep(cases);
  /* Guards the sweep itself: if the inputs stop reaching the interesting rules, the
     test would go green by covering nothing. Three rules is the honest floor —
     frequency-base, activity-not-covered and no-upsell-without-benefit are the only
     ones these answers can reach on the loaded venue data. cap-top-plan and
     frequency-allowance-floor are unreachable by construction (the base rank for
     "daily" already is the top plan, and the allowance floor equals the frequency
     base), which is worth knowing rather than worth asserting away. */
  assert.ok(plansSeen.size >= plans, `sweep only ever reached ${[...plansSeen]} — it is no longer exercising the rules`);
  assert.ok(rulesSeen.size >= rules, `sweep only ever fired ${[...rulesSeen]} — it is no longer exercising the rules`);
  assert.equal(
    mismatches.length, 0,
    `${mismatches.length} of ${cases.length} inputs get a different membership from the two engines:\n    ` +
    mismatches.slice(0, 6).join('\n    ') +
    (mismatches.length > 6 ? `\n    … and ${mismatches.length - 6} more` : '')
  );
}

test('both question sets offer the same answers to sweep over', () => {
  /* If the two option lists drift, the sweep below is comparing engines over inputs
     only one of them can be given, and the parity result means nothing. */
  const DEMO_ONLY = ['__skip', 'anywhere'];
  for (const questionId of ['goal', 'activities', 'area', 'frequency']) {
    const demo = standalone.optionIds(questionId).filter((id) => !DEMO_ONLY.includes(id));
    assert.deepEqual(demo, optionIds(questionId), `the ${questionId} question offers different options in src/ and standalone/`);
  }
});

test('a fully answered journey gets the same membership from both engines', () => {
  /* Exhaustive over goal subsets x activity singles-and-pairs x areas x frequencies. */
  const cases = [];
  for (const goal of GOAL_SETS) {
    for (const activities of ACTIVITY_SETS) {
      for (const area of AREA_IDS) {
        for (const frequency of FREQUENCIES) cases.push({ goal, activities, area, frequency });
      }
    }
  }
  assert.equal(cases.length, GOAL_SETS.length * ACTIVITY_SETS.length * AREA_IDS.length * FREQUENCIES.length);
  assertAgreement(cases, { plans: 3, rules: 3 });
});

test('a half-answered journey gets the same membership from both engines', () => {
  /* Both engines are asked for a plan before the questions are finished — server.js
     journeyContext() calls provisionalPlan() on whatever has been answered, and the
     standalone's "Your fit so far" panel does the same — and either question can be
     skipped outright. Same sweep as above, with exactly one answer withheld, plus the
     nothing-answered case.
     THIS CURRENTLY FAILS, and the failure is real, not an artefact of the harness.
     standalone/src/domain.js:331 guards the no-upsell-without-benefit rule with
     `carriesFrequency(cheapPlan, answers.frequency)`, and its carriesFrequency
     (domain.js:156) reads a missing frequency as the default two sessions a week —
     eight check-ins — so Essential is rejected. src/plans.js:46 instead treats a
     missing frequency as "no constraint", so src/recommend.js:119 lets the rule run.
     Result: with frequency unanswered the server offers Essential and the demo
     offers Classic for the same answers. Fix one of the engines; do not weaken this. */
  const cases = [{}];
  for (const goal of GOAL_SETS) for (const activities of ACTIVITY_SETS) for (const area of AREA_IDS) cases.push({ goal, activities, area });
  for (const goal of GOAL_SETS) for (const activities of ACTIVITY_SETS) for (const frequency of FREQUENCIES) cases.push({ goal, activities, frequency });
  for (const goal of GOAL_SETS) for (const area of AREA_IDS) for (const frequency of FREQUENCIES) cases.push({ goal, area, frequency });
  for (const activities of ACTIVITY_SETS) for (const area of AREA_IDS) for (const frequency of FREQUENCIES) cases.push({ activities, area, frequency });
  assertAgreement(cases, { plans: 3, rules: 3 });
});

test('the area answer reaches both engines in the shape the question produces', () => {
  /* The area question is multi-select in both question sets (src/questions.js:44,
     standalone/src/questions.js:16), so both consumers store it as an array —
     server.js:329 assigns the chosen array for any multi question.
     THIS CURRENTLY FAILS, and again the drift is real. src/venues.js:61 reads
     `areaById(answers.area)`, which returns null for an array and falls back to
     AREAS[0]; the server therefore searches Neukölln whatever the visitor picked, and
     the coverage counts on the page belong to a neighbourhood they never chose.
     standalone/src/domain.js:14-25 handles one, two or three areas and measures from
     the nearest. Comparing the single-string form instead would hide this, which is
     why the shape is asserted here rather than normalised away. */
  const failures = [];
  for (const area of AREA_IDS) {
    for (const shape of [[area], [area, AREA_IDS[(AREA_IDS.indexOf(area) + 1) % AREA_IDS.length]]]) {
      const answers = { goal: ['unwind'], activities: ['spa'], area: shape, frequency: 'twice' };
      const server = serverRun(answers);
      const demo = standalone.run(answers);
      if (JSON.stringify(decisionOf(server)) !== JSON.stringify(decisionOf(demo))) {
        failures.push(`area=[${shape}]\n      src/recommend.js -> ${server.planId} coverage ${JSON.stringify(server.coverage)}\n      standalone/src/domain.js -> ${demo.planId} coverage ${JSON.stringify(demo.coverage)}`);
      }
    }
  }
  assert.equal(failures.length, 0, `${failures.length} multi-select area answers are read differently:\n    ${failures.slice(0, 4).join('\n    ')}`);
});

test('neither engine reports coverage of nowhere', () => {
  /* The guard this suite was asked to pin: when the visitor names an activity and no
     venue in the pool does it, coverage must be null rather than a totals object that
     lets the page write "Classic lets you into 0 of the 0 places". Both engines are
     handed the *same* match object here, so only the rule is under test. */
  const dance = groupById('dance');
  const pool = VENUES
    .filter((v) => !v.activities.some((a) => dance.activities.includes(a)))
    .map((v) => ({ ...v, distanceKm: 1.2, affinityHits: [] }));
  assert.ok(pool.length >= 3, 'the fixture needs a pool that does anything but dance');
  /* Without this the test could pass vacuously: it has to be a pool that really does
     count zero places for the activity asked for. */
  assert.equal(serverCoverage([dance.id], pool, 'classic').totals.nearby, 0, 'the fixture no longer produces a zero count');
  const match = { venues: pool.slice(0, 6), pool, area: AREAS[0], areas: [AREAS[0]], radiusKm: 3, widened: false, categories: [] };
  const answers = { goal: ['try_new'], activities: [dance.id], area: AREAS[0].id, frequency: 'twice' };

  for (const [name, rec] of [['src/recommend.js', serverRun(answers, match)], ['standalone/src/domain.js', standalone.run(answers, match)]]) {
    assert.equal(rec.coverage, null, `${name} kept a coverage total with no nearby places: ${JSON.stringify(rec.coverage)}`);
    const counted = rec.reasons.find((r) => /\b0 places?\b/.test(r));
    assert.equal(counted, undefined, `${name} put a zero count on the page: "${counted}"`);
  }
});

test('compactAnswerLabel formats activities concisely without overflowing', () => {
  assert.equal(standalone.compactAnswerLabel('activities', ['gym']), 'Gym & strength');
  assert.equal(standalone.compactAnswerLabel('activities', ['gym', 'swim']), 'Gym & Swimming');
  assert.equal(standalone.compactAnswerLabel('activities', ['gym', 'swim', 'spa']), 'Gym +2');
  assert.equal(standalone.compactAnswerLabel('activities', ['yoga', 'fight', 'dance', 'climb']), 'Yoga +3');
  assert.equal(standalone.compactAnswerLabel('frequency', 'twice'), '2x / wk');
});

