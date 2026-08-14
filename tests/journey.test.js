/**
 * Tests for the critical journey.
 *
 * Uses Node's built-in test runner and a real HTTP server, so there is nothing to install:
 *   npm test
 *
 * These cover the parts that would quietly break a demo: the recommendation rules,
 * venue matching, free-text interpretation, and the full end-to-end journey including
 * leaving, resuming, and changing an answer.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { recommend } from '../src/recommend.js';
import { matchVenues, distanceKm, AREAS } from '../src/venues.js';
import { coverage, upsell, downsell } from '../src/coverage.js';
import { weekPlan, perSession, SESSIONS } from '../src/weekplan.js';
import { interpretFallback } from '../src/ula.js';
import { nextQuestion, isFitComplete, QUESTIONS } from '../src/questions.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ *
 * unit: venue matching
 * ------------------------------------------------------------------ */

describe('venue matching', () => {
  test('distances are plausible within Berlin', () => {
    const neu = AREAS.find((a) => a.id === 'neukoelln');
    const mitte = AREAS.find((a) => a.id === 'mitte');
    const km = distanceKm(neu, mitte);
    assert.ok(km > 3 && km < 9, `expected 3–9 km between Neukölln and Mitte, got ${km}`);
  });

  test('returns at least three venues for every area', () => {
    for (const area of AREAS) {
      const match = matchVenues({ area: area.id, goal: 'move_more' });
      assert.ok(match.venues.length >= 3, `${area.id} produced only ${match.venues.length} matches`);
    }
  });

  test('an unwinding goal surfaces calmer activities', () => {
    const match = matchVenues({ area: 'neukoelln', goal: 'unwind' });
    const activities = match.venues.flatMap((v) => v.affinityHits);
    assert.ok(
      activities.some((a) => ['yoga', 'swimming', 'sauna', 'pilates', 'meditation', 'spa'].includes(a)),
      'expected at least one calm activity in the matches'
    );
  });

  test('says so when it had to widen the search', () => {
    const match = matchVenues({ area: 'wedding', goal: 'try_new' });
    assert.equal(typeof match.widened, 'boolean');
    if (match.radiusKm === null) assert.equal(match.widened, true);
  });
});

/* ------------------------------------------------------------------ *
 * unit: recommendation rules
 * ------------------------------------------------------------------ */

