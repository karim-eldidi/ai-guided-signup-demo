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

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dobParts = (d.birthDate && typeof d.birthDate === 'string') ? d.birthDate.split('-') : [];
  const dYear = dobParts[0] || '';
  const dMonth = dobParts[1] || '';
  const dDay = dobParts[2] || '';
  const dobField = `<div class="field field--dob">
    <label id="dob-label">Date of birth</label>
    <div class="dob-fields-row" role="group" aria-labelledby="dob-label">
      <input id="dob_day" name="dob_day" type="text" inputmode="numeric" placeholder="DD" maxlength="2" value="${esc(dDay)}" autocomplete="bday-day" aria-label="Day of birth" required>
      <select id="dob_month" name="dob_month" autocomplete="bday-month" aria-label="Month of birth" required>
        <option value="">Month</option>
        ${MONTHS.map((m, i) => {
          const val = String(i + 1).padStart(2, '0');
          const isSel = (dMonth === val || dMonth === String(i + 1));
          return `<option value="${val}" ${isSel ? 'selected' : ''}>${m}</option>`;
        }).join('')}
      </select>
      <input id="dob_year" name="dob_year" type="text" inputmode="numeric" placeholder="YYYY" maxlength="4" value="${esc(dYear)}" autocomplete="bday-year" aria-label="Year of birth" required>
      <input id="birthDate" name="birthDate" type="hidden" value="${esc(d.birthDate||'')}">
    </div>
    ${errors.birthDate ? `<div class="field-error">${esc(errors.birthDate)}</div>` : ''}
    <div class="field__why">${icon('info', 14)} <span>Venues check age on entry. Must be at least 18 years old.</span></div>
  </div>`;

  const main = `<main class="content" id="main">
    <h1 class="h-question" style="margin-top:14px">Your details</h1>
    <p class="lede" style="margin-top:0;max-width:52ch">Just what we need to create your ${esc(plan.name)} membership. Nothing else.</p>

    <form method="POST" action="/details" novalidate>
      <div class="card">
        <div class="form-grid">
          ${field('firstName', 'First name', { autocomplete: 'given-name' })}
          ${field('lastName', 'Last name', { autocomplete: 'family-name' })}
          ${field('email', 'Email', { type: 'email', autocomplete: 'email', wide: true })}
          ${dobField}
          ${field('phone', 'Mobile number', {
            type: 'tel',
            autocomplete: 'tel',
            placeholder: '+49 151 12345678',
            why: 'For booking confirmations and studio access.'
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
