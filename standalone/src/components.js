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
function topbar(step, opts={}) {
  const { savedNote = Boolean(S.email && S.saveOptIn), saveExit = true, sub = null, stepper = true, back = null, checkout = false } = opts;
  const n = savedNote ? `<div class="saved-note" title="Saved to ${esc(S.email)} — your progress is safe.">${icon('checkThin',13)} <span>Saved &middot;</span> <span class="saved-note__mail">${esc(S.email)}</span></div>` : '';

  if (!stepper) {
    return `<header class="topbar">
      <div class="topbar__left"><button class="wordmark linkish" style="text-decoration:none" data-go="landing">Urban Sports Club</button>${n}</div>
      <div class="topbar__center"></div>
      <div class="topbar__right">${back?`<button class="link-plain linkish" data-go="${esc(back.route)}">${icon('back',17)} ${esc(back.label)}</button>`:(saveExit?`<button class="link-plain" data-go="save" data-open-exit>Save for later</button>`:'')}</div></header>`;
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
      <div class="topbar__right">${saveExit?`<button class="link-plain" data-go="save" data-open-exit>Save for later</button>`:''}</div></header>
    <div class="mobile-progress">
      <div class="mobile-progress__label">${qText}</div>
      <div class="mobile-progress__track"><div class="mobile-progress__fill" style="width:${barPct}%"></div></div>
      ${savedNote?`<div class="saved-note saved-note--mobile">${icon('checkThin',16)} Saved — your progress is safe.</div>`:''}
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
    <div class="topbar__right">${saveExit?`<button class="link-plain" data-go="save" data-open-exit>Save for later</button>`:''}</div></header>
  <div class="mobile-progress"><div class="mobile-progress__label">${mobileText}</div>
    <div class="mobile-progress__track"><div class="mobile-progress__fill" style="width:${barPct}%"></div></div>
    ${savedNote?`<div class="saved-note saved-note--mobile">${icon('checkThin',16)} Saved — your progress is safe.</div>`:''}</div>`;
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
  const out = panel.outerHTML;
  return out.replace(
    '<p class="save-out"><button class="linkish strong" data-skip-save>Continue without saving</button></p>',
    `<div class="save-bookmark"><span>Prefer not to use email?</span><br>
      <button class="linkish" type="button" data-copy-resume>${icon('bookmark',16)} Copy a private link to bookmark</button></div>`
  );
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
        ${ulaAvatar('sm')}
        <h2 id="login-modal-title" style="margin:8px 0 4px;font-size:22px;font-weight:800;letter-spacing:-0.02em">Resume your journey</h2>
        <p class="small muted" style="margin:0 0 16px">Enter the email you used when saving to pick up where you left off.</p>
      </div>
      ${err}
      <form data-form="login" novalidate class="login-form">
        <div class="field" style="margin-bottom:14px">
          <label class="field__label" for="login-email">Your email address</label>
          <input id="login-email" class="field__input" type="email" name="email" placeholder="you@example.com" value="${esc(FIELDS.loginEmail||'')}" autocomplete="email" required>
        </div>
        <button class="btn btn--primary btn--block" type="submit">Resume my journey</button>
        <div class="orline" style="margin:16px 0"><span>or continue with</span></div>
        <div class="sso-row" style="max-width:none;margin-bottom:12px">
          <button class="sso-btn" type="submit" name="provider" value="google" aria-label="Resume with Google">${GOOGLE} <span>Google</span></button>
          <button class="sso-btn" type="submit" name="provider" value="apple" aria-label="Resume with Apple">${APPLE} <span>Apple</span></button>
        </div>
        ${notFoundActions}
      </form>
    </div>
  </div>`;
}
function openLoginModal(error=null) {
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
function hasSaveableProgress() {
  return ROUTE !== 'landing' || Object.keys(S.answers||{}).length > 0 || Boolean(SEARCH.q || SEARCH.result);
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

function venueSheet() {
  if (!SHEET) return '';
  const v = VENUES.find(x=>x.id===SHEET); if (!v) return '';
  const match = matchVenues(A());
  const found = (match.venues||[]).find(x=>x.id===v.id);
  const km = found ? found.distanceKm : Math.min(...((match.areas)||[match.anywhere?ANYWHERE:match.area]).map(a=>distanceKm(a,v)));
  const plan = currentPlan();
  const currentWeekDays = (S.weekDays && S.weekDays.length)
    ? S.weekDays : weekPlan(A().activities||[], match.pool||[], plan.id, A().frequency).sessions.map(x=>x.day);
  const activeDay = WEEK_ADD_DAY || currentWeekDays[0] || 'Monday';
  if (!WEEK_ADD_DAY) WEEK_ADD_DAY = activeDay;

  const isStarred = Boolean(S.starredVenues && S.starredVenues[v.id]);

  /* If opened via "Add to week", show a focused, lightweight Quick-Add bottom sheet */
  if (WEEK_ADD_MODE) {
    const areaLabel = v.nearestArea ? v.nearestArea.name : (AREAS.find(a=>a.id===v.area)||{}).name || '';
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
              ${DAY_ORDER.map(day=>{
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
  const firstPlan = PLANS.find(p=>p.venueTiers.includes(v.tier));
  const yours = v.access ? v.access[plan.id] : null;
  const firstAccess = v.access ? PLANS.find(pl=>v.access[pl.id] && !/^not included/i.test(v.access[pl.id])) : firstPlan;

  return `<div class="sheet" id="venue-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
    <div class="sheet__panel">
      <button class="sheet__close" data-close-sheet aria-label="Close">&times;</button>
      <div class="sheet__media">${venueMedia(v)}</div>
      <div class="sheet__body">
        <div class="sheet__head-row" style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
          <div>
            <h2 id="sheet-title" style="font-size:22px;font-weight:800;letter-spacing:-.01em;margin:0">${esc(v.name)}</h2>
            <p class="small muted" style="margin:4px 0 0">${esc(v.tierLabel||'Venue')} · ${km} km from ${esc(match.anywhere?'the city centre':((found&&found.nearestArea)||match.area).name)}</p>
          </div>
          <button class="activity-card__star-btn ${isStarred ? 'is-active' : ''}" type="button" data-toggle-star="${esc(v.id)}" aria-label="${isStarred ? 'Remove from routine' : 'Add to routine'}" title="${isStarred ? 'In your routine' : 'Add to routine'}" style="position:static;box-shadow:none;flex:0 0 auto">
            ${icon(isStarred ? 'starFill' : 'star', 18)}
          </button>
        </div>
        ${v.address?`<p class="small muted" style="margin:4px 0 0">${icon('pin',15)} ${esc(v.address)}</p>`:''}

        ${v.blurb ? `<p style="font-size:15px;line-height:1.45;margin:14px 0 0">${esc(v.blurb)}</p>` : ''}
        <div class="chips">${v.activities.map(a=>`<span class="chip-sm">${esc(ACTIVITY_LABELS[a]||a)}</span>`).join('')}</div>
        <div style="margin-top:16px">
          ${v.hoursWeekday?`<div class="sheet__row">${icon('clock',20)}<span><strong>Weekdays</strong><br>${esc(v.hoursWeekday)}</span></div>`:''}
          ${v.hoursWeekend?`<div class="sheet__row">${icon('calendar',20)}<span><strong>Weekends</strong><br>${esc(v.hoursWeekend)}</span></div>`:''}
          ${!v.hoursWeekday&&!v.hoursWeekend?`<div class="sheet__row">${icon('clock',20)}<span><strong>Opening hours</strong><br>Not published &mdash; this venue runs to a class timetable.</span></div>`:''}
          ${v.goodToKnow?`<div class="sheet__row">${icon('info',20)}<span><strong>Good to know</strong><br>${esc(v.goodToKnow)}</span></div>`:''}
        </div>
        ${v.access
          ? `<div class="covered ${yours && !/^not included/i.test(yours) ? 'covered--yes' : 'covered--no'}">${icon(yours && !/^not included/i.test(yours) ? 'checkThin' : 'info', 19)}
              <span>On <strong>${esc(plan.name)}</strong>: ${esc(yours || 'not published for this plan')}.${
                yours && /^not included/i.test(yours) && firstAccess ? ` Included from <strong>${esc(firstAccess.name)}</strong>, ${priceFor(firstAccess,S.commitmentId)} € a month.` : ''}</span></div>
             <div class="accesslist">${PLANS.map(pl=>`<div class="accesslist__row ${pl.id===plan.id?'is-yours':''}">
                <span>${esc(pl.name)}</span><span>${esc(v.access[pl.id]||'—')}</span></div>`).join('')}</div>`
          : `<div class="covered ${included?'covered--yes':'covered--no'}">${icon(included?'checkThin':'info',19)}
              <span>${included
                ? `Included in <strong>${esc(plan.name)}</strong> — ${lowerFirst(plan.checkInModel)}.`
                : `Needs a Plus check-in, which ${esc(plan.name)} doesn&rsquo;t include.`}</span></div>`}
        <div style="display:none"><a href="${esc(v.url||'https://urbansportsclub.com/en/venues/')}">urbansportsclub.com</a></div>
      </div>
      <div class="sheet__foot" style="position:sticky;bottom:0;background:#fff;border-top:1px solid var(--border);padding:14px 20px;display:flex;gap:10px;z-index:10;box-shadow:0 -4px 12px rgba(0,0,0,0.04)">
        <button class="btn btn--secondary" style="flex:1" data-close-sheet>Close</button>
        <button class="btn ${isStarred ? 'btn--secondary' : 'btn--primary'}" style="flex:2" type="button" data-toggle-star="${esc(v.id)}">
          ${icon(isStarred ? 'starFill' : 'plus', 14)} <span>${isStarred ? 'Remove from routine' : 'Add to routine'}</span>
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
