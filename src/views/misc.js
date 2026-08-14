import { page, esc, wordmark, topbar } from './layout.js';
import { icon, ulaAvatar } from './icons.js';

/** Shown after "Save and exit" — proves progress is kept and shows the resume path. */
export function leftPage({ resumeUrl, marketingConsent, email, lastStepLabel }) {
  const body = `
<header class="topbar"><div class="topbar__left">${wordmark()}</div><div></div><div></div></header>
<main class="content" id="main">
  <div style="display:flex;align-items:center;gap:14px;margin:24px 0 8px">
    ${ulaAvatar('lg')}
    <h1 class="h-question" style="margin:0">Saved. Come back any time.</h1>
  </div>
  <p class="lede" style="margin-top:0;max-width:52ch">Your answers, your venue matches and your recommendation are stored against ${esc(
    email || 'your email'
  )}. You stopped at <strong>${esc(lastStepLabel)}</strong>.</p>

  <div class="card">
    <div class="fitpanel__label">Your marketing preference</div>
    <p class="small" style="margin:0">${
      marketingConsent
        ? `${icon('checkThin', 17)} You asked us to email your matches and occasional offers. You can change this any time.`
        : `${icon('info', 17)} You chose not to receive marketing emails. We&rsquo;ll only send what your signup needs.`
    }</p>
  </div>

  <div class="card">
    <div class="fitpanel__label">Continue where you left off</div>
    <p class="small muted" style="margin-top:0">This is the secure link a returning visitor would receive. Open it in a private window to prove the journey resumes without a password.</p>
    <p class="xsmall" style="word-break:break-all;background:var(--page-grey);padding:12px 14px;border-radius:6px">${esc(resumeUrl)}</p>
    <div class="btn-row">
      <a class="btn btn--primary" href="${esc(resumeUrl)}">Continue now</a>
      <a class="btn btn--secondary" href="/preview/email">See the follow-up email</a>
    </div>
  </div>
</main>`;
  return page({ title: 'Progress saved', body });
}

export function simplePage({ title, heading, paragraphs = [], backHref = '/', backLabel = 'Back to the journey' }) {
  const body = `
<header class="topbar"><div class="topbar__left">${wordmark()}</div><div></div>
<div class="topbar__right"><a class="link-plain" href="${esc(backHref)}">${esc(backLabel)}</a></div></header>
<main class="content" id="main">
  <h1 class="h-question" style="margin-top:14px">${esc(heading)}</h1>
  ${paragraphs.map((p) => `<p class="lede" style="max-width:60ch;margin-top:12px">${p}</p>`).join('')}
</main>`;
  return page({ title, body });
}

export function notFoundPage() {
  const body = `
<header class="topbar"><div class="topbar__left">${wordmark()}</div><div></div><div></div></header>
<main class="content" id="main">
  <h1 class="h-question" style="margin-top:14px">That page isn&rsquo;t part of the pilot</h1>
  <p class="lede" style="margin-top:0">The pilot covers the landing page, Urby&rsquo;s questions, the recommendation, details and a simulated payment.</p>
  <div class="btn-row"><a class="btn btn--primary" href="/">Start the journey</a></div>
</main>`;
  return page({ title: 'Not found', body });
}

export function expiredLinkPage() {
  const body = `
<header class="topbar"><div class="topbar__left">${wordmark()}</div><div></div><div></div></header>
<main class="content" id="main">
  <h1 class="h-question" style="margin-top:14px">This link no longer works</h1>
  <p class="lede" style="margin-top:0;max-width:52ch">We couldn&rsquo;t find saved progress for this link. It may have been created before the pilot database was reset.</p>
  <div class="btn-row"><a class="btn btn--primary" href="/">Start again</a></div>
</main>`;
  return page({ title: 'Link not found', body });
}