describe('recommendation rules', () => {
  const forAnswers = (answers) => recommend(answers, matchVenues(answers));

  test('frequency drives the plan', () => {
    /* Mitte has no Essential-tier gym, so 'once' is lifted by the coverage rule —
       assert on the rule that fired rather than pretending it should not. */
    const once = forAnswers({ goal: 'move_more', activities: ['gym'], area: 'mitte', frequency: 'once' });
    assert.ok(once.appliedRules.includes('frequency-base'));
    assert.ok(['essential', 'classic'].includes(once.planId));
    assert.equal(forAnswers({ goal: 'move_more', activities: ['gym'], area: 'mitte', frequency: 'twice' }).planId, 'classic');
    assert.equal(forAnswers({ goal: 'move_more', activities: ['gym'], area: 'mitte', frequency: 'often' }).planId, 'premium');
    /* 'daily' no longer forces Max: if Premium opens exactly the same places, the
       anti-over-selling rule takes the cheaper one. Assert the floor, not the top. */
    const daily = forAnswers({ goal: 'move_more', activities: ['gym'], area: 'mitte', frequency: 'daily' });
    assert.ok(['premium', 'max'].includes(daily.planId), `unexpected ${daily.planId}`);
    if (daily.planId === 'premium') assert.ok(daily.appliedRules.includes('no-upsell-without-benefit'));
  });

  test('the design reference case gives Classic, at the real published price', () => {
    const rec = forAnswers({ goal: 'move_more', activities: ['gym'], area: 'neukoelln', frequency: 'twice' });
    assert.equal(rec.planId, 'classic');
    assert.equal(rec.price, 75);
  });

  test('a tier above Essential is only recommended with evidence for it', () => {
    /* The old rule bumped anyone who said "unwind" to Classic on the strength of the
       word alone, which produced a 75 € recommendation for one session a week. Now a
       bump has to name a venue the cheaper plan does not include. */
    const rec = forAnswers({ goal: 'unwind', activities: ['spa'], area: 'kreuzberg', frequency: 'once' });
    assert.equal(rec.planId, 'essential', 'Stadtbad Neukölln covers spa on Essential');
    assert.ok(!rec.appliedRules.includes('unwind-needs-plus-tier'));

    const forced = forAnswers({ goal: 'move_more', activities: ['gym'], area: 'neukoelln', frequency: 'once' });
    assert.notEqual(forced.planId, 'essential');
    assert.ok(forced.appliedRules.includes('activity-not-covered'));
    assert.ok(forced.reasons.some((r) => /needs/i.test(r)), 'the bump must name the plan it needs');
  });

  test('never recommends a tier whose only advantage goes unused', () => {
    const answers = { goal: 'move_more', activities: ['gym'], area: 'mitte', frequency: 'daily' };
    const rec = forAnswers(answers);
    const pool = matchVenues(answers).pool;
    if (rec.appliedRules.includes('no-upsell-without-benefit')) {
      assert.equal(
        coverage(['gym'], pool, rec.planId).totals.included,
        coverage(['gym'], pool, 'max').totals.included,
        'the cheaper plan must open exactly the same places'
      );
    }
  });

  test('the top plan is never recommended without the frequency to justify it', () => {
    for (const frequency of ['once', 'twice', 'often']) {
      const rec = forAnswers({ goal: 'try_new', activities: ['gym', 'yoga', 'swim'], area: 'mitte', frequency });
      assert.notEqual(rec.planId, 'max', `max was recommended for frequency=${frequency}`);
    }
  });

  test('every recommendation can explain itself', () => {
    const rec = forAnswers({ goal: 'try_new', activities: ['gym', 'yoga', 'swim'], area: 'friedrichshain', frequency: 'often' });
    assert.ok(rec.reasons.length >= 3, `expected at least 3 reasons, got ${rec.reasons.length}`);
    assert.ok(rec.explanation.includes(rec.planName));
    assert.ok(rec.appliedRules.length >= 1);
  });

  test('offers a cheaper and a richer alternative where one exists', () => {
    const rec = forAnswers({ goal: 'move_more', activities: ['gym'], area: 'neukoelln', frequency: 'twice' });
    assert.equal(rec.alternatives.length, 2);
    assert.deepEqual(
      rec.alternatives.map((a) => a.direction).sort(),
      ['cheaper', 'richer']
    );
  });

  test('never invents a price outside the plan dataset', () => {
    const prices = [35, 29, 24, 75, 64, 59, 115, 104, 99, 165, 154, 149];
    for (const frequency of ['once', 'twice', 'often', 'daily']) {
      const rec = forAnswers({ goal: 'move_more', activities: ['gym', 'yoga', 'swim'], area: 'mitte', frequency });
      assert.ok(prices.includes(rec.price), `unexpected price ${rec.price}`);
    }
  });
});

/* ------------------------------------------------------------------ *
 * unit: coverage — "what can I actually do on this membership?"
 * ------------------------------------------------------------------ */

