/* ---------------- shared chrome ---------------- */
const STEP_LABELS = { landing:'the landing page', fit:"Urby's questions", recommendation:'your recommendation', save:'saving your fit', details:'your details', payment:'the payment screen', converted:'a completed signup' };
/* Two progress indicators used to sit side by side at the same weight: "1 of 3" in the
   stepper and "Question 2 of 4" on its own bar underneath. Testers read them as two
   competing counters rather than as one inside the other. The four questions are the
   inside of step 1, so they are now drawn inside step 1 — a segment each, under the dot
   they belong to — and the question line below keeps the number but loses its bar. */
/* `stepper:false` is for the one screen that is not a step of the checkout. Saving your
   fit and leaving is a way *out*, not a way through, and drawing "1 of 3" above it told
   the visitor they were mid-purchase when they had just decided not to be. Rule 8: one
   decision per screen — and the decision here is only whether to be sent a link. */
function activePlanTitle() {
  const pId = S.chosenPlanId || (recommend(S.answers, matchVenues(S.answers)) || {}).planId || 'classic';
  const p = planById(pId);
  return p ? p.name : 'Classic';
}

function userAccountDropdown() {
  const name = userFirstName() || 'Member';
  const planName = activePlanTitle();
  const email = maskedEmail(S.email);

  return `<div class="user-menu-popover" id="user-menu-popover" role="menu" aria-label="Account menu">
    <div class="user-menu__header">
      <div class="user-menu__title">${esc(name)}'s plan</div>
      <div class="user-menu__badge">${icon('checkThin', 13)} <span>${esc(planName)} · Saved automatically</span></div>
      ${email ? `<div class="user-menu__email">${esc(email)}</div>` : ''}
    </div>
    <div class="user-menu__body">
      <button class="user-menu__action user-menu__action--highlight" type="button" data-user-menu-action="continue" role="menuitem">
        <span>Continue your plan</span>
        ${icon('arrowRight', 15)}
      </button>
      <button class="user-menu__action" type="button" data-user-menu-action="personal-details" role="menuitem">
        <div class="user-menu__action-icon">${icon('user', 16)}</div>
        <div class="user-menu__action-content">
          <div class="user-menu__action-title">Personal details</div>
          <div class="user-menu__action-sub">Edit your name and email</div>
        </div>
      </button>
      <button class="user-menu__action" type="button" data-user-menu-action="preferences" role="menuitem">
        <div class="user-menu__action-icon">${icon('sliders', 16)}</div>
        <div class="user-menu__action-content">
          <div class="user-menu__action-title">Edit your preferences</div>
          <div class="user-menu__action-sub">Recommendation &amp; filter settings</div>
        </div>
      </button>
      <button class="user-menu__action" type="button" data-user-menu-action="copy-link" role="menuitem">
        <div class="user-menu__action-icon">${icon('link', 16)}</div>
        <div class="user-menu__action-content">
          <div class="user-menu__action-title">Copy return link</div>
          <div class="user-menu__action-sub">${RESUME_COPIED_TOAST ? '<strong style="color:var(--c-forest,#107e4a)">✓ Copied link to clipboard!</strong>' : 'Resume on any phone or laptop'}</div>
        </div>
      </button>
      <div class="user-menu__divider"></div>
      <button class="user-menu__action user-menu__action--plain" type="button" data-user-menu-action="new-plan" role="menuitem">
        Start a new plan
      </button>
      <button class="user-menu__action user-menu__action--plain user-menu__action--danger" type="button" data-user-menu-action="forget-me" role="menuitem">
        Forget me on this device
      </button>
    </div>
  </div>`;
}

function userNavChip(modifier = '') {
  if (isLoggedIn()) {
    const fName = userFirstName() || 'Member';
    const wrapClass = modifier ? ` user-nav-chip-wrapper--${modifier}` : '';
    const chipClass = modifier ? ` user-nav-chip--${modifier}` : '';
    return `<div class="user-nav-chip-wrapper${wrapClass}">
      <button class="user-nav-chip${chipClass} ${USER_MENU_OPEN?'is-active':''}" type="button" data-toggle-user-menu aria-expanded="${USER_MENU_OPEN}" aria-haspopup="true">
        ${icon('user', 14)} <span>Hi, ${esc(fName)}</span>
      </button>
      ${USER_MENU_OPEN ? userAccountDropdown() : ''}
    </div>`;
  }
  return '';
}

function topbar(step, opts={}) {
  const { savedNote = Boolean(S.email && S.saveOptIn), saveExit = true, sub = null, stepper = true, back = null, checkout = false } = opts;
  const n = (savedNote && !isLoggedIn()) ? `<div class="saved-note" title="Saved to ${esc(S.email)} — your progress is safe.">${icon('checkThin',13)} <span>Saved &middot;</span> <span class="saved-note__mail">${esc(S.email)}</span></div>` : '';
  const userChip = userNavChip();
  const authLinks = `<div class="topbar__auth-links"><button class="topbar__auth-link" type="button" data-open-login>Log in</button>${saveExit?`<span class="topbar__auth-dot" aria-hidden="true">&middot;</span><button class="topbar__auth-link" type="button" data-go="save" data-open-exit>Save for later</button>`:''}</div>`;
  const rightAuth = userChip ? userChip : (back ? `<button class="link-plain linkish" data-go="${esc(back.route)}">${icon('back',17)} ${esc(back.label)}</button>` : authLinks);

  if (!stepper) {
    return `<header class="topbar">
      <div class="topbar__left"><button class="wordmark linkish" style="text-decoration:none" data-go="landing">Urban Sports Club</button>${n}</div>
      <div class="topbar__center"></div>
      <div class="topbar__right">${rightAuth}</div></header>`;
  }

  /* Dedicated question progress during fit discovery (Option 1: separate discovery from checkout) */
  if (sub && sub.total) {
    const qText = `Question ${sub.done+1} of ${sub.total}`;
    const qBars = Array.from({length:sub.total},(_,k)=>
      `<span class="qstep__bar ${k<sub.done?'is-done':k===sub.done?'is-now':''}"></span>`
    ).join('');
    const barPct = ((sub.done + 1) / sub.total) * 100;

    return `<header class="topbar">
      <div class="topbar__left"><button class="wordmark linkish" style="text-decoration:none" data-go="landing">Urban Sports Club</button>${n}</div>
      <div class="topbar__center">
        <div class="qstep" aria-label="${qText}">
          <span class="qstep__label">${qText}</span>
          <div class="qstep__bars" aria-hidden="true">${qBars}</div>
        </div>
      </div>
      <div class="topbar__right">${rightAuth}</div></header>
    <div class="mobile-progress">
      <div class="mobile-progress__label">${qText}</div>
      <div class="mobile-progress__track"><div class="mobile-progress__fill" style="width:${barPct}%"></div></div>
      ${savedNote && !isLoggedIn()?`<div class="saved-note saved-note--mobile">${icon('checkThin',16)} Saved — your progress is safe.</div>`:''}
    </div>`;
  }

  /* Checkout stepper: Details -> Payment */
  const steps = [{n:1,l:'Details'},{n:2,l:'Payment'}];
  const cur = checkout ? step : (step >= 2 ? step - 1 : 1);
  const dots = steps.map((s,i)=>{
    const state = s.n === cur ? 'is-current' : s.n < cur ? 'is-done' : '';
    return `${i?'<div class="stepper__line"></div>':''}<div class="stepper__step ${state}"><div class="stepper__dot">${s.n<cur?icon('checkThin',16):s.n}</div><div class="stepper__label">${s.l}</div></div>`;
  }).join('');

  const mobileText = `Step ${cur} of ${steps.length} &middot; ${steps[cur-1].l}`;
  const barPct = (cur / steps.length) * 100;

  return `<header class="topbar">
    <div class="topbar__left"><button class="wordmark linkish" style="text-decoration:none" data-go="landing">Urban Sports Club</button>${n}</div>
    <div class="topbar__center"><div class="stepper">${dots}</div></div>
    <div class="topbar__right">${rightAuth}</div></header>
  <div class="mobile-progress"><div class="mobile-progress__label">${mobileText}</div>
    <div class="mobile-progress__track"><div class="mobile-progress__fill" style="width:${barPct}%"></div></div>
    ${savedNote && !isLoggedIn()?`<div class="saved-note saved-note--mobile">${icon('checkThin',16)} Saved — your progress is safe.</div>`:''}</div>`;
}
const ulaRow = () => `<div class="ula-row">${ulaAvatar()}<div class="ula-name"><b>Urby</b> <span>· Membership guide</span></div></div>`;
const ulaNote = text => `<div class="ula-note">${ulaAvatar('sm')}<p>${text}</p></div>`;
/* The other half of the AI layer. Answering questions is the visible half; this
   is the half that pays for itself — what the visitor actually wanted, including
   the wants we could not serve, and what they were after at the moment they left.
   Every line is read back from something they did. Nothing here is guessed. */
