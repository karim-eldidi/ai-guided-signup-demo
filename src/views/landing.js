import { page, esc, wordmark } from './layout.js';
import { icon, ulaAvatar, googleMark, appleMark } from './icons.js';

/**
 * Landing page.
 *
 * Two sections, matching the supplied designs and mirroring how the Contentstack
 * app composes a page from modular sections:
 *   1. hero-signup  — value proposition, email-first capture, Google/Apple, consent
 *   2. ula-guide    — the Urby product moment further down the page
 * See PORTING.md for the 1:1 mapping to CMS sections.
 */
export function landingPage({ error = null, email = '', resumed = false } = {}) {
  const body = `
${heroSignup({ error, email, resumed })}
${ulaGuideSection()}
${footer()}
`;
  return page({ title: 'Your way to move', body, bodyClass: 'landing-page' });
}

/* ---------------- section: hero-signup ---------------- */

function heroSignup({ error, email, resumed }) {
  return `<section class="landing" id="main">
  <div class="landing__panel">
    <div class="landing__panelbar">
      ${wordmark()}
      <a class="login-link login-link--mobile" href="/login">Log in</a>
    </div>

    <div class="landing__body">
      <h1 class="h-hero">Your way<br>to move.</h1>
      <p class="lede">Tell us what moves you. We&rsquo;ll find nearby activities and a membership that fits your life.</p>

      <div class="ula-intro">
        <span class="ula-intro__icon">${icon('sparkle', 26)}</span>
        <div>
          <div class="ula-intro__title">Meet Urby, your personal membership guide.</div>
          <div class="ula-intro__sub">Find nearby activities and the right membership.</div>
          <div class="ula-intro__mobile">Urby will find nearby activities and the right membership.</div>
        </div>
      </div>

      ${
        resumed
          ? `<div class="notice" style="max-width:560px">${icon('checkThin', 20)}<span>Welcome back. Your answers are saved — continue where you left off.</span></div>`
          : ''
      }

      <form method="POST" action="/start" novalidate>
        <div class="signup-row">
          <input type="email" name="email" inputmode="email" autocomplete="email"
                 placeholder="Your email address" aria-label="Your email address" value="${esc(email)}" required>
          <button type="submit">Find my fit</button>
        </div>
        ${error ? `<p class="field-error" role="alert">${esc(error)}</p>` : ''}

        <div class="or-divider">or continue with</div>

        <div class="sso-row">
          <button class="sso-btn" type="submit" name="provider" value="google">${googleMark} Google</button>
          <button class="sso-btn" type="submit" name="provider" value="apple">${appleMark} Apple</button>
        </div>

        <div class="consent-row">
          <label class="checkbox">
            <input type="checkbox" name="marketing" value="yes" id="marketing">
            <span></span>
          </label>
          <label class="consent-label" for="marketing">Email me offers, news and activity inspiration.</label>
        </div>

        <p class="terms-line">By continuing, you agree to our <a href="/legal/terms">Terms</a> and <a href="/legal/privacy">Privacy Policy</a>.</p>
      </form>
    </div>
  </div>

  <div class="landing__media">
    <a class="login-link login-link--desktop" href="/login">Log in</a>
    <img src="/images/hero-climber.jpg" alt="A climber resting and smiling at a bouldering gym in Berlin">
  </div>
</section>`;
}

/* ---------------- section: ula-guide ---------------- */

function ulaGuideSection() {
  return `<section class="ula-section">
  <div class="ula-section__inner">
    <div class="ula-section__eyebrow">${ulaAvatar('sm')}<span>Urby · Membership guide</span></div>
    <h2 class="h-section">Not sure where to start? Ask Urby.</h2>
    <p class="ula-section__lede">Tell me what you want from movement and I&rsquo;ll help you find nearby activities and a membership that fits.</p>

    <div class="ula-demo">
      <div class="ula-demo__q">What would you love to do more of?</div>
      <div class="options" id="ula-demo-options">
        <button class="option-card" type="button" data-demo-answer="Great — I&rsquo;ll find nearby activities that fit your routine.">
          <span class="option-card__icon">${icon('bolt', 20)}</span>
          <span class="option-card__label">Move more</span>
          <span class="option-card__check">${icon('checkThin', 17)}</span>
        </button>
        <button class="option-card" type="button" data-demo-answer="Good to know — I&rsquo;ll look for calmer places to reset.">
          <span class="option-card__icon">${icon('leaf', 20)}</span>
          <span class="option-card__label">Unwind</span>
          <span class="option-card__check">${icon('checkThin', 17)}</span>
        </button>
        <button class="option-card" type="button" data-demo-answer="Nice — I&rsquo;ll look for a mix you haven&rsquo;t tried yet.">
          <span class="option-card__icon">${icon('sparkle', 20)}</span>
          <span class="option-card__label">Try something new</span>
          <span class="option-card__check">${icon('checkThin', 17)}</span>
        </button>
      </div>
      <div class="ula-demo__answer" id="ula-demo-answer" role="status"></div>
      <div class="btn-row">
        <a class="btn btn--primary" href="/#main">Start with Urby</a>
      </div>
    </div>
  </div>
</section>`;
}

function footer() {
  return `<footer style="padding:40px 24px 60px;text-align:center" class="small muted">
    Urban Sports Club pilot · sample data · <a href="/admin/journeys">journey data</a> · <a href="/preview/email">follow-up email preview</a>
  </footer>`;
}
