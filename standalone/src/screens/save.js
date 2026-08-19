            <div class="confirm-receipt-list">
              <div class="confirm-receipt-row">
                <span class="muted">Plan</span>
                <b>${esc(plan.name)}</b>
              </div>
              <div class="confirm-receipt-row">
                <span class="muted">Term</span>
                <span>${esc(commitment.label)}</span>
              </div>
              <div class="confirm-receipt-row">
                <span class="muted">Start date</span>
                <span>${esc(fmtDate(S.startDate))}</span>
              </div>
              <div class="confirm-receipt-row">
                <span class="muted">Monthly visits</span>
                <span>${monthlyAllowance(plan)} visits / mo</span>
              </div>
              <div class="confirm-receipt-row">
                <span class="muted">Member</span>
                <span>${esc(memberName.trim()||first)}</span>
              </div>
              <div class="confirm-receipt-row">
                <span class="muted">Payment</span>
                <span>${FIELDS.method==='paypal'?'PayPal':FIELDS.method==='wallet'?'Apple / Google Pay':'Credit / Debit Card'}</span>
              </div>
              <div class="confirm-receipt-row">
                <span class="muted">Email</span>
                <span class="text-truncate">${esc(S.email||'—')}</span>
              </div>
            </div>
            <div class="confirm-receipt-footer">
              ${esc(commitment.renewal.replace(/\.*$/, ''))}. Cancellation notice: ${esc(RULES.cancellationNotice.replace(/\.*$/, ''))}.
            </div>
          </div>
        </details>

        <!-- Urby Note Card -->
        <div class="confirm-urby-card">
          ${ulaAvatar('sm')}
          <div>
            <b>Need help or want to change?</b>
            <p>You can pause, upgrade, or manage your membership anytime in the app.</p>
          </div>
        </div>

        <!-- Demo Tools Card -->
        <div class="confirm-demo-card">
          <div class="fitpanel__label">Demo tools</div>
          <p class="xsmall muted" style="margin:4px 0 10px">Pilot testing utilities (not in production):</p>
          <ul class="confirm-demo-links">
            <li>${icon('refresh',16)} <button class="linkish" data-go="left">Your resume link</button></li>
            <li>${icon('speech',16)} <button class="linkish" data-go="email">Follow-up email preview</button></li>
            <li>${icon('grid',16)} <button class="linkish" data-go="data">Journey data</button></li>
            <li>${icon('bolt',16)} <button class="linkish" data-reset>Start fresh visitor</button></li>
          </ul>
        </div>

        <!-- Honest Pilot Notice -->
        <div class="notice notice--simulated" style="margin-top:14px">
          ${icon('info',17)}
          <span><strong>Simulated checkout.</strong> Nothing was charged and no membership exists.</span>
        </div>
      </aside>
    </div>
  </main>`;
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
