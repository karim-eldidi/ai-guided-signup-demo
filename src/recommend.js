/**
 * Plan recommendation — clear, testable product rules.
 *
 * This file owns the recommendation. The AI layer (src/urby.js) never chooses a plan,
 * never invents a price and never overrides a rule; it only rephrases the explanation
 * this function produces. That is what keeps Urby credible and keeps the journey working
 * when the AI service is unavailable.
 *
 * Every rule that fires records a reason, so the UI can always answer "why this plan?".
 */

import { ACTIVITY_LABELS } from './venues.js';
import { groupById, groupWords, plural } from './activities.js';
import { coverage, downsell } from './coverage.js';
import { PLANS, COMMITMENTS, RULES, CURRENCY, planById, planByRank, commitmentById, priceFor,
         monthlyAllowance, visitsWanted, carriesFrequency, allowanceFloor } from './plans.js';

export { PLANS, COMMITMENTS, RULES, CURRENCY, planById, planByRank, commitmentById, priceFor };

/** Rule 1: expected frequency sets the starting point. */
const FREQUENCY_BASE = {
  once: 1,      // Essential
  twice: 2,     // Classic
  often: 3,     // Premium
  daily: 4      // Max
};

const FREQUENCY_WORDS = {
  once: 'about once a week',
  twice: 'twice a week',
  often: 'three or four times a week',
  daily: 'five or more times a week'
};

/**
 * @param {object} answers  Urby's collected answers
 * @param {object} match    Result of matchVenues()
 * @returns {object} recommendation
 */