function intentProfile() {
  const evs = n => S.events.filter(e => e.name === n);
  const L = id => answerLabel(id, S.answers[id]);
  const given = id => S.answers[id] && S.answers[id] !== SKIP;
  const wanted = [], said = [], gaps = [], signals = [];

  if (given('goal'))    wanted.push(`wants to ${lowerFirst(L('goal'))}`);
  if (given('activities')) wanted.push(`would actually do ${groupWords(S.answers.activities.filter(x=>x!==SKIP))}`);
  if (given('area'))    wanted.push(`looking around ${areaIds(S.answers.area).includes('anywhere') ? 'anywhere in Berlin' : 'Berlin-' + L('area')}`);
  if (given('frequency')) wanted.push(`expects to go ${lowerFirst(L('frequency'))}`);
  for (const id of ['goal','frequency']) if (S.answers[id] === SKIP) gaps.push(`Didn&rsquo;t know the answer to &ldquo;${esc(qById(id).prompt)}&rdquo;`);

  Object.entries(S.freeText || {}).forEach(([qid, text]) => { if (text) said.push(text); });

  const asks = evs('ula_asked');
  const missed = asks.filter(e => e.payload && ['none','unknown','venues-none'].includes(e.payload.matched));
  asks.filter(e => !missed.includes(e)).forEach(e => signals.push(`Asked Urby &ldquo;${esc(e.payload.question)}&rdquo;`));
  missed.forEach(e => gaps.push(`Asked &ldquo;${esc(e.payload.question)}&rdquo; &mdash; Urby had no approved answer`));
  evs('city_unavailable_requested').forEach(e => gaps.push(`Wanted <strong>${esc(e.payload.city)}</strong>, which this pilot cannot cover`));
  evs('venue_demand').forEach(e => gaps.push(`Asked us to add <strong>${esc(e.payload.place)}</strong> &mdash; a place they would use that we do not have`));

  const opened = evs('venue_opened').map(e => (VENUES.find(v => v.id === e.payload.venue) || {}).name).filter(Boolean);
  if (opened.length) signals.push(`Looked at ${opened.length} venue${opened.length === 1 ? '' : 's'}: ${esc([...new Set(opened)].join(', '))}`);
  if (S.planOverridden && S.chosenPlanId) signals.push(`Moved off Urby&rsquo;s recommendation to <strong>${esc(planById(S.chosenPlanId).name)}</strong>`);
  if (S.commitmentId !== 'monthly') signals.push(`Chose ${esc(commitmentById(S.commitmentId).label)} over paying monthly`);

  return { wanted, said, gaps, signals,
           sentence: wanted.length ? wanted.join(', ').replace(/^./, c => c.toUpperCase()) + '.' : null,
           stoppedAt: STEP_LABELS[S.lastStep] || S.lastStep };
}

function intentBlock() {
  const p = intentProfile();
  if (!p.sentence && !p.said.length && !p.gaps.length) return '';
  return `<div class="intent">
    <div class="intent__label">${icon('sparkle',16)} What I heard you&rsquo;re after</div>
    ${p.sentence ? `<p class="intent__line">${p.sentence}</p>` : ''}
    ${p.said.length ? `<p class="intent__quote">&ldquo;${esc(p.said[p.said.length-1])}&rdquo;</p>` : ''}
    ${p.gaps.length ? `<p class="intent__gap">${icon('info',15)} <span>${p.gaps[0]}.</span></p>` : ''}
  </div>`;
}

function savePanelHtml() {
  /* The full-page save route remains readable for old browser history, but the live
     journey reuses its one source of truth inside this modal. */
  const template = document.createElement('template');
  template.innerHTML = saveScreen();
  const panel = template.content.querySelector('.savepanel');
  if (!panel) return '';
  return panel.outerHTML;
}

function exitModal() {
  if (SAVE_MODAL_MODE === 'saved' && S.email && S.saveOptIn) {
    const savedWhat = fitComplete(S.answers) || S.planOverridden
      ? 'Your answers, venue matches and recommendation'
      : 'Your answers and where you stopped';
    return `<div class="overlay" id="exit-modal" hidden role="dialog" aria-modal="true" aria-labelledby="exit-title">
      <div class="modal modal--saved"><button class="modal__close" data-close-exit aria-label="Close">&times;</button>
        ${ulaAvatar()}<h2 id="exit-title">Saved. Come back any time.</h2>
        <p class="modal__sub">${savedWhat} are saved to <strong>${esc(S.email)}</strong>.</p>
        ${intentBlock()}
        <div class="notice notice--soft">${icon('checkFill',19)}<span>Your private return link is ready. No payment has been taken.</span></div>
        <div class="saved-actions"><button class="btn btn--primary" data-copy-resume>Copy my return link</button>
          <button class="btn btn--secondary" data-close-exit>Keep exploring</button></div>
      </div></div>`;
  }
  return `<div class="overlay" id="exit-modal" hidden role="dialog" aria-modal="true" aria-labelledby="save-modal-title">
    <div class="modal modal--save"><button class="modal__close" data-close-exit aria-label="Close save dialog">&times;</button>
      <span class="sr-only" id="save-modal-title">Save your progress</span>${savePanelHtml()}
    </div></div>`;
}
function openSaveModal(mode='form', source='manual') {
  clearTimeout(SAVE_IDLE_TIMER);
  if (mode === 'form' && S.email && S.saveOptIn) mode = 'saved';
  SAVE_MODAL_MODE = mode;
  /* Rebuild only the dialog so its recap always reflects the choices on the page now. */
  const old = document.getElementById('exit-modal');
  if (old) old.outerHTML = exitModal();
  const modal = document.getElementById('exit-modal');
  if (!modal) return;
  modal.hidden = false; document.body.style.overflow = 'hidden'; document.body.classList.add('save-modal-open');
  log('save_modal_opened', { source, atStep:S.lastStep });
  (modal.querySelector('input,button') || modal).focus();
}
function closeSaveModal(reason='closed') {
  const modal = document.getElementById('exit-modal');
  if (modal) modal.hidden = true;
  document.body.style.overflow = ''; document.body.classList.remove('save-modal-open');
  log('save_modal_closed', { reason, atStep:S.lastStep });
  armSaveInactivity();
}
function loginModal() {
  const err = LOGIN_ERROR ? `<div class="notice notice--error" role="alert" style="margin-bottom:16px">${icon('info',16)} <span>${esc(LOGIN_ERROR)}</span></div>` : '';
  const notFoundActions = LOGIN_ERROR && LOGIN_ERROR.includes('No saved journey') ? `
    <div style="margin-top:12px;text-align:center">
      <button class="btn btn--secondary btn--block" type="button" data-close-login data-go="fit">Start fresh fit quiz</button>
    </div>` : '';

  return `<div class="overlay" id="login-modal" ${LOGIN_MODAL_OPEN?'':'hidden'} role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
    <div class="modal modal--login">
      <button class="modal__close" data-close-login aria-label="Close login dialog">&times;</button>
      <div class="login-modal__head">
        <div style="display:flex;align-items:center;gap:10px;margin:2px 0 6px">
          ${ulaAvatar('xs')}
          <h2 id="login-modal-title" style="margin:0;font-size:21px;font-weight:800;letter-spacing:-0.02em">Sign in or resume</h2>
        </div>
        <p class="small muted" style="margin:0 0 16px">Enter your details to save unlimited places and access your plan.</p>
      </div>
      ${err}
      <form data-form="login" novalidate class="login-form">
        <div class="field" style="margin-bottom:14px">
          <label class="field__label" for="login-email">Your email address</label>
          <input id="login-email" class="field__input" type="email" name="email" placeholder="you@example.com" value="${esc(FIELDS.loginEmail||S.email||'')}" autocomplete="email" required autofocus>
        </div>
        <button class="btn btn--primary btn--block" type="submit">Continue to my plan</button>
        <div class="orline" style="margin:16px 0"><span>or continue with</span></div>
        <div class="sso-row" style="max-width:none;margin-bottom:12px">
          <button class="sso-btn" type="submit" name="provider" value="google" aria-label="Continue with Google">${GOOGLE} <span>Google</span></button>
          <button class="sso-btn" type="submit" name="provider" value="apple" aria-label="Continue with Apple">${APPLE} <span>Apple</span></button>
        </div>
        ${notFoundActions}
      </form>
    </div>
  </div>`;
}
function openLoginModal(error=null) {
  USER_MENU_OPEN = false;
  LOGIN_MODAL_OPEN = true;
  LOGIN_ERROR = error;
  const old = document.getElementById('login-modal');
  if (old) old.outerHTML = loginModal();
  const modal = document.getElementById('login-modal');
  if (!modal) return;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  document.body.classList.add('login-modal-open');
  const input = modal.querySelector('input');
  if (input) input.focus();
}
function closeLoginModal() {
  LOGIN_MODAL_OPEN = false;
  LOGIN_ERROR = null;
  const modal = document.getElementById('login-modal');
  if (modal) modal.hidden = true;
  document.body.style.overflow = '';
  document.body.classList.remove('login-modal-open');
}

