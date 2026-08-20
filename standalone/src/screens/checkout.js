/* A photograph, a name and a distance. Nothing tappable: this is a receipt for a decision
   already made, and a card that opens a sheet here would take you off the form. */
const asideVenue = v => {
  const kmLabel = typeof v.distanceKm === 'number' ? `${v.distanceKm} km away` : 'in Berlin';
  const tierTag = v.tier === 'premium'
    ? '<span class="tier-tag tier-tag--premium" style="font-size:10px;padding:1px 5px;margin-left:4px">Premium</span>'
    : v.tier === 'plus'
    ? '<span class="tier-tag tier-tag--plus" style="font-size:10px;padding:1px 5px;margin-left:4px">Plus</span>'
    : '';
  return `<div class="asidevenue"><div class="asidevenue__media">${venueMedia(v)}</div>
  <div><div class="asidevenue__name">${esc(v.name)}${tierTag}</div><div class="asidevenue__meta">${kmLabel}</div></div></div>`;
};

/* the way through — the only thing between the plan and the payment review */
function detailsScreen() {
  const F = fitSummary();
  const plan = F.plan, commitment = F.commitment;
  const d = Object.assign({ email: S.email||'' }, S.details||{});
  /* autocomplete and inputmode: a reviewer pointed out the browser could not
     autofill any of this, which is pure typing on a phone. */
  const f=(name,label,o={})=>`<div class="field ${o.wide?'field--wide':''} ${o.className||''}">
    <label for="${name}">${esc(label)}${o.optional?'<span class="field__opt">Optional</span>':''}</label>
    <input id="${name}" name="${name}" type="${o.type||'text'}" value="${esc(d[name]||'')}" placeholder="${esc(o.ph||'')}"
      ${o.auto?`autocomplete="${o.auto}"`:''} ${o.mode?`inputmode="${o.mode}"`:''}
      ${o.max?`max="${esc(o.max)}"`:''} ${o.min?`min="${esc(o.min)}"`:''} ${o.optional?'':'required aria-required="true"'}>
    ${ERRORS[name]?`<div class="field-error">${esc(ERRORS[name])}</div>`:''}
    ${o.why?`<div class="field__why">${icon('info',14)} <span>${esc(o.why)}</span></div>`:''}</div>`;
  const each = perSession(F.price, S.answers.frequency, plan);
  const shown = F.included.slice(0,3), more = Math.max(0, F.included.length - shown.length);
  const aside = `<div class="ordercard">
    <div class="fitpanel__label">Order summary</div>
    <div class="ordercard__idrow">
      <div class="ordercard__name">${esc(plan.name)}</div>
      <div class="ordercard__price"><b>${F.price} €</b><span>/ month</span></div>
    </div>
    <div class="ordercard__term">${esc(commitment.label)} &middot; Cancel anytime</div>

    ${shown.length ? `
    <div class="ordercard__venues">
      <div class="ordercard__venues-title">Included from your routine:</div>
      <div class="asidevenues">
        ${shown.map(asideVenue).join('')}
      </div>
      ${more > 0 ? `<div class="ordercard__venues-more">+ ${more} more places included in ${esc(plan.name)}</div>` : ''}
    </div>` : `
    <div class="ordercard__highlights">
      <div class="ordercard__item">${icon('checkThin',16)}<span>${esc(plan.venueCount)} venues across Germany &amp; Europe</span></div>
      <div class="ordercard__item">${icon('checkThin',16)}<span>${plan.dailyCheckIn?'Daily check-ins (up to 1 visit/day)':'4 check-ins each month'}</span></div>
      ${plan.plusCheckIns?`<div class="ordercard__item">${icon('checkThin',16)}<span>${plan.plusCheckIns} Plus check-ins / month (${plan.id==='max'?'2 massages':'1 massage'})</span></div>`:''}
    </div>`}

    <div class="ordercard__trust">
      ${icon('lock',15)} <span>Secure checkout &middot; Simulated pilot</span>
    </div>

    <div class="ordercard__links">
      <button class="linkish font-medium" type="button" data-go="plans">${icon('pencil',14)} Change plan</button>
    </div>
  </div>`;
  return `${topbar(2)}<main class="details-page-wrap" id="main">
    <div class="details-header-block">
      <h1 class="details-title" tabindex="-1">Your details</h1>
      <p class="details-lede">Set up your <strong>${esc(plan.name)}</strong> membership.</p>
    </div>
    <div class="two-col two-col--form">
      <div class="two-col__main">
        <form class="details-form" data-form="details" novalidate>
          <div class="details-sso">
            <div class="sso-row">
              <button class="sso-btn" type="submit" name="provider" value="google">${GOOGLE} <span>Google</span></button>
              <button class="sso-btn" type="submit" name="provider" value="apple">${APPLE} <span>Apple</span></button>
            </div>
          </div>
          <div class="details-divider"><span>or continue with email</span></div>
          <section class="details-section"><div class="fitpanel__label">Personal information</div>
            <div class="details-grid details-grid--person">
              ${f('firstName','First name',{auto:'given-name'})}${f('lastName','Last name',{auto:'family-name'})}
              ${f('birthDate','Date of birth',{type:'date',auto:'bday',max:dobMax(),min:dobMin(),why:'Must be at least 18 years old.'})}
            </div></section>
          <section class="details-section"><div class="fitpanel__label">Contact details</div>
            <div class="details-grid details-grid--contact">
              ${f('email','Membership email',{type:'email',auto:'email',mode:'email',ph:'you@example.com',why:'For your membership contract. Entering your email here does not save your progress if you leave.'})}
              ${f('phone','Mobile number',{type:'tel',auto:'tel',mode:'tel',ph:'+49 151 12345678',why:'For booking confirmations and studio access.'})}
            </div></section>
          <section class="details-section"><div class="fitpanel__label">Home address</div>
            <div class="details-grid details-grid--address">
              ${f('street','Street and number',{auto:'street-address'})}
              ${f('postcode','Postcode',{auto:'postal-code',mode:'numeric',ph:'12045'})}${f('city','City',{auto:'address-level2',ph:'Berlin'})}
            </div></section>
          <div class="details-form__actions"><button class="btn btn--primary btn--wide desktop-cta" type="submit">Continue to payment</button>
            <p class="reassure">${icon('lock',15)} Nothing is charged yet.</p></div>
          <div class="paybar">
            <div class="paybar__info" data-open-order-summary role="button" tabindex="0" aria-label="View order summary details">
              <div class="paybar__lead">
                <span class="paybar__plan"><b>${esc(plan.name)}</b></span>
                <span class="paybar__details-trigger">Summary ▾</span>
              </div>
              <div class="paybar__subtext">
                <span class="paybar__price"><b>${F.price} €</b> / month</span>
                ${each ? `<span class="paybar__per-visit">&approx; ${each} €/visit</span>` : ''}
              </div>
            </div>
            <button class="btn btn--primary" type="submit">Continue</button>
          </div>
        </form>
      </div>
      <aside class="two-col__aside">${aside}</aside>
    </div>
  </main>
  ${orderSummaryDrawer(aside)}
  ${exitModal()}`;
}

