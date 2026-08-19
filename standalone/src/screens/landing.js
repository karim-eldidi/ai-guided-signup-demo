/* ---------------- screens ---------------- */
/* The hero was one photograph, so the front door said "climbing" and nothing else — and
   the variety is the product. It now takes one of the images already inlined in the build
   and holds it: chosen once per page load rather than on every render, so coming back to
   the landing does not reshuffle it, and never on a timer. A crossfade would be motion
   nobody asked for and would have to be switched off again for prefers-reduced-motion;
   one image held for the whole visit needs no exception. The box is set by the layout and
   the crop by the stylesheet, so every image lands in the same place and nothing shifts.
   The only text over the photograph is the Log in chip, which carries its own yellow
   background for exactly this reason. */
const HERO_SHOTS = [
  { src:'/images/hero-climber.jpg',      alt:'A climber resting and smiling at a bouldering gym in Berlin' },
  { src:'/images/venue-boulderklub.jpg', alt:'A climber reaching for a hold on a colourful bouldering wall' },
  { src:'/images/venue-yoga.jpg',        alt:'A yoga class stretching on mats in a bright studio' },
  { src:'/images/venue-stadtbad.jpg',    alt:'The pool of a historic Berlin swimming bath under tall windows' }
];
const HERO_SHOT = HERO_SHOTS[Math.floor(Math.random() * HERO_SHOTS.length)];

