/**
 * The plan dataset, loaded once.
 *
 * Split out of recommend.js so that coverage.js can read plans without importing
 * the rules engine (which reads coverage). Same data, no import cycle.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dataset = JSON.parse(readFileSync(join(here, '..', 'data', 'plans.json'), 'utf8'));

export const PLANS = dataset.plans;
export const COMMITMENTS = dataset.commitments;
export const RULES = dataset.rules;
export const CURRENCY = dataset.currency;
export const SOURCES = dataset.sources || {};

export function planById(id) {
  return PLANS.find((p) => p.id === id) || null;
}
export function planByRank(rank) {
  return PLANS.find((p) => p.rank === rank) || null;
}
export function commitmentById(id) {
  return COMMITMENTS.find((c) => c.id === id) || COMMITMENTS[0];
}

/** Monthly price for a plan under a given commitment. */
export function priceFor(plan, commitmentId = 'monthly') {
  return plan[commitmentById(commitmentId).priceField];
}

/* What a plan actually permits in a month, read from the published fields:
   Essential is "4 check-ins a month, in total"; every other plan is one a day, so
   about 30. This is a HARD limit. A plan that cannot carry the frequency someone
   gave us must never be recommended for it, and must never be priced as though it
   could — a reviewer found "twice a week" recommended on an allowance of four, with
   the page then dividing the price by eight. */
export const monthlyAllowance = (plan) =>
  !plan ? 0 : (plan.dailyCheckIn ? 30 : (plan.checkInsPerMonth || 0));
export const SESSIONS_PER_WEEK = { once: 1, twice: 2, often: 3, daily: 5 };
export const visitsWanted = (frequency) => (SESSIONS_PER_WEEK[frequency] || 2) * 4;
export const carriesFrequency = (plan, frequency) =>
  !frequency || monthlyAllowance(plan) >= visitsWanted(frequency);
/* The cheapest plan whose allowance can carry this frequency. */
export const allowanceFloor = (frequency) =>
  PLANS.filter((p) => carriesFrequency(p, frequency)).sort((a, b) => a.rank - b.rank)[0] || null;
