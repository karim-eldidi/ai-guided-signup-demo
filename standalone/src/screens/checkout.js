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
      <p class="details-lede">Set up your <strong>${esc(plan.name)}</strong> membership &middot; Nothing is charged today.</p>
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
  const renewal = commitment.renewal;
  const method = FIELDS.method||'card';
  const match = matchVenues(A());
  const where = whereName(match);
  const memberName = ((S.details.firstName||'')+' '+(S.details.lastName||'')).trim()||'New Member';

  return `${topbar(3)}<main class="content pay-page" id="main">
    <div class="pay-head">
      <h1 class="h-question" style="margin-top:0" tabindex="-1">Review and confirm</h1>
      <p class="pay-sub">Final step before your routine begins. Everything you agree to is transparently listed below.</p>
    </div>
    ${ulaNote('Review your membership details and confirmed start date before confirming.')}

    <div class="pay-layout">
      <!-- LEFT COLUMN: Main Form & Actions -->
      <div class="pay-main">
        <form data-form="payment">
          <!-- 1. Payment Method Section -->
          <div class="pay-section-card">
            <div class="pay-section-title">
              <span class="pay-step-badge">1</span>
              <span>Choose payment method</span>
            </div>
            <div class="options">
              <label class="option-card ${method==='card'?'is-selected':''}" data-card>
                <input class="option-card__input" type="radio" name="method" value="card" ${method==='card'?'checked':''}>
                <span class="option-card__icon">${icon('card',21)}<span class="option-card__check">${icon('checkThin',17)}</span></span>
                <span class="option-card__label">
                  <strong>Credit or debit card</strong>
                  <span class="xsmall muted" style="display:block;font-weight:400;margin-top:2px">Visa, Mastercard, Amex</span>
                </span>
              </label>
              <label class="option-card ${method==='paypal'?'is-selected':''}" data-card>
                <input class="option-card__input" type="radio" name="method" value="paypal" ${method==='paypal'?'checked':''}>
                <span class="option-card__icon">${icon('paypal',21)}<span class="option-card__check">${icon('checkThin',17)}</span></span>
                <span class="option-card__label">
                  <strong>PayPal</strong>
                  <span class="xsmall muted" style="display:block;font-weight:400;margin-top:2px">Fast &amp; secure checkout with PayPal</span>
                </span>
              </label>
              <label class="option-card ${method==='wallet'?'is-selected':''}" data-card>
                <input class="option-card__input" type="radio" name="method" value="wallet" ${method==='wallet'?'checked':''}>
                <span class="option-card__icon">${icon('wallet',21)}<span class="option-card__check">${icon('checkThin',17)}</span></span>
                <span class="option-card__label">
                  <strong>Apple Pay &amp; Google Pay</strong>
                  <span class="xsmall muted" style="display:block;font-weight:400;margin-top:2px">1-tap device checkout</span>
                </span>
              </label>
            </div>
            <div class="pay-mock-notice">
              ${icon('lock',14)} <span>Powered by Adyen. In production, this is where the secure Adyen drop-in is embedded. Payment is simulated in this pilot.</span>
            </div>
          </div>

          <!-- 2. Transparent Cancellation & Flexibility (Collapsible) -->
          <details class="pay-terms-disclosure pay-section-card">
            <summary>
              <div class="pay-terms-summary-left">
                <span class="pay-step-badge">2</span>
                <span>Cancellation, pause &amp; terms</span>
              </div>
              <span class="pay-terms-chevron">${icon('chevronDown', 18)}</span>
            </summary>
            <div class="pay-terms-body">
              <ul class="pay-terms-list">
                <li>
                  ${icon('checkThin',17)}
                  <span><strong>${esc(renewal)}</strong></span>
                </li>
                <li>
                  ${icon('checkThin',17)}
                  <span><strong>Cancellation notice:</strong> ${esc(RULES.cancellationNotice)}</span>
                </li>
                <li>
                  ${icon(commitment.canPause?'checkThin':'info',17)}
                  <span>${commitment.canPause ? '<strong>Free pause:</strong> Pause your membership for 1 to 6 full months at zero cost.' : `<strong>No pause:</strong> A ${commitment.minimumTermMonths}-month membership cannot be paused (monthly memberships are fully flexible without pause).`}</span>
                </li>
                <li>
                  ${icon('sparkle',17)}
                  <span><strong>Instant access:</strong> Check in at any included venue via the USC app starting ${esc(fmtDate(S.startDate))}.</span>
                </li>
              </ul>
              <p class="xsmall muted" style="margin:14px 0 0">Real published terms. You can always review or update your membership in the USC app.</p>
            </div>
          </details>

          <!-- 3. Primary Action Row -->
          <div class="btn-row pay-actions desktop-cta">
            <button class="btn btn--primary btn--lg" type="submit" style="width:100%">
              Confirm and start membership &mdash; ${price} &euro; / mo
            </button>
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

      <!-- RIGHT COLUMN: Sticky Order Summary Sidebar -->
      <aside class="pay-sidebar" aria-label="Order summary">
        <div class="pay-summary-card">
          <div class="pay-summary-head">
            <div>
              <span class="pay-plan-badge">${esc(plan.name)}</span>
              <h2 class="pay-summary-title">${esc(plan.name)} Membership</h2>
              <span class="pay-summary-term">${esc(commitment.label)}</span>
            </div>
            <div class="pay-summary-price">
              <b>${price} &euro;</b>
              <small>/ month</small>
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
            <div class="pay-detail-row">
              <span class="pay-detail-label"><label for="start-date">Start date</label></span>
              <span class="pay-detail-val">
                <select id="start-date" data-start-date style="font:inherit;color:inherit;background:transparent;border:1px solid var(--cream-line);border-radius:var(--radius);padding:4px 8px">
                  ${startDateChoices().map(d => `<option value="${esc(d)}"${d === S.startDate ? ' selected' : ''}>${esc(fmtDate(d))}</option>`).join('')}
                </select>
                <small class="muted">memberships start on the 1st</small>
              </span>
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

          <!-- Receipt / Price Breakdown -->
          <div class="pay-receipt">
            <div class="pay-receipt-row">
              <span>${esc(plan.name)} (Monthly)</span>
              <span>${price}.00 &euro;</span>
            </div>
            <div class="pay-receipt-row">
              <span>Activation fee</span>
              <span class="pay-free-tag">FREE (0.00 &euro;)</span>
            </div>
            <div class="pay-receipt-row pay-receipt-total">
              <span>Total due today</span>
              <span>${price}.00 &euro;</span>
            </div>
            <div class="pay-receipt-subtext">
              Billed monthly. Auto-renews unless cancelled.
            </div>
          </div>

          <div class="pay-summary-divider"></div>

          <div class="pay-urby-reassurance">
            ${ulaAvatar('sm')}
            <p>Everything is flexible. You can adjust your plan, switch commitments, or cancel whenever you need.</p>
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
