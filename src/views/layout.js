import { icon, ulaAvatar } from './icons.js';

export function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Page shell. Every screen goes through here so the demo banner, fonts and
 * accessibility scaffolding stay consistent.
 */
export function page({ title, body, bodyClass = '', script = '', showBanner = true }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)} · Urban Sports Club</title>
<!-- Figtree is self-hosted; styles.css declares it from /fonts. Fetching it from
     fonts.googleapis.com meant an offline demo fell back to Helvetica, where weights 600-900
     render identically and the type hierarchy collapses. -->
<link rel="preload" href="/fonts/figtree-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles.css">
<link rel="icon" href="data:,">
</head>
<body class="${bodyClass}">
<a class="skip-link" href="#main">Skip to main content</a>
${showBanner ? demoBanner() : ''}
${body}
<script src="/app.js" defer></script>
${script ? `<script defer>${script}</script>` : ''}
</body>
</html>`;
}

function demoBanner() {
  return `<div class="demo-banner">Pilot demo — real Urban Sports Club prices, terms and venues. Simulated payment. <a href="/admin/journeys">Journey data</a></div>`;
}

export function wordmark(href = '/') {
  return `<a class="wordmark" href="${href}">Urban Sports Club</a>`;
}

/** Top bar used on the signup steps. */
export function topbar({ step, savedNote = false, saveAndExit = true }) {
  const steps = [
    { id: 1, label: 'Your fit' },
    { id: 2, label: 'Details' },
    { id: 3, label: 'Payment' }
  ];
  const dots = steps
    .map((s, i) => {
      const state = s.id === step ? 'is-current' : s.id < step ? 'is-done' : '';
      const dot = s.id < step ? icon('checkThin', 16) : s.id;
      return `${i ? '<div class="stepper__line"></div>' : ''}
        <div class="stepper__step ${state}">
          <div class="stepper__dot">${dot}</div>
          <div class="stepper__label">${esc(s.label)}</div>
        </div>`;
    })
    .join('');

  return `<header class="topbar">
    <div class="topbar__left">
      ${wordmark()}
      ${savedNote ? `<div class="saved-note">${icon('checkThin', 16)} Email saved — your progress is safe.</div>` : ''}
    </div>
    <div class="topbar__center"><div class="stepper">${dots}</div></div>
    <div class="topbar__right">
      ${saveAndExit ? `<button class="link-plain" type="button" data-open-exit>Save and exit</button>` : ''}
    </div>
  </header>
  <div class="mobile-progress">
    <div class="mobile-progress__label">${step} of 3 · ${esc(steps[step - 1].label)}</div>
    <div class="mobile-progress__track"><div class="mobile-progress__fill" style="width:${(step / 3) * 100}%"></div></div>
    ${savedNote ? `<div class="saved-note saved-note--mobile">${icon('checkThin', 16)} Email saved — your progress is safe.</div>` : ''}
  </div>`;
}

export function ulaRow(size = 'md') {
  return `<div class="ula-row">${ulaAvatar(size)}<div class="ula-name"><b>Urby</b> <span>· Membership guide</span></div></div>`;
}

/** The "Before you go" consent modal from the designs. */
export function exitModal({ consentAlreadyGiven = false }) {
  return `<div class="overlay" id="exit-modal" hidden role="dialog" aria-modal="true" aria-labelledby="exit-title">
    <div class="modal">
      <button class="modal__close" type="button" data-close-exit aria-label="Close">&times;</button>
      ${ulaAvatar('md')}
      <h2 id="exit-title">Before you go</h2>
      <p class="modal__sub">Your progress is saved.</p>
      ${
        consentAlreadyGiven
          ? `<p class="modal__body">You've already asked me to email you. I'll send your venue matches and recommendation, and you can pick up exactly where you left off.</p>
             <a class="btn btn--primary" href="/exit?consent=keep">Done</a>`
          : `<p class="modal__body">Want me to email your nearby venue matches, membership recommendation and occasional offers based on what you've told me?</p>
             <a class="btn btn--primary" href="/exit?consent=yes">Yes, email me</a>
             <a class="btn btn--secondary" href="/exit?consent=no">Exit without emails</a>`
      }
      <p class="modal__fine">You can unsubscribe anytime. <a href="/legal/privacy">Privacy Policy</a></p>
      <button class="modal__tertiary" type="button" data-close-exit>Keep exploring</button>
    </div>
  </div>`;
}