function personalDetailsModal() {
  const fName = S.firstName || (S.details && S.details.firstName) || '';
  const lName = S.lastName || (S.details && S.details.lastName) || '';
  const email = S.email || '';

  return `<div class="overlay" id="personal-details-modal" ${PERSONAL_DETAILS_MODAL_OPEN?'':'hidden'} role="dialog" aria-modal="true" aria-labelledby="personal-details-title">
    <div class="modal modal--personal-details">
      <button class="modal__close" data-close-personal-details aria-label="Close dialog">&times;</button>
      <div class="modal__head" style="margin-bottom:18px">
        <h2 id="personal-details-title" style="margin:0 0 6px;font-size:20px;font-weight:800;letter-spacing:-0.02em">Personal details</h2>
        <p class="small muted" style="margin:0">Choose how we should address you and where to send your private return link.</p>
      </div>
      <form data-form="personal-details" novalidate>
        <div class="field" style="margin-bottom:16px">
          <label class="field__label" for="pd-first-name">First name</label>
          <input id="pd-first-name" class="field__input" type="text" name="firstName" placeholder="e.g. Karim" value="${esc(fName)}" required>
          <span class="field__hint" style="display:block;margin-top:5px;font-size:12px;color:var(--c-stone,#6b7280)">This is what we'll show in your greeting.</span>
        </div>
        <div class="field" style="margin-bottom:16px">
          <label class="field__label" for="pd-last-name">Last name <span class="muted" style="font-weight:normal">(optional)</span></label>
          <input id="pd-last-name" class="field__input" type="text" name="lastName" placeholder="e.g. Eldidi" value="${esc(lName)}">
        </div>
        <div class="field" style="margin-bottom:20px">
          <label class="field__label" for="pd-email">Email address</label>
          <input id="pd-email" class="field__input" type="email" name="email" placeholder="you@example.com" value="${esc(email)}" required>
          <span class="field__hint" style="display:block;margin-top:5px;font-size:12px;color:var(--c-stone,#6b7280)">Changing this updates where your return link is sent.</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-top:24px">
          <button class="btn btn--primary" type="submit">Save changes</button>
          <button class="btn btn--linkish" type="button" data-close-personal-details>Cancel</button>
        </div>
      </form>
    </div>
  </div>`;
}

function openPersonalDetailsModal() {
  USER_MENU_OPEN = false;
  PERSONAL_DETAILS_MODAL_OPEN = true;
  const old = document.getElementById('personal-details-modal');
  if (old) old.outerHTML = personalDetailsModal();
  const modal = document.getElementById('personal-details-modal');
  if (!modal) return;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  const input = modal.querySelector('input');
  if (input) input.focus();
}

function closePersonalDetailsModal() {
  PERSONAL_DETAILS_MODAL_OPEN = false;
  const modal = document.getElementById('personal-details-modal');
  if (modal) modal.hidden = true;
  document.body.style.overflow = '';
}

function recommendationPreferencesModal() {
  const prefs = S.preferences || { minRating: null, strictlyNearMe: false, sportFocus: [] };
  const currentRating = prefs.minRating ? String(prefs.minRating) : 'any';
  const strictlyNearMe = Boolean(prefs.strictlyNearMe);
  const sportFocus = Array.isArray(prefs.sportFocus) ? prefs.sportFocus : [];

  const mainSports = [
    { id: 'gym', label: 'Gym & Fitness' },
    { id: 'bouldering', label: 'Bouldering' },
    { id: 'yoga', label: 'Yoga' },
    { id: 'swimming', label: 'Swimming' },
    { id: 'pilates', label: 'Pilates' },
    { id: 'crossfit', label: 'CrossFit' },
    { id: 'sauna', label: 'Sauna & Spa' },
    { id: 'dance', label: 'Dance' },
    { id: 'martial_arts', label: 'Martial Arts' },
    { id: 'padel', label: 'Padel / Tennis' }
  ];

  return `<div class="overlay" id="preferences-modal" ${PREFERENCES_MODAL_OPEN?'':'hidden'} role="dialog" aria-modal="true" aria-labelledby="preferences-title">
    <div class="modal modal--preferences">
      <button class="modal__close" data-close-preferences aria-label="Close preferences dialog">&times;</button>
      <div class="modal__head" style="margin-bottom:18px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          ${icon('sliders', 18)}
          <h2 id="preferences-title" style="margin:0;font-size:20px;font-weight:800;letter-spacing:-0.02em">Recommendation settings</h2>
        </div>
        <p class="small muted" style="margin:0">Fine-tune how Urby selects places and creates your routine.</p>
      </div>
      <form data-form="recommendation-preferences" novalidate>
        <div class="pref-group" style="margin-bottom:20px">
          <label class="field__label" style="margin-bottom:8px;display:block">Minimum studio rating</label>
          <div class="segmented-chips">
            <label class="seg-chip ${currentRating==='any'?'is-selected':''}">
              <input type="radio" name="minRating" value="any" ${currentRating==='any'?'checked':''}>
              <span>Any rating</span>
            </label>
            <label class="seg-chip ${currentRating==='4.0'?'is-selected':''}">
              <input type="radio" name="minRating" value="4.0" ${currentRating==='4.0'?'checked':''}>
              <span>★ 4.0 and above</span>
            </label>
            <label class="seg-chip ${currentRating==='4.5'?'is-selected':''}">
              <input type="radio" name="minRating" value="4.5" ${currentRating==='4.5'?'checked':''}>
              <span>★ 4.5 only</span>
            </label>
          </div>
          <span class="field__hint" style="display:block;margin-top:5px;font-size:12px;color:var(--c-stone,#6b7280)">Prioritize studios highly rated by members in Berlin.</span>
        </div>

        <div class="pref-group" style="margin-bottom:20px">
          <label class="pref-switch">
            <input type="checkbox" name="strictlyNearMe" value="yes" ${strictlyNearMe?'checked':''}>
            <span class="pref-switch__slider"></span>
            <div class="pref-switch__content">
              <strong>Strictly in my selected area</strong>
              <div class="small muted">Only recommend venues within 3 km of your neighbourhood, disabling automatic wide-radius search.</div>
            </div>
          </label>
        </div>

        <div class="pref-group" style="margin-bottom:24px">
          <label class="field__label" style="margin-bottom:8px;display:block">Specialized sport focus</label>
          <div class="pref-sports-grid">
            ${mainSports.map(s => `
              <label class="pref-sport-chip ${sportFocus.includes(s.id)?'is-selected':''}">
                <input type="checkbox" name="sportFocus" value="${s.id}" ${sportFocus.includes(s.id)?'checked':''}>
                <span>${s.label}</span>
              </label>
            `).join('')}
          </div>
          <span class="field__hint" style="display:block;margin-top:6px;font-size:12px;color:var(--c-stone,#6b7280)">Urby will give special priority to these activities when creating your plan.</span>
        </div>

        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn btn--primary" type="submit">Save preferences</button>
          <button class="btn btn--linkish" type="button" data-close-preferences>Cancel</button>
        </div>
      </form>
    </div>
  </div>`;
}

