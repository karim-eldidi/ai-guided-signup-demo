import { page, esc, topbar, exitModal } from './layout.js';
import { icon } from './icons.js';
import { planById, priceFor, commitmentById } from '../recommend.js';

/**
 * Payment screen — the full order summary before anything is confirmed.
 * Non-production: no card data is collected, nothing is charged, no PSP is contacted.
 */
export function paymentPage({ planId, commitmentId, details, startDate, method = 'card', errors = {} }) {
  const plan = planById(planId);
  const commitment = commitmentById(commitmentId);
  const price = priceFor(plan, commitmentId);
  const renewal =
    commitment.renewal;

  const main = `<main class="content" id="main">
    <h1 class="h-question" style="margin-top:14px">Review and pay</h1>
    <p class="lede" style="margin-top:0;max-width:52ch">Everything you&rsquo;re agreeing to, in one place. No surprises after this screen.</p>

    <div class="notice">
      ${icon('info', 19)}
      <span><strong>Simulated payment.</strong> This pilot does not contact a payment provider and never collects card details. Nothing is charged.</span>
    </div>

    <div class="card">
      <div class="fitpanel__label">Your order</div>
      <dl class="summary-list">
        <div class="summary-row"><dt>Membership</dt><dd>${esc(plan.name)}</dd></div>
        <div class="summary-row"><dt>Billing frequency</dt><dd>Monthly</dd></div>
        <div class="summary-row"><dt>Commitment</dt><dd>${esc(commitment.label)}</dd></div>
        <div class="summary-row"><dt>Start date</dt><dd>${esc(formatDate(startDate))}</dd></div>
        <div class="summary-row"><dt>Member</dt><dd>${esc(`${details?.firstName || ''} ${details?.lastName || ''}`.trim() || '—')}</dd></div>
        <div class="summary-row summary-row--total"><dt>Total each month</dt><dd>${price} €</dd></div>
      </dl>
    </div>

    <div class="card">
      <div class="fitpanel__label">Cancellation, pause and renewal</div>
      <ul class="reasons">
        <li>${icon('checkThin', 19)}<span>${esc(renewal)}</span></li>
        <li>${icon('checkThin', 19)}<span>At least 72 hours&rsquo; notice before the end of your billing period.</span></li>
        <li>${icon('checkThin', 19)}<span>${commitment.canPause ? 'This membership can be paused for 1 to 6 full months at no cost.' : 'This membership cannot be paused — only monthly memberships can.'}</span></li>
        <li>${icon('info', 19)}<span>${esc(plan.limitations.join(' · '))}</span></li>
      </ul>
      <p class="xsmall muted" style="margin-top:14px">Sample terms for the pilot. Final wording comes from Legal before any real test.</p>
    </div>

    <form method="POST" action="/payment">
      <div class="card">
        <div class="fitpanel__label">Payment method</div>
        <div class="options">
          <label class="option-card ${method === 'card' ? 'is-selected' : ''}">
            <input type="radio" name="method" value="card" ${method === 'card' ? 'checked' : ''} style="position:absolute;opacity:0;width:0;height:0">
            <span class="option-card__icon">${icon('card', 21)}</span>
            <span class="option-card__label">Credit or debit card <span class="xsmall muted strong" style="display:block;font-weight:400">Visa, Mastercard, Amex</span></span>
            <span class="option-card__check">${icon('checkThin', 17)}</span>
          </label>
          <label class="option-card ${method === 'paypal' ? 'is-selected' : ''}">
            <input type="radio" name="method" value="paypal" ${method === 'paypal' ? 'checked' : ''} style="position:absolute;opacity:0;width:0;height:0">
            <span class="option-card__icon">${icon('paypal', 21)}</span>
            <span class="option-card__label">PayPal <span class="xsmall muted strong" style="display:block;font-weight:400">Fast and secure checkout</span></span>
            <span class="option-card__check">${icon('checkThin', 17)}</span>
          </label>
          <label class="option-card ${method === 'wallet' ? 'is-selected' : ''}">
            <input type="radio" name="method" value="wallet" ${method === 'wallet' ? 'checked' : ''} style="position:absolute;opacity:0;width:0;height:0">
            <span class="option-card__icon">${icon('wallet', 21)}</span>
            <span class="option-card__label">Apple Pay &amp; Google Pay <span class="xsmall muted strong" style="display:block;font-weight:400">1-tap device checkout</span></span>
            <span class="option-card__check">${icon('checkThin', 17)}</span>
          </label>
        </div>
        <p class="xsmall muted" style="margin-top:16px">${icon('lock', 14)} Powered by Adyen. In production this is where the existing Adyen drop-in would be embedded.</p>
        ${errors.method ? `<div class="field-error">${esc(errors.method)}</div>` : ''}
      </div>

      <div class="btn-row">
        <button class="btn btn--primary" type="submit">Confirm and start membership</button>
        <a class="btn btn--secondary" href="/details">Back</a>
      </div>
      <p class="xsmall muted" style="margin-top:16px">By confirming you accept the <a href="/legal/terms" style="text-decoration:underline">Terms</a> and the cancellation conditions above.</p>
    </form>
  </main>`;

  const body = `
${topbar({ step: 3, savedNote: true })}
${main}
${exitModal({ consentAlreadyGiven: false })}
`;
  return page({ title: 'Review and pay', body });
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