function orderSummaryDrawer(aside) {
  if (!ORDER_SUMMARY_OPEN) return '';
  return `<div class="drawer-backdrop" data-close-order-summary></div>
  <div class="plan-drawer" role="dialog" aria-modal="true" aria-label="Order summary details">
    <div class="plan-drawer__handle-bar" data-close-order-summary><div class="plan-drawer__handle"></div></div>
    <div class="plan-drawer__head">
      <h3 class="plan-drawer__title">Order summary</h3>
      <button class="plan-drawer__close" type="button" data-close-order-summary aria-label="Close summary">${icon('close', 18)}</button>
    </div>
    <div class="plan-drawer__body" style="padding-bottom:24px">
      ${aside}
      <div style="margin-top:16px">
        <button class="btn btn--secondary btn--block" type="button" data-close-order-summary>Close</button>
      </div>
    </div>
  </div>`;
}

function paymentScreen() {
  const plan = currentPlan(), commitment = commitmentById(S.commitmentId), price = priceFor(plan,S.commitmentId);
  const each = perSession(price, S.answers.frequency, plan);
  const method = FIELDS.method||'card';
  const match = matchVenues(A());
  const where = whereName(match);
  const memberName = ((S.details.firstName||'')+' '+(S.details.lastName||'')).trim()||'New Member';

  return `${topbar(3)}<main class="content pay-page" id="main">
    <div class="pay-head">
      <h1 class="h-question" style="margin-top:0" tabindex="-1">Review and confirm</h1>
      <p class="pay-sub">Final step before your routine begins. Everything you agree to is transparently listed below.</p>
    </div>

    <div class="pay-layout">
      <!-- LEFT COLUMN: Main Form & Actions -->
      <div class="pay-main">
        <form data-form="payment">
          <!-- 1. Payment Method Section -->
          <div class="pay-section-card">
            <div class="pay-card-head">
              <span class="pay-step-badge">1</span>
              <h2 class="pay-card-title">Payment method</h2>
            </div>
            <p class="pay-card-sub">Choose how you'd like to pay. Payment is simulated for this pilot.</p>

            <div class="pay-method-tabs" role="radiogroup" aria-label="Payment method">
              <label class="pay-tab ${method==='card'?'is-selected':''}">
                <input type="radio" name="method" value="card" ${method==='card'?'checked':''} class="sr-only">
                <span class="pay-tab__radio"></span>
                <span class="pay-tab__content">
                  <span class="pay-tab__label">Credit or Debit Card</span>
                  <span class="pay-tab__icons">
                    ${icon('card',20)}
                  </span>
                </span>
              </label>

              <label class="pay-tab ${method==='paypal'?'is-selected':''}">
                <input type="radio" name="method" value="paypal" ${method==='paypal'?'checked':''} class="sr-only">
                <span class="pay-tab__radio"></span>
                <span class="pay-tab__content">
                  <span class="pay-tab__label">PayPal</span>
                  <span class="pay-tab__icons">${icon('paypal',18)}</span>
                </span>
              </label>

              <label class="pay-tab ${method==='wallet'?'is-selected':''}">
                <input type="radio" name="method" value="wallet" ${method==='wallet'?'checked':''} class="sr-only">
                <span class="pay-tab__radio"></span>
                <span class="pay-tab__content">
                  <span class="pay-tab__label">Apple / Google Pay</span>
                  <span class="pay-tab__icons">${APPLE} ${GOOGLE}</span>
                </span>
              </label>
            </div>

            <!-- Adyen Mock Form / Drop-in -->
            <div class="pay-mock-form">
              ${method === 'card' ? `
                <div class="pay-field-group">
                  <label class="pay-label" for="mock-card-num">Card number</label>
                  <div class="pay-input-wrap">
                    <input id="mock-card-num" class="pay-input font-mono" type="text" placeholder="4532 &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 8890" value="4532 &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 8890" readonly>
                    <span class="pay-input-icon">${icon('lock', 15)}</span>
                  </div>
                </div>
                <div class="pay-field-row">
                  <div class="pay-field-group">
                    <label class="pay-label" for="mock-card-exp">Expiry</label>
                    <input id="mock-card-exp" class="pay-input font-mono" type="text" placeholder="MM/YY" value="08/28" readonly>
                  </div>
                  <div class="pay-field-group">
                    <label class="pay-label" for="mock-card-cvc">CVC / CVV</label>
                    <input id="mock-card-cvc" class="pay-input font-mono" type="text" placeholder="CVC" value="&bull;&bull;&bull;" readonly>
                  </div>
                </div>
              ` : method === 'paypal' ? `
                <div class="pay-wallet-box">
                  ${icon('paypal', 28)}
                  <div>
                    <b>PayPal account connected</b>
                    <p class="xsmall muted" style="margin:2px 0 0">Simulation: will authorize automatically on confirmation.</p>
                  </div>
                </div>
              ` : `
                <div class="pay-wallet-box">
                  <div style="display:flex;gap:8px">${APPLE} ${GOOGLE}</div>
                  <div>
                    <b>Device Wallet Ready</b>
                    <p class="xsmall muted" style="margin:2px 0 0">Simulation: standard biometrics check passed.</p>
                  </div>
                </div>
              `}

              <div class="pay-adyen-badge">
                ${icon('lock',14)}
                <span>Powered by Adyen. In production, this is where the secure Adyen drop-in is embedded. Payment is simulated in this pilot.</span>
              </div>
            </div>
          </div>

          <!-- 2. Terms & Confirmation Checklist -->
          <div class="pay-section-card">
            <div class="pay-card-head">
              <span class="pay-step-badge">2</span>
              <h2 class="pay-card-title">Agreement &amp; terms</h2>
            </div>
            <ul class="pay-terms-list">
              <li>
                ${icon('checkThin', 16)}
                <div>
                  <strong>Recurring monthly membership.</strong>
                  <span>Your plan renews automatically every month unless cancelled with ${esc(RULES.cancellationNotice.replace(/\.*$/, ''))}.</span>
                </div>
              </li>
              <li>
                ${icon('checkThin', 16)}
                <div>
                  <strong>14-day statutory right of withdrawal.</strong>
                  <span>You may withdraw within 14 days of joining without penalty.</span>
                </div>
              </li>
              <li>
                ${icon('checkThin', 16)}
                <div>
                  <strong>Terms &amp; privacy accepted.</strong>
                  <span>By confirming, you agree to the <button class="linkish" data-go="terms">General Terms and Conditions</button> and <button class="linkish" data-go="privacy">Privacy Policy</button>.</span>
                </div>
              </li>
            </ul>
          </div>

          <!-- 3. Primary & Secondary Action Row -->
          <div class="pay-actions">
            <div class="desktop-cta">
              <button class="btn btn--primary btn--lg" type="submit" style="width:100%">
                Confirm and start membership &mdash; ${price} &euro; / mo
              </button>
            </div>
            <div class="pay-actions__secondary">
              <button class="btn btn--secondary" type="button" data-go="details">${icon('back',16)} Back to details</button>
              <button class="linkish xsmall muted" type="button" data-go="save">Save progress for later</button>
            </div>
          </div>

          <!-- 4. Honest Pilot Disclaimer -->
          <div class="notice notice--simulated">
            ${icon('info',18)}
            <span><strong>Simulated checkout.</strong> Nothing is charged, no card details are collected, and no live contract is formed.</span>
          </div>

          <!-- Mobile Sticky Paybar -->
          <div class="paybar">
            <div class="paybar__info">
              <b>${esc(plan.name)}</b>
              <span>${price} &euro; / month${each?` &middot; &approx; ${each} &euro; / session`:''}</span>
            </div>
            <button class="btn btn--primary" type="submit">Confirm &amp; pay</button>
          </div>
        </form>
      </div>

      <!-- RIGHT COLUMN: Sticky Order Summary & Receipt (38%) -->
      <aside class="pay-sidebar">
        <div class="pay-summary-card">
          <div class="fitpanel__label">Order summary</div>

          <div class="pay-summary-hero">
            <div class="pay-summary-plan-badge">${esc(plan.name)}</div>
            <div class="pay-summary-price">
              <b>${price} &euro;</b> <span>/ month</span>
              <small>${esc(commitment.label)} &middot; Auto-renews</small>
            </div>
          </div>

          <div class="pay-summary-divider"></div>

          <!-- Highlights of what's included -->
          <div class="pay-summary-details">
            <div class="pay-detail-row">
              <span class="pay-detail-label">Member</span>
              <span class="pay-detail-val font-semibold">${esc(memberName)}</span>
            </div>
            <div class="pay-detail-row">
              <span class="pay-detail-label">Email</span>
              <span class="pay-detail-val">${esc(S.email || '—')}</span>
            </div>
            <div class="pay-detail-row pay-detail-row--editable">
              <span class="pay-detail-label"><label for="start-date">Start date</label></span>
              <div class="pay-detail-val pay-detail-val--select">
                <select id="start-date" class="pay-select" data-start-date>
                  ${startDateChoices().map(d => `<option value="${esc(d)}"${d === S.startDate ? ' selected' : ''}>${esc(fmtDate(d))}</option>`).join('')}
                </select>
                <span class="pay-detail-subtext">Memberships start on the 1st</span>
              </div>
            </div>
            <div class="pay-detail-row">
              <span class="pay-detail-label">Monthly visits</span>
              <span class="pay-detail-val font-semibold">${monthlyAllowance(plan)} visits / month</span>
            </div>
            ${where ? `
            <div class="pay-detail-row">
              <span class="pay-detail-label">Primary area</span>
              <span class="pay-detail-val">${esc(where)}</span>
            </div>` : ''}
          </div>

          <div class="pay-summary-divider"></div>

          <!-- Transparent Receipt Calculation -->
          <div class="pay-receipt">
            <div class="pay-receipt-row">
              <span>Monthly membership (${esc(plan.name)})</span>
              <span>${price}.00 &euro;</span>
            </div>
            <div class="pay-receipt-row">
              <span>Activation fee</span>
              <span class="pay-free-tag">FREE (0.00 &euro;)</span>
            </div>
            <div class="pay-receipt-row pay-receipt-total">
              <span>Due today</span>
              <span>${price}.00 &euro;</span>
            </div>
            <div class="pay-receipt-subtext">
              Billed monthly. Auto-renews unless cancelled.
            </div>
          </div>
        </div>
      </aside>
    </div>
  </main>${exitModal()}`;
}

