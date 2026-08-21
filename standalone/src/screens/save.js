/* A place in the recap: the photograph large enough to recognise, the name, the
   distance. Nothing tappable — this is a receipt for a decision already made, and a
   card that opened a sheet from here would take you off the form. */
const saveVenue = v => {
  const kmLabel = typeof v.distanceKm === 'number' ? `${v.distanceKm} km away` : 'in Berlin';
  return `<div class="savevenue"><div class="savevenue__media">${venueMedia(v)}</div>
  <div class="savevenue__text"><div class="savevenue__name">${esc(v.name)}</div>
    <div class="savevenue__meta">${kmLabel}</div></div></div>`;
};

/* the way out — show what is being kept before asking for anywhere to send it.
   Rule 71: it is reachable from anywhere, so it says only what is true at the point
   the visitor left. Before the four questions there is no plan and no match, so it
   shows the answers so far and where they stopped, and nothing else. */
function saveScreen() {
  const hasPlan = fitComplete(S.answers) || S.planOverridden;
  const F = hasPlan ? fitSummary() : null;
  const answered = QUESTIONS.filter(q => isAnswered(S.answers[q.id])).length;
  const currentQNum = Math.min(answered + 1, QUESTIONS.length);
  const backActionLabel = hasPlan
    ? 'Back to recommendation'
    : `Continue with question ${currentQNum}`;

  const starredKeys = Object.keys(S.starredVenues || {});
  const allStarredRoutine = F ? (starredKeys.length
    ? starredKeys.map(id => F.included.find(v => v.id === id) || VENUES.find(v => v.id === id)).filter(Boolean)
    : F.included.slice(0, 3)) : [];
  const savedRoutine = allStarredRoutine.slice(0, 6);
  const morePlaces = F ? Math.max(0, allStarredRoutine.length - savedRoutine.length) : 0;

  const recapSection = hasPlan ? `
    <div class="saverecap savepanel__recap">
      <div class="saverecap__head">
        <span class="saverecap__tag savepanel__plabel">${F.isRec ? 'Recommended membership' : 'The membership you chose'}</span>
        <div class="saverecap__plan saveplan">
          <b class="savepanel__name">${esc(F.plan.name)}</b>
          <span>${F.price} €<small>/mo</small></span>
        </div>
        <div class="saverecap__meta">${F.totals
          ? (F.totals.included === F.totals.nearby
              ? (F.totals.included === 1 ? 'Includes your matching place' : F.totals.included === 2 ? 'Includes both of your matching places' : `Includes all ${F.totals.included} of your matching places`)
              : `Includes ${F.totals.included} of your ${F.totals.nearby} matching places`)
          : (savedRoutine.length ? `Includes ${savedRoutine.length} places in your routine` : '')} &middot; ${esc(F.commitment.label)} &middot; ${plural(visitsFor(F.plan, S.answers.frequency),'visit','visits')}/mo</div>
      </div>

      ${savedRoutine.length ? `
      <div class="saverecap__venues">
        <div class="saverecap__label">Your saved routine (${plural(savedRoutine.length, 'place', 'places')})</div>
        <div class="saverecap__venue-grid">
          ${savedRoutine.map(v => {
            const tierTag = v.tier === 'premium'
              ? '<span class="tier-tag tier-tag--premium" style="font-size:10px;padding:1px 5px">✨ Premium</span>'
              : v.tier === 'plus'
              ? '<span class="tier-tag tier-tag--plus" style="font-size:10px;padding:1px 5px">⚡ Plus</span>'
              : '<span class="tier-tag tier-tag--standard" style="font-size:10px;padding:1px 5px">Classic</span>';
            const kmLabel = typeof v.distanceKm === 'number' ? `${v.distanceKm} km away` : 'in Berlin';
            return `<div class="saverecap__venue-card">
              <div class="saverecap__venue-img">${venueMedia(v)}</div>
              <div class="saverecap__venue-info">
                <span class="saverecap__venue-title">${esc(v.name)}</span>
                <span class="saverecap__venue-dist">${kmLabel} &middot; ${tierTag}</span>
              </div>
            </div>`;
          }).join('')}
        </div>
        ${morePlaces ? `<div class="saverecap__more">+${morePlaces} more matching ${plural(morePlaces,'place','places')} included</div>` : ''}
      </div>` : ''}
    </div>
  ` : `
    <div class="saverecap">
      <div class="saverecap__head">
        <span class="saverecap__tag">Your fit draft</span>
        <div class="saverecap__plan savepanel__where"><b>Question ${currentQNum} of ${QUESTIONS.length}</b></div>
        <div class="saverecap__meta">Urby has saved your draft and is matching 190+ Berlin studios.</div>
      </div>
      <div class="saverecap__chips">
        <div class="saverecap__label">Your selections so far (tap to edit)</div>
        ${answerChips({ label:'', compact:true })}
      </div>
    </div>
  `;

  return `${topbar(1,{ stepper:false, savedNote:Boolean(S.email&&S.saveOptIn),
                       back: hasPlan ? { route:'recommendation', label:'Back to recommendation' }
                                     : { route:'fit', label:'Back to your questions' } })}
  <main class="savewrap" id="main">
    <div class="savepanel">
      <div class="savepanel__left">
        <div class="savepanel__guide">${ulaAvatar('sm')}<span>Urby &middot; Membership guide</span></div>
        <h1 class="savepanel__title" tabindex="-1">${hasPlan ? 'Saving your personalized plan' : 'Saving your progress'}</h1>
        <p class="savepanel__sub">${hasPlan ? 'Your custom routine, matching studios, and calculated membership plan.' : 'Your answers, matching studios, and progress so far.'}</p>
        ${recapSection}
      </div>

      <div class="savepanel__right">
        <div class="save-perk-banner">
          ${icon('sparkle',14)} <span><strong>10% off voucher included</strong> &middot; applied when you return</span>
        </div>

        <form data-form="save" novalidate class="saveform">
          <div class="savefield__wrap">
            <label class="savefield__label" for="save-email">Email address</label>
            <input id="save-email" class="savefield" type="email" name="email" placeholder="Your email address" value="${esc(FIELDS.email||'')}">
            ${ERRORS.email?`<p class="field-error" role="alert">${esc(ERRORS.email)}</p>`:''}
          </div>
          <button class="btn btn--primary btn--block" type="submit">Email me my return link</button>
          
          <div class="save-trust-line">
            ${icon('lock',13)} <span>No spam &middot; Instant 1-click return link &middot; No card needed</span>
          </div>

          <div class="orline"><span>or continue with</span></div>
          <div class="sso-row" style="max-width:none">
            <button class="sso-btn" type="submit" name="provider" value="google" aria-label="Save with Google">${GOOGLE} Google <small class="muted">(simulated)</small></button>
            <button class="sso-btn" type="submit" name="provider" value="apple" aria-label="Save with Apple">${APPLE} Apple <small class="muted">(simulated)</small></button>
          </div>
          <div class="consent-row" style="max-width:none">
            <label class="checkbox"><input type="checkbox" name="marketing" id="marketing" ${S.marketing?'checked':''}><span></span></label>
            <label class="consent-label" for="marketing">Email me occasional offers &amp; updates <span class="muted">(optional)</span></label>
          </div>
          <p class="terms-line">By continuing, you agree to our <button class="linkish" data-go="terms">Terms</button> and <button class="linkish" data-go="privacy">Privacy Policy</button>.</p>
        </form>
        <p class="save-out"><button class="linkish strong" data-skip-save>&larr; ${esc(backActionLabel)}</button></p>
        <div class="save-bookmark"><span>Prefer not to use email?</span> <button class="linkish" type="button" data-copy-resume>${icon('bookmark',12)} Copy private bookmark link</button></div>
      </div>
    </div>
    <p class="savefoot"><button class="linkish" data-go="terms">Terms</button>
      <button class="linkish" data-go="privacy">Privacy</button>
      <button class="linkish" data-go="data">About this pilot</button></p>
  </main>${venueSheet()}`;
}

