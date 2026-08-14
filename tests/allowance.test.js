/**
 * The recommendation must never contradict the membership it recommends.
 *
 * An external reviewer found a twice-a-week visitor recommended Essential — four
 * check-ins a month — with the page then dividing 35 € by eight visits to advertise
 * "about 4.40 € a session". Every claim on that screen was individually derived from
 * real data, and the combination was impossible. That is the one class of error that
 * discredits every other number we show, so it gets its own suite: every frequency,
 * against every plan, on both the recommendation and the arithmetic.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommend } from '../src/recommend.js';
import { matchVenues } from '../src/venues.js';
import { weekPlan, perSession } from '../src/weekplan.js';
import { PLANS, planById, monthlyAllowance, visitsWanted, carriesFrequency, allowanceFloor } from '../src/plans.js';

const FREQUENCIES = ['once', 'twice', 'often', 'daily'];
const ACTIVITIES = [['gym'], ['swim'], ['spa'], ['yoga'], ['gym', 'swim'], []];
const AREAS = ['neukoelln', 'kreuzberg', 'mitte', 'anywhere'];

test('the published allowance is read from the data, not assumed', () => {
  assert.equal(monthlyAllowance(planById('essential')), 4, 'Essential publishes four a month, in total');
  for (const id of ['classic', 'premium', 'max']) {
    assert.equal(monthlyAllowance(planById(id)), 30, `${id} is one check-in a day`);
  }
  assert.deepEqual(
    FREQUENCIES.map(visitsWanted),
    [4, 8, 12, 20],
    'a week of sessions is four weeks of visits'
  );
});

test('every recommendation can carry the frequency it was given', () => {
  const failures = [];
  for (const frequency of FREQUENCIES) {
    for (const activities of ACTIVITIES) {
      for (const area of AREAS) {
        const answers = { goal: 'move_more', activities, area, frequency };
        const rec = recommend(answers, matchVenues(answers));
        const plan = planById(rec.planId);
        if (!carriesFrequency(plan, frequency)) {
          failures.push(
            `${frequency} + ${activities.join('/') || 'no activity'} + ${area} -> ${plan.name} ` +
            `(allows ${monthlyAllowance(plan)}, needs ${visitsWanted(frequency)})`
          );
        }
      }
    }
  }
  assert.deepEqual(failures, [], `${failures.length} recommendations cannot be used as promised`);
});

test('cost per session divides by the visits the plan permits, not the visits hoped for', () => {
  const essential = planById('essential');
  // 35 € on four permitted visits is 8.75 €, never 4.40 € on eight
  assert.equal(perSession(essential.priceMonthly, 'twice', essential), 8.8);
  assert.equal(perSession(essential.priceMonthly, 'daily', essential), 8.8);
  assert.equal(perSession(essential.priceMonthly, 'once', essential), 8.8);
  const classic = planById('classic');
  assert.equal(perSession(classic.priceMonthly, 'twice', classic), 9.4);
  assert.equal(perSession(classic.priceMonthly, 'often', classic), 6.3);
  // with no plan given it falls back to the intent, which is the caller's problem
  assert.equal(perSession(35, 'twice'), 4.4);
});

test('cost per session is never flattered by a cap the visitor cannot use', () => {
  for (const frequency of FREQUENCIES) {
    for (const plan of PLANS) {
      const each = perSession(plan.priceMonthly, frequency, plan);
      const floor = plan.priceMonthly / monthlyAllowance(plan);
      assert.ok(
        each >= Math.round(floor * 10) / 10 - 0.05,
        `${plan.name} at ${frequency} priced ${each} €, below its own best case of ${floor.toFixed(2)} €`
      );
    }
  }
});

test('a week that exceeds the plan says so, in the plan’s own numbers', () => {
  const answers = { goal: 'move_more', activities: ['swim'], area: 'neukoelln', frequency: 'daily' };
  const match = matchVenues(answers);
  const wp = weekPlan(answers.activities, match.pool || match.venues, 'essential', 'daily');
  assert.equal(wp.overAllowance, true);
  assert.equal(wp.allowedVisits, 4);
  assert.equal(wp.wantedVisits, 20);
  assert.equal(wp.perMonth, 4, 'the month cannot hold more visits than the plan allows');
  assert.match(wp.note, /Essential allows 4/);
});

test('a week within the plan makes no complaint', () => {
  const answers = { goal: 'move_more', activities: ['gym'], area: 'neukoelln', frequency: 'twice' };
  const match = matchVenues(answers);
  const wp = weekPlan(answers.activities, match.pool || match.venues, 'classic', 'twice');
  assert.equal(wp.overAllowance, false);
  assert.equal(wp.perMonth, 8);
  assert.ok(!/allows/.test(wp.note || ''));
});

test('the allowance floor is the cheapest plan that works, not the safest', () => {
  assert.equal(allowanceFloor('once').id, 'essential');
  assert.equal(allowanceFloor('twice').id, 'classic');
  assert.equal(allowanceFloor('often').id, 'classic');
  assert.equal(allowanceFloor('daily').id, 'classic');
});

test('five times a week does not force the top plan', () => {
  const answers = { goal: 'move_more', activities: ['gym'], area: 'neukoelln', frequency: 'daily' };
  const rec = recommend(answers, matchVenues(answers));
  assert.notEqual(rec.planId, 'max', "Max's Plus check-ins are not something they asked for");
});

test('the reasons never argue for a plan other than the one recommended', () => {
  for (const frequency of FREQUENCIES) {
    for (const activities of ACTIVITIES) {
      const answers = { goal: 'move_more', activities, area: 'neukoelln', frequency };
      const rec = recommend(answers, matchVenues(answers));
      const argued = rec.reasons.filter((r) => /did not put you on/.test(r));
      // The concrete failure this guards: a "so I did not put you on X" line surviving
      // after a later rule moved the recommendation somewhere else entirely.
      if (rec.appliedRules.includes('frequency-allowance-floor')) {
        assert.equal(argued.length, 0, `${frequency}/${activities.join('/')}: stale downsell reason kept`);
      }
    }
  }
});