function landing() {
  /* Karim's layout, August 13. The order is the argument: what this is, what you
     get, then the one field that starts it — and the reason we ask for it, stated
     in five words rather than defended in three sentences.

     The one thing his mock did not carry is a way past the email. The PM session's
     hardest trust finding was Cristiano's "wizards are perceived as tools to trick
     users into giving an email", so it stays — but as four words on the same line
     as the save note, not as a second button competing with the first. */
  /* The email came off this page on 13 August. Rule 25 had already made it optional,
     and three reviews had already said it felt like a toll gate — but "optional" is a
     property of the form and not of the feeling, and a fourth reviewer still read a
     field on the front door as the price of admission. The address only ever existed
     to power the resume link, so it is now asked on the save screen, where the visitor
     can see what it buys. Rule 61.

     What replaces it is the question those same reviewers actually arrived with:
     "is my studio on this?" Nothing in the pilot could answer it — the one box that
     took a place name filed it as demand and moved on. A search field is also the most
     familiar control on the internet, which is the answer to "I did not know where to
     begin". So the page now opens by offering something instead of asking for something,
     and the guide sits underneath it as the way in for anyone who has no name to type. */
  /* The control arm, kept deliberately. `?variant=email-first` still renders the page as
     it was — the optional address, the conditional consent row, the terms line — because
     "we took the email off the front door" is exactly the kind of claim a pilot should be
     able to show side by side rather than assert. It is the old page, unchanged, not a
     softened one. */
  const emailFirst = `<form data-form="start" novalidate>
        <div class="ula-intro">
          <span class="ula-intro__icon">${icon('sparkle',22)}</span>
          <div><div class="ula-intro__title">Not sure where to start?</div>
            <div class="ula-intro__sub">Four questions, then real places near you and the membership that fits.</div></div>
        </div>
        <div class="signup-row"><input type="email" name="email" id="landing-email" placeholder="Your email address &mdash; optional" aria-label="Your email address, optional" value="${esc(FIELDS.email||'')}">
          <button type="submit">Find my fit</button></div>
        ${ERRORS.email?`<p class="field-error" role="alert">${esc(ERRORS.email)}</p>`:''}
        <p class="savenote">Add it and we&rsquo;ll save your answers so you can come back to them.</p>
        <div class="consent-row consent-row--conditional" data-consent-row ${(FIELDS.email||'').trim()?'':'hidden'}><label class="checkbox"><input type="checkbox" name="marketing" id="marketing" ${S.marketing&&(FIELDS.email||'').trim()?'checked':''}><span></span></label>
        <p class="terms-line">By continuing, you agree to our <button class="linkish" data-go="terms">Terms</button> and <button class="linkish" data-go="privacy">Privacy Policy</button>.</p>
        <p class="landing__alt">Already know what you want? <button class="linkish strong" type="button" data-go="plans">View memberships ${icon('arrowRight',17)}</button></p></form>`;

  /* Clean, high-converting hero card + secondary actions */
  const guideFirst = `
    <div class="landing-hero-card">
      <div class="landing-hero-card__badge">${icon('sparkle',12)} <span>RECOMMENDED</span></div>
      <h2 class="landing-hero-card__title">Find the right membership for you</h2>
      <!-- Testers met the name Urby here first and did not know what it was. The name stays,
           because it is the guide's name everywhere else in the journey, but it now introduces
           itself in the same breath — one clause, on its first appearance, rather than an extra
           row on a card that already has five. -->
      <p class="landing-hero-card__value">Tell Urby, our membership guide, how and where you want to move. Get nearby studio picks, a custom routine, and the plan that fits.</p>
      <div class="landing-hero-card__meta">
        <span class="meta-item">${icon('question',15)} <span>4 quick questions</span></span>
        <span class="meta-dot">&middot;</span>
        <span class="meta-item">${icon('clock',15)} <span>~2 minutes</span></span>
        <span class="meta-dot">&middot;</span>
        <span class="meta-item">${icon('lock',14)} <span>No email needed</span></span>
      </div>
      <button class="btn btn--primary btn--block landing-hero-card__btn" type="button" data-start-fit>
        <span>Build my routine</span> ${icon('arrowRight',18)}
      </button>
    </div>

    <div class="landing-sub-actions landing__shortcuts">
      <button class="sub-action-btn shortcut" type="button" data-go="search">
        <div class="sub-action-btn__left">
          ${icon('search',17)}
          <span>Find a venue</span>
        </div>
        <span class="sub-action-btn__arrow">&rarr;</span>
      </button>

      <button class="sub-action-btn shortcut" type="button" data-go="plans">
        <div class="sub-action-btn__left">
          ${icon('grid',17)}
          <span>Compare memberships</span>
        </div>
        <span class="sub-action-btn__arrow">&rarr;</span>
      </button>
    </div>`;
  const primary = VARIANT === 'email-first' ? emailFirst : guideFirst;
  return `<main class="landing" id="main">
    <div class="landing__panel">
      <div class="landing__panelbar"><button class="wordmark linkish" style="text-decoration:none" data-go="landing">Urban Sports Club</button>
        <button class="login-link login-link--mobile linkish" data-go="login">Log in</button></div>
      <div class="landing__body">
        <h1 class="h-hero" tabindex="-1">Find your way<br>to move.</h1>
        <p class="lede">Build your fitness routine and find the membership that covers it.</p>
        ${S.returns?`<div class="notice" style="max-width:560px">${icon('checkThin',20)}<span>Welcome back. Your answers are saved — continue where you left off.</span></div>`:''}
        ${primary}
      </div></div>
    <div class="landing__media"><button class="login-link login-link--desktop linkish" data-go="login">Log in</button>
      <img src="${IMG[HERO_SHOT.src]}" width="800" height="900" fetchpriority="high" alt="${esc(HERO_SHOT.alt)}" decoding="async"></div>
  </main>
  <section class="ula-section"><div class="ula-section__inner">
    <div class="sr-only">What would you love to do more of?</div>
    <!-- The question used to be asked twice on this page: once here, under a heading and a
         lede, and once nowhere near the top. Now the panel asks it, so this section keeps
         only the thing the panel cannot do — take a question of your own. It carries its
         own heading and avatar, so it needs nothing above it. -->
    ${VARIANT === 'email-first' ? `<div class="ula-section__eyebrow">${ulaAvatar('sm')}<span>Urby · Membership guide</span></div>
    <h2 class="h-section">Start with one answer.</h2>
    <p class="ula-section__lede">Tell me what you want from movement and I&rsquo;ll find nearby places and a membership that fits. Pick one and we&rsquo;ll begin.</p>
    <div class="ula-demo"><div class="ula-demo__q">What would you love to do more of?</div>
      <div class="options">
        ${QUESTIONS[0].options.map(o=>`<button class="option-card" data-begin="${esc(o.id)}">
          <span class="option-card__icon">${icon(o.icon,20)}</span><span class="option-card__label">${o.label}</span>
          <span class="option-card__chev">${icon('chevron',17)}</span></button>`).join('')}
      </div>
      <p class="xsmall muted" style="margin-top:16px">Choosing one starts the conversation &mdash; you can change it later.</p>
    </div>` : ''}
    ${askBlock(false)}
  </div></section>
  <footer style="padding:40px 24px 60px;text-align:center" class="small muted">
    <!-- The Terms and Privacy links used to hang off "By continuing…" under the email
         field. Nothing on this page collects anything any more, so the sentence went and
         the links moved here, where they belong on a page that makes no request. -->
    Urban Sports Club pilot · real plans, terms and venues · <button class="linkish" data-go="terms">Terms</button> · <button class="linkish" data-go="privacy">Privacy</button> · <button class="linkish" data-go="data">journey data</button> · <button class="linkish" data-go="email">follow-up email preview</button>
  </footer>`;
}

/* Where this page is looking from. If they have told us, it is theirs; if they have not,
   it is the detected guess — and the guess is labelled as one, never presented as their
   answer (rules 26 and 53). */