describe('coverage', () => {
  const near = (area, activities) => matchVenues({ area, activities }).pool;

  test('counts only venues that really include the plan', () => {
    const pool = near('kreuzberg', ['spa']);
    const onClassic = coverage(['spa'], pool, 'classic');
    const onPremium = coverage(['spa'], pool, 'premium');
    assert.ok(onPremium.totals.included > onClassic.totals.included,
      'Premium must open more spa venues than Classic');
    for (const row of onClassic.rows) {
      for (const v of row.included) {
        assert.doesNotMatch(v.access.classic, /^not included/i,
          `${v.name} is counted as included on Classic but its page says otherwise`);
      }
    }
  });

  test('never counts a venue twice across groups', () => {
    const pool = near('mitte', ['gym', 'yoga', 'swim', 'spa']);
    const cov = coverage(['gym', 'yoga', 'swim', 'spa'], pool, 'max');
    const flat = cov.rows.flatMap((r) => r.included.map((v) => v.id));
    assert.equal(cov.totals.included, new Set(flat).size);
  });

  test('the upsell names the venues it would open, or offers nothing', () => {
    const pool = near('kreuzberg', ['spa']);
    const up = upsell(['spa'], pool, 'classic');
    assert.ok(up, 'expected an upsell from Classic for spa in Kreuzberg');
    assert.ok(up.addsCount >= 1);
    assert.equal(up.addsCount, up.adds.length);
    assert.ok(up.delta > 0, 'an upsell must cost more, or it is not an upsell');
    const already = new Set(coverage(['spa'], pool, 'classic').rows.flatMap((r) => r.included.map((v) => v.id)));
    for (const v of up.adds) assert.ok(!already.has(v.id), `${v.name} was already included`);
  });

  test('there is no upsell from the top plan', () => {
    const pool = near('mitte', ['gym', 'spa']);
    assert.equal(upsell(['gym', 'spa'], pool, 'max'), null);
  });

  test('offers a downgrade when it costs the visitor nothing', () => {
    const pool = near('neukoelln', ['swim']);
    const down = downsell(['swim'], pool, 'classic');
    if (down) {
      const mine = coverage(['swim'], pool, 'classic').totals.included;
      const theirs = coverage(['swim'], pool, down.planId).totals.included;
      assert.equal(mine, theirs, 'a downgrade must not quietly remove a venue');
      assert.ok(down.saves > 0);
    }
  });

  test('reports an activity with nothing included rather than hiding it', () => {
    /* Essential covers exactly one venue in this dataset — Stadtbad Neukölln —
       so gym near Kreuzberg is genuinely uncovered on it. */
    const pool = near('kreuzberg', ['gym']);
    const cov = coverage(['gym'], pool, 'essential');
    assert.ok(cov.totals.groupsMissing.includes('gym and strength'));
    assert.equal(cov.rows[0].none, true);
    assert.ok(cov.rows[0].unlockedBy.length >= 1, 'must say which plan would open it');
  });
});

describe('activity-driven rules', () => {
  const forAnswers = (answers) => recommend(answers, matchVenues(answers));

  test('an activity with nothing included nearby lifts the plan, and says why', () => {
    const rec = forAnswers({ goal: 'move_more', activities: ['gym'], area: 'kreuzberg', frequency: 'once' });
    assert.notEqual(rec.planId, 'essential');
    assert.ok(rec.reasons.some((r) => /needs|included on/i.test(r)));
  });

  test('picking several activities avoids the most limited plan', () => {
    const rec = forAnswers({ goal: 'move_more', activities: ['gym', 'yoga', 'swim'], area: 'mitte', frequency: 'once' });
    assert.notEqual(rec.planId, 'essential');
    assert.ok(rec.appliedRules.includes('activity-breadth') || rec.appliedRules.includes('activity-not-covered'));
  });

  test('the recommendation carries the coverage it claims', () => {
    const rec = forAnswers({ goal: 'unwind', activities: ['spa', 'swim'], area: 'kreuzberg', frequency: 'twice' });
    assert.ok(rec.coverage, 'expected coverage on the recommendation');
    assert.equal(rec.coverage.totals.groupsAsked, 2);
    const claimed = rec.reasons.find((r) => /lets you into/.test(r));
    assert.ok(claimed, 'expected a reason stating how many places are included');
    assert.match(claimed, new RegExp(`lets you into ${rec.coverage.totals.included}`));
  });

  test('a trim to Classic only happens when nothing is lost', () => {
    const answers = { goal: 'move_more', activities: ['gym'], area: 'friedrichshain', frequency: 'twice' };
    const rec = forAnswers(answers);
    if (rec.appliedRules.includes('nearby-sufficient')) {
      const pool = matchVenues(answers).pool;
      assert.equal(
        coverage(['gym'], pool, rec.planId).totals.included,
        coverage(['gym'], pool, 'classic').totals.included
      );
    }
  });
});