export function recommend(answers = {}, match = { venues: [], categories: [] }) {
  const reasons = [];
  const appliedRules = [];
  const notes = [];

  // ---- Rule 1: start from stated frequency ------------------------------------
  let rank = FREQUENCY_BASE[answers.frequency] ?? 2;
  if (answers.frequency) {
    appliedRules.push('frequency-base');
    reasons.push(`You said you'd realistically go ${FREQUENCY_WORDS[answers.frequency] || 'a couple of times a week'}.`);
  } else {
    notes.push('No frequency given, so we assumed a couple of sessions a week.');
  }


  const groups = (answers.activities || []).filter(Boolean);
  const pool = match.pool || match.venues || [];

  // ---- Rule 5: an activity with nothing included nearby -----------------------
  /* The only rule that can move someone up on grounds other than frequency, and it
     needs proof: a thing they said they would do, with zero included venues near
     them on this plan, and at least one on a higher plan. It names both. */
  if (groups.length && pool.length) {
    const rankBefore = rank;
    const gaps = coverage(groups, pool, (planByRank(rank) || planByRank(2)).id).rows
      .filter((r) => r.none && r.unlockedBy.length);
    if (gaps.length) {
      const needed = gaps
        .map((r) => r.unlockedBy[0])
        .sort((a, b) => a.rank - b.rank)[0];
      const gap = gaps.find((r) => r.unlockedBy.some((p) => p.id === needed.id));
      const target = Math.min(needed.rank, 3);   // never jump to the top plan on coverage alone
      if (target > rank) {
        rank = target;
        appliedRules.push('activity-not-covered');
        const from = planByRank(rankBefore) || planByRank(2);
        reasons.push(
          `Nowhere near you that does ${gap.short} is included on ${from.name} — ` +
          `the closest, ${gap.locked[0].name}, needs ${needed.name}.`
        );
      }
    }
  }

  // ---- Rule 6: places close by, and nothing lost by trimming ------------------
  const closeBy = (match.venues || []).filter((v) => v.distanceKm <= 2.5);
  if (closeBy.length >= 3 && rank > 2 && (answers.frequency === 'twice' || answers.frequency === 'once')) {
    /* Only trim if the cheaper plan still covers everything they asked for —
       saving someone 40 € by quietly removing a venue they wanted is not a favour. */
    const here = coverage(groups, pool, (planByRank(rank) || planByRank(2)).id);
    const trimmed = coverage(groups, pool, (planByRank(2) || planByRank(2)).id);
    const losesNothing = here.totals.included === trimmed.totals.included;
    if (losesNothing) {
      rank = 2;
      appliedRules.push('nearby-sufficient');
      reasons.push(`${closeBy.length} of your places are within 2.5 km, and Classic already covers all of them.`);
    }
  }

  // ---- Rule 7: never recommend the top plan unless frequency justifies it -----
  if (rank === 4 && answers.frequency !== 'daily') {
    rank = 3;
    appliedRules.push('cap-top-plan');
  }

  /* ---- Rule 8: never sell a tier whose only advantage is something they did not ask for.
     A tester was recommended Classic at 75 € for one session a week, which the page
     itself then priced at ~20 € a visit. If a cheaper plan opens exactly the same
     places, that is the recommendation. This is the anti-over-selling rule and it
     runs last, so it can undo any bump above it. */
  if (groups.length && pool.length) {
    const asIs = planByRank(rank) || planByRank(2);
    /* ...down to the cheapest plan that loses them nothing AND can still carry the
       visits they told us about. Without the frequency argument this rule dropped a
       twice-a-week visitor to Essential because the venue happened to be included
       there — eight visits a month against an allowance of four. */
    const cheaper = downsell(groups, pool, asIs.id, undefined, answers.frequency);
    if (cheaper) {
      const cheapPlan = planById(cheaper.planId);
      if (cheapPlan && cheapPlan.rank < rank) {
        rank = cheapPlan.rank;
        appliedRules.push('no-upsell-without-benefit');
        reasons.push(
          `${cheapPlan.name} opens the same places near you as ${asIs.name}, for ${cheaper.saves} € a month less — so I did not put you on ${asIs.name}.`
        );
      }
    }
  }

  /* The last word, and a hard one. The frequency they gave us is a floor on the
     monthly check-in allowance, not a hint: no rule above may leave someone on a plan
     whose published allowance cannot carry it. This is the one class of error that
     discredits every other number on the page, so it is enforced after everything. */
  if (answers.frequency) {
    const need = visitsWanted(answers.frequency);
    const floor = allowanceFloor(answers.frequency);
    if (floor && floor.rank > rank) {
      const was = planByRank(rank) || planByRank(2);
      rank = floor.rank;
      appliedRules.push('frequency-allowance-floor');
      for (let i = reasons.length - 1; i >= 0; i--) {
        if (reasons[i].includes('did not put you on')) reasons.splice(i, 1);
      }
      reasons.push(
        `${was.name} allows only ${monthlyAllowance(was)} check-ins a month, and what you told me is about ${need}. ${floor.name} is the cheapest plan that carries that.`
      );
    } else if (!floor) {
      notes.push(`No plan covers ${need} check-ins a month — the most any plan allows is one a day.`);
    }
  }

  const plan = planByRank(rank) || planByRank(2);

  // ---- Context reasons: always explain how the goal and obstacle were used ----
  const areaNameEarly = match.area ? match.area.name : 'your area';
  const categoryCountEarly = (match.categories || []).length;
  const topActivitiesEarly = [...new Set((match.venues || []).flatMap((v) => v.affinityHits || []))]
    .slice(0, 3)
    .map((a) => ACTIVITY_LABELS[a] || a);

  const goalList = Array.isArray(answers.goal)
    ? answers.goal.filter((x) => x && x !== '__skip')
    : (answers.goal && answers.goal !== '__skip' ? [answers.goal] : []);

  if (goalList.length === 1) {
    const g = goalList[0];
    const GOAL_REASON = {
      move_more: topActivitiesEarly.length
        ? `You want to move more, so we prioritised ${listWords(topActivitiesEarly)} near you.`
        : 'You want to move more, so we prioritised regular training venues near you.',
      unwind: 'You want to unwind, so we prioritised calmer studios, pools and sauna.',
      try_new: 'You want to try something new, so we mixed venue types instead of repeating one.'
    };
    if (GOAL_REASON[g]) reasons.push(GOAL_REASON[g]);
  } else if (goalList.length > 1) {
    const hasMove = goalList.includes('move_more');
    const hasUnwind = goalList.includes('unwind');
    const hasTryNew = goalList.includes('try_new');

    if (hasMove && hasUnwind && hasTryNew) {
      reasons.push('You want to stay active, recharge and try new things, so we balanced high-energy workouts, recovery spas and novel studio styles.');
    } else if (hasMove && hasUnwind) {
      reasons.push('You want to move more and unwind, so we balanced regular workout places with calming yoga, pools and recovery spots.');
    } else if (hasMove && hasTryNew) {
      reasons.push('You want to move more and explore new sports, so we prioritised active variety across different fitness and studio formats.');
    } else if (hasUnwind && hasTryNew) {
      reasons.push('You want to unwind while trying new things, so we curated relaxing wellness alongside fresh movement and class styles.');
    }
  }

  /* The reason that answers the real question: how many of the places I would
     actually use does this plan let me into? */
  let cov = groups.length && pool.length ? coverage(groups, pool, plan.id) : null;
  if (cov && !cov.totals.nearby) cov = null; // "0 of the 0 places" is not a sentence
  if (cov) {
    reasons.push(
      `Of the ${plural(cov.totals.nearby, 'place', 'places')} near ${areaNameEarly} ` +
      `${cov.totals.nearby === 1 ? 'that does' : 'that do'} ${groupWords(groups)}, ` +
      `${plan.name} lets you into ${cov.totals.included}.`
    );
    const missing = cov.totals.groupsMissing;
    if (missing.length) {
      notes.push(`${plan.name} does not include anywhere near you for ${missing.join(' or ')}.`);
    }
  } else if (closeBy.length) {
    reasons.push(`${closeBy.length} of your matches are within 2.5 km of ${areaNameEarly}.`);
  }

  reasons.push(
    `${plan.name} opens ${plan.venueCount} venues, and gives you ${lowerFirst(plan.checkInModel)}.`
  );

  // ---- Transparency about the venue set --------------------------------------
  if (match.widened) {
    notes.push('We had to look a little further out to find enough options near you.');
  }
  if (!groups.length) {
    notes.push('You have not told us which activities you would actually do, so these matches are broad.');
  }

  // ---- Explanation ------------------------------------------------------------
  const topActivities = [...new Set((match.venues || []).flatMap((v) => v.affinityHits || []))]
    .slice(0, 3)
    .map((a) => ACTIVITY_LABELS[a] || a);

  const areaName = match.area ? match.area.name : 'your area';
  const venueCount = (match.venues || []).length;

  let explanation = `${plan.name} fits because ${lowerFirst(reasons[0] || 'you want to get moving')}`;
  if (venueCount) {
    explanation += ` We found ${venueCount} venues around ${areaName}`;
    if (topActivities.length) explanation += ` covering ${listWords(topActivities)}`;
    explanation += `.`;
  }
  explanation += ` ${plan.shortReason}.`;

  const alternatives = [];
  const cheaper = planByRank(rank - 1);
  const richer = planByRank(rank + 1);
  if (cheaper) {
    alternatives.push({
      id: cheaper.id,
      name: cheaper.name,
      direction: 'cheaper',
      price: cheaper.priceMonthly,
      tradeoff: `Saves ${plan.priceMonthly - cheaper.priceMonthly} € a month. ${cheaper.limitations[0]}.`
    });
  }
  if (richer) {
    alternatives.push({
      id: richer.id,
      name: richer.name,
      direction: 'richer',
      price: richer.priceMonthly,
      tradeoff: `Costs ${richer.priceMonthly - plan.priceMonthly} € more a month. ${richer.bestFor}.`
    });
  }

  return {
    planId: plan.id,
    planName: plan.name,
    price: plan.priceMonthly,
    currency: CURRENCY,
    reasons,
    notes,
    explanation: explanation.replace(/\s+/g, ' ').trim(),
    appliedRules,
    alternatives,
    venueIds: (match.venues || []).map((v) => v.id),
    coverage: cov,
    generatedBy: 'rules'
  };
}

/**
 * A partial, clearly-provisional read used by the "Your fit, so far" panel while
 * questions are still open. Matches the design's "I'll confirm this after one more question."
 */
export function provisionalPlan(answers = {}, match = { venues: [], categories: [] }) {
  if (!answers.goal) return null;
  const rec = recommend(answers, match);
  return {
    planId: rec.planId,
    planName: rec.planName,
    price: rec.price,
    shortReason: planById(rec.planId).shortReason,
    provisional: true
  };
}

function lowerFirst(s) {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

function listWords(items) {
  if (items.length <= 1) return items[0] || '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