function leftScreen() {
  return `${topbar(1,{saveExit:false})}<main class="content" id="main">
    <div style="display:flex;align-items:center;gap:14px;margin:24px 0 8px">${ulaAvatar('lg')}
      <h1 class="h-question" style="margin:0" tabindex="-1">Saved. Come back any time.</h1></div>
    <!-- Only claim what is actually held: someone who saved on question two has no venue
         matches and no recommendation yet, and saying otherwise is a promise the resume
         link cannot keep (rule 6). -->
    <p class="lede" style="margin-top:0;max-width:52ch">${fitComplete(S.answers)
      ? 'Your answers, venue matches and recommendation are'
      : 'Your answers so far are'} stored against ${esc(S.email||'your email')}. You stopped at <strong>${esc(STEP_LABELS[S.lastStep]||S.lastStep)}</strong>.</p>
    <div class="card"><div class="fitpanel__label">Your marketing preference</div>
      <p class="small" style="margin:0">${S.marketing?`${icon('checkThin',17)} You asked us to email your matches and occasional offers.`:`${icon('info',17)} You chose not to receive marketing emails.`}</p></div>
    <div class="card"><div class="fitpanel__label">Your link back</div>
      <p class="small muted" style="margin-top:0">This is the secure link a returning visitor would receive. Copy it, open a new tab and paste it — everything comes back, with no password.</p>
      <p class="copybox" id="resume-link">${esc(resumeUrl())}</p>
      <div class="btn-row"><button class="btn btn--primary" data-copy-resume>Copy the link</button>
        <button class="btn btn--secondary" data-go="email">See the follow-up email</button></div></div>
    <!-- Saving is a pause, not an exit. Someone who has just been told their fit is safe
         is often only one click from carrying on, so the way back is on the screen. -->
    <p class="save-out">${fitComplete(S.answers) || S.planOverridden
      ? `<button class="linkish strong" data-go="recommendation">${icon('back',17)} Back to your recommendation</button>`
      : `<button class="linkish strong" data-go="fit">${icon('back',17)} Back to your questions</button>`}</p>
  </main>`;
}