/* ------------------------------------------------------------------ *
 * unit: the week — the page's argument for paying
 * ------------------------------------------------------------------ */

describe('a possible week', () => {
  const near = (area, activities) => matchVenues({ area, activities }).pool;

  test('gives exactly as many sessions as the frequency answered', () => {
    const pool = near('kreuzberg', ['gym', 'spa']);
    for (const [freq, count] of Object.entries(SESSIONS)) {
      const wp = weekPlan(['gym', 'spa'], pool, 'classic', freq);
      assert.equal(wp.sessions.length, count, `${freq} should give ${count} sessions`);
    }
  });

  test('every session is a real venue that really does that activity', () => {
    const pool = near('mitte', ['swim', 'gym']);
    const wp = weekPlan(['swim', 'gym'], pool, 'premium', 'often');
    assert.ok(wp.sessions.length);
    for (const s of wp.sessions) {
      assert.ok(pool.some((v) => v.id === s.venue.id), `${s.venue.name} is not in the nearby set`);
      assert.equal(typeof s.distanceKm, 'number');
      assert.ok(s.activity, 'every session names an activity');
    }
  });

  test('spreads the week instead of stacking one day', () => {
    const pool = near('kreuzberg', ['gym', 'spa']);
    const wp = weekPlan(['gym', 'spa'], pool, 'classic', 'often');
    assert.equal(new Set(wp.sessions.map((s) => s.day)).size, wp.sessions.length);
  });

  test('prefers a venue the plan includes, and says so when it cannot', () => {
    const pool = near('kreuzberg', ['spa']);
    const onEssential = weekPlan(['spa'], pool, 'essential', 'twice');
    for (const s of onEssential.sessions) {
      if (!s.included) {
        assert.ok(s.needs, 'a session outside the plan must name the plan that covers it');
        assert.match(s.access, /^not included/i);
      } else {
        assert.doesNotMatch(s.access, /^not included/i);
      }
    }
    const onMax = weekPlan(['spa'], pool, 'max', 'twice');
    assert.ok(onMax.sessions.every((s) => s.included), 'Max should cover every spa session nearby');
  });

  test('quotes the venue’s own published limit, never a made-up one', () => {
    const pool = near('kreuzberg', ['gym']);
    const wp = weekPlan(['gym'], pool, 'classic', 'twice');
    for (const s of wp.sessions) {
      if (s.venue.access) assert.equal(s.access, s.venue.access.classic);
    }
  });

  test('price per session is arithmetic, not marketing', () => {
    assert.equal(perSession(75, 'twice'), 9.4);
    assert.equal(perSession(35, 'once'), 8.8);
    assert.equal(perSession(165, 'daily'), 8.3);
  });

  test('says nothing rather than inventing a week with no activities', () => {
    const wp = weekPlan([], [], 'classic', 'twice');
    assert.deepEqual(wp.sessions, []);
  });
});

/* ------------------------------------------------------------------ *
 * unit: question flow and free-text fallback
 * ------------------------------------------------------------------ */

describe('question flow', () => {
  test('asks questions in order and knows when it is done', () => {
    const answers = {};
    for (const q of QUESTIONS) {
      assert.equal(nextQuestion(answers).id, q.id);
      answers[q.id] = q.multi ? ['gym'] : (q.options ? q.options[0].id : 'neukoelln');
    }
    assert.equal(nextQuestion(answers), null);
    assert.equal(isFitComplete(answers), true);
  });
});

