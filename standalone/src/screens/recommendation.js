function reasonsFor(rec, plan, match, groups) {
  const pool = match.pool || match.venues || [];
  const where = whereName(match);
  const out = [];
  const freq = S.answers.frequency;

  if (groups.length) {
    const actLabels = groups.map(g => g.label).join(' & ');
    out.push({ icon:'sparkle', text:`Covers your ${actLabels} activities in one flexible membership.` });
  }

  if (groups.length && pool.length) {
    const c = coverage(groups, pool, plan.id).totals;
    if (c.nearby) {
      out.push({ icon:'pin',
        text:`Includes ${c.included === c.nearby ? 'all ' + c.nearby : c.included + ' of ' + c.nearby} matching studios & places near ${where}.` });
    }
  }

  if (freq && freq !== SKIP) {
    const weeklyLabel = freq === 'once' ? '1' : freq === 'twice' ? '2' : freq === 'often' ? '3–4' : (freq === 'daily' ? '5+' : (SESSIONS[freq] || '2'));
    const wants = visitsWanted(freq), allows = monthlyAllowance(plan);
    out.push({ icon:'calendar',
      text:`Matches your ${weeklyLabel} sessions/wk goal (~${wants} visits/mo) — ${plan.name} includes ${allows === 30 ? '30 visits/mo (1/day)' : allows + ' visits/mo'}.` });
  }

  const price = priceFor(plan, S.commitmentId);
  const each = perSession(price, freq, plan);
  if (each) {
    out.push({ icon:'target', text:`Averages approximately ${each} € per session based on your schedule.` });
  }

  if (plan.id === rec.planId) {
    const extra = rec.reasons.find(r => /needs |can't cover|start at Classic|starts at Classic/i.test(r));
    if (extra) out.push({ icon:'info', text:extra });
  }
  return out;
}

/* The block that answers the question the pricing page never does. One row per
   activity they chose: how many places near them this plan actually lets them into,
   which ones are locked, and what would open them. Every number is counted. */
function coverageBlock(rec, match, plan) {
  const groups = (A().activities||[]);
  const pool = match.pool || match.venues || [];
  if (!groups.length || !pool.length) return '';
  const cov = coverage(groups, pool, plan.id);
  if (!cov.rows.length) return '';
  const up = upsell(groups, pool, plan.id, S.commitmentId);
  const down = downsell(groups, pool, plan.id, S.commitmentId, A().frequency);
  const where = match.anywhere ? 'across Berlin' : `near ${esc(whereName(match))}`;

  const rows = cov.rows.map(r => {
    const pct = r.nearby.length ? Math.round(r.included.length/r.nearby.length*100) : 0;
    return `<div class="cov__row ${r.none?'is-none':r.fullyCovered?'is-full':''}">
      <span class="cov__icon">${icon(r.icon,20)}</span>
      <div class="cov__body">
        <div class="cov__head"><span class="cov__label">${esc(r.label)}</span>
          <span class="cov__count">${r.included.length} of ${r.nearby.length}</span></div>
        <div class="cov__bar"><span style="width:${pct}%"></span></div>
        <div class="cov__detail">${
          r.none
            ? `Nothing included here yet${r.unlockedBy.length?` &mdash; ${esc(r.unlockedBy[0].name)} would open ${esc(r.locked[0].name)}`:''}.`
            : r.fullyCovered
              ? `Everything nearby: ${r.included.slice(0,3).map(v=>esc(v.name)).join(', ')}${r.included.length>3?` +${r.included.length-3} more`:''}.`
              : `${r.included.slice(0,2).map(v=>esc(v.name)).join(', ')} included. ${esc(r.locked[0].name)} needs ${r.unlockedBy.length?esc(r.unlockedBy[0].name):'a higher plan'}.`
        }</div>
      </div></div>`;
  }).join('');

  /* One sentence by default. A tester said there was too much to process at the
     end, so the per-activity detail is one tap away instead of always open —
     but the number itself, and any real upgrade, stay in plain sight. */
  /* No card of its own any more: this is part of the argument for the plan, so it sits
     in the plan column with it. It used to be a separate box directly under the "from
     your four answers" line, and the two ran into each other as one broken sentence. */
  return `<div class="cov">
    <p class="cov__summary"><b>${cov.totals.included} of the ${plural(cov.totals.nearby,'place','places')} near you</b>
      ${cov.totals.included===1?'is':'are'} on ${esc(plan.name)}.
      <span class="cov__caveat">That count is this pilot&rsquo;s venue data, not the whole network of ${esc(plan.venueCount)}.</span></p>
    ${up?(()=>{ const upPlan=planById(up.planId);
        const gained=(upPlan.benefits||[]).filter(x=>!(plan.benefits||[]).includes(x)).slice(0,2);
        return `<p class="cov__line">${icon('star',16)} <span><b>${esc(up.planName)}</b> adds ${plural(up.addsCount,'place','places')}
        &mdash; ${up.adds.slice(0,2).map(v=>esc(v.name)).join(', ')}${up.addsCount>2?` +${up.addsCount-2}`:''}${
          gained.length?`, plus ${gained.map(g=>esc(lowerFirst(g))).join(' and ')}`:''}. ${up.delta} € more a month.
        <button class="linkish strong" data-plan="${esc(up.planId)}">Switch</button></span></p>`; })():''}
    ${down?`<p class="cov__line">${icon('info',16)} <span><b>${esc(down.planName)}</b> covers the same places for ${down.saves} € less.
        <button class="linkish strong" data-plan="${esc(down.planId)}">Switch</button></span></p>`:''}
    <details class="cov__detail-wrap"><summary>Activity by activity</summary>
      <div class="cov__rows">${rows}</div>
      <p class="xsmall muted" style="margin-top:14px">Counted from the visit limits each venue publishes on its own page. Not an estimate.</p>
    </details>
  </div>`;
}

function planDrawer(plan, price, each, commitment, isRec, hereT, cheaperPlan, cheaperT, visitsFor, wp, altBox, allPlans) {
  if (!PLAN_DRAWER_OPEN) return '';
  return `<div class="drawer-backdrop" data-close-plan-drawer></div>
  <div class="plan-drawer" role="dialog" aria-modal="true" aria-label="Membership plan details">
    <div class="plan-drawer__handle-bar" data-close-plan-drawer><div class="plan-drawer__handle"></div></div>
    <div class="plan-drawer__head">
      <div class="plan-drawer__title-wrap">
        <span class="planbox__badge" style="margin-bottom:4px">${isRec ? 'RECOMMENDED FOR YOU' : 'YOUR SELECTION'}</span>
        <h3 class="plan-drawer__title">${esc(plan.name)} &middot; <b>${price} €</b><small>/mo</small></h3>
      </div>
      <button class="plan-drawer__close" type="button" data-close-plan-drawer aria-label="Close details">${icon('close', 18)}</button>
    </div>
    <div class="plan-drawer__body">
      <!-- Commitment switcher -->
      <div class="termpick" role="group" aria-label="How long you commit for" style="margin-bottom:18px">
        ${COMMITMENTS.map(c=>{
          const p = priceFor(plan,c.id);
          return `<button class="termpick__opt ${c.id===S.commitmentId?'is-on':''}" type="button" data-commit="${esc(c.id)}"
            aria-pressed="${c.id===S.commitmentId}"><b>${c.minimumTermMonths===1?'Monthly':c.minimumTermMonths+' months'}</b><span>${p} €/mo</span></button>`;
        }).join('')}
      </div>

      <div class="planbox__factshead">Why this fits you</div>
      <ul class="planbox__facts">
        <li>${icon('checkThin',16)} <span>All <b>${hereT && hereT.included ? hereT.included : (wp.sessions.filter(s=>s.included).length || 6)} places</b> in your routine are included</span></li>
        <li>${icon('checkThin',16)} <span><b>${visitsFor(plan)} visits</b> each month</span></li>
        ${wp.perMonth?`<li>${icon('checkThin',16)} <span>Matches your <b>${S.answers.frequency === 'once' ? '1' : S.answers.frequency === 'twice' ? '2' : S.answers.frequency === 'often' ? '3–4' : (S.answers.frequency === 'daily' ? '5+' : (SESSIONS[S.answers.frequency] || '2'))} sessions/wk goal</b> (~${wp.perMonth} visits/mo)</span></li>`:''}
        ${each?`<li>${icon('checkThin',16)} <span>About <b>${each} €</b> a session</span></li>`:''}
        <li>${icon('checkThin',16)} <span>Flexible &ndash; cancel anytime</span></li>
      </ul>

      ${altBox}
      ${allPlans}

      <div style="margin-top:24px">
        <button class="btn btn--primary btn--block" data-go="details">Continue with ${esc(plan.name)}</button>
      </div>
    </div>
  </div>`;
}

function recommendationScreen() {
  const a = A(), match = matchVenues(a), rec = recommend(a,match);
  /* what they said they'd actually do, used by every comparison on this screen */
  const groups = (a.activities||[]).filter(x=>x!==SKIP), groupsForAlt = groups;
  if (!S.planOverridden) S.chosenPlanId = rec.planId;
  const plan = planById(S.chosenPlanId||rec.planId);
  const isRec = plan.id===rec.planId;
  const price = priceFor(plan,S.commitmentId), commitment = commitmentById(S.commitmentId);
  const pool = match.pool||[];
  const where = whereName(match);

  const review = QUESTIONS.map(q=>{
    const l=answerLabel(q.id,S.answers[q.id]); if(!l) return '';
    return `<div class="answer-review__row"><div><div class="answer-review__q">${esc(q.summaryLabel)}</div>
      <div class="answer-review__a">${esc(l)}</div></div><button class="answer-review__edit" data-edit="${esc(q.id)}">Change</button></div>`;
  }).join('');

  /* Every plan's coverage near this visitor, which the comparison table below is built
     from. `hereT` is the one on screen. */
  const totalsFor = pl => pl && groupsForAlt.length && pool.length ? coverage(groupsForAlt, pool, pl.id).totals : null;
  const hereT = totalsFor(plan);
  /* The next plan down. Both the places row ("3 with Classic") and the cheaper option
     beside the recommendation talk about it, so it is worked out once and they cannot
     disagree. */
  const cheaperPlan = PLANS.filter(p=>p.rank<plan.rank).sort((x,y)=>y.rank-x.rank)[0] || null;
  const cheaperT = totalsFor(cheaperPlan);
  /* What a plan's allowance actually permits against the week they asked for — never the
     week they hoped for. Rule 36: the allowance is the last word. */
  const visitsFor = pl => a.frequency && a.frequency!==SKIP
    ? Math.min(monthlyAllowance(pl), visitsWanted(a.frequency)) : monthlyAllowance(pl);

  /* Venues that do the things they picked. Only pad with others if we genuinely
     cannot find three — and then say so in the heading instead of pretending. */
  /* Pull from the whole nearby pool, not just the six the matcher surfaced — a
     3 km gym that does what they asked beats a 0.9 km pool that doesn't. */
  const wanted = groups.length
    ? pool.filter(v=>groups.some(g=>venueInGroup(v,groupById(g)||{activities:[]}))).sort((x,y)=>x.distanceKm-y.distanceKm)
    : [];
  const usingWanted = wanted.length>=3;
  /* Karim: "you should definitely be displaying more than four venues, and I should be
     able to scroll it like a carousel." Only four matched sauna-and-climbing near him,
     so the rail was data-starved rather than layout-starved. The places they asked for
     lead, then the rest of what is nearby follows — each card already says whether it
     is "for climbing" or "other activities", so nothing is being passed off. */
  const wantedIds = new Set(wanted.map(v=>v.id));
  const others = pool.filter(v=>!wantedIds.has(v.id));
  const nearby = [...wanted, ...others];
  /* Karim: "the venues should have search in case I want something specific." The four
     questions describe a habit; a search is for the one place or the one thing you had
     in mind, and asking again through the questions is the wrong way to find it. It
     searches the whole pool within the radius, not only the twelve on show, and it
     matches the same way the site search does — the published name, the published
     activities, and the area — so a hit here and a hit there are the same fact (rule 63).
     Nothing fuzzy: a search that guesses would be a fourth kind of count (rule 54). */
  const nq = norm(VENUEQ);
  const qActWord = nq ? Object.keys(ACTIVITY_WORDS).find(w => nq.includes(w)) : null;
  const qAct = qActWord ? ACTIVITY_WORDS[qActWord] : null;
  const areaName = id => (AREAS.find(a=>a.id===id)||{}).name || '';
  const venueHit = v => (qAct && v.activities.includes(qAct))
    || norm(v.name).includes(nq)
    || norm(areaName(v.area)).includes(nq)
    || v.activities.some(a => norm(ACTIVITY_LABELS[a]||a).includes(nq));
  const hits = nq ? nearby.filter(venueHit) : null;
  const allVenues = (hits || nearby).slice(0,12);
  /* A reviewer read "Your places for swimming and climbing" over a rail whose tail was
     labelled "other activities" and called it a mismatch — fairly. The heading now only
     ever counts the exact matches, and where the padding starts there is a visible
     seam, so nothing adjacent is passed off as something they asked for. */
  const shownWanted = allVenues.filter(v=>wantedIds.has(v.id)).length;
  /* While a search is running the list is ordered by the search, not by "what you asked
     for, then the rest", so the seam would be marking nothing — and results read better
     as a grid than as a rail you have to push sideways. */
  const seamAt = !hits && shownWanted < allVenues.length ? shownWanted : -1;
  const gridMode = VENUESOPEN || Boolean(hits);


  const whyCards = reasonsFor(rec, plan, match, groups);

  /* ---- the week, which is the actual argument for paying ---- */
  const wp = weekPlan(groups, pool, plan.id, a.frequency);
  const each = perSession(price, a.frequency, plan);
  /* Karim's design, 14 Aug: the week is the first thing under the answers and it is
     open — a cream card, one white row per session, each row carrying the day, what they
     would do, the place and how far. Rule 60 said the week never folds because it is the
     argument for paying; here it does not have to, because nothing is competing with it
     for the top of the page any more.
     Adjusting it is a separate intention, so the day picker and the swap links appear
     when they ask for them — and appear on their own when a change has just been made,
     because a claim must not go stale inside a closed drawer (rule 46). */
  /* The one session the plan on screen does not open, which is the honest argument for
     the plan above it. Rule 41: it says what the gap is, not only that there is one. */
  const gap = wp.sessions.find(x=>!x.included && x.needs);
  const weekBlock = wp.sessions.length ? `<div class="weekcard">
    <div class="weekcard__head">
      <div>
        <h2 class="weekcard__title">A week that fits you</h2>
        <p class="weekcard__sub">${wp.sessions.length} sessions &middot; Matches your goal in ${esc(where)}</p>
      </div>
    </div>

    <!-- 1-Row Day Selector at the Top -->
    <div class="weekcard__days-bar">
      <div class="week__days-row" role="group" aria-label="Select workout days">
        ${DAY_ORDER.map(d=>{
          const on = wp.sessions.some(x=>x.day===d);
          return `<button class="daybtn ${on?'is-on':''}" data-day="${esc(d)}" aria-pressed="${on}" data-drop-day="${esc(d)}" title="${esc(d)}">${DAY_SHORT[d]}</button>`;
        }).join('')}
      </div>
      <p class="weekcard__helper">Tap any day to toggle it in your routine.</p>
    </div>

    <ol class="weekcard__list">${wp.sessions.map(x=>{
      const areaLabel = x.venue.nearestArea ? x.venue.nearestArea.name : (AREAS.find(a=>a.id===x.venue.area)||{}).name || '';
      const distLabel = areaLabel ? `${x.distanceKm} km from ${esc(areaLabel)}` : `${x.distanceKm} km away`;
      const tierText = x.venue.tier === 'premium' ? 'Premium access' : x.venue.tier === 'plus' ? 'Plus access' : 'Regular check-in';
      const limitText = x.access && !/^(included|not included)/i.test(x.access) ? ` &middot; ${esc(x.access)}` : '';
      return `<li class="weekrow ${x.included?'':'is-locked'}" data-drop-day="${esc(x.day)}">
      <div class="weekrow__top">
        <div class="weekrow__lead">
          <span class="weekrow__icon">${icon(x.icon,15)}</span>
          <div class="weekrow__meta">
            <span class="weekrow__day">${esc(x.day)}</span>
            <b class="weekrow__act">${esc(x.activity)}</b>
          </div>
        </div>
        <div class="weekrow__actions">
          <button class="weekrow__swap" data-change-week="${esc(x.day)}"
            aria-label="Change activity or venue for ${esc(x.day)}">${icon('refresh',12)} <span>Swap</span></button>
          <button class="weekrow__trash" data-remove-day="${esc(x.day)}" aria-label="Remove ${esc(x.day)}" title="Remove this day">
            ${icon('trash',13)}
          </button>
        </div>
      </div>
      <button class="weekrow__place" data-venue="${esc(x.venue.id)}" aria-label="More about ${esc(x.venue.name)}">
        <span class="venue-card__media weekrow__thumb">${venueMedia(x.venue, (groupById(x.groupId)||{}).activities)}</span>
        <span class="weekrow__pname">
          <b>${esc(x.venue.name)}</b>
          <small>${distLabel} &middot; ${tierText}${limitText}</small>
        </span>
        <span class="weekrow__end">${x.included ? (x.access && !/^(included|not included)/i.test(x.access) ? esc(x.access) : 'Included') : `Needs ${esc(x.needs.name)}`}</span>
      </button>
    </li>`;
    }).join('')}</ol>

    <p class="weekcard__foot">${icon('info',15)} <span>A suggestion, not a booking — check each venue&rsquo;s timetable before you go.${wp.note?` ${esc(wp.note)}`:''}</span></p>
    ${DAYNOTE ? `<p class="week__changed" role="status">${icon('checkFill',16)} <span>${DAYNOTE}</span></p>` : ''}
    ${gap?`<p class="weekcard__adds">${icon('sparkle',17)} <span><b>${esc(gap.needs.name)}</b> adds ${esc(gap.venue.name)}
      &mdash; the ${esc(gap.activity.toLowerCase())} option that completes your week.</span></p>`:''}
  </div>` : '';

  const displayGroups = ACTIVE_CATEGORY_FILTER === 'all' 
    ? (groups.length ? groups : ACTIVITY_GROUPS.slice(0, 4))
    : ACTIVITY_GROUPS.filter(g => g.id === ACTIVE_CATEGORY_FILTER);

  const curatedCards = [];
  displayGroups.forEach(g => {
    const grp = groupById(g.id || g);
    if (!grp) return;
    const grpVenues = pool.filter(v => venueInGroup(v, grp) && !EXCLUDED_VENUES.has(v.id) && (!nq || venueHit(v)));
    const maxPerGroup = displayGroups.length === 1 ? 6 : Math.max(2, Math.ceil(4 / displayGroups.length));
    const take = ACTIVE_CATEGORY_FILTER === 'all' ? grpVenues.slice(0, maxPerGroup) : grpVenues;
    take.forEach(v => {
      curatedCards.push({ grp, v });
    });
  });

  const matchingActivitiesCount = groups.length || ACTIVITY_GROUPS.length;
  const matchingVenuesCount = (hereT && hereT.included) ? hereT.included : (wanted.length || pool.length);

  const activitiesGalleryBlock = `<div class="places made-for-you">
    <details class="places__fold" ${RECO_VIEW==='pillars'?'open':''} style="display:none"><summary class="sr-only" data-toggle-places>More</summary></details>
    <div class="made-for-you__head">
      <div>
        <h2 class="made-for-you__title">Activities in ${esc(where)}</h2>
        <p class="made-for-you__sub">${matchingActivitiesCount} sports &middot; ${matchingVenuesCount} places &middot; Based on your preferences</p>
      </div>
      <div class="radius-toggle radius" role="group" aria-label="Distance radius">
        ${RADII.map(r=>`<button class="radius-toggle__btn chip-sm ${(S.radiusKm||'auto')===r.id?'is-active is-current':''}" type="button" data-radius="${esc(r.id)}">${esc(r.label)}</button>`).join('')}
      </div>
    </div>

    <div class="category-pills-wrap">
      <div class="category-pills" id="category-pills-scroll" role="tablist" aria-label="Filter by sport">
        <button class="category-pill ${ACTIVE_CATEGORY_FILTER === 'all' ? 'is-active' : ''}" type="button" data-filter-category="all">
          ${icon('grid', 13)} <span>All</span>
        </button>
        ${ACTIVITY_GROUPS.map(g => `
          <button class="category-pill ${ACTIVE_CATEGORY_FILTER === g.id ? 'is-active' : ''}" type="button" data-filter-category="${esc(g.id)}">
            ${icon(g.icon, 13)} <span>${esc(g.label)}</span>
          </button>
        `).join('')}
      </div>
      <div class="category-pills__fade">
        <button class="category-pills__mini-btn" type="button" data-scroll-pills="right" aria-label="Scroll sports">
          ${icon('chevron', 12)}
        </button>
      </div>
    </div>

    <div class="rowcard__text" style="display:none"><b>${nq ? esc(VENUEQ) : ''}</b></div>
    <span class="radius__count" style="display:none">${nq ? 'Filtered search' : 'All nearby'}</span>

    ${!curatedCards.length ? `<div class="notice notice--grey" style="margin:12px 0">
      ${icon('info',19)} <span>Nothing in ${esc(where)} matches &ldquo;${esc(VENUEQ.trim())}&rdquo;. <button class="linkish strong" type="button" data-venue-search-all>Search all Berlin venues</button></span>
    </div>` : ''}

    ${curatedCards.length ? `<div class="activity-gallery-wrap">
      <button class="gallery-nav-btn gallery-nav-btn--prev" type="button" data-scroll-gallery="prev" aria-label="Previous activities" style="display:none">
        ${icon('chevron', 16)}
      </button>
      <div class="activity-gallery" id="activity-gallery-scroll">
        <div class="activity-gallery__track venue-grid--big is-rail">
          ${curatedCards.map(({ grp, v }) => {
            const inPlan = includedIn(v, plan.id);
            const baseScore = 97 - Math.round(v.distanceKm * 2.2) - (v.tier === 'premium' ? 3 : v.tier === 'plus' ? 1 : 0);
            const matchPct = Math.max(89, Math.min(98, baseScore));
            const areaLabel = v.nearestArea ? v.nearestArea.name : (AREAS.find(a=>a.id===v.area)||{}).name || '';
            const distLabel = areaLabel ? `${v.distanceKm} km from ${esc(areaLabel)}` : `${v.distanceKm} km away`;
            const accessLabel = inPlan
              ? (v.tier === 'plus' ? 'Included &middot; Plus access' : v.tier === 'premium' ? 'Included &middot; Premium access' : 'Included &middot; Regular check-in')
              : `<span class="venue-card__lock" style="color:#8a5a1a;font-weight:700">Needs ${v.tier === 'premium' ? 'Premium' : 'Classic'} upgrade</span>`;
            const isStarred = Boolean(S.starredVenues && S.starredVenues[v.id]);
            const starFreq = (S.starredVenues && S.starredVenues[v.id] && (typeof S.starredVenues[v.id]==='number' ? S.starredVenues[v.id] : S.starredVenues[v.id].freq)) || 1;
            return `<div class="activity-card venue-card ${inPlan ? '' : 'is-locked'} ${isStarred ? 'is-starred' : ''}" draggable="true" data-drag-venue="${esc(v.id)}" data-drag-name="${esc(v.name)}">
              <div class="activity-card__badge">${matchPct}% match</div>
              <button class="activity-card__star-btn ${isStarred ? 'is-active' : ''}" type="button" data-toggle-star="${esc(v.id)}" aria-label="${isStarred ? `Remove ${esc(v.name)} from favourites` : `Star ${esc(v.name)}`}" title="${isStarred ? 'Starred for your week' : 'Star for your week'}">
                ${icon(isStarred ? 'starFill' : 'star', 15)}
              </button>
              <button class="activity-card__media-btn" data-venue="${esc(v.id)}" aria-label="Details about ${esc(v.name)}">
                <span class="activity-card__media">${venueMedia(v)}</span>
                <span class="activity-card__icon-badge">${icon(grp.icon, 16)}</span>
              </button>
              <div class="activity-card__content">
                <div class="activity-card__activity"><b>${esc(grp.label)}</b></div>
                <div class="venue-card__meta" style="display:none">for ${esc(grp.label.toLowerCase())}</div>
                <button class="activity-card__vname venue-card__name linkish" data-venue="${esc(v.id)}">${esc(v.name)}</button>
                <div class="activity-card__dist">${distLabel}</div>
                <div class="activity-card__access">${accessLabel}</div>
                <div class="activity-card__actions">
                  ${isStarred ? `
                    <div class="activity-card__starred-controls">
                      <button class="btn-pill btn-pill--sm btn-pill--starred" type="button" data-toggle-star="${esc(v.id)}" title="Click to remove from your week">
                        ${icon('starFill', 12)} <span>In week</span>
                      </button>
                      <div class="freq-toggle" role="group" aria-label="Frequency">
                        <button class="freq-toggle__btn ${starFreq===1?'is-active':''}" type="button" data-set-star-freq="${esc(v.id)}" data-freq="1" title="1 time per week">1x</button>
                        <button class="freq-toggle__btn ${starFreq===2?'is-active':''}" type="button" data-set-star-freq="${esc(v.id)}" data-freq="2" title="2 times per week">2x</button>
                      </div>
                    </div>
                  ` : `
                    <button class="btn-pill btn-pill--sm btn-pill--block" type="button" data-toggle-star="${esc(v.id)}">
                      ${icon('plus', 11)} <span>Add to week</span>
                    </button>
                  `}
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <button class="gallery-nav-btn gallery-nav-btn--next" type="button" data-scroll-gallery="next" aria-label="Next activities">
        ${icon('chevron', 16)}
      </button>
    </div>` : (() => {
      const selectedGroup = groupById(ACTIVE_CATEGORY_FILTER);
      const selectedCategoryLabel = selectedGroup ? selectedGroup.label : 'this activity';
      const radiusLabel = (S.radiusKm === '8') ? '8 km' : (S.radiusKm === 'any') ? 'Berlin' : '3 km';
      return `<div class="gallery-empty-state">
        <div class="gallery-empty-state__icon">${icon('pin', 22)}</div>
        <div class="gallery-empty-state__text">
          <b>No ${esc(selectedCategoryLabel.toLowerCase())} studios right within ${esc(radiusLabel)} of ${esc(where)}</b>
          <p>There are great ${esc(selectedCategoryLabel.toLowerCase())} venues across Berlin, or you can expand your search distance.</p>
        </div>
        <div class="gallery-empty-state__actions">
          <button class="btn btn--secondary btn--sm" type="button" data-radius="any">
            ${icon('pin', 13)} <span>Expand to all Berlin</span>
          </button>
          <button class="btn btn--secondary btn--sm" type="button" data-filter-category="all">
            <span>Show all sports</span>
          </button>
          <button class="btn btn--primary btn--sm" type="button" data-go="search">
            ${icon('search', 13)} <span>Explore all venues &rarr;</span>
          </button>
        </div>
      </div>`;
    })()}

    <div class="made-for-you__foot">
      <button class="made-for-you__explore-link" type="button" data-go="search">
        ${icon('sparkle', 15)} <span>Looking for something specific? Ask Urby or explore all ${allVenues.length} Berlin venues &rarr;</span>
      </button>
    </div>
  </div>`;

  const recoTabs = `<div class="reco-tabs" role="tablist" aria-label="Recommendation view format">
    <button class="reco-tab ${RECO_VIEW==='pillars'?'is-active':''}" type="button" data-set-reco-view="pillars" data-toggle-places aria-selected="${RECO_VIEW==='pillars'}">
      Activities
    </button>
    <button class="reco-tab ${RECO_VIEW==='week'?'is-active':''}" type="button" data-set-reco-view="week" data-toggle-week aria-selected="${RECO_VIEW==='week'}">
      My week <span class="reco-tab__badge">${wp.sessions.length}</span>
    </button>
  </div>`;

  /* ---- the plan, on the side, as a consequence of the above ---- */
  /* ---- why this plan: the whole argument, folded behind its own heading ---- */
  const covHtml = coverageBlock(rec, match, plan);
  const whyHead = isRec?`Why ${esc(plan.name)} for you`:`What ${esc(plan.name)} means for you`;
  const whyBody = `<ul class="why__list">${whyCards.map(r=>`<li><span class="why__icon">${icon(r.icon,16)}</span><span>${esc(r.text)}</span></li>`).join('')}</ul>
      ${rec.notes.length?`<p class="why__note">${icon('info',15)} <span>${esc(rec.notes.join(' '))}</span></p>`:''}
      ${covHtml}`;
  const whyBlock = `<details class="reco-why shelf__row"${MOREPICK==='why'?' open':''}>
    <summary class="shelf__head" data-more="why">${icon('sparkle',18)}<span class="shelf__label">${whyHead}</span>
      <span class="shelf__hint">${covHtml?'the reasons, and what it opens near you':'the reasons behind it'}</span>${icon('chevron',18)}</summary>
    <div class="shelf__body">${whyBody}</div>
  </details>`;

  const opensNothing = t => Boolean(t && t.nearby && !t.included);
  const allPlans = `<details class="allplans" open>
    <summary class="allplans__head" data-toggle-alt>
      <span class="allplans__headcopy"><span>Compare all ${PLANS.length===4?'four':PLANS.length} memberships</span>
        <small>Essential, Classic, Premium and Max</small></span>${icon('chevron',18)}</summary>
    <div class="allplans__grid">
      ${PLANS.slice().sort((x,y)=>x.rank-y.rank).map(pl => {
        const p = priceFor(pl, S.commitmentId), t = totalsFor(pl), here = pl.id === plan.id;
        const tag = here ? (isRec ? 'Recommended' : 'Your choice') : (pl.id===rec.planId ? 'Urby&rsquo;s pick' : '');
        const short = a.frequency && !carriesFrequency(pl, a.frequency)
          ? `Not enough for your ${visitsWanted(a.frequency)}-visit routine` : '';
        const fewer = !here && t && hereT && t.nearby && t.included < hereT.included
          ? `${hereT.included-t.included} fewer ${hereT.included-t.included===1?'place':'places'} than ${plan.name}` : '';
        const note = short || fewer;
        return `<div class="allplans__row ${here?'is-current':''}" ${here?'':`data-plan="${esc(pl.id)}" role="button" tabindex="0"`}>
          <div class="allplans__name">${esc(pl.name)}${tag?`<span class="allplans__tag">${tag}</span>`:''}</div>
          <div class="allplans__price">${p} €<small>/mo</small></div>
          <div class="allplans__opens">${visitsFor(pl)} visits${t&&t.nearby
            ? ` &middot; opens ${t.included} of ${t.nearby} ${t.nearby===1?'place':'places'}`
            : ` &middot; ${esc(pl.bestFor.toLowerCase())}`}</div>
          <div class="allplans__act">${here?'':icon('chevron',17)}</div>
          ${note?`<div class="allplans__warn">${icon('info',14)} <span>${esc(note)}</span></div>`:''}
        </div>`;
      }).join('')}
    </div>
    <p class="allplans__foot"><button class="linkish" type="button" data-go="plans">See everything each plan includes</button></p>
  </details>`;

  const altBox = cheaperPlan ? (() => {
    const p = priceFor(cheaperPlan, S.commitmentId);
    const short = a.frequency && !carriesFrequency(cheaperPlan, a.frequency)
      ? `Not enough for your ${visitsWanted(a.frequency)}-visit routine` : '';
    return `<div class="altbox">
      <div class="altbox__head">Cheaper option</div>
      <div class="altbox__card" data-plan="${esc(cheaperPlan.id)}" role="button" tabindex="0"
        aria-label="Switch to ${esc(cheaperPlan.name)} for ${p} euros a month">
        <div class="altbox__row"><b>${esc(cheaperPlan.name)}</b>
          <span class="altbox__price">${p} €<small>/mo</small></span></div>
        <div class="altbox__meta">${visitsFor(cheaperPlan)} visits${cheaperT&&cheaperT.nearby
          ? ` &middot; opens ${cheaperT.included} of ${cheaperT.nearby} ${cheaperT.nearby===1?'place':'places'}`:''}</div>
        ${short?`<p class="altbox__warn">${icon('info',15)} <span>${esc(short)}</span></p>`:''}
        ${opensNothing(cheaperT)
          ? `<p class="altbox__warn">${icon('info',15)} <span>Opens none of the places you asked for.</span></p>` : ''}
        <span class="altbox__chev">${icon('chevron',19)}</span>
      </div>
    </div>`;
  })() : '';

  const planAside = `<div class="planbox">
    <div class="planbox__badge">${isRec ? 'RECOMMENDED FOR YOU' : 'Your choice'}</div>
    <div class="planbox__idrow">
      <div class="planbox__name">${esc(plan.name)}</div>
      <div class="planbox__price"><b>${price} €</b><small>/mo</small></div>
    </div>
    <div class="termpick" role="group" aria-label="How long you commit for">
      ${COMMITMENTS.map(c=>{
        const p = priceFor(plan,c.id);
        return `<button class="termpick__opt ${c.id===S.commitmentId?'is-on':''}" type="button" data-commit="${esc(c.id)}"
          aria-pressed="${c.id===S.commitmentId}"><b>${c.minimumTermMonths===1?'Monthly':c.minimumTermMonths+' months'}</b><span>${p} €/mo</span></button>`;
      }).join('')}
    </div>
    <div class="planbox__factshead">Why this fits you</div>
    <ul class="planbox__facts">
      <li>${icon('checkThin',16)} <span>All <b>${hereT && hereT.included ? hereT.included : 6} places</b> are included</span></li>
      <li>${icon('checkThin',16)} <span><b>${visitsFor(plan)} visits</b> each month</span></li>
      ${wp.perMonth?`<li>${icon('checkThin',16)} <span>Matches your <b>${S.answers.frequency === 'once' ? '1' : S.answers.frequency === 'twice' ? '2' : S.answers.frequency === 'often' ? '3–4' : (S.answers.frequency === 'daily' ? '5+' : (SESSIONS[S.answers.frequency] || '2'))} sessions/wk goal</b> (~${wp.perMonth} visits/mo)</span></li>`:''}
      ${each?`<li>${icon('checkThin',16)} <span>About <b>${each} €</b> a session</span></li>`:''}
      <li>${icon('checkThin',16)} <span>Flexible &ndash; cancel anytime</span></li>
    </ul>
    <div class="planbox__cta"><button class="btn btn--primary btn--block" data-go="details">Continue with ${esc(plan.name)}</button></div>
    <div class="planbox__foot">
      <p class="planbox__fine">${esc(commitment.label)} &middot; no payment yet</p>
      ${S.email?'':`<button class="linkish planbox__save" type="button" data-go="save" data-open-exit>Save this and come back later</button>`}
    </div>
    ${!isRec ? `<p class="planbox__back">${icon('sparkle',15)} <span>Urby would have picked <b>${esc(planById(rec.planId).name)}</b> for you &mdash; <button class="linkish" data-plan="${esc(rec.planId)}">switch back</button></span></p>` : ''}
    ${altBox}
    ${allPlans}
  </div>`;

  const goalPhraseMap = { move_more:'moving more', unwind:'unwinding', try_new:'trying new things' };
  const goalListRaw = Array.isArray(a.goal) ? a.goal.filter(x => x !== SKIP) : (a.goal && a.goal !== SKIP ? [a.goal] : []);
  const goalPhrases = goalListRaw.map(g => goalPhraseMap[g]).filter(Boolean);
  const goalTitleStr = goalPhrases.length ? listWords(goalPhrases) : null;
  const heroBlock = `${ulaRow()}
    <h1 class="h-question reco-hero__title" tabindex="-1">${MOBILE()
      ? 'Your week, made to fit'
      : (goalTitleStr ? `Your plan for ${goalTitleStr}` : `Your plan near ${esc(where)}`)}</h1>
    ${match.reachedFurther?`<div class="notice notice--grey">${icon('info',19)}<span>Nothing in this pilot&rsquo;s venue set does ${esc(groupWords(groups))} right by ${esc(where)}, so I looked across the city. The distances below are real.</span></div>`:''}`;
  const chipsBlock = answerChips({ label:'You told us' });

  const moreRow = `<details class="rowcard rowcard--more"${MOREOPEN?' open':''}>
    <summary class="rowcard__head" data-toggle-more>
      <span class="rowcard__icon">${icon('question',22)}</span>
      <span class="rowcard__text"><b>Questions and details</b></span>
      <span class="rowcard__links">
        <button class="rowcard__link" type="button" data-more="why">${isRec?`Why ${esc(plan.name)} fits`:`What ${esc(plan.name)} means`}</button>
        <span aria-hidden="true">&middot;</span>
        <button class="rowcard__link" type="button" data-more="ask">Ask Urby</button>
        <span aria-hidden="true">&middot;</span>
        <button class="rowcard__link" type="button" data-more="terms">Membership terms</button>
      </span>
      <span class="rowcard__chev">${icon('chevron',20)}</span>
    </summary>
    <div class="rowcard__body rowcard__body--flush">
      <div class="shelf">
        ${whyBlock}
        ${askBlock(true, true)}
        <details class="shelf__row"${MOREPICK==='terms'?' open':''}><summary class="shelf__head" data-more="terms">${icon('info',18)}<span class="shelf__label">Membership details and terms</span>
          <span class="shelf__hint">what&rsquo;s included, limits, cancelling</span>${icon('chevron',18)}</summary>
          <div class="shelf__body">
            <div class="fitpanel__label">What&rsquo;s included in ${esc(plan.name)}</div>
            <ul class="reasons">${(plan.benefits||[]).map(x=>`<li>${icon('checkThin',19)}<span>${esc(x)}</span></li>`).join('')}</ul>
            <div class="fitpanel__label" style="margin-top:20px">Worth knowing about ${esc(plan.name)}</div>
            <ul class="reasons">${plan.limitations.map(l=>`<li>${icon('info',19)}<span>${esc(l)}</span></li>`).join('')}</ul>
            <p class="xsmall muted" style="margin-top:12px">${esc(plan.checkInModel)} · ${esc(plan.venueCount)} venues · ${commitment.minimumTermMonths===1?'no minimum term':commitment.minimumTermMonths+'-month minimum term'}. ${esc(RULES.cancellationNotice)}</p>
          </div></details>
      </div>
    </div>
  </details>`;

  return `${topbar(1)}<div class="two-col two-col--reco"><main class="two-col__main" id="main">
    ${heroBlock}
    ${chipsBlock}
    <section class="reco-canvas-box">
      ${recoTabs}
      <div class="reco-main-canvas">
        <div class="reco-tab-panel reco-tab-panel--pillars" style="${RECO_VIEW==='pillars'?'':'display:none'}">
          ${activitiesGalleryBlock}
        </div>
        <div class="plan-summary" style="display:block;height:0;overflow:hidden;margin:0;padding:0"></div>
        <div class="reco-tab-panel reco-tab-panel--week" style="${RECO_VIEW==='week'?'':'display:none'}">
          ${weekBlock}
        </div>
      </div>
    </section>
    ${appsBlock()}
    ${moreRow}
  </main>
  ${MOBILE()?'':`<aside class="two-col__aside two-col__aside--sticky">
    ${planAside}
  </aside>`}
  </div>
  <div class="paybar">
    <div class="paybar__info" data-open-plan-drawer role="button" tabindex="0" aria-label="View plan breakdown and options">
      <div class="paybar__lead">
        <b>${esc(plan.name)}</b>
        <span class="paybar__details-pill">${icon('info', 11)} Details ${icon('chevron', 10)}</span>
      </div>
      <span>${price} € / month${each?` · ≈ ${each} € a session`:''}</span>
    </div>
    <button class="btn btn--primary" data-go="details">Continue</button>
  </div>
  ${planDrawer(plan, price, each, commitment, isRec, hereT, cheaperPlan, cheaperT, visitsFor, wp, altBox, allPlans)}
  ${exitModal()}${venueSheet()}${appSheet()}`;
}

/* For the visitor who already knows. Aligned in the PM session: a way past the
   wizard straight to the plans. Deliberately a quiet link on the landing rather
   than a second front door, because the same group flagged competing paths. */
function planWeekDots(daily) {
  const days=['M','T','W','T','F','S','S'];
  return `<div class="weekdots" aria-label="${daily?'A check-in is available every day':'About one check-in in a typical week'}">
    ${days.map((d,i)=>`<span class="weekdots__day ${daily||i===0?'is-on':''}" aria-hidden="true">${d}</span>`).join('')}</div>`;
}

function plusSheet() {
  if (!PLANPLUS) return '';
  const pl=PLANS.find(p=>p.id===PLANPLUS); if (!pl) return '';
  const massages=pl.id==='max'?2:1, ems=pl.id==='max'?6:3;
  return `<div class="sheet" id="plus-sheet" role="dialog" aria-modal="true" aria-labelledby="plus-title">
    <div class="sheet__panel">
      <button class="sheet__close" data-close-plus aria-label="Close">&times;</button>
      <div class="sheet__body">
        <div class="plans-kicker">${ulaAvatar('sm')}<strong>Urby · Membership guide</strong></div>
        <h2 id="plus-title" style="margin:8px 36px 0 0">What are Plus check-ins?</h2>
        <p class="plus-sheet__intro">Plus check-ins open selected high-end partners &mdash; premium studios, spas, massages and EMS.</p>
        <ul class="plus-sheet__facts">
          <li>${icon('checkThin',18)}<span><strong>${esc(pl.name)} includes ${pl.plusCheckIns} a month.</strong> They are separate from your regular daily check-in access.</span></li>
          <li>${icon('checkThin',18)}<span>That allowance includes <strong>${massages} massage${massages===1?'':'s'}</strong> and up to <strong>${ems} EMS sessions</strong> a month.</span></li>
          <li>${icon('info',18)}<span>Plus check-ins reset each month and unused visits do not roll over.</span></li>
        </ul>
        <button class="btn btn--primary btn--block" type="button" data-close-plus style="margin-top:18px">Got it</button>
      </div>
    </div></div>`;
}

function plansScreen() {
  const maxVenues=17800;
  const selectedPlanId = S.chosenPlanId || (PLANS.find(pl=>pl.mostPopular)||PLANS[1]).id;
  const selectedPlan = PLANS.find(pl=>pl.id===selectedPlanId) || PLANS[1];

  const cards = PLANS.map(pl=>{
    const price=priceFor(pl,S.commitmentId), venues=parseInt(String(pl.venueCount).replace(/\D/g,''),10)||0;
    const access=Math.max(5,Math.min(100,venues/maxVenues*100));
    const daily=Boolean(pl.dailyCheckIn), plus=pl.plusCheckIns||0, selected=selectedPlan.id===pl.id;
    const best={essential:'Trying a few activities',classic:'A regular weekly routine',premium:'Studios and recovery',max:'Frequent premium access'}[pl.id]||pl.bestFor;
    const plusCopy=plus ? `<button class="plancard__plus" type="button" data-plus-open="${esc(pl.id)}" aria-label="Explain Plus check-ins on ${esc(pl.name)}">
        <b>${plus} Plus check-ins / month</b><span>For premium studios, spas and EMS</span>
        <em>Includes ${pl.id==='max'?'2 massages':'1 massage'}</em><u>What are Plus check-ins?</u></button>`
      : `<div class="plancard__locked">${icon('lock',13)}<span>Not included</span></div>`;
    return `<article class="plancard ${pl.mostPopular?'is-popular':''} ${selected?'is-selected':''}" data-pick-plan="${esc(pl.id)}" role="button" tabindex="0" ${selected?'aria-current="true"':''}>
      <div class="plancard__top">
        ${pl.mostPopular?`<span class="badge plancard__badge">Most popular</span>`:''}
        <div class="plancard__name">${esc(pl.name)}</div>
        <div class="plancard__price"><b>${price} €</b><span>/mo</span></div>
      </div>
      <div class="plancard__section"><span class="plancard__label">Venue access</span>
        <div class="plancard__venues">${esc(pl.venueCount)} venues</div>
        <div class="accessbar" role="img" aria-label="${esc(pl.venueCount)} venues out of 17,800 on Max"><span class="accessbar__fill" style="width:${access}%"></span></div></div>
      <div class="plancard__section"><span class="plancard__label">Check-ins</span>
        <span class="plancard__check-main">${daily?'Daily':'4 total each month'}</span>
        <span class="plancard__check-sub">${daily?'up to one each day':'about once a week'}</span>${planWeekDots(daily)}</div>
      <div class="plancard__section"><span class="plancard__label">Plus &amp; recovery</span>${plusCopy}</div>
      <div class="plancard__section plancard__best"><span class="plancard__label">Best for</span>${esc(best)}</div>
      <button class="btn btn--secondary btn--block plancard__cta" type="button" data-pick-plan="${esc(pl.id)}" aria-pressed="${selected?'true':'false'}">${selected?`${icon('checkThin',17)} Selected`:`Choose ${esc(pl.name)}`}</button>
    </article>`;
  }).join('');

  const selection = `<div class="plans-selection desktop-cta" role="status">
    <div class="plans-selection__copy"><b>${esc(selectedPlan.name)} selected · ${priceFor(selectedPlan,S.commitmentId)} € /mo</b>
      <span>You can keep comparing. Nothing moves forward until you continue.</span></div>
    <button class="btn btn--primary" type="button" data-go="details">Continue with ${esc(selectedPlan.name)} ${icon('arrowRight',17)}</button>
  </div>`;

  const stickyBar = `<div class="plans-sticky-bar">
    <div class="plans-sticky-bar__left">
      <div class="plans-sticky-bar__name"><b>${esc(selectedPlan.name)}</b> &middot; ${priceFor(selectedPlan,S.commitmentId)} €/mo</div>
      <div class="plans-sticky-bar__sub">${S.commitmentId==='annual'?'12-month commitment':'Monthly · Cancel anytime'}</div>
    </div>
    <button class="btn btn--primary plans-sticky-bar__cta" type="button" data-go="details">
      Continue with ${esc(selectedPlan.name)} ${icon('arrowRight',16)}
    </button>
  </div>`;

  const journeyRoute=fitComplete(S.answers)?'recommendation':'fit';
  const guide=`<aside class="plans-guide" aria-label="Get help choosing a membership">
    <div class="plans-guide__brand">${ulaAvatar('sm')}<span>Urby &middot; Guide</span></div>
    <h2>Not sure which plan to pick?</h2>
    <p>Answer 4 quick questions and I&rsquo;ll match one plan to your favourite activities, nearby venues and weekly routine.</p>
    <button class="btn btn--primary" type="button" data-go="${journeyRoute}" style="margin-top:16px">Find my fit ${icon('arrowRight',16)}</button>
    <span class="plans-guide__note">2 minutes · no email needed</span>
  </aside>`;

  return `${topbar(1,{savedNote:Boolean(S.email&&S.saveOptIn)})}<main class="content plans-page" id="main">
    <div class="plans-layout"><div class="plans-main">
      <div class="plans-kicker">${ulaAvatar('sm')}<span><strong>Urby</strong> · Membership guide</span></div>
      <div class="plans-head"><h1 class="h-question" tabindex="-1">Compare memberships</h1>
        <p class="reco-lede">See how venue access, visit frequency and premium benefits change with each plan.</p></div>
      <div class="commit-row">${COMMITMENTS.map(c=>`<button class="chip-sm ${c.id===S.commitmentId?'is-current':''}" data-commit="${esc(c.id)}">${esc(c.minimumTermMonths===1?'Monthly':c.minimumTermMonths+' months')}</button>`).join('')}</div>
      <div class="plangrid-hint"><span>Swipe to compare all 4 plans &rarr;</span></div>
      <div class="plangrid">${cards}</div>${selection}
      <div class="plans-shared">${icon('checkThin',17)}<span>Every membership includes video on demand, wellbeing apps and online classes.</span>
        <button class="linkish" type="button" data-go="terms">Membership terms</button>
        <button class="plans-shared__ask" type="button" data-plan-ask>Ask Urby</button></div>
      ${PLANASK?`<div class="plans-ask">${askBlock(true,false)}</div>`:''}
    </div>${guide}</div>
  </main>${stickyBar}${plusSheet()}${exitModal()}`;
}

/* Saving and signing up are two different intentions, so they are two different screens.
   They used to be one: "Continue with Classic" landed on an email form, which put an
   address between the visitor and the checkout — the toll gate rule 25 exists to stop,
   reintroduced one screen later. Now the plan's CTA goes straight to the details form and
   this screen is reached only by someone who has decided to leave and come back.

   Both screens describe the same four facts — the answers, the plan, the term, and what it
   opens — so both read them from here and cannot drift apart.

   Three counts exist and only one of them is a match (rule 54): places doing what they
   asked (nearby), of those the ones this plan opens (included), and everything else in
   range, which is neither. `included` is the third of those, nearest first. */
function fitSummary() {
  const plan = currentPlan(), match = matchVenues(A());
  const groups = (A().activities||[]).filter(x=>x!==SKIP);
  const pool = match.pool||[];
  const cov = groups.length && pool.length ? coverage(groups, pool, plan.id) : null;
  const included = cov
    ? [...new Map(cov.rows.flatMap(r=>r.included).map(v=>[v.id,v])).values()].sort((a,b)=>a.distanceKm-b.distanceKm)
    : [];
  return { plan, match, groups, included, totals: cov?cov.totals:null, where: whereName(match),
           commitment: commitmentById(S.commitmentId), price: priceFor(plan,S.commitmentId),
           isRec: !S.planOverridden };
}
/* A photograph, a name and a distance. Nothing tappable: this is a receipt for a decision
   already made, and a card that opens a sheet here would take you off the form. */
const asideVenue = v => `<div class="asidevenue"><div class="asidevenue__media">${venueMedia(v)}</div>
  <div><div class="asidevenue__name">${esc(v.name)}</div><div class="asidevenue__meta">${v.distanceKm} km away</div></div></div>`;

/* A place in the recap: the photograph large enough to recognise, the name, the
   distance. Nothing tappable — this is a receipt for a decision already made, and a
   card that opened a sheet from here would take you off the form. */
const saveVenue = v => `<div class="savevenue"><div class="savevenue__media">${venueMedia(v)}</div>
  <div class="savevenue__text"><div class="savevenue__name">${esc(v.name)}</div>
    <div class="savevenue__meta">${v.distanceKm} km away</div></div></div>`;

/* the way out — show what is being kept before asking for anywhere to send it.
   Rule 71: it is reachable from anywhere, so it says only what is true at the point
   the visitor left. Before the four questions there is no plan and no match, so it
   shows the answers so far and where they stopped, and nothing else. */
function saveScreen() {
  const hasPlan = fitComplete(S.answers) || S.planOverridden;
  const F = hasPlan ? fitSummary() : null;
  const answered = QUESTIONS.filter(q => isAnswered(S.answers[q.id])).length;
  const shownVenues = F ? F.included.slice(0, 3) : [];
  const moreVenues = F ? Math.max(0, F.included.length - shownVenues.length) : 0;
  const savedWeek = F ? weekPlan(F.groups, F.match.pool||[], F.plan.id, S.answers.frequency).sessions : [];

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
          : (F.included.length ? `Includes ${F.included.length} matching places` : '')} &middot; ${esc(F.commitment.label)} &middot; ${plural(visitsFor(F.plan, S.answers.frequency),'visit','visits')}/mo</div>
      </div>

      ${savedWeek.length ? `
      <div class="saverecap__week">
        <div class="saverecap__label">Your planned week</div>
        <div class="saverecap__days">
          ${savedWeek.slice(0, 3).map(s => `
            <div class="saverecap__day-row">
              <span class="saverecap__day-name">${esc(s.day.slice(0,3))}</span>
              <span class="saverecap__day-act"><b>${esc(s.activity)}</b> at ${esc(s.venue.name)}</span>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      ${shownVenues.length ? `
      <div class="saverecap__venues">
        <div class="saverecap__label">Included places near ${esc(F.where)}</div>
        <div class="saverecap__venue-grid">
          ${shownVenues.map(v => `
            <div class="saverecap__venue-card">
              <div class="saverecap__venue-img">${venueMedia(v)}</div>
              <div class="saverecap__venue-info">
                <span class="saverecap__venue-title">${esc(v.name)}</span>
                <span class="saverecap__venue-dist">${v.distanceKm} km away</span>
              </div>
            </div>
          `).join('')}
        </div>
        ${moreVenues ? `<div class="saverecap__more">+${moreVenues} more matching ${plural(moreVenues,'place','places')}</div>` : ''}
      </div>` : ''}
    </div>
  ` : `
    <div class="saverecap">
      <div class="saverecap__head">
        <span class="saverecap__tag">Your progress so far</span>
        <div class="saverecap__plan savepanel__where"><b>question ${Math.min(answered + 1, QUESTIONS.length)} of ${QUESTIONS.length}</b></div>
        <div class="saverecap__meta">We'll save every answer you've given so far.</div>
      </div>
      <div class="saverecap__chips">
        ${answerChips({ label:'', compact:true })}
      </div>
    </div>
  `;

  return `${topbar(1,{ stepper:false, savedNote:Boolean(S.email&&S.saveOptIn),
                       back: hasPlan ? { route:'recommendation', label:'Back to recommendation' }
                                     : { route:'fit', label:'Back to your questions' } })}
  <main class="savewrap" id="main">
    <div class="savepanel">
      <div class="savepanel__grid">
        <div class="savepanel__left">
          <div class="savepanel__guide">${ulaAvatar('sm')}<span>Urby &middot; Membership guide</span></div>
        <h1 class="savepanel__title" tabindex="-1">Here&rsquo;s what you&rsquo;re saving</h1>
        <p class="savepanel__sub">${hasPlan ? 'Your custom routine, matching studios, and membership plan.' : 'Your answers and progress so far.'}</p>
        ${recapSection}
      </div>

      <div class="savepanel__right">
        <h2 class="savepanel__asktitle">Keep your progress</h2>
        <p class="savepanel__asksub">Email yourself a secure link to pick up right where you left off.</p>

        <form data-form="save" novalidate class="saveform">
          <label class="savefield__label" for="save-email">Email address</label>
          <input id="save-email" class="savefield" type="email" name="email" placeholder="Your email address" value="${esc(FIELDS.email||'')}">
          ${ERRORS.email?`<p class="field-error" role="alert">${esc(ERRORS.email)}</p>`:''}
          <button class="btn btn--primary btn--block" type="submit">Save my progress</button>
          <div class="orline"><span>or continue with</span></div>
          <div class="sso-row" style="max-width:none">
            <button class="sso-btn" type="submit" name="provider" value="google" aria-label="Save with Google">${GOOGLE} Google <small class="muted">(simulated)</small></button>
            <button class="sso-btn" type="submit" name="provider" value="apple" aria-label="Save with Apple">${APPLE} Apple <small class="muted">(simulated)</small></button></div>
          <div class="consent-row" style="max-width:none;margin:16px 0 12px"><label class="checkbox"><input type="checkbox" name="marketing" id="marketing" ${S.marketing?'checked':''}><span></span></label>
            <label class="consent-label" for="marketing">Send me occasional offers and activity inspiration.<br><span class="muted">Optional</span></label></div>
          <div class="notice notice--soft">${icon('lock',18)}<span><b>No payment will be taken.</b> Private return link.</span></div>
          <p class="terms-line" style="margin-top:12px">By continuing, you agree to our <button class="linkish" data-go="terms">Terms</button> and <button class="linkish" data-go="privacy">Privacy Policy</button>.</p>
        </form>
        <p class="save-out"><button class="linkish strong" data-skip-save>Continue without saving</button></p>
      </div>
    </div>
    <p class="savefoot"><button class="linkish" data-go="terms">Terms</button>
      <button class="linkish" data-go="privacy">Privacy</button>
      <button class="linkish" data-go="data">About this pilot</button></p>
  </main>${venueSheet()}`;
}

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
    ${o.why?`<div class="field__why">${icon('info',14)} ${esc(o.why)}</div>`:''}</div>`;
  const each = perSession(F.price, S.answers.frequency, plan);
  const shown = F.included.slice(0,3), more = Math.max(0, F.included.length - shown.length);
  const chosenFor = [
    ...F.groups.map(groupById).filter(Boolean).map(g => ({ i:g.icon, l:g.label })),
    isAnswered(S.answers.frequency) && S.answers.frequency !== SKIP
      ? { i:'calendar', l:answerLabel('frequency', S.answers.frequency) } : null
  ].filter(Boolean);
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