function openPreferencesModal() {
  USER_MENU_OPEN = false;
  PREFERENCES_MODAL_OPEN = true;
  const old = document.getElementById('preferences-modal');
  if (old) old.outerHTML = recommendationPreferencesModal();
  const modal = document.getElementById('preferences-modal');
  if (!modal) return;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closePreferencesModal() {
  PREFERENCES_MODAL_OPEN = false;
  const modal = document.getElementById('preferences-modal');
  if (modal) modal.hidden = true;
  document.body.style.overflow = '';
}

function favoriteLimitModal() {
  return `<div class="overlay" id="favorite-limit-modal" ${FAVORITE_LIMIT_MODAL_OPEN?'':'hidden'} role="dialog" aria-modal="true" aria-labelledby="fav-limit-title">
    <div class="modal modal--fav-limit">
      <button class="modal__close" data-close-favorite-limit aria-label="Close dialog">&times;</button>
      <div style="text-align:center;padding:12px 6px 16px">
        <div style="display:inline-flex;margin-bottom:12px">${ulaAvatar('lg')}</div>
        <h2 id="fav-limit-title" style="margin:0 0 8px;font-size:21px;font-weight:800;letter-spacing:-0.02em">Save unlimited places</h2>
        <p class="muted" style="margin:0 auto 20px;max-width:360px;line-height:1.45;font-size:14px">You've reached the 10-studio limit for guests. Sign in or save your email to keep saving unlimited favorite places and sync across devices.</p>
        <div style="display:flex;flex-direction:column;gap:10px;max-width:300px;margin:0 auto">
          <button class="btn btn--primary btn--block" type="button" data-open-login>Sign in or save progress</button>
          <button class="btn btn--secondary btn--block" type="button" data-close-favorite-limit>Keep my 10 places</button>
        </div>
      </div>
    </div>
  </div>`;
}

function openFavoriteLimitModal() {
  FAVORITE_LIMIT_MODAL_OPEN = true;
  const old = document.getElementById('favorite-limit-modal');
  if (old) old.outerHTML = favoriteLimitModal();
  const modal = document.getElementById('favorite-limit-modal');
  if (!modal) return;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeFavoriteLimitModal() {
  FAVORITE_LIMIT_MODAL_OPEN = false;
  const modal = document.getElementById('favorite-limit-modal');
  if (modal) modal.hidden = true;
  document.body.style.overflow = '';
}

function globalModals() {
  return `${exitModal()}${loginModal()}${personalDetailsModal()}${recommendationPreferencesModal()}${favoriteLimitModal()}`;
}
function armSaveInactivity() {
  clearTimeout(SAVE_IDLE_TIMER);
  if (S.saveOptIn || !hasSaveableProgress()) return;
  SAVE_IDLE_TIMER = setTimeout(() => {
    const modal = document.getElementById('exit-modal');
    if (!modal || !modal.hidden || document.hidden) return;
    openSaveModal('form','15_minute_inactivity');
  }, SAVE_IDLE_MS);
}
['pointerdown','keydown','input','scroll'].forEach(type => document.addEventListener(type, () => {
  const modal = document.getElementById('exit-modal');
  if (!modal || modal.hidden) armSaveInactivity();
}, { passive:true }));
function activityIcon(acts=[]) {
  const has=(...l)=>acts.some(a=>l.includes(a));
  if (has('yoga','pilates','meditation','barre')) return 'leaf';
  if (has('spa','sauna')) return 'spa';
  if (has('swimming','aqua_fitness')) return 'waves';
  if (has('tennis','padel')) return 'racket';
  if (has('running','outdoor')) return 'shoe';
  if (has('bouldering','climbing')) return 'mountain';
  if (has('boxing','martial_arts')) return 'glove';
  if (has('dance')) return 'music';
  if (has('gym','strength','crossfit','cardio','hiit')) return 'dumbbell';
  return 'grid';
}
/* Testers could not tell whether a card was a place they could go to or a class they could
   book there. The dataset only describes places — an address, opening hours, per-plan visit
   limits — and it already carries the word for it: `tierLabel` reads "Plus venue". So the
   card uses the published string, which is how the venue sheet has always introduced a place
   ("Plus venue · 1.2 km from Mitte"). Nothing is derived and nothing is invented: an
   activity word like "yoga" is what read as a class, and there is no timetable here to make
   a class out of. */
const venueKindLabel = v => v.tierLabel || 'Venue';
/* The tile is drawn first and the photograph sits on top of it. If the photo
   cannot load — offline, or the media bucket is unreachable — the <img> removes
   itself and the branded tile is simply what you see. No broken-image icons. */
const venueMedia = (v, acts) => {
  /* Three layers, each removing itself if it cannot load: the venue's real
     photograph from Urban Sports Club's media bucket on top, an inlined photo
     from the supplied designs beneath it for the few venues that have one, and
     a branded tile at the bottom. Offline you get a photo or a tile — never a
     broken-image icon.
     `acts` overrides which activity the fallback tile draws: a search for swimming
     should not show a leaf just because the pool also runs yoga. */
  const offline = v.image && IMG[v.image];
  return `<span class="venue-card__glyph">${icon(activityIcon(acts||v.activities),34)}</span>`
    + (offline ? `<img src="${offline}" alt="${esc(v.name)}" decoding="async">` : '')
    + (v.photo ? `<img src="${esc(v.photo)}" alt="${esc(v.name)}" loading="lazy" decoding="async" onerror="this.remove()">` : '');
};
const venueCard = (v, tappable=true) => {
  const plan = currentPlan();
  const inPlan = includedIn(v, plan.id);
  const needs = inPlan ? null : firstPlanWithAccess(v);
  const tier = v.tier ? (v.tier === 'premium' ? 'Premium' : v.tier === 'plus' ? 'Plus' : 'Standard') : '';
  const tierBadge = tier ? `<span class="tier-tag tier-tag--${v.tier}">${tier}</span>` : '';
  const areaLabel = v.nearestArea ? v.nearestArea.name : (AREAS.find(a=>a.id===v.area)||{}).name || '';
  /* This card already carries the tier as a badge, so the meta says only what the card is —
     the published "Plus venue" wording would be the tier twice on one card (rule 33). */
  const kindLabel = tierBadge ? 'Venue' : venueKindLabel(v);
  const distLabel = areaLabel ? `${v.distanceKm} km from ${esc(areaLabel)}` : `${v.distanceKm} km away`;
  return `<div class="venue-card ${inPlan?'':'is-locked'}" draggable="true" data-drag-venue="${esc(v.id)}" data-drag-name="${esc(v.name)}" title="Drag onto your week or click to add">
  <button class="venue-card__media-btn" data-venue="${esc(v.id)}" aria-label="More about ${esc(v.name)}">
    <div class="venue-card__media">${venueMedia(v)}${inPlan?'':`<span class="venue-card__lock">${icon('lock',13)} ${needs?esc(needs.name):'not included'}</span>`}</div>
  </button>
  <div class="venue-card__body">
    <div class="venue-card__headrow">
      <button class="venue-card__name" data-venue="${esc(v.id)}">${esc(v.name)}</button>
      ${tierBadge}
    </div>
    <div class="venue-card__meta">${esc(kindLabel)} &middot; ${distLabel}</div>
    <div class="venue-card__foot">
      <button class="btn-pill btn-pill--sm" data-open-add-venue="${esc(v.id)}">${icon('plus',11)} <span>Add</span></button>
      <button class="linkish venue-card__more" data-venue="${esc(v.id)}">Details</button>
    </div>
  </div></div>`;
};

/* venue sheet — opens over the page so exploring never costs you your place */
/* "We think you're in Berlin — change it if we're wrong."
   An assumption a visitor can see and correct beats a silent one. */
function cityChip() {
  const picker = CITYPICK ? `<div class="citypick">
      <div class="citypick__label">Which city are you in?</div>
      <div class="citypick__grid">${CITIES.map(c=>`<button class="chip-sm ${c==='Berlin'?'is-current':''}" data-city="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      ${CITYWANTED?`<p class="citypick__note">${icon('info',17)} <span>This pilot only has venue data loaded for <b>Berlin</b>, so I&rsquo;ll keep searching there.
        I&rsquo;ve noted that you wanted <b>${esc(CITYWANTED)}</b> &mdash; that shows up in the <button class="linkish" data-go="data">journey data</button>.
        In production this list comes from the live venue database.</span></p>`
        :`<p class="citypick__note">${icon('info',17)} <span>Only Berlin has venues loaded in this pilot. Pick any city and I&rsquo;ll tell you honestly what I can show.</span></p>`}
    </div>` : '';
  return `<div class="geoblock">
    <div class="geochip-row">
      <div class="geochip">${icon('pin',15)}<span class="geochip__text"><span class="geochip__full">Looks like you&rsquo;re in </span><b>Berlin</b></span>
        <button class="geochip__change" data-change-city aria-expanded="${CITYPICK}">${CITYPICK?'Close':'Change'}</button></div>
    </div>
    <p class="qhint" style="margin:8px 0 12px">Pick up to 3 neighbourhoods (home, work, or routine).</p>
    ${picker}</div>`;
}

function urbyMascotAvatar(size = 'md') {
  const w = size === 'sm' ? 40 : size === 'lg' ? 80 : 58;
  const h = size === 'sm' ? 40 : size === 'lg' ? 80 : 58;
  return `<div class="urby-mascot urby-mascot--animated" style="width:${w}px;height:${h}px;flex:0 0 ${w}px;" aria-label="Urby, membership guide" role="img">
    <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Background Circle -->
      <circle cx="50" cy="50" r="48" fill="#FEF3C7" stroke="#FDE68A" stroke-width="2" />
      
      <!-- Mascot Container with gentle floating motion -->
      <g class="urby-float-group">
        <!-- Shadow -->
        <ellipse cx="50" cy="88" rx="22" ry="4" fill="rgba(0,0,0,0.06)" />

        <!-- Top flame / tuft -->
        <path class="urby-tuft" d="M50 18 C46 10, 52 6, 56 8 C58 10, 57 15, 50 18 Z" fill="#F59E0B" />

        <!-- Character Body (Cute rounded bean shape) -->
        <path class="urby-body" d="M30 40 C30 22, 70 22, 70 40 C70 54, 76 74, 72 84 C70 88, 30 88, 28 84 C24 74, 30 54, 30 40 Z" fill="#FCD34D" stroke="#D97706" stroke-width="2" />

        <!-- Headband (Black with URBY lettering) -->
        <path d="M28 35 C28 33, 72 33, 72 35 L73 45 C73 47, 27 47, 27 45 Z" fill="#18181B" />
        <text x="50" y="42.5" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="7.5" font-weight="900" letter-spacing="1" text-anchor="middle">URBY</text>

        <!-- Eyes Group (with blink animation) -->
        <g class="urby-eyes">
          <ellipse cx="43" cy="53" rx="2.8" ry="3.8" fill="#18181B" />
          <circle cx="44.2" cy="51.8" r="1.1" fill="#FFFFFF" />
          <ellipse cx="57" cy="53" rx="2.8" ry="3.8" fill="#18181B" />
          <circle cx="58.2" cy="51.8" r="1.1" fill="#FFFFFF" />
        </g>

        <!-- Rosy Cheeks -->
        <ellipse cx="36" cy="57" rx="3" ry="1.8" fill="#FCA5A5" opacity="0.85" />
        <ellipse cx="64" cy="57" rx="3" ry="1.8" fill="#FCA5A5" opacity="0.85" />

        <!-- Happy Smile -->
        <path d="M47 58 Q50 62 53 58" fill="none" stroke="#18181B" stroke-width="1.8" stroke-linecap="round" />
      </g>
    </svg>
  </div>`;
}

function howToEditModal() {
  if (!HOW_TO_EDIT_OPEN) return '';
  return `<div class="sheet-backdrop" data-close-how-to-edit></div>
  <div class="modal modal--how-to-edit" role="dialog" aria-modal="true" aria-labelledby="how-to-edit-title">
    <button class="modal__close" type="button" data-close-how-to-edit aria-label="Close guide">&times;</button>
    <div class="how-to-edit-head">
      <div class="how-to-edit-avatar">${urbyMascotAvatar('md')}</div>
      <div>
        <div class="sheet__guide" style="font-size:12px;font-weight:700;color:var(--navy-soft);margin-bottom:2px">Urby &middot; Membership guide</div>
        <h2 id="how-to-edit-title" style="margin:0;font-size:20px;font-weight:800;letter-spacing:-0.02em">How your starting routine works</h2>
      </div>
    </div>
    <div class="how-to-edit-body" style="margin-top:16px">
      <div class="how-to-edit-step">
        <div class="how-to-edit-step__num">1</div>
        <div class="how-to-edit-step__text">
          <strong>Change any suggested session</strong>
          <p>Tap &ldquo;Change&rdquo; on any day to swap it for another partner studio near you that fits what you want to do.</p>
        </div>
      </div>
      <div class="how-to-edit-step">
        <div class="how-to-edit-step__num">2</div>
        <div class="how-to-edit-step__text">
          <strong>Add more sessions &amp; sports</strong>
          <p>Tap &ldquo;Add another session&rdquo; or switch to &ldquo;Activities &amp; studios&rdquo; to browse all places across Berlin.</p>
        </div>
      </div>
      <div class="how-to-edit-step">
        <div class="how-to-edit-step__num">3</div>
        <div class="how-to-edit-step__text">
          <strong>Your membership adjusts dynamically</strong>
          <p>As you add or swap places, the recommended plan updates so your routine is always covered at the best price.</p>
        </div>
      </div>
    </div>
    <div style="margin-top:20px">
      <button class="btn btn--primary btn--block" type="button" data-close-how-to-edit>Got it</button>
    </div>
  </div>`;
}

function swapSessionModal(day, plan, pool) {
  if (!SESSION_SWAP_OPEN || !SESSION_SWAP_DAY) return '';
  const dayName = SESSION_SWAP_DAY;
  const venues = (pool || VENUES).slice(0, 8);
  return `<div class="sheet-backdrop" data-close-session-swap></div>
  <div class="modal modal--swap-session" role="dialog" aria-modal="true" aria-labelledby="swap-session-title">
    <div class="sheet__handle-bar" data-close-session-swap><div class="sheet__handle"></div></div>
    <div class="swap-session-head">
      <div>
        <span class="routine-day-pill" style="margin-bottom:4px">${esc(dayName)}</span>
        <h2 id="swap-session-title" style="margin:4px 0 0;font-size:19px;font-weight:800">Change ${esc(dayName)} session</h2>
      </div>
      <button class="modal__close" type="button" data-close-session-swap aria-label="Close studio selector">&times;</button>
    </div>
    <p class="small muted" style="margin:4px 0 14px">Pick an alternative studio near you for ${esc(dayName)}:</p>
    <div class="swap-session-list">
      ${venues.map(v => {
        const inPlan = includedIn(v, plan.id);
        const grp = ACTIVITY_GROUPS.find(g => venueInGroup(v, g)) || ACTIVITY_GROUPS[0];
        const dist = typeof v.distanceKm === 'number' ? `${v.distanceKm} km away` : 'nearby';
        const tierBadge = v.tier === 'plus' ? 'Plus included' : v.tier === 'premium' ? 'Premium' : 'Included';
        return `<div class="swap-session-item">
          <div class="swap-session-thumb">${venueMedia(v)}</div>
          <div class="swap-session-info">
            <div class="swap-session-cat">${esc(grp.label)}</div>
            <strong class="swap-session-name">${esc(v.name)}</strong>
            <div class="swap-session-meta">
              <span class="routine-item__badge ${inPlan ? (v.tier === 'plus' ? 'routine-item__badge--plus' : 'routine-item__badge--included') : 'routine-item__badge--upgrade'}">
                ${icon('checkThin', 11)} ${tierBadge}
              </span>
              <span>&middot; ${dist}</span>
            </div>
          </div>
          <button class="btn btn--secondary btn--sm swap-session-btn" type="button" data-swap-day-venue="${esc(v.id)}" data-day="${esc(dayName)}">
            Select
          </button>
        </div>`;
      }).join('')}
    </div>
    <div class="swap-session-foot" style="margin-top:14px;text-align:center">
      <button class="linkish strong" type="button" data-set-reco-view="pillars" data-close-session-swap>Browse all activities &amp; studios &rarr;</button>
    </div>
  </div>`;
}

function venueTimetable(v) {
  const acts = v.activities || [];
  const has = (...types) => types.some(t => acts.some(a => a.toLowerCase().includes(t)));

  let slots = [];
  if (has('bouldering', 'climbing')) {
    slots = [
      { time: '17:30', icon: 'mountain', name: 'Open Bouldering & Technique' },
      { time: '19:00', icon: 'mountain', name: 'Route Coaching Workshop' }
    ];
  } else if (has('yoga', 'pilates', 'barre')) {
    slots = [
      { time: '08:00', icon: 'leaf', name: 'Morning Vinyasa Flow' },
      { time: '18:15', icon: 'leaf', name: 'Dynamic Pilates & Core' }
    ];
  } else if (has('swimming', 'sauna', 'spa', 'wellness')) {
    slots = [
      { time: '08:30', icon: 'waves', name: 'Open Lane Swim' },
      { time: '18:00', icon: 'spa', name: 'Hydro-Mobility & Recovery' }
    ];
  } else if (has('dance')) {
    slots = [
      { time: '18:00', icon: 'music', name: 'Contemporary Dance Flow' },
      { time: '19:30', icon: 'music', name: 'Urban Choreography' }
    ];
  } else if (has('martial arts', 'boxing', 'combat')) {
    slots = [
      { time: '18:00', icon: 'glove', name: 'Boxing Fundamentals' },
      { time: '19:15', icon: 'glove', name: 'Conditioning & Padwork' }
    ];
  } else if (has('racket', 'tennis', 'padel', 'badminton', 'squash')) {
    slots = [
      { time: '17:30', icon: 'racket', name: 'Open Match Play' },
      { time: '19:00', icon: 'racket', name: 'Technique Drills' }
    ];
  } else {
    slots = [
      { time: '18:00', icon: 'shoe', name: 'Outdoor Bootcamp' },
      { time: '19:15', icon: 'dumbbell', name: 'Functional Training & HYROX' }
    ];
  }

  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayName = dayNames[now.getDay()] || 'Tue';
  const monthName = monthNames[now.getMonth()] || 'Aug';
  const dayNum = now.getDate() || 25;
  const dateStr = `${dayName} ${dayNum} ${monthName}`;

  return { dateStr, slots };
}

function venueSheet() {
  if (!SHEET) return '';
  const v = VENUES.find(x => x.id === SHEET); if (!v) return '';
  const match = matchVenues(A());
  const found = (match.venues || []).find(x => x.id === v.id);
  const km = found ? found.distanceKm : Math.min(...((match.areas) || [match.anywhere ? ANYWHERE : match.area]).map(a => distanceKm(a, v)));
  const areaLabel = (found && found.nearestArea && found.nearestArea.name) || (v.nearestArea ? v.nearestArea.name : (AREAS.find(a => a.id === v.area) || {}).name || (match.area && match.area.name) || 'Mitte');
  const plan = currentPlan();
  const isStarred = Boolean(S.starredVenues && S.starredVenues[v.id]);

  /* If opened via "Add to week", show a focused, lightweight Quick-Add bottom sheet */
  if (WEEK_ADD_MODE) {
    const distLabel = areaLabel ? `${km} km from ${esc(areaLabel)}` : `${km} km away`;
    return `<div class="sheet sheet--quickadd" id="venue-sheet" role="dialog" aria-modal="true" aria-labelledby="quickadd-title">
      <div class="sheet__panel sheet__panel--quickadd">
        <div class="sheet__handle" aria-hidden="true"></div>
        <button class="sheet__close" data-close-sheet aria-label="Close">&times;</button>

        <div class="quickadd-card">
          <div class="quickadd-head">
            <div class="quickadd-thumb">${venueMedia(v)}</div>
            <div class="quickadd-info">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                <h2 id="quickadd-title" class="quickadd-title">${esc(v.name)}</h2>
                <button class="activity-card__star-btn ${isStarred ? 'is-active' : ''}" type="button" data-toggle-star="${esc(v.id)}" aria-label="${isStarred ? 'Remove from week' : 'Star for week'}" title="${isStarred ? 'Starred for week' : 'Star for week'}" style="position:static;box-shadow:none;flex:0 0 auto">
                  ${icon(isStarred ? 'starFill' : 'star', 16)}
                </button>
              </div>
              <p class="quickadd-sub">${esc(v.tierLabel||'Venue')} &middot; ${distLabel}</p>
            </div>
          </div>

          <div class="quickadd-body">
            <div class="quickadd-label">Choose a day for your routine</div>
            <div class="quickadd-days" role="group" aria-label="Select day">
              ${DAY_ORDER.map(day => {
                const isSelected = WEEK_ADD_DAY === day;
                return `<button class="daybtn ${isSelected ? 'is-on' : ''}" type="button" data-add-day="${esc(day)}" aria-pressed="${isSelected}">${DAY_SHORT[day]}</button>`;
              }).join('')}
            </div>
          </div>

          <div class="quickadd-actions">
            <button class="btn btn--primary btn--block quickadd-btn" type="button" data-add-venue="${esc(v.id)}">
              Add to ${esc(WEEK_ADD_DAY || 'my week')}
            </button>
            <button class="linkish quickadd-details-btn" type="button" data-venue="${esc(v.id)}">
              View full studio details &amp; timetable &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* Full venue details profile */
  const included = plan.venueTiers.includes(v.tier);
  const firstPlan = PLANS.find(p => p.venueTiers.includes(v.tier));
  const yours = v.access ? v.access[plan.id] : null;
  const firstAccess = v.access ? PLANS.find(pl => v.access[pl.id] && !/^not included/i.test(v.access[pl.id])) : firstPlan;

  // Tier info & badges
  const tier = v.tier || 'standard';
  const tierBadgeText = tier === 'premium' ? '👑 Premium' : tier === 'plus' ? '✓ Plus access' : `✓ ${plan.name} included`;
  const tierBadgeClass = tier === 'premium' ? 'venue-hero-badge--premium' : tier === 'plus' ? 'venue-hero-badge--plus' : 'venue-hero-badge--standard';

  const actNames = v.activities.map(a => ACTIVITY_LABELS[a] || (a.charAt(0).toUpperCase() + a.slice(1))).slice(0, 3).join(' · ');
  const primaryActIcon = activityIcon(v.activities);

  const timetable = venueTimetable(v);
  const visitsText = yours && !/^not included/i.test(yours)
    ? yours
    : (v.tier === 'plus' ? 'Up to 8 visits per month' : v.tier === 'premium' ? 'Up to 4 visits per month' : '1 visit per day');

  return `<div class="sheet sheet--venue-profile" id="venue-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
    <div class="sheet__panel sheet__panel--venue-profile">
      <!-- Desktop & Mobile Modal Header -->
      <header class="venue-profile-header">
        <div class="venue-profile-header__left">
          <span class="venue-profile-header__logo">${icon('target', 20)} <b>Urban Sports Club</b></span>
        </div>
        <div class="venue-profile-header__center">
          <span class="venue-profile-header__mobile-title">Venue details</span>
        </div>
        <div class="venue-profile-header__right">
          <button class="venue-profile-header__back linkish" type="button" data-close-sheet aria-label="Back to places">
            ${icon('back', 16)} <span>Back to places</span>
          </button>
          <button class="activity-card__star-btn venue-profile-header__mobile-star ${isStarred ? 'is-active' : ''}" type="button" data-toggle-star="${esc(v.id)}" aria-label="${isStarred ? 'Remove from routine' : 'Add to routine'}" title="${isStarred ? 'In your routine' : 'Add to routine'}">
            ${icon(isStarred ? 'starFill' : 'star', 18)}
          </button>
          <button class="venue-profile-header__close" type="button" data-close-sheet aria-label="Close venue details">${icon('close', 16)}</button>
        </div>
      </header>

      <!-- 2-Column Grid Body -->
      <div class="venue-profile-grid">
        <!-- LEFT COLUMN: Hero Photo with Badges & Next Classes Card -->
        <div class="venue-profile-left">
          <div class="venue-hero-media">
            ${venueMedia(v)}
            <!-- Overlay Badges -->
            <div class="venue-hero-badges-top">
              <span class="venue-hero-badge venue-hero-badge--dist">${km} km away</span>
              <span class="venue-hero-badge ${tierBadgeClass}">${tierBadgeText}</span>
            </div>
            <button class="venue-hero-star-btn ${isStarred ? 'is-active' : ''}" type="button" data-toggle-star="${esc(v.id)}" aria-label="${isStarred ? 'Remove from routine' : 'Add to routine'}" title="${isStarred ? 'In your routine' : 'Add to routine'}">
              ${icon(isStarred ? 'starFill' : 'star', 18)}
            </button>
            <div class="venue-hero-cat-badge">
              ${icon(primaryActIcon, 17)}
            </div>
          </div>

          <!-- Next classes timetable card -->
          <div class="venue-classes-card">
            <div class="venue-classes-card__head">
              <h3 class="venue-classes-card__title">Next classes</h3>
              <span class="venue-classes-card__date">${timetable.dateStr}</span>
            </div>
            <div class="venue-classes-list">
              ${timetable.slots.map(s => `
                <div class="venue-class-row">
                  <span class="venue-class-time">${s.time}</span>
                  <span class="venue-class-icon">${icon(s.icon, 16)}</span>
                  <span class="venue-class-name">${esc(s.name)}</span>
                </div>
              `).join('')}
            </div>
            <div class="venue-classes-footnote">
              ${icon('info', 14)} <span>Example timetable &mdash; live availability is not connected in this pilot.</span>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Title, Submeta, Urby Recommendation & Accordions -->
        <div class="venue-profile-right">
          <div class="venue-profile-head">
            <h1 id="sheet-title" class="venue-profile-title">${esc(v.name)}</h1>
            <div class="venue-profile-submeta">
              <span class="venue-submeta-item">${icon(primaryActIcon, 16)} ${esc(actNames)}</span>
              <span class="venue-submeta-dot">&middot;</span>
              <span class="venue-submeta-item">${icon('pin', 15)} ${v.address ? `${esc(v.address)} (${km} km)` : `${km} km from ${esc(areaLabel)}`}</span>
            </div>
          </div>

          <!-- Urby Recommendation Card -->
          <div class="venue-urby-card">
            <div class="venue-urby-card__main">
              ${urbyMascotAvatar('md')}
              <div class="venue-urby-card__info">
                <div class="venue-urby-card__title-row">
                  <h4 class="venue-urby-card__title">Why Urby matched this for you</h4>
                  ${explainVenueMatch(v, S.answers, plan).isTopMatch ? `<span class="venue-urby-top-match-badge">${icon('starFill', 11)} Great match</span>` : ''}
                </div>
                <div class="venue-urby-card__bullets">
                  ${explainVenueMatch(v, S.answers, plan).reasons.map(r => `
                    <div class="venue-urby-card__bullet">
                      <span class="venue-urby-bullet-icon venue-urby-bullet-icon--${r.type}">${icon(r.icon, 13)}</span>
                      <span>${esc(r.text)}</span>
                    </div>
                  `).join('')}
                  ${v.goodToKnow ? `
                    <div class="venue-urby-card__bullet">
                      <span class="venue-urby-bullet-icon venue-urby-bullet-icon--highlight">${icon('sparkles', 13)}</span>
                      <span><b>Highlight:</b> ${esc(v.goodToKnow)}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
            <div class="venue-urby-card__cta">
              <button class="btn ${isStarred ? 'btn--secondary' : 'btn--primary'} venue-urby-btn" type="button" data-toggle-star="${esc(v.id)}">
                ${isStarred ? `${icon('checkThin', 16)} In your routine` : 'Add to my routine'}
              </button>
            </div>
            <p class="venue-urby-card__note">${included ? 'This place works with the membership I recommended.' : `Upgrade to ${esc(firstAccess ? firstAccess.name : 'Plus')} to include this venue.`}</p>
          </div>

          <!-- Accordions Group -->
          <div class="venue-accordions sheet__body" style="padding:0">
            <details class="venue-accordion">
              <summary class="venue-accordion__summary">
                <span class="venue-accordion__title-wrap">${icon('shield', 18)} <span>Practical details & limits</span></span>
                <span class="venue-accordion__chevron">${icon('chevronDown', 18)}</span>
              </summary>
              <div class="venue-accordion__body">
                <!-- Visual quick facts grid with micro-illustrations -->
                <div class="venue-facts-grid">
                  <div class="venue-fact-card">
                    <div class="venue-fact-icon venue-fact-icon--blue">${icon('qr', 18)}</div>
                    <div class="venue-fact-text">
                      <strong>QR Check-in</strong>
                      <span>Scan at front desk with app</span>
                    </div>
                  </div>
                  <div class="venue-fact-card">
                    <div class="venue-fact-icon venue-fact-icon--amber">${icon('bag', 18)}</div>
                    <div class="venue-fact-text">
                      <strong>What to bring</strong>
                      <span>Towel, lock & clean shoes</span>
                    </div>
                  </div>
                  <div class="venue-fact-card">
                    <div class="venue-fact-icon venue-fact-icon--teal">${icon('shower', 18)}</div>
                    <div class="venue-fact-text">
                      <strong>Amenities</strong>
                      <span>Showers & lockers on site</span>
                    </div>
                  </div>
                </div>

                ${v.access ? `<div class="accesslist" style="margin-top:16px">
                  <div class="accesslist__title">Plan access breakdown</div>
                  ${PLANS.map(pl => `<div class="accesslist__row ${pl.id === plan.id ? 'is-yours' : ''}">
                    <span class="accesslist__plan-name">${esc(pl.name)} ${pl.id === plan.id ? '<span class="badge-sm badge--green">Your plan</span>' : ''}</span>
                    <span class="accesslist__limit">${esc(v.access[pl.id] || '—')}</span>
                  </div>`).join('')}
                </div>` : ''}
              </div>
            </details>

            <details class="venue-accordion">
              <summary class="venue-accordion__summary">
                <span class="venue-accordion__title-wrap">${icon('pin', 18)} <span>Address & directions</span></span>
                <span class="venue-accordion__chevron">${icon('chevronDown', 18)}</span>
              </summary>
              <div class="venue-accordion__body">
                ${v.address ? `<div class="sheet__row" style="margin-bottom:8px">${icon('pin', 18)}<span><strong>Address</strong><br>${esc(v.address)} (${esc(areaLabel)} &middot; ${km} km away)</span></div>` : ''}
                <div class="sheet__row" style="margin-bottom:12px">${icon('shoe', 18)}<span><strong>Transit & access</strong><br>Nearby public transport & cycling lanes with bike racks outside.</span></div>
                <div style="margin-top:8px">
                  <a href="${esc(v.url || 'https://urbansportsclub.com/en/venues/')}" target="_blank" rel="noopener" class="venue-outlink-btn">
                    ${icon('map', 15)} <span>View on urbansportsclub.com</span> ${icon('arrowRight', 14)}
                  </a>
                </div>
              </div>
            </details>

            <details class="venue-accordion">
              <summary class="venue-accordion__summary">
                <span class="venue-accordion__title-wrap">${icon('clock', 18)} <span>Opening times</span></span>
                <span class="venue-accordion__chevron">${icon('chevronDown', 18)}</span>
              </summary>
              <div class="venue-accordion__body">
                <div class="venue-times-grid">
                  ${v.hoursWeekday ? `<div class="venue-time-pill sheet__row">
                    <span class="venue-time-pill__day">Weekdays</span>
                    <span class="venue-time-pill__hours">${esc(v.hoursWeekday)}</span>
                  </div>` : ''}
                  ${v.hoursWeekend ? `<div class="venue-time-pill sheet__row">
                    <span class="venue-time-pill__day">Weekends</span>
                    <span class="venue-time-pill__hours">${esc(v.hoursWeekend)}</span>
                  </div>` : ''}
                  ${!v.hoursWeekday && !v.hoursWeekend ? `<div class="sheet__row">${icon('clock', 18)}<span>Opening hours run to class timetable.</span></div>` : ''}
                </div>
              </div>
            </details>

            <details class="venue-accordion">
              <summary class="venue-accordion__summary">
                <span class="venue-accordion__title-wrap">${icon('info', 18)} <span>Good to know</span></span>
                <span class="venue-accordion__chevron">${icon('chevronDown', 18)}</span>
              </summary>
              <div class="venue-accordion__body">
                <div class="sheet__row">${icon('bolt', 18)}<span>${esc(v.goodToKnow || 'Please arrive 10 minutes before your class starts. Standard 12-hour cancellation policy applies.')}</span></div>
              </div>
            </details>

            <details class="venue-accordion">
              <summary class="venue-accordion__summary">
                <span class="venue-accordion__title-wrap">${icon('sparkle', 18)} <span>About this venue</span></span>
                <span class="venue-accordion__chevron">${icon('chevronDown', 18)}</span>
              </summary>
              <div class="venue-accordion__body">
                <p style="font-size:14px;line-height:1.55;margin:0 0 10px;color:var(--ink-soft)">${esc(v.blurb || 'A partner studio in the Urban Sports Club Berlin network featuring certified coaches and dedicated workout spaces.')}</p>
                <div class="chips" style="margin-top:8px">${v.activities.map(a => `<span class="chip-sm">${esc(ACTIVITY_LABELS[a] || a)}</span>`).join('')}</div>
              </div>
            </details>
          </div>
        </div>
      </div>

      <!-- Mobile Sticky Action Bar -->
      <div class="venue-profile-mobile-bar">
        <button class="btn ${isStarred ? 'btn--secondary' : 'btn--primary'} btn--block venue-profile-mobile-btn" type="button" data-toggle-star="${esc(v.id)}">
          ${isStarred ? `${icon('checkThin', 16)} In your routine` : 'Add to my routine'}
        </button>
      </div>
    </div>
  </div>`;
}

function appSheet() {
  if (!APP_SHEET) return '';
  const a = APPS.find(x => x.id === APP_SHEET);
  if (!a) return '';
  const isAnnual = S.commitmentId === 'annual';
  const isBiennial = S.commitmentId === 'biennial';
  const isMonthly = !isAnnual && !isBiennial;
  const requires24 = a.minCommitment === 'biennial';

  return `<div class="sheet sheet--app" id="app-sheet" role="dialog" aria-modal="true" aria-labelledby="app-sheet-title">
    <div class="sheet__panel sheet__panel--app">
      <div class="sheet__handle" aria-hidden="true"></div>
      <button class="sheet__close" data-close-app-sheet aria-label="Close dialog">&times;</button>

      <div class="app-popup">
        <div class="app-popup__head">
          <div class="app-popup__logo-box">${appLogo(a)}</div>
          <div class="app-popup__title-group">
            <span class="app-popup__cat">${esc(a.category)}</span>
            <h2 id="app-sheet-title" class="app-popup__name">${esc(a.name)}</h2>
          </div>
        </div>

        <p class="app-popup__pitch">${esc(a.blurb)}</p>

        <div class="app-popup__facts">
          <div class="app-popup__fact">
            <span class="app-popup__fact-dot"></span>
            <span><strong>Included in 12- &amp; 24-mo plans</strong> (worth ~10–15 €/mo).</span>
          </div>
          <div class="app-popup__fact">
            <span class="app-popup__fact-dot"></span>
            <span><strong>Switch anytime</strong> directly in your USC app.</span>
          </div>
        </div>

        <div class="app-popup__foot">
          ${isMonthly ? `
            <button class="btn btn--primary btn--sm app-popup__cta" type="button" data-commit="${requires24 ? 'biennial' : 'annual'}" data-close-app-sheet>
              Unlock with ${requires24 ? '24-month' : '12-month'} plan
            </button>
            <button class="linkish app-popup__dismiss" type="button" data-close-app-sheet>
              Keep monthly &middot; Close
            </button>
          ` : (isAnnual && requires24) ? `
            <button class="btn btn--primary btn--sm app-popup__cta" type="button" data-commit="biennial" data-close-app-sheet>
              Upgrade to 24-month (unlocks 2 apps)
            </button>
            <button class="linkish app-popup__dismiss" type="button" data-close-app-sheet>
              Close
            </button>
          ` : `
            <button class="btn btn--primary btn--sm app-popup__cta" type="button" data-close-app-sheet>
              Got it
            </button>
          `}
        </div>
      </div>
    </div>
  </div>`;
}

function appsBlock() {
  if (!APPS.length) return '';
  const mine = appsFor(S.commitmentId);
  const slots = APP_UNLOCK[S.commitmentId] || 0;
  const all = mine.length ? mine : appsFor('annual');
  const locked = !slots;
  const groups = (A().activities||[]).filter(x=>x!==SKIP);
  const ranked = rankApps(all, groups, A().goal);

  const card = a => `<button class="appcard linkish" type="button" data-app="${esc(a.id)}" aria-label="View details about ${esc(a.name)} app">
    ${appLogo(a)}
    <span class="appcard__text">
      <span class="appcard__name">${esc(a.name)}</span>
      <span class="appcard__cat">${esc(a.category)}</span>
    </span>
    <span class="appcard__info-icon">${icon('info',14)}</span>
  </button>`;

  const chip = a => `<span class="appchip">${appLogo(a)}<span>${esc(a.name)}</span></span>`;

  return `<details class="rowcard rowcard--apps"${APPSOPEN?' open':''}>
    <summary class="rowcard__head" data-toggle-apps>
      <span class="rowcard__icon">${icon('device',22)}</span>
      <span class="rowcard__text"><b>Free Wellbeing Apps</b>
        <small>${locked
          ? '0 &euro; extra with 12- or 24-month memberships'
          : `0 &euro; extra &middot; ${slots===1?'1 free app':'2 free apps'} included in your term`}</small></span>
      <span class="rowcard__chips">${ranked.list.slice(0,2).map(chip).join('')}</span>
      <!-- "Explore free apps" came off this handle: the summary is already the whole
           clickable thing, and asking someone to explore before they have committed to
           anything was one word too many. The arrow stays — it is the affordance, and the
           stylesheet turns it a quarter-turn when the row opens. -->
      <span class="rowcard__cta" aria-hidden="true">${icon('arrowRight',18)}</span>
    </summary>
    <div class="rowcard__body">
      <div class="apps-switcher-strip">
        <div class="apps-switcher-strip__label">
          <span class="apps-switcher-strip__title">✨ Digital Partner Apps</span>
          <span class="apps-switcher-strip__hint">${locked ? 'Requires 12- or 24-month membership' : slots === 1 ? '1 app unlocked &middot; switch anytime' : '2 apps unlocked &middot; switch anytime'}</span>
        </div>
        <div class="apps-segmented-control" role="group" aria-label="Membership length">
          <button class="apps-seg-btn ${S.commitmentId==='monthly'?'is-active':''}" type="button" data-commit="monthly">Monthly <small>(no apps)</small></button>
          <button class="apps-seg-btn ${S.commitmentId==='annual'?'is-active':''}" type="button" data-commit="annual">12 mo <small>(1 free app)</small></button>
          <button class="apps-seg-btn ${S.commitmentId==='biennial'?'is-active':''}" type="button" data-commit="biennial">24 mo <small>(2 free apps)</small></button>
        </div>
      </div>

      <div class="appgrid ${locked?'is-locked':''}">${ranked.list.map(card).join('')}</div>

      <div class="apps__foot">
        <span class="apps__note">${ranked.matched && groups.length
          ? `Closest to ${esc(groupWords(groups))} first`
          : `From the published catalogue`} &middot; Tap any app for details</span>
      </div>
    </div>
  </details>`;
}

/* Guy's point, and Karim's: a radius is the wrong tool when someone has told us
   two neighbourhoods. We search both, we say plainly when we had to look further,
   and when the answer is genuinely thin we ask for the place they wish were there.
   That is the one piece of information nobody else in the funnel can collect, and
   it lands in the journey data as demand rather than disappearing. */
function partnerAsk(match, groups) {
  const where = whereName(match);
  const thin = match.reachedFurther || match.widened || (match.pool||[]).length < 3;
  if (PLACEWANTED) return `<div class="notice" style="margin-top:16px">${icon('checkThin',19)}<span>Noted &mdash;
    <b>${esc(PLACEWANTED)}</b> near ${esc(where)}. It shows up in the <button class="linkish" data-go="data">journey data</button> as a place members are asking for.</span></div>`;
  return `<details class="partnerask"${thin?' open':''}>
    <summary>${icon('pin',16)} <span>${thin?`Not enough nearby?`:`Somewhere you go that isn&rsquo;t here?`} Tell us what to add</span></summary>
    <form data-form="place-demand" class="partnerask__form">
      <input type="text" name="place" placeholder="Name a studio, gym or pool near ${esc(where)}" aria-label="A place we should add">
      <button class="btn btn--secondary" type="submit" style="height:48px;font-size:16px">Suggest it</button>
    </form>
    <p class="xsmall muted">We pass this to the partnerships team. Nothing here is booked or shared with the place itself.</p>
  </details>`;
}

function reviewAnswersSheet() {
  if (!REVIEW_ANSWERS_OPEN) return '';
  const questionsList = [
    { id: 'goal', label: 'Goal', icon: 'target', prompt: 'What would you love to do more of?' },
    { id: 'activities', label: 'Activities', icon: 'dumbbell', prompt: 'What sports or activities interest you?' },
    { id: 'area', label: 'Area', icon: 'pin', prompt: 'Where do you want to work out?' },
    { id: 'frequency', label: 'Frequency', icon: 'calendar', prompt: 'How often would you realistically like to go?' }
  ];

  const items = questionsList.map(q => {
    const val = S.answers[q.id];
    const answered = isAnswered(val);
    const summary = answered ? compactAnswerLabel(q.id, val) : 'Not answered yet';
    return `<div class="review-answers-item">
      <div class="review-answers-item__icon">${icon(q.icon, 18)}</div>
      <div class="review-answers-item__body">
        <span class="review-answers-item__label">${esc(q.label)}</span>
        <strong class="review-answers-item__val ${answered ? '' : 'is-empty'}">${esc(summary)}</strong>
      </div>
      <button class="btn btn--secondary btn--sm review-answers-item__edit" type="button" data-edit="${esc(q.id)}" aria-label="Edit answer for ${esc(q.label)}">
        Edit
      </button>
    </div>`;
  }).join('');

  return `<div class="sheet sheet--review-answers" role="dialog" aria-modal="true" aria-label="Review your answers">
    <div class="sheet__backdrop" data-close-review-answers></div>
    <div class="sheet__panel sheet__panel--review">
      <header class="sheet__head">
        <div class="sheet__head-text">
          <div class="sheet__guide">${ulaAvatar('sm')} <span>Urby &middot; Membership guide</span></div>
          <h2 class="sheet__title">Your answers & preferences</h2>
        </div>
        <button class="sheet__close" type="button" data-close-review-answers aria-label="Close answers panel">&times;</button>
      </header>
      <div class="sheet__body">
        <p class="review-answers-sub">You can review or change any answer at any time. Your routine and recommendation update immediately.</p>
        <div class="review-answers-list">
          ${items}
        </div>
      </div>
      <footer class="sheet__foot">
        <button class="btn btn--primary btn--block" type="button" data-close-review-answers>Done</button>
      </footer>
    </div>
  </div>`;
}