describe('free-text fallback (no AI key needed)', () => {
  test('maps plain language onto a choice', () => {
    assert.equal(interpretFallback('goal', 'I just want to get fitter and stronger').optionId, 'move_more');
    assert.equal(interpretFallback('goal', 'work is stressful, I need to relax').optionId, 'unwind');
    assert.deepEqual(interpretFallback('activities', 'swimming and a sauna afterwards').optionIds, ['swim', 'spa']);
    assert.equal(interpretFallback('frequency', 'maybe twice a week').optionId, 'twice');
  });

  test('resolves a Berlin postcode to an area', () => {
    const areaOptions = AREAS.map((a) => ({ id: a.id, label: a.name }));
    assert.equal(interpretFallback('area', 'I live in 12045', areaOptions).optionId, 'neukoelln');
    assert.equal(interpretFallback('area', 'Prenzlauer Berg please', areaOptions).optionId, 'prenzlauer-berg');
  });

  test('admits when it cannot tell, rather than guessing', () => {
    assert.equal(interpretFallback('goal', 'asdfgh qwerty').optionId, null);
  });
});

/* ------------------------------------------------------------------ *
 * end to end: the journey a stakeholder walks
 * ------------------------------------------------------------------ */

describe('end-to-end journey', () => {
  let child;
  let base;
  const jar = new Map();

  const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');

  function absorb(res) {
    const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of raw) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      jar.set(pair.slice(0, i), pair.slice(i + 1));
    }
  }

  async function go(path, options = {}) {
    const res = await fetch(base + path, {
      redirect: 'manual',
      ...options,
      headers: { cookie: cookieHeader(), ...(options.headers || {}) }
    });
    absorb(res);
    return res;
  }

  async function post(path, data) {
    return go(path, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(data).toString()
    });
  }

  before(async () => {
    rmSync(join(root, '.data', 'test-pilot.db'), { force: true });
    const port = 3400 + Number(process.hrtime.bigint() % 90n);
    child = spawn(process.execPath, ['--no-warnings=ExperimentalWarning', 'server.js'], {
      cwd: root,
      env: { ...process.env, PORT: String(port), ANTHROPIC_API_KEY: '' },
      stdio: 'ignore'
    });
    base = `http://127.0.0.1:${port}`;
    // wait for the port to answer
    for (let i = 0; i < 60; i++) {
      try {
        await fetch(base + '/', { redirect: 'manual' });
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw new Error('server did not start');
  });

  after(() => {
    if (child) child.kill();
  });

  test('landing page renders the designed copy', async () => {
    const res = await go('/?utm_source=meta&utm_campaign=test');
    assert.equal(res.status, 200);
    const body = await res.text();
    /* The headline carries a written line break, so the words are not adjacent. */
    assert.match(body, /Your way<br>to move\./);
    assert.match(body, /Find my fit/);
    assert.match(body, /Email me offers, news and activity inspiration/);
  });

  test('a bad email is refused without losing the visitor', async () => {
    const res = await post('/start', { email: 'not-an-email' });
    assert.equal(res.status, 200);
    assert.match(await res.text(), /valid email address/);
  });

  test('email plus consent identifies the visitor', async () => {
    const res = await post('/start', { email: 'e2e@example.com', marketing: 'yes' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/fit');
  });

  test('Urby asks one question at a time until the fit is complete', async () => {
    const answers = [
      ['goal', 'move_more'],
      ['activities', 'gym'],
      ['area', 'neukoelln'],
      ['frequency', 'twice']
    ];
    for (const [questionId, choice] of answers) {
      const view = await go('/fit');
      assert.equal(view.status, 200);
      const html = await view.text();
      assert.match(html, new RegExp(`name="questionId" value="${questionId}"`));
      const res = await post('/answer', { questionId, choice });
      assert.equal(res.status, 302);
    }
    const done = await go('/fit');
    assert.equal(done.headers.get('location'), '/recommendation');
  });

  test('the recommendation explains itself and shows nearby venues', async () => {
    const res = await go('/recommendation');
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /Classic/);
    assert.match(html, /75 €/);
    assert.match(html, /Why this fits/);
    assert.match(html, /Nearby, on this membership/);
    assert.match(html, /Worth knowing before you decide/);
  });

  test('free text that Urby cannot read asks again instead of guessing', async () => {
    const res = await post('/answer', { questionId: 'goal', freeText: 'zzzz qqqq' });
    assert.equal(res.status, 302);
    assert.match(res.headers.get('location'), /unclear=1/);
    const page = await go(res.headers.get('location'));
    assert.match(await page.text(), /pick the closest option/);
  });

  test('changing an answer updates the recommendation', async () => {
    /* Five times a week used to force Max at 165 €. It must not: Max's only advantage
       over Classic here is Plus check-ins nobody asked for, and Classic's one-a-day
       allowance already carries twenty visits a month. The recommendation should move
       when the answer moves, without inventing a reason to charge more. */
    await post('/answer', { questionId: 'frequency', choice: 'daily' });
    const daily = await (await go('/recommendation')).text();
    assert.match(daily, /five or more times a week/);
    assert.doesNotMatch(daily, /165 €/, 'daily must not force the top plan');
    // put it back
    await post('/answer', { questionId: 'frequency', choice: 'twice' });
    assert.match(await (await go('/recommendation')).text(), /75 €/);
  });

  test('a visitor can override the recommendation', async () => {
    await post('/choose-plan', { planId: 'premium' });
    const html = await (await go('/recommendation')).text();
    assert.match(html, /You chose Premium/);
    assert.match(html, /Your choice/);
    await post('/choose-plan', { planId: 'classic' });
  });

  test('the annual commitment changes the price shown', async () => {
    await post('/choose-commitment', { commitmentId: 'annual' });
    assert.match(await (await go('/recommendation')).text(), /75 €/);
    await post('/choose-commitment', { commitmentId: 'monthly' });
  });

  test('details are validated before payment', async () => {
    const bad = await post('/details', { firstName: 'A', lastName: '', email: 'nope', postcode: 'x' });
    assert.equal(bad.status, 200);
    const html = await bad.text();
    assert.match(html, /We need your last name/);
    assert.match(html, /valid postcode/);

    const good = await post('/details', {
      firstName: 'Alex',
      lastName: 'Tester',
      email: 'e2e@example.com',
      birthDate: '1992-04-18',
      street: 'Weserstraße 42',
      postcode: '12045',
      city: 'Berlin'
    });
    assert.equal(good.status, 302);
    assert.equal(good.headers.get('location'), '/payment');
  });

  test('payment shows the full order before confirming, then simulates', async () => {
    const view = await go('/payment');
    const html = await view.text();
    assert.match(html, /Simulated payment/);
    assert.match(html, /Cancellation, pause and renewal/);
    assert.match(html, /Total each month/);

    const res = await post('/payment', { method: 'sepa' });
    assert.equal(res.headers.get('location'), '/confirmation');
    assert.match(await (await go('/confirmation')).text(), /You&rsquo;re in|You’re in/);
  });

  test('progress survives leaving and coming back through the resume link', async () => {
    const left = await go('/left');
    const html = await left.text();
    const match = html.match(/\/resume\/([A-Za-z0-9_-]+)/);
    assert.ok(match, 'expected a resume link on the saved page');

    // A brand new browser with no cookies follows the link.
    const res = await fetch(`${base}/resume/${match[1]}`, { redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/confirmation');
    assert.ok((res.headers.getSetCookie() || []).some((c) => c.startsWith('usc_sid=')));
  });

  test('an unknown resume link fails gracefully', async () => {
    const res = await fetch(`${base}/resume/definitely-not-a-token`, { redirect: 'manual' });
    assert.equal(res.status, 404);
    assert.match(await res.text(), /This link no longer works/);
  });

  test('the follow-up email preview reflects the saved answers', async () => {
    const html = await (await go('/preview/email')).text();
    assert.match(html, /Your next move is waiting/);
    assert.match(html, /Berlin-Neukölln/);
    assert.match(html, /Marketing consent: <strong>given/);
  });

  test('journey data records the funnel and the conversion', async () => {
    const html = await (await go('/admin/journeys')).text();
    assert.match(html, /Journey funnel/);
    assert.match(html, /Converted/);
    assert.match(html, /meta/);
  });

  test('unknown pages return a helpful 404, not a crash', async () => {
    const res = await go('/nope');
    assert.equal(res.status, 404);
    assert.match(await res.text(), /isn&rsquo;t part of the pilot|isn’t part of the pilot/);
  });
});
