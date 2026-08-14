import { page, esc, topbar, exitModal } from './layout.js';
import { icon } from './icons.js';
import { planById, priceFor, commitmentById } from '../recommend.js';

/**
 * Details screen — only what is needed to create a membership, with a plain
 * explanation next to anything a visitor would reasonably question.
 */
export function detailsPage({ plan: planId, commitmentId, details = {}, errors = {}, email = '' }) {
  const plan = planById(planId);
  const commitment = commitmentById(commitmentId);
  const price = priceFor(plan, commitmentId);
  const d = details || {};

  const field = (name, label, opts = {}) => {
    const { type = 'text', why = null, autocomplete = null, wide = false, placeholder = '', required = true } = opts;
    return `<div class="field ${wide ? 'field--wide' : ''}">
      <label for="${name}">${esc(label)}${required ? '' : ' <span class="muted" style="font-weight:400">(optional)</span>'}</label>
      <input id="${name}" name="${name}" type="${type}" value="${esc(d[name] || '')}"
             ${autocomplete ? `autocomplete="${autocomplete}"` : ''} placeholder="${esc(placeholder)}"
             ${errors[name] ? 'aria-invalid="true"' : ''}>
      ${errors[name] ? `<div class="field-error">${esc(errors[name])}</div>` : ''}
      ${why ? `<div class="field__why">${icon('info', 14)} ${esc(why)}</div>` : ''}
    </div>`;
  };

  const main = `<main class="content" id="main">
    <h1 class="h-question" style="margin-top:14px">Your details</h1>
    <p class="lede" style="margin-top:0;max-width:52ch">Just what we need to create your ${esc(plan.name)} membership. Nothing else.</p>

    <form method="POST" action="/details" novalidate>
      <div class="card">
        <div class="form-grid">
          ${field('firstName', 'First name', { autocomplete: 'given-name' })}
          ${field('lastName', 'Last name', { autocomplete: 'family-name' })}
          ${field('email', 'Email', { type: 'email', autocomplete: 'email', wide: true })}
          ${field('birthDate', 'Date of birth', {
            type: 'date',
            autocomplete: 'bday',
            why: 'Venues check age on entry, and some classes have a minimum age. We do not use it for anything else.'
          })}
          ${field('phone', 'Mobile number', {
            type: 'tel',
            autocomplete: 'tel',
            required: false,
            why: 'Only used if a venue needs to reach you about a booking.'
          })}
          ${field('street', 'Street and number', { autocomplete: 'street-address', wide: true })}
          ${field('postcode', 'Postcode', { autocomplete: 'postal-code', placeholder: '12043' })}
          ${field('city', 'City', { autocomplete: 'address-level2', placeholder: 'Berlin' })}
        </div>
        <div class="notice" style="margin:24px 0 0">
          ${icon('lock', 19)}
          <span>Pilot demo — details are stored only in a local file on the machine running this app, and are not sent to any Urban Sports Club system.</span>
        </div>
      </div>

      <div class="card">
        <div class="fitpanel__label">What you&rsquo;re signing up for</div>
        <dl class="summary-list">
          <div class="summary-row"><dt>Membership</dt><dd>${esc(plan.name)}</dd></div>
          <div class="summary-row"><dt>Price</dt><dd>${price} € / month</dd></div>
          <div class="summary-row"><dt>Billing</dt><dd>${esc(commitment.label)}</dd></div>
        </dl>
        <p class="xsmall muted" style="margin-top:12px"><a href="/recommendation" style="text-decoration:underline">Change membership</a></p>
      </div>

      <div class="btn-row">
        <button class="btn btn--primary" type="submit">Continue to payment</button>
        <a class="btn btn--secondary" href="/recommendation">Back</a>
      </div>
    </form>
  </main>`;

  const body = `
${topbar({ step: 2, savedNote: true })}
${main}
${exitModal({ consentAlreadyGiven: false })}
`;
  return page({ title: 'Your details', body });
}
