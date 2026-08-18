/**
 * Venue matching against the local sample dataset.
 *
 * Deliberately simple and deterministic: distance from the chosen area centroid,
 * plus an activity affinity score derived from the visitor's stated goal.
 * No live availability, no personalisation beyond the answers given.
 */

import { activityIdsFor } from './activities.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dataset = JSON.parse(readFileSync(join(here, '..', 'data', 'venues.json'), 'utf8'));

export const AREAS = dataset.areas;
export const VENUES = dataset.venues;
export const CITY = dataset.city;

/** Activities that support each stated goal. Order matters only for readability. */
const GOAL_AFFINITY = {
  move_more: ['gym', 'strength', 'crossfit', 'hiit', 'running', 'cardio', 'boxing', 'bouldering', 'climbing', 'swimming', 'dance'],
  unwind: ['yoga', 'pilates', 'meditation', 'sauna', 'spa', 'swimming', 'barre', 'aqua_fitness'],
  try_new: ['bouldering', 'climbing', 'dance', 'boxing', 'padel', 'tennis', 'martial_arts', 'barre', 'aqua_fitness', 'crossfit']
};

/** Human-readable names for activity ids, used in explanations. */
export const ACTIVITY_LABELS = {
  gym: 'gym', strength: 'strength training', crossfit: 'CrossFit', hiit: 'HIIT',
  running: 'running', cardio: 'cardio', boxing: 'boxing', bouldering: 'bouldering',
  climbing: 'climbing', swimming: 'swimming', dance: 'dance', yoga: 'yoga',
  pilates: 'pilates', meditation: 'meditation', sauna: 'sauna', spa: 'spa',
  barre: 'barre', aqua_fitness: 'aqua fitness', tennis: 'tennis', padel: 'padel',
  martial_arts: 'martial arts', outdoor: 'outdoor training', cycling: 'indoor cycling'
};

export function areaById(id) {
  return AREAS.find((a) => a.id === id) || null;
}

/** Great-circle distance in km, rounded to one decimal. */
export function distanceKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

/**
 * Match venues for a set of answers.
 * Returns { venues, area, radiusKm, widened, categories }
 * `widened` is true when we had to look further out to find enough options —
 * the UI says so out loud rather than pretending everything is on the doorstep.
 */
export function matchVenues(answers = {}, limit = 6) {
  const area = areaById(answers.area) || AREAS[0];
  /* What the visitor said they would actually do beats what we inferred from a
     one-word goal. The goal is only a fallback for anyone who skipped it. */
  const chosen = activityIdsFor(answers.activities || []);
  const goalList = Array.isArray(answers.goal)
    ? answers.goal.filter((x) => x && x !== '__skip')
    : (answers.goal && answers.goal !== '__skip' ? [answers.goal] : []);
  const goalAffinities = [...new Set(goalList.flatMap((g) => GOAL_AFFINITY[g] || []))];
  const affinity = chosen.length ? chosen : goalAffinities;

  const scored = VENUES.map((v) => {
    const km = distanceKm(area, v);
    const hits = v.activities.filter((a) => affinity.includes(a));
    // Closer is better; matching the stated goal is worth roughly 1.5 km of walking.
    const score = hits.length * 1.5 - km;
    return { ...v, distanceKm: km, affinityHits: hits, score };
  }).sort((a, b) => b.score - a.score);

  let radiusKm = 3;
  let nearby = scored.filter((v) => v.distanceKm <= radiusKm);
  let widened = false;
  if (nearby.length < 3) {
    radiusKm = 8;
    nearby = scored.filter((v) => v.distanceKm <= radiusKm);
    widened = true;
  }
  if (nearby.length < 3) {
    nearby = scored;
    radiusKm = null;
    widened = true;
  }

  /* If they named activities and nothing within the radius does any of them,
     look across the whole city rather than reporting "0 of 0 places". The
     distances stay real, so the screen can say how much further it is. */
  let reachedFurther = false;
  if (chosen.length && !nearby.some((v) => v.activities.some((a) => chosen.includes(a)))) {
    const anywhereMatches = scored.filter((v) => v.activities.some((a) => chosen.includes(a)));
    if (anywhereMatches.length) {
      nearby = [...nearby, ...anywhereMatches].filter((v, i, all) => all.findIndex((x) => x.id === v.id) === i);
      reachedFurther = true;
    }
  }

  const venues = nearby.slice(0, limit);
  const categories = [...new Set(venues.flatMap((v) => v.activities))];

  /* `venues` is what we show — six at most, so the screen stays a decision.
     `pool` is everything within the radius, which is what coverage counts:
     "4 of 6 places included" must count all six, not just the visible ones. */
  return { venues, pool: nearby, area, radiusKm, widened, reachedFurther, categories };
}

/** Distinct activity categories available within the matched set — feeds the "variety" rule. */
export function varietyScore(match) {
  return match.categories.length;
}
