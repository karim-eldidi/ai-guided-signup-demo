/**
 * A possible week — the "here is what you'd actually do" block.
 *
 * The recommendation screen used to open with a price, which reads like a
 * checkout. This turns the same answers into a week: which day, which activity,
 * which real venue, how far, and what the plan gets you there. It is a *plan*,
 * not a promise: nothing is booked, and the copy says so.
 *
 * Rules it will not break:
 *  - only venues from the loaded dataset, with their real distances
 *  - only activities the visitor actually chose
 *  - the number of sessions is exactly the frequency they gave us
 *  - if the nearest venue for an activity is not on their plan, the session says
 *    so rather than quietly pretending they can walk in
 */

import { ACTIVITY_GROUPS, groupById, venueInGroup } from './activities.js';
import { includedIn, accessLabel, firstPlanWithAccess } from './coverage.js';
import { planById, monthlyAllowance, visitsWanted } from './plans.js';

/** Sessions a week, from the frequency answer. */
export const SESSIONS = { once: 1, twice: 2, often: 3, daily: 5 };

/* Spread the sessions across the week rather than stacking them on Monday. */
const DAY_SPREAD = {
  1: ['Wednesday'],
  2: ['Tuesday', 'Saturday'],
  3: ['Monday', 'Wednesday', 'Saturday'],
  4: ['Monday', 'Wednesday', 'Friday', 'Sunday'],
  5: ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Sunday']
};

/**
 * @param {string[]} groupIds  chosen activity groups (empty falls back to all)
 * @param {object[]} venues    nearby venues, each with distanceKm
 * @param {string}   planId
 * @param {string}   frequency answer id
 * @returns {{sessions: object[], perMonth: number, note: string|null}}
 */
export function weekPlan(groupIds = [], venues = [], planId = 'classic', frequency = 'twice') {
  const count = SESSIONS[frequency] || 2;
  const days = DAY_SPREAD[count] || DAY_SPREAD[2];
  const groups = (groupIds.length ? groupIds.map(groupById).filter(Boolean) : ACTIVITY_GROUPS)
    .filter((g) => venues.some((v) => venueInGroup(v, g)));

  const wantedVisits = count * 4;
  const allowedVisits = monthlyAllowance(planById(planId));
  const overAllowance = allowedVisits > 0 && wantedVisits > allowedVisits;
  const perMonth = Math.min(wantedVisits, allowedVisits || wantedVisits);
  if (!groups.length) return { sessions: [], perMonth, wantedVisits, allowedVisits, overAllowance, note: null };

  /* Round-robin the activities so a two-session week does two different things,
     and don't send someone to the same venue twice while another one is free. */
  const used = new Set();
  const sessions = days.map((day, i) => {
    const group = groups[i % groups.length];
    const forGroup = venues
      .filter((v) => venueInGroup(v, group))
      .sort((a, b) => a.distanceKm - b.distanceKm);
    const preferred = forGroup.filter((v) => includedIn(v, planId));
    const pick =
      preferred.find((v) => !used.has(v.id)) ||
      preferred[0] ||
      forGroup.find((v) => !used.has(v.id)) ||
      forGroup[0];
    if (!pick) return null;
    used.add(pick.id);
    const included = includedIn(pick, planId);
    return {
      day,
      groupId: group.id,
      activity: group.label,
      icon: group.icon,
      venue: pick,
      distanceKm: pick.distanceKm,
      included,
      access: accessLabel(pick, planId),
      needs: included ? null : firstPlanWithAccess(pick)
    };
  }).filter(Boolean);

  const planName = (planById(planId) || {}).name || 'this plan';
  return {
    sessions,
    perMonth,
    wantedVisits,
    allowedVisits,
    overAllowance,
    note: overAllowance
      ? `This week is about ${wantedVisits} visits a month, and ${planName} allows ${allowedVisits}. Pick fewer days, or move up a plan.`
      : sessions.some((s) => !s.included)
      ? 'One of these needs a higher plan — swap it, or open it below.'
      : null
  };
}

/**
 * Price per session at the stated frequency. The most persuasive number on the
 * page, and the only honest way to make a monthly fee feel like a purchase
 * rather than a subscription trap. Rounded to 10 cents.
 */
export function perSession(price, frequency = 'twice', plan = null) {
  /* Divided by the visits you can actually take, never by the visits you hoped for.
     35 € ÷ 8 gave 4.40 € a session on a plan that permits four. */
  const wanted = visitsWanted(frequency);
  const permonth = plan ? Math.min(wanted, monthlyAllowance(plan)) : wanted;
  if (!permonth) return null;
  return Math.round((price / permonth) * 10) / 10;
}
