import { esc } from './layout.js';
import { icon } from './icons.js';
import { QUESTIONS, answerLabel } from '../questions.js';

/**
 * "Your fit, so far" — the right-hand panel on desktop, a collapsible row on mobile.
 * It shows what Urby has learned, what she found, and how provisional the plan still is.
 */
export function fitPanel({ answers, match, provisional, areas, answeredCount, totalQuestions, confirmed = false }) {
  const facts = QUESTIONS.map((q) => {
    const label = answerLabel(q.id, answers[q.id], areas);
    if (!label) return '';
    const text = q.id === 'area' ? `Berlin · ${label}` : label;
    return `<div class="fitpanel__fact">${icon(q.icon, 21)}<span>${esc(text)}</span></div>`;
  })
    .filter(Boolean)
    .join('');

  // Venues only appear once Urby knows where to look — no pretending before then.
  const venues = answers.area ? (match.venues || []).slice(0, 3) : [];
  const venueCards = venues.map(venueCard).join('');

  const planBlock = provisional
    ? `<div class="plan-card">
        <span class="plan-card__icon">${icon('star', 22)}</span>
        <div>
          <div class="plan-card__name">${esc(provisional.planName)}</div>
          <div class="plan-card__price"><b>${provisional.price} €</b> <span>/ month</span></div>
          <div class="plan-card__reason">${esc(provisional.shortReason)}</div>
        </div>
      </div>`
    : `<p class="small muted">Answer a couple of questions and I'll suggest a membership.</p>`;

  const remaining = totalQuestions - answeredCount;
  const note = confirmed
    ? `<div class="panel-note">${icon('checkThin', 19)}<span>This is your recommendation. You can change it any time.</span></div>`
    : provisional
      ? `<div class="panel-note">${icon('sparkle', 19)}<span>${
          remaining > 1
            ? `I'll confirm this after ${remaining} more questions.`
            : `I'll confirm this after one more question.`
        }</span></div>`
      : '';

  const widened =
    match.widened && venues.length
      ? `<p class="xsmall muted" style="margin-top:10px">Looked a little further out to find enough options.</p>`
      : '';

  const contents = `
    <h2>Your fit, so far</h2>
    <div class="fitpanel__facts">${facts || '<p class="small muted">Nothing yet — Urby is about to ask.</p>'}</div>
    ${
      venues.length
        ? `<hr>
           <div class="fitpanel__label">Nearby venues we found for you</div>
           <div class="venue-grid">${venueCards}</div>
           ${widened}`
        : ''
    }
    ${
      provisional || confirmed
        ? `<hr>
           <div class="fitpanel__label">${confirmed ? 'Your membership' : 'Looking like a fit'}</div>
           ${planBlock}`
        : ''
    }
    ${note}
  `;

  return `<aside class="two-col__aside">
    <button class="fitpanel-mobile-toggle" type="button" data-toggle-fitpanel aria-expanded="false" aria-controls="fitpanel-contents">
      <span>Your fit so far · ${answeredCount} answer${answeredCount === 1 ? '' : 's'}</span>
      ${icon('chevron', 20)}
    </button>
    <div class="fitpanel">
      <div class="fitpanel__contents" id="fitpanel-contents">${contents}</div>
    </div>
  </aside>`;
}

export function venueCard(v) {
  const media = v.image
    ? `<img src="${esc(v.image)}" alt="${esc(v.name)}" loading="lazy">`
    : `<span class="venue-card__glyph">${icon(activityIcon(v.activities), 34)}</span>`;
  return `<div class="venue-card">
    <div class="venue-card__media">${media}</div>
    <div class="venue-card__body">
      <div class="venue-card__name">${esc(v.name)}</div>
      <div class="venue-card__meta">· ${v.distanceKm} km</div>
    </div>
  </div>`;
}

/** Picks the closest line icon for a venue that has no photo in the sample set. */
export function activityIcon(activities = []) {
  const has = (...list) => activities.some((a) => list.includes(a));
  if (has('yoga', 'pilates', 'meditation', 'barre')) return 'leaf';
  if (has('spa', 'sauna')) return 'spa';
  if (has('swimming', 'aqua_fitness')) return 'waves';
  if (has('tennis', 'padel')) return 'racket';
  if (has('running', 'outdoor')) return 'shoe';
  if (has('bouldering', 'climbing')) return 'mountain';
  if (has('boxing', 'martial_arts')) return 'glove';
  if (has('dance')) return 'music';
  if (has('gym', 'strength', 'crossfit', 'cardio', 'hiit')) return 'dumbbell';
  return 'grid';
}
