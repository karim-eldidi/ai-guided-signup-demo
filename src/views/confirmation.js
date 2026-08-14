import { page, esc, topbar } from './layout.js';
import { icon, ulaAvatar } from './icons.js';
import { planById, priceFor, commitmentById } from '../recommend.js';
import { formatDate } from './payment.js';

export function confirmationPage({ planId, commitmentId, details, startDate, email, resumeUrl, marketingConsent }) {
  const plan = planById(planId);
  const commitment = commitmentById(commitmentId);
  const price = priceFor(plan, commitmentId);

  const main = `<main class="content" id="main">
    <div style="display:flex;align-items:center;gap:14px;margin:20px 0 10px">
      ${ulaAvatar('lg')}
      <div>
        <h1 class="h-question" style="margin:0">You&rsquo;re in, ${esc(details?.firstName || 'welcome')}.</h1>
        <p class="small muted" style="margin:6px 0 0">${esc(plan.name)} · starts ${esc(formatDate(startDate))}</p>
      </div>
    </div>

    <div class="notice">
      ${icon('info', 19)}
      <span><strong>Placeholder handoff.</strong> In production this is where the journey hands over to the existing checkout and membership creation. Nothing was charged and no membership exists.</span>
    </div>

    <div class="card">
      <div class="fitpanel__label">What happens next</div>
      <ul class="reasons">
        <li>${icon('checkThin', 19)}<span>A confirmation goes to ${esc(email || 'your email')}.</span></li>
        <li>${icon('checkThin', 19)}<span>Your membership starts on ${esc(formatDate(startDate))} and costs ${price} € a month.</span></li>
        <li>${icon('checkThin', 19)}<span>You can check in at any included venue with the app from day one.</span></li>
        <li>${icon(marketingConsent ? 'checkThin' : 'info', 19)}<span>${
          marketingConsent
            ? 'You asked us to email you activity inspiration and offers. You can unsubscribe any time.'
            : 'You chose not to receive marketing emails. We&rsquo;ll only send what your membership requires.'
        }</span></li>
      </ul>
    </div>

    <div class="card">
      <div class="fitpanel__label">Demo tools</div>
      <p class="small muted" style="margin-top:0">These exist to make the pilot demonstrable — they would not appear in a real journey.</p>
      <ul class="reasons" style="margin-top:14px">
        <li>${icon('refresh', 19)}<span><a href="${esc(resumeUrl)}" style="text-decoration:underline">Your resume link</a> — open it in a private window to prove progress survives leaving.</span></li>
        <li>${icon('speech', 19)}<span><a href="/preview/email" style="text-decoration:underline">Follow-up email preview</a> — what an identified visitor who left would receive.</span></li>
        <li>${icon('grid', 19)}<span><a href="/admin/journeys" style="text-decoration:underline">Journey data</a> — source, steps, answers, recommendation, exit point and conversion.</span></li>
        <li>${icon('bolt', 19)}<span><a href="/reset" style="text-decoration:underline">Start a fresh visitor</a> — clears your session cookie only.</span></li>
      </ul>
    </div>
  </main>`;

  const body = `${topbar({ step: 3, savedNote: false, saveAndExit: false })}${main}`;
  return page({ title: 'Welcome to Urban Sports Club', body });
}
