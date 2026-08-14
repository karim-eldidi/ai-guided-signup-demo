import { page, esc, topbar, ulaRow, exitModal } from './layout.js';
import { icon } from './icons.js';
import { fitPanel, venueCard } from './fitpanel.js';
import { QUESTIONS, answerLabel } from '../questions.js';
import { PLANS, COMMITMENTS, planById, priceFor } from '../recommend.js';

/**
 * Recommendation screen — a small number of nearby venues, one recommended plan,
 * a plain-language reason, and an obvious way to compare or change without
 * dropping the visitor into a dense pricing grid.
 */
export function recommendationPage({
  recommendation,
  explanation,
  answers,
  match,
  areas,
  chosenPlanId,
  commitmentId,
  aiBadge = null
}) {
  const plan = planById(chosenPlanId || recommendation.planId);
  const isRecommended = plan.id === recommendation.planId;
  const price = priceFor(plan, commitmentId);
  const commitment = COMMITMENTS.find((c) => c.id === commitmentId) || COMMITMENTS[0];

  const reasons = recommendation.reasons.map((r) => `<li>${icon('checkThin', 19)}<span>${esc(r)}</span></li>`).join('');
  const notes = recommendation.notes.length
    ? `<div class="notice notice--grey" style="margin-top:22px">${icon('info', 19)}<span>${recommendation.notes
        .map(esc)
        .join(' ')}</span></div>`
    : '';

  const venues = (match.venues || []).slice(0, 6).map(venueCard).join('');

  // Only the adjacent cheaper and richer plan — deliberately not a full pricing grid.
  const neighbours = PLANS.filter((p) => Math.abs(p.rank - plan.rank) === 1);
  const otherPlans = neighbours
    .map((p) => {
      const delta = priceFor(p, commitmentId) - price;
      const tradeoff =
        delta < 0
          ? `${Math.abs(delta)} € less a month. ${p.limitations[0]}.`
          : `${delta} € more a month. ${p.bestFor}.`;
      return `<form method="POST" action="/choose-plan">
          <input type="hidden" name="planId" value="${esc(p.id)}">
          <button class="alt-card" type="submit">
            <span class="alt-card__name">${esc(p.name)}</span>
            <span class="alt-card__price">${priceFor(p, commitmentId)} € / month</span>
            <span class="alt-card__tradeoff">${esc(tradeoff)}</span>
            <span class="xsmall strong" style="margin-top:6px;text-decoration:underline">Choose ${esc(p.name)}</span>
          </button>
        </form>`;
    })
    .join('');

  const commitmentOptions = COMMITMENTS.map((c) => {
    const active = c.id === commitmentId;
    return `<form method="POST" action="/choose-commitment" style="flex:1 1 0">
        <input type="hidden" name="commitmentId" value="${esc(c.id)}">
        <button class="alt-card ${active ? 'is-current' : ''}" type="submit" aria-pressed="${active}">
          <span class="alt-card__name">${priceFor(plan, c.id)} € <span style="font-size:15px;font-weight:600">/ month</span></span>
          <span class="alt-card__tradeoff">${esc(c.label)}</span>
        </button>
      </form>`;
  }).join('');

  const review = QUESTIONS.map((q) => {
    const label = answerLabel(q.id, answers[q.id], areas);
    if (!label) return '';
    return `<div class="answer-review__row">
        <div>
          <div class="answer-review__q">${esc(q.summaryLabel)}</div>
          <div class="answer-review__a">${esc(label)}</div>
        </div>
        <a class="answer-review__edit" href="/fit?edit=${esc(q.id)}">Change</a>
      </div>`;
  }).join('');

  const main = `<main class="two-col__main" id="main">
    ${ulaRow()}
    <h1 class="h-question" style="margin-bottom:18px">${isRecommended ? 'Here&rsquo;s what fits you' : `You chose ${esc(plan.name)}`}</h1>
    <p class="lede" style="max-width:56ch;margin-top:0">${esc(explanation)}</p>

    <div class="card" style="margin-top:28px">
      <div class="plan-card" style="border:0;padding:0">
        <span class="plan-card__icon">${icon('star', 22)}</span>
        <div style="flex:1 1 auto">
          ${isRecommended ? `<span class="badge">Recommended for you</span>` : `<span class="badge badge--grey">Your choice</span>`}
          <div class="plan-card__name" style="margin-top:8px">${esc(plan.name)}</div>
          <div class="plan-card__price"><b>${price} €</b> <span>/ month · ${esc(commitment.label)}</span></div>
          <div class="plan-card__reason">${esc(plan.bestFor)}</div>
        </div>
      </div>

      <hr style="border:0;border-top:1px solid var(--border);margin:24px 0">

      <div class="fitpanel__label">Why this fits</div>
      <ul class="reasons">${reasons}</ul>

      <div class="fitpanel__label" style="margin-top:26px">Worth knowing before you decide</div>
      <ul class="reasons">${plan.limitations.map((l) => `<li>${icon('info', 19)}<span>${esc(l)}</span></li>`).join('')}</ul>
      <p class="xsmall muted" style="margin-top:14px">${esc(plan.checkInModel)} · ${esc(plan.venueCount)} venues · ${commitment.minimumTermMonths === 1 ? 'no minimum term' : `${commitment.minimumTermMonths}-month minimum term`}.</p>
    </div>

    ${notes}

    <div class="card">
      <div class="fitpanel__label">How you&rsquo;d like to pay</div>
      <div class="alt-grid" style="margin-top:0">${commitmentOptions}</div>
    </div>

    <div class="card">
      <div class="fitpanel__label">Nearby, on this membership</div>
      <div class="venue-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${venues}</div>
      <p class="xsmall muted" style="margin-top:14px">Distances measured from ${esc(match.area ? match.area.name : 'your area')}. Real Urban Sports Club venue data; distances are approximate.</p>
    </div>

    <div class="card">
      <div class="fitpanel__label">Compare or change</div>
      <div class="alt-grid">${otherPlans}</div>
      ${
        !isRecommended
          ? `<form method="POST" action="/choose-plan" style="margin-top:16px">
               <input type="hidden" name="planId" value="${esc(recommendation.planId)}">
               <button class="link-plain" type="submit" style="text-decoration:underline">${icon('refresh', 16)} Back to Urby&rsquo;s recommendation (${esc(
                 recommendation.planName
               )})</button>
             </form>`
          : ''
      }
    </div>

    <div class="card">
      <div class="fitpanel__label">Your answers</div>
      <div class="answer-review">${review}</div>
    </div>

    <div class="btn-row">
      <a class="btn btn--primary" href="/details">Continue to your details</a>
      <button class="btn btn--secondary" type="button" data-open-exit>Save and come back later</button>
    </div>

    ${aiBadge ? `<p class="xsmall muted ai-badge">${esc(aiBadge)}</p>` : ''}
  </main>`;

  const body = `
${topbar({ step: 1, savedNote: true })}
<div class="two-col">
  ${main}
  ${fitPanel({
    answers,
    match,
    provisional: { planName: plan.name, price, shortReason: plan.shortReason },
    areas,
    answeredCount: QUESTIONS.length,
    totalQuestions: QUESTIONS.length,
    confirmed: true
  })}
</div>
${exitModal({ consentAlreadyGiven: false })}
`;

  return page({ title: `${plan.name} looks like your fit`, body });
}
