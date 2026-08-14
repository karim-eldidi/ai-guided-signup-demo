/**
 * Coverage — the question the pricing page never answers:
 * "which places near me can I actually use on this membership, for the things I
 * actually do?"
 *
 * Everything here is counted from the loaded venue data and the per-plan visit
 * limits each venue publishes. Nothing is estimated. If a venue's page does not
 * state a limit for a plan, we fall back to the plan's venue tiers, and if we
 * still cannot tell, the venue is reported as unknown rather than included —
 * over-promising coverage is the one mistake this file exists to prevent.
 */

import { carriesFrequency, PLANS, planById } from './plans.js';
import { ACTIVITY_GROUPS, groupById, venueInGroup } from './activities.js';

const NOT_INCLUDED = /^not included/i;

/** Does this plan get any access at all to this venue? */
export function includedIn(venue, planId) {
  if (venue.access && typeof venue.access[planId] === 'string') {
    return !NOT_INCLUDED.test(venue.access[planId]);
  }
  const plan = planById(planId);
  if (plan && Array.isArray(plan.venueTiers) && venue.tier) {
    return plan.venueTiers.includes(venue.tier);
  }
  return false;
}

/** What this plan gets at this venue, in the venue's own words. */
export function accessLabel(venue, planId) {
  if (venue.access && typeof venue.access[planId] === 'string') return venue.access[planId];
  return includedIn(venue, planId) ? 'included' : 'not included here';
}

/** The cheapest plan with any access to this venue, or null. */
export function firstPlanWithAccess(venue) {
  return PLANS.slice().sort((a, b) => a.rank - b.rank).find((p) => includedIn(venue, p.id)) || null;
}

/**
 * Coverage for the chosen activity groups, on one plan, in one area.
 *
 * @param {string[]} groupIds  selected activity groups; empty means "all of them"
 * @param {object[]} venues    the nearby venue set (already distance-scored)
 * @param {string}   planId
 * @returns {{rows: object[], totals: object}}
 */
export function coverage(groupIds = [], venues = [], planId = 'classic') {
  const groups = (groupIds.length ? groupIds.map(groupById).filter(Boolean) : ACTIVITY_GROUPS)
    .filter((g) => venues.some((v) => venueInGroup(v, g)));

  const rows = groups.map((group) => {
    const nearby = venues.filter((v) => venueInGroup(v, group));
    const included = nearby.filter((v) => includedIn(v, planId));
    const locked = nearby.filter((v) => !includedIn(v, planId));
    // For anything locked, the cheapest plan that would open it.
    const unlockedBy = [...new Set(locked.map((v) => (firstPlanWithAccess(v) || {}).id).filter(Boolean))]
      .map(planById)
      .filter(Boolean)
      .sort((a, b) => a.rank - b.rank);
    return {
      groupId: group.id,
      label: group.label,
      short: group.short,
      icon: group.icon,
      nearby,
      included,
      locked,
      unlockedBy,
      fullyCovered: locked.length === 0,
      none: included.length === 0
    };
  });

  const includedIds = new Set(rows.flatMap((r) => r.included.map((v) => v.id)));
  const nearbyIds = new Set(rows.flatMap((r) => r.nearby.map((v) => v.id)));
  return {
    rows,
    totals: {
      included: includedIds.size,
      nearby: nearbyIds.size,
      groupsCovered: rows.filter((r) => !r.none).length,
      groupsAsked: rows.length,
      groupsMissing: rows.filter((r) => r.none).map((r) => r.short)
    }
  };
}

/**
 * The honest upsell: the cheapest plan above this one that opens at least one
 * more place the visitor said they would use — and exactly which places.
 * Returns null when there is nothing real to offer, which is the point.
 */
export function upsell(groupIds = [], venues = [], planId = 'classic', commitmentPrice = (p) => p.priceMonthly) {
  const current = planById(planId);
  if (!current) return null;
  const mine = new Set(coverage(groupIds, venues, planId).rows.flatMap((r) => r.included.map((v) => v.id)));

  const candidates = PLANS.filter((p) => p.rank > current.rank).sort((a, b) => a.rank - b.rank);
  for (const plan of candidates) {
    const theirs = coverage(groupIds, venues, plan.id).rows.flatMap((r) => r.included);
    const added = theirs.filter((v) => !mine.has(v.id));
    const unique = [...new Map(added.map((v) => [v.id, v])).values()];
    if (unique.length) {
      return {
        planId: plan.id,
        planName: plan.name,
        delta: commitmentPrice(plan) - commitmentPrice(current),
        adds: unique,
        addsCount: unique.length
      };
    }
  }
  return null;
}

/**
 * The mirror image: could the visitor drop a tier and lose nothing they asked for?
 * Recommending down when the data supports it is what makes recommending up credible.
 */
export function downsell(groupIds = [], venues = [], planId = 'classic', commitmentPrice = (p) => p.priceMonthly, frequency = null) {
  const current = planById(planId);
  if (!current) return null;
  const mineRows = coverage(groupIds, venues, planId).rows;
  const mine = new Set(mineRows.flatMap((r) => r.included.map((v) => v.id)));
  if (!mine.size) return null;

  /* Cheapest first, not one tier down: walking down a single tier meant a
     five-times-a-week visitor was moved from Max to Premium while the same page said
     Classic covered the same places — the recommendation arguing against itself. And
     a cheaper plan is only an option if its monthly allowance can still carry them. */
  const cheaper = PLANS.filter((p) => p.rank < current.rank).sort((a, b) => a.rank - b.rank);
  for (const plan of cheaper) {
    if (frequency && !carriesFrequency(plan, frequency)) continue;
    const theirs = new Set(coverage(groupIds, venues, plan.id).rows.flatMap((r) => r.included.map((v) => v.id)));
    const lost = [...mine].filter((id) => !theirs.has(id));
    if (!lost.length) {
      return {
        planId: plan.id,
        planName: plan.name,
        saves: commitmentPrice(current) - commitmentPrice(plan)
      };
    }
  }
  return null;
}