function confirmationScreen() {
  const plan = currentPlan();
  const commitment = commitmentById(S.commitmentId);
  const price = priceFor(plan, S.commitmentId);
  const a = A();
  const match = matchVenues(a);
  const groups = a.activities || [];
  const pool = match.pool || [];
  const wp = weekPlan(groups, pool, plan.id, a.frequency);
  const sessions = wp.sessions || [];
  const memberName = ((S.details && S.details.firstName) || '') + ' ' + ((S.details && S.details.lastName) || '');
  const first = S.details && S.details.firstName ? S.details.firstName : (S.email ? S.email.split('@')[0] : 'there');

  return `${topbar(3,{saveExit:false})}<main class="content confirm-page" id="main">
    <!-- Celebratory Hero Header -->
    <div class="confirm-hero">
      <div class="confirm-hero__avatar-wrap">
        ${ulaAvatar('lg')}
        <span class="confirm-hero__sparkle">${icon('sparkle', 16)}</span>
      </div>
      <div class="confirm-hero__text">
        <h1 class="confirm-hero__title" tabindex="-1">You&rsquo;re all set, ${esc(first)}!</h1>
        <div class="confirm-hero__badge-row">
          <span class="confirm-hero__tag">Membership confirmed</span>
          <span class="confirm-hero__plan-tag">${esc(plan.name)} &middot; ${monthlyAllowance(plan)} visits/mo</span>
        </div>
        <p class="confirm-hero__sub">
          Starts <strong>${esc(fmtDate(S.startDate))}</strong> &middot; Everything is ready for your routine.
        </p>
      </div>
    </div>

    <div class="confirm-layout">
      <!-- LEFT MAIN COLUMN: Kickoff & Visual Gyms (62%) -->
      <div class="confirm-main">

        <!-- 1. Visual App & Kickoff Card -->
        <div class="confirm-card confirm-kickoff-card">
          <div class="confirm-card__head">
            <h2 class="confirm-card__title">Ready for your first check-in</h2>
          </div>

          <div class="confirm-kickoff-grid">
            <div class="confirm-kickoff-step">
              <div class="confirm-kickoff-step__num">1</div>
              <div class="confirm-kickoff-step__body">
                <b>Download the USC app</b>
                <div class="confirm-app-badges">
                  <a href="https://apps.apple.com/app/urban-sports-club/id998362348" target="_blank" rel="noopener" class="confirm-store-btn confirm-store-btn--apple">${APPLE} <span>App Store</span></a>
                  <a href="https://play.google.com/store/apps/details?id=com.urbansportsclub" target="_blank" rel="noopener" class="confirm-store-btn confirm-store-btn--google">${GOOGLE} <span>Google Play</span></a>
                </div>
              </div>
            </div>

            <div class="confirm-kickoff-step">
              <div class="confirm-kickoff-step__num">2</div>
              <div class="confirm-kickoff-step__body">
                <b>Sign in with your email</b>
                <p><strong class="text-ink">${esc(S.email||'your email')}</strong></p>
              </div>
            </div>

            <div class="confirm-kickoff-step">
              <div class="confirm-kickoff-step__num">3</div>
              <div class="confirm-kickoff-step__body">
                <b>Scan QR code at venue &amp; work out</b>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Your Starting Routine & Chosen Studios -->
        ${sessions.length ? `
        <div class="confirm-card confirm-routine-card">
          <div class="confirm-card__head">
            <div>
              <div class="confirm-card__badge-row">
                <span class="confirm-card__badge">Your initial routine</span>
                <span class="confirm-card__subbadge">${sessions.length} sessions / week</span>
              </div>
              <h2 class="confirm-card__title">The places you picked</h2>
            </div>
          </div>

          <div class="confirm-routine-carousel-wrap">
            <div class="confirm-routine-grid" role="region" aria-label="Chosen workout places">
              ${sessions.map(s => {
                const areaLabel = s.venue.nearestArea ? s.venue.nearestArea.name : (AREAS.find(ar=>ar.id===s.venue.area)||{}).name || '';
                const tierClass = s.venue.tier === 'premium' ? 'badge--premium' : s.venue.tier === 'plus' ? 'badge--plus' : 'badge--standard';
                const tierText = s.venue.tier === 'premium' ? 'Premium' : s.venue.tier === 'plus' ? 'Plus' : 'Included';
                return `
                <button type="button" class="confirm-venue-card linkish" data-venue="${esc(s.venue.id)}" aria-label="View details about ${esc(s.venue.name)}">
                  <div class="venue-card__media confirm-venue-media">
                    ${venueMedia(s.venue, (groupById(s.groupId)||{}).activities)}
                    <span class="confirm-venue-day-badge">${esc(s.day)}</span>
                  </div>
                  <div class="confirm-venue-card__body">
                    <div class="confirm-venue-card__top">
                      <b>${esc(s.venue.name)}</b>
                      <span class="confirm-tier-badge ${tierClass}">${tierText}</span>
                    </div>
                    <div class="confirm-venue-card__meta">
                      <span>${esc(s.activity)}</span>
                      ${areaLabel ? ` &middot; <span>${esc(areaLabel)}</span>` : ''}
                    </div>
                  </div>
                </button>`;
              }).join('')}
            </div>
          </div>

          <div class="confirm-routine-banner">
            ${icon('checkThin', 16)}
            <span>Your routine is saved. You can follow these days or discover and book all venues directly in the USC app.</span>
          </div>
        </div>` : ''}

      </div>

      <!-- RIGHT SIDEBAR COLUMN: Collapsible Receipt & Demo Tools (38%) -->
      <aside class="confirm-sidebar">
        <!-- Collapsible Receipt Card -->
        <details class="confirm-receipt-disclosure">
          <summary class="confirm-receipt-summary">
            <div class="confirm-receipt-summary__left">
              <span class="fitpanel__label" style="margin:0">Order details &amp; receipt</span>
              <span class="confirm-receipt-price">${price}.00 &euro;</span>
            </div>
            <span class="confirm-receipt-chevron">${icon('chevronDown', 16)}</span>
          </summary>

          <div class="confirm-receipt-body">
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
