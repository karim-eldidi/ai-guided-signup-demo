import { page, esc } from './layout.js';
import { icon } from './icons.js';

/**
 * Follow-up email preview.
 *
 * Only rendered for a session that has an email. The copy references saved progress
 * and the concern the visitor expressed — nothing sensitive, nothing inferred.
 * Marketing content only appears when marketing consent was given; the "continue
 * your signup" message is transactional and shown either way, which is the
 * distinction Legal will care about.
 */
export function emailPreviewPage({ session, answers, areas, provisional, marketingConsent, resumeUrl, lastStepLabel }) {
  const firstName = session.details?.firstName || (session.email ? session.email.split('@')[0] : 'there');
  const goalLabel = labelFor('goal', answers, areas);
  const areaLabel = labelFor('area', answers, areas);
  const barrierLabel = labelFor('barrier', answers, areas);

  const converted = session.payment_status === 'simulated_paid';
  const facts = [
    goalLabel ? { icon: 'target', label: 'Goal', value: goalLabel } : null,
    areaLabel ? { icon: 'pin', label: 'Area', value: `Berlin-${areaLabel}` } : null,
    provisional ? { icon: 'tag', label: 'Early match', value: `${provisional.planName}, ${provisional.price} € / month` } : null,
    lastStepLabel && !converted ? { icon: 'calendar', label: 'You stopped at', value: lastStepLabel } : null
  ].filter(Boolean);

  const factRows = facts
    .map(
      (f) => `<div class="email-facts__row">${icon(f.icon, 20)}<span><strong>${esc(f.label)}</strong> · ${esc(f.value)}</span></div>`
    )
    .join('');

  const body = `
<div class="email-page">
  <div style="max-width:620px;margin:0 auto 18px">
    <p class="small muted" style="margin:0 0 6px">Preview of the follow-up email · not sent from this pilot</p>
    <p class="xsmall muted" style="margin:0">
      Marketing consent: <strong>${marketingConsent ? 'given' : 'not given'}</strong>.
      ${
        marketingConsent
          ? 'Offers and inspiration may be included.'
          : 'Only the transactional "continue your signup" message would be sent — no offers.'
      }
    </p>
  </div>

  <div class="email-card">
    <div class="email-hero">
      <div class="email-hero__photo"><img src="/images/email-header.jpg" alt=""></div>
      <div class="email-hero__inner">
        <span class="wordmark" style="text-decoration:none">Urban Sports Club</span>
        <h1>Your next move is waiting</h1>
      </div>
    </div>

    <div class="email-body">
      <p>Hi ${esc(capitalize(firstName))},</p>
      <p>${
        goalLabel
          ? `Thanks for telling us you want to ${esc(goalLabel.toLowerCase())}.`
          : 'Thanks for starting to look around.'
      } Urby has saved your answers${areaLabel ? ` and found options close to ${esc(areaLabel)}` : ' and found some options for you'}.</p>
      ${
        barrierLabel
          ? `<p>You mentioned <strong>${esc(barrierLabel.toLowerCase())}</strong> is what would make it easier — that is exactly what we matched against.</p>`
          : ''
      }
      <p>${
        converted
          ? 'Your membership is set up — this is what the reminder would have looked like if you had left before finishing.'
          : `Pick up where you left off. There&rsquo;s ${provisional ? 'just a step or two' : 'not much'} left before your membership is set up.`
      }</p>

      <div class="email-facts">
        <h3>Your fit so far</h3>
        ${factRows}
      </div>

      <a class="btn btn--primary btn--block" href="${esc(resumeUrl)}" style="text-decoration:none">Continue where you left off</a>
      <p class="small muted" style="margin-top:16px">Your answers are saved. You&rsquo;ll return exactly where you left off.</p>
      <p class="xsmall muted" style="margin-top:10px">Not you? Ignore this email.</p>
    </div>

    <div class="email-footer">
      Urban Sports Club · <a href="/legal/privacy">Privacy</a> · <a href="/legal/terms">Help</a>
      ${marketingConsent ? `<div style="margin-top:8px">You receive this because you asked us to email you. <a href="/unsubscribe">Unsubscribe</a></div>` : ''}
    </div>
  </div>

  <div style="max-width:620px;margin:26px auto 0">
    <a class="btn btn--secondary btn--block" href="/admin/journeys" style="text-decoration:none">Back to journey data</a>
  </div>
</div>`;

  return page({ title: 'Follow-up email preview', body, showBanner: false });
}

export function emailUnavailablePage() {
  const body = `<div class="email-page">
    <div class="email-card" style="padding:44px 36px">
      <h1 class="h-question" style="margin-top:0">No identified visitor yet</h1>
      <p class="lede" style="margin-top:0">The follow-up email only exists once someone has given an email address. Start the journey, enter an email, then come back.</p>
      <div class="btn-row"><a class="btn btn--primary" href="/">Start the journey</a></div>
    </div>
  </div>`;
  return page({ title: 'Follow-up email preview', body, showBanner: false });
}

function labelFor(questionId, answers, areas) {
  const value = answers[questionId];
  if (!value) return null;
  if (typeof value === 'object' && value.freeText) return value.freeText;
  if (questionId === 'area') {
    if (Array.isArray(value)) {
      const names = value.map((id) => (areas.find((x) => x.id === id) || {}).name).filter(Boolean);
      return names.length ? (names.length <= 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`) : String(value);
    }
    const a = areas.find((x) => x.id === value);
    return a ? a.name : value;
  }
  const map = {
    move_more: 'move more',
    unwind: 'unwind',
    try_new: 'try something new',
    nearby: 'Finding places close to me',
    variety: 'Having enough variety',
    schedule: 'Fitting it around my schedule'
  };
  if (Array.isArray(value)) {
    const names = value.map((id) => map[id] || id).filter(Boolean);
    return names.length ? (names.length <= 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`) : String(value);
  }
  return map[value] || String(value);
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