function emailScreen() {
  const a=A(), match=matchVenues(a), prov=provisionalPlan(a,match);
  const first = S.details.firstName || (S.email?S.email.split('@')[0]:'there');
  const cap = s => s?s.charAt(0).toUpperCase()+s.slice(1):s;
  const goal=answerLabel('goal',S.answers.goal), area=answerLabel('area',S.answers.area), acts=answerLabel('activities',S.answers.activities);
  const rows=[ goal && goal!=='Not sure yet' && {i:'target',l:'Goal',v:goal.toLowerCase()},
               area && {i:'pin',l:'Area',v:area==='Anywhere in Berlin'?'Anywhere in Berlin':'Berlin-'+area},
               prov && {i:'tag',l:'Early match',v:`${prov.planName}, ${prov.price} € / month`},
               !S.paid && {i:'calendar',l:'You stopped at',v:STEP_LABELS[S.lastStep]||S.lastStep} ].filter(Boolean);
  if (!S.email) return `<div class="email-page"><div class="email-card" style="padding:44px 36px">
    <h1 class="h-question" style="margin-top:0" tabindex="-1">No identified visitor yet</h1>
    <p class="lede" style="margin-top:0">The follow-up email only exists once someone has chosen to save their progress. Walk the journey and press Save, then come back.</p>
    <div class="btn-row"><button class="btn btn--primary" data-go="landing">Start the journey</button></div></div></div>`;
  return `<div class="email-page">
    <div style="max-width:620px;margin:0 auto 18px"><p class="small muted" style="margin:0 0 6px">Preview of the follow-up email · nothing is actually sent</p>
      <p class="xsmall muted" style="margin:0">Marketing consent: <strong>${S.marketing?'given':'not given'}</strong>. ${S.marketing?'Offers and inspiration may be included.':'Only the transactional message would be sent — no offers.'}</p></div>
    <div class="email-card">
      <div class="email-hero"><div class="email-hero__photo"><img src="${IMG['/images/email-header.jpg']}" alt=""></div>
        <div class="email-hero__inner"><span class="wordmark">Urban Sports Club</span><h1>Your next move is waiting</h1></div></div>
      <div class="email-body">
        <p>Hi ${esc(cap(first))},</p>
        <p>${goal&&goal!=='Not sure yet'?`Thanks for telling us you want to ${esc(goal.toLowerCase())}.`:'Thanks for starting to look around.'} Urby has saved your answers${area?` and found options ${area==='Anywhere in Berlin'?'across Berlin':'close to '+esc(area)}`:''}.</p>
        ${acts&&acts!=='Not sure yet'?`<p>You said you&rsquo;d do <strong>${esc(acts.toLowerCase())}</strong> — that is exactly what we counted places for.</p>`:''}
        <p>${S.paid?'Your membership is set up — this is what the reminder would have looked like if you had left before finishing.':'Pick up where you left off. There&rsquo;s just a step or two left.'}</p>
        <div class="email-facts"><h3>Your fit so far</h3>
          ${rows.map(r=>`<div class="email-facts__row">${icon(r.i,20)}<span><strong>${esc(r.l)}</strong> · ${esc(r.v)}</span></div>`).join('')}</div>
        <button class="btn btn--primary btn--block" data-go="${S.paid?'confirmation':'recommendation'}">Continue where you left off</button>
        <p class="small muted" style="margin-top:16px">Your answers are saved. You&rsquo;ll return exactly where you left off.</p></div>
      <div class="email-footer">Urban Sports Club · Privacy · Help
        ${S.marketing?'<div style="margin-top:8px">You receive this because you asked us to email you.</div>':''}</div></div>
    <div style="max-width:620px;margin:26px auto 0"><button class="btn btn--secondary btn--block" data-go="data">Journey data</button></div></div>`;
}
