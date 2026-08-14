/**
 * The activities a visitor can ask for, grouped the way people actually talk.
 *
 * Venue data uses fine-grained activity ids ('strength', 'hiit', 'barre'…). Nobody
 * picks from a list of seventeen. These eight groups are what Urby offers, and each
 * one expands to the venue activity ids behind it. Groups are deliberately
 * disjoint, so "3 of 4 places included" can never double-count a venue.
 *
 * A group only ever appears in the question if the loaded venue data actually has
 * venues for it — the journey never offers something it cannot show.
 */

export const ACTIVITY_GROUPS = [
  { id: 'gym',   label: 'Gym & strength',    short: 'gym and strength',    icon: 'dumbbell', activities: ['gym', 'strength', 'crossfit', 'hiit'] },
  { id: 'yoga',  label: 'Yoga & pilates',    short: 'yoga and pilates',    icon: 'leaf',     activities: ['yoga', 'pilates', 'barre', 'meditation'] },
  { id: 'swim',  label: 'Swimming',          short: 'swimming',            icon: 'waves',    activities: ['swimming', 'aqua_fitness'] },
  { id: 'spa',   label: 'Sauna & spa',       short: 'sauna and spa',       icon: 'spa',      activities: ['sauna', 'spa'] },
  { id: 'climb', label: 'Climbing',          short: 'climbing',            icon: 'mountain', activities: ['bouldering', 'climbing'] },
  { id: 'fight', label: 'Boxing & martial arts', short: 'boxing and martial arts', icon: 'glove', activities: ['boxing', 'martial_arts'] },
  { id: 'dance', label: 'Dance',             short: 'dance',               icon: 'music',    activities: ['dance'] },
  { id: 'cycle', label: 'Indoor cycling',    short: 'indoor cycling',      icon: 'bolt',     activities: ['cycling', 'cardio'] }
];

export function groupById(id) {
  return ACTIVITY_GROUPS.find((g) => g.id === id) || null;
}

/** True when the venue offers anything in this group. */
export function venueInGroup(venue, group) {
  return venue.activities.some((a) => group.activities.includes(a));
}

/** Groups that at least `min` of the given venues can actually serve. */
export function availableGroups(venues = [], min = 1) {
  return ACTIVITY_GROUPS.filter((g) => venues.filter((v) => venueInGroup(v, g)).length >= min);
}

/** Selected group ids -> the venue activity ids they stand for. */
export function activityIdsFor(groupIds = []) {
  return [...new Set(groupIds.flatMap((id) => (groupById(id) || { activities: [] }).activities))];
}

/**
 * Naming several groups in a sentence. The short names contain "and"
 * ("gym and strength"), so joining three of them with another "and" reads as
 * mush — past two groups this switches to the &-labels and plain commas.
 */
export function groupWords(groupIds = []) {
  const groups = groupIds.map(groupById).filter(Boolean);
  if (!groups.length) return '';
  if (groups.length === 1) return groups[0].short;
  if (groups.length === 2) return `${groups[0].short} and ${groups[1].short}`;
  return groups.map((g) => g.label.toLowerCase()).join(', ');
}

/** "1 place" / "4 places" — small thing, but a demo lives on these. */
export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}
