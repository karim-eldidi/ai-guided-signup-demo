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
  const perkText = S.commitmentId === 'biennial'
    ? 'Includes 2 free wellness apps (0 € extra)'
    : S.commitmentId === 'annual'
      ? 'Includes 1 free wellness app (0 € extra)'
      : '12- & 24-mo plans include free wellness apps';

  return `<div class="drawer-backdrop" data-close-plan-drawer></div>
  <div class="plan-drawer" role="dialog" aria-modal="true" aria-label="Membership plan details">
    <div class="plan-drawer__handle-bar" data-close-plan-drawer><div class="plan-drawer__handle"></div></div>
    <div class="plan-drawer__head">
      <div class="plan-drawer__title-wrap">
        <span class="planbox__badge" style="margin-bottom:3px">${isRec ? 'RECOMMENDED' : 'YOUR SELECTION'}</span>
        <h3 class="plan-drawer__title">${esc(plan.name)} &middot; <b>${price} €</b><small>/mo</small></h3>
      </div>
      <button class="plan-drawer__close" type="button" data-close-plan-drawer aria-label="Close details">${icon('close', 18)}</button>
    </div>
    <div class="plan-drawer__body">
      <!-- Commitment switcher -->
      <div class="termpick" role="group" aria-label="How long you commit for" style="margin-bottom:6px">
        ${COMMITMENTS.map(c=>{
          const p = priceFor(plan,c.id);
          return `<button class="termpick__opt ${c.id===S.commitmentId?'is-on':''}" type="button" data-commit="${esc(c.id)}"
            aria-pressed="${c.id===S.commitmentId}"><b>${c.minimumTermMonths===1?'Monthly':c.minimumTermMonths+' months'}</b><span>${p} €/mo</span></button>`;
        }).join('')}
      </div>
      <div class="termpick__perk-banner" style="font-size:12px;color:var(--navy);background:var(--cream);border:1px solid var(--cream-line);padding:6px 10px;border-radius:var(--radius);margin-bottom:12px;display:flex;align-items:center;gap:5px">
        ${icon('sparkle',12)} <span>${perkText}</span>
      </div>

      <div class="planbox__factshead" style="font-size:13px;font-weight:700;margin-bottom:8px">Included with ${esc(plan.name)}</div>
      <ul class="planbox__facts" style="margin-bottom:14px">
        <li>${icon('checkThin',15)} <span>All <b>${hereT && hereT.included ? hereT.included : (wp.sessions.filter(s=>s.included).length || 6)} places</b> in your routine included</span></li>
        <li>${icon('checkThin',15)} <span><b>${visitsFor(plan)} visits</b> each month</span></li>
        ${each?`<li>${icon('checkThin',15)} <span>About <b>${each} €</b> a session</span></li>`:''}
        <li>${icon('checkThin',15)} <span>Flexible &ndash; cancel anytime</span></li>
      </ul>

      ${altBox || allPlans ? `
        <details class="drawer-compare" style="margin-top:10px;margin-bottom:14px;border:1px solid var(--border);border-radius:var(--radius);background:#fff">
          <summary style="padding:10px 12px;font-size:13px;font-weight:700;color:var(--navy);cursor:pointer;display:flex;align-items:center;justify-content:space-between">
            <span>Compare with other memberships</span>
            <span style="font-size:11px;color:var(--navy-soft)">▼</span>
          </summary>
          <div style="padding:10px 12px 14px;border-top:1px solid var(--border)">
            ${altBox}
            ${allPlans}
          </div>
        </details>
      ` : ''}

      <div style="margin-top:14px">
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
  const resolveVenue = rawV => {
    if (!rawV) return null;
    let v = rawV;
    if (typeof v.distanceKm !== 'number') {
      const from = (match.areas && match.areas.length) ? match.areas : [match.area || ANYWHERE];
      const km = Math.round(Math.min(...from.map(a => distanceKm(a, v))) * 10) / 10;
      const nearestArea = from.reduce((best, a) => distanceKm(a, v) < distanceKm(best, v) ? a : best, from[0]);
      v = { ...v, distanceKm: km, nearestArea };
    }
    return v;
  };

  const getTierTag = v => {
    if (v.tier === 'premium') return `<span class="tier-tag tier-tag--premium">✨ Premium studio</span>`;
    if (v.tier === 'plus') return `<span class="tier-tag tier-tag--plus">⚡ Plus studio</span>`;
    return `<span class="tier-tag tier-tag--standard">Classic studio</span>`;
  };

  // Routine venues: user-starred places or curated starting places matching their routine
  const starredKeys = Object.keys(S.starredVenues || {});
  let routineVenues = [];
  if (starredKeys.length) {
    routineVenues = starredKeys.map(id => resolveVenue(VENUES.find(v => v.id === id))).filter(Boolean);
  } else {
    // Default initial routine from matched venues in their goal/area
    routineVenues = (wanted.length ? wanted : pool).slice(0, 3).map(resolveVenue).filter(Boolean);
  }

  const routineItemsHtml = routineVenues.map(v => {
    const inPlan = includedIn(v, plan.id);
    const grp = ACTIVITY_GROUPS.find(g => venueInGroup(v, g)) || ACTIVITY_GROUPS[0];
    const areaLabel = v.nearestArea ? v.nearestArea.name : (AREAS.find(a => a.id === v.area) || {}).name || '';
    const distLabel = areaLabel ? `${v.distanceKm} km from ${esc(areaLabel)}` : `${v.distanceKm} km away`;
    const tierTag = getTierTag(v);
    const statusBadge = inPlan
      ? `<span class="routine-item__badge routine-item__badge--included">${icon('checkThin', 12)} Included in ${esc(plan.name)}</span>`
      : `<span class="routine-item__badge routine-item__badge--upgrade">Needs ${v.tier === 'premium' ? 'Premium' : 'Classic'}</span>`;
    const tierNote = v.tier === 'premium' 
      ? 'High-end studio with premium access'
      : v.tier === 'plus' 
      ? 'Includes Plus check-ins'
      : 'Standard check-in';

    return `<li class="routine-item ${inPlan ? '' : 'is-upgrade'}">
      <button class="routine-item__thumb-btn" type="button" data-venue="${esc(v.id)}" aria-label="Details about ${esc(v.name)}">
        <span class="routine-item__thumb">${venueMedia(v)}</span>
        <span class="routine-item__icon">${icon(grp.icon, 13)}</span>
      </button>
      <div class="routine-item__content">
        <div class="routine-item__meta-row">
          <span class="routine-item__cat">${esc(grp.label)}</span>
          ${tierTag}
          ${statusBadge}
        </div>
        <button class="routine-item__title linkish" type="button" data-venue="${esc(v.id)}"><b>${esc(v.name)}</b></button>
        <div class="routine-item__sub">${distLabel} &middot; <span class="routine-item__note">${tierNote}</span></div>
      </div>
      <div class="routine-item__actions">
        <button class="routine-item__remove-btn" type="button" data-toggle-star="${esc(v.id)}" aria-label="Remove ${esc(v.name)} from routine" title="Remove from routine">
          ${icon('trash', 14)}
        </button>
      </div>
    </li>`;
  }).join('');

  const allRoutineIncluded = routineVenues.every(v => includedIn(v, plan.id));
  const lockedCount = routineVenues.filter(v => !includedIn(v, plan.id)).length;

  const routineBlock = `<div class="routine-card">
    <div class="routine-card__head">
      <div class="routine-card__head-lead">
        <h2 class="routine-card__title">My Routine</h2>
        <p class="routine-card__sub">${routineVenues.length} saved places &middot; Matching your fitness routine in ${esc(where)}</p>
      </div>
      <button class="routine-card__add-btn" type="button" data-go="search" aria-label="Browse and add places to routine">
        ${icon('plus', 13)} <span>Add places</span>
      </button>
    </div>

    ${allRoutineIncluded ? `
      <div class="routine-card__status routine-card__status--all-in">
        ${icon('checkFill', 15)}
        <span><b>All ${routineVenues.length} places in your routine</b> are fully included in <b>${esc(plan.name)}</b>.</span>
      </div>
    ` : `
      <div class="routine-card__status routine-card__status--upgrade">
        ${icon('sparkle', 15)}
        <span><b>${lockedCount} of your ${routineVenues.length} saved places</b> require a tier upgrade to access.</span>
      </div>
    `}

    <ol class="routine-list">${routineItemsHtml}</ol>

    <div class="routine-card__tip">
      <span class="routine-card__tip-icon">${icon('info', 14)}</span>
      <span>Star any studio or sport across the app to add it to your routine. Your membership adjusts to cover your favorites.</span>
    </div>

    <div class="routine-card__foot">
      <button class="made-for-you__explore-link" type="button" data-go="search">
        ${icon('sparkle', 14)} <span>Looking for a specific studio? Explore all ${allVenues.length} Berlin venues &rarr;</span>
      </button>
    </div>
  </div>`;

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
            const vResolved = resolveVenue(v);
            const inPlan = includedIn(vResolved, plan.id);
            const baseScore = 97 - Math.round(vResolved.distanceKm * 2.2) - (vResolved.tier === 'premium' ? 3 : vResolved.tier === 'plus' ? 1 : 0);
            const matchPct = Math.max(89, Math.min(98, baseScore));
            const areaLabel = vResolved.nearestArea ? vResolved.nearestArea.name : (AREAS.find(a=>a.id===vResolved.area)||{}).name || '';
            const distLabel = areaLabel ? `${vResolved.distanceKm} km from ${esc(areaLabel)}` : `${vResolved.distanceKm} km away`;
            const tierTag = getTierTag(vResolved);
            const accessLabel = inPlan
              ? (vResolved.tier === 'plus' ? `<span class="access-pill access-pill--included">${icon('checkThin', 11)} Included &middot; Plus access</span>` : vResolved.tier === 'premium' ? `<span class="access-pill access-pill--included">${icon('checkThin', 11)} Included &middot; Premium access</span>` : `<span class="access-pill access-pill--included">${icon('checkThin', 11)} Included &middot; Regular check-in</span>`)
              : `<span class="access-pill access-pill--locked venue-card__lock">${icon('lock', 11)} Needs ${vResolved.tier === 'premium' ? 'Premium' : 'Classic'} upgrade</span>`;
            const isStarred = Boolean(S.starredVenues && S.starredVenues[vResolved.id]);
            return `<div class="activity-card venue-card ${inPlan ? '' : 'is-locked'} ${isStarred ? 'is-starred' : ''}" draggable="true" data-drag-venue="${esc(vResolved.id)}" data-drag-name="${esc(vResolved.name)}">
              <div class="activity-card__badges">
                <span class="activity-card__badge">${matchPct}% match</span>
                ${tierTag}
              </div>
              <button class="activity-card__star-btn ${isStarred ? 'is-active' : ''}" type="button" data-toggle-star="${esc(vResolved.id)}" aria-label="${isStarred ? `Remove ${esc(vResolved.name)} from routine` : `Add ${esc(vResolved.name)} to routine`}" title="${isStarred ? 'In your routine' : 'Add to routine'}">
                ${icon(isStarred ? 'starFill' : 'star', 15)}
              </button>
              <button class="activity-card__media-btn" data-venue="${esc(vResolved.id)}" aria-label="Details about ${esc(vResolved.name)}">
                <span class="activity-card__media">${venueMedia(vResolved)}</span>
                <span class="activity-card__icon-badge">${icon(grp.icon, 16)}</span>
              </button>
              <div class="activity-card__content">
                <div class="activity-card__activity"><b>${esc(grp.label)}</b></div>
                <div class="venue-card__meta" style="display:none">for ${esc(grp.label.toLowerCase())}</div>
                <button class="activity-card__vname venue-card__name linkish" data-venue="${esc(vResolved.id)}">${esc(vResolved.name)}</button>
                <div class="activity-card__dist">${distLabel}</div>
                <div class="activity-card__access">${accessLabel}</div>
                <div class="activity-card__actions">
                  ${isStarred ? `
                    <button class="btn-pill btn-pill--sm btn-pill--starred btn-pill--block" type="button" data-toggle-star="${esc(vResolved.id)}" title="Click to remove from routine">
                      ${icon('starFill', 12)} <span>In routine</span>
                    </button>
                  ` : `
                    <button class="btn-pill btn-pill--sm btn-pill--block" type="button" data-toggle-star="${esc(vResolved.id)}">
                      ${icon('plus', 11)} <span>Add to routine</span>
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
        ${icon('sparkle', 14)} <span>Looking for a specific studio? Explore all ${allVenues.length} Berlin venues &rarr;</span>
      </button>
    </div>
  </div>`;

  const routineCount = routineVenues.length;
  const recoTabs = `<div class="reco-tabs" role="tablist" aria-label="Recommendation view format">
    <button class="reco-tab ${RECO_VIEW==='pillars'?'is-active':''}" type="button" data-set-reco-view="pillars" aria-selected="${RECO_VIEW==='pillars'}">
      Activities
    </button>
    <button class="reco-tab ${RECO_VIEW==='routine'||RECO_VIEW==='week'?'is-active':''}" type="button" data-set-reco-view="routine" data-toggle-routine aria-selected="${RECO_VIEW==='routine'||RECO_VIEW==='week'}">
      My routine <span class="reco-tab__badge">${routineCount}</span>
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
    <div class="termpick__perk-banner" style="font-size:12.5px;color:var(--navy);background:var(--cream);border:1px solid var(--cream-line);padding:6px 10px;border-radius:var(--radius);margin-top:8px;margin-bottom:14px;display:flex;align-items:center;gap:6px">
      ${icon('sparkle',13)} <span>${S.commitmentId==='biennial'?'Includes 2 free wellness apps (0 € extra)':S.commitmentId==='annual'?'Includes 1 free wellness app (0 € extra)':'12 & 24 mo include free partner apps'}</span>
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
    ${match.reachedFurther?`<div class="notice notice--grey">${icon('info',19)}<span>Nothing in this pilot&rsquo;s venue data does ${esc(groupWords(groups))} right by ${esc(where)}, so I looked across the city. The distances below are real.</span></div>`:''}`;
  const chipsBlock = answerChips({ label:'You told us' });

  const moreRow = `<details class="rowcard rowcard--more"${MOREOPEN?' open':''}>
    <summary class="rowcard__head" data-toggle-more>
      <span class="rowcard__icon">${icon('help',22)}</span>
      <span class="rowcard__text">
        <b>Need more detail?</b>
        <small>The math, the whole network, Urby, terms</small>
      </span>
      <span class="rowcard__actions">
        <button class="rowcard__link" type="button" data-go="plans">Compare plans</button>
        <span aria-hidden="true">&middot;</span>
        <button class="rowcard__link" type="button" data-more="why">Why ${esc(plan.name)}</button>
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
        <div class="reco-tab-panel reco-tab-panel--routine reco-tab-panel--week" style="${RECO_VIEW==='routine'||RECO_VIEW==='week'?'':'display:none'}">
          ${routineBlock}
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
    <div class="paybar__info" data-open-plan-drawer role="button" tabindex="0" aria-label="View plan breakdown and pricing details">
      <div class="paybar__lead">
        <b>${esc(plan.name)}</b>
        <span class="paybar__details-pill">${icon('chevron', 10)} Details &amp; terms</span>
      </div>
      <span class="paybar__subtext">${price} € / month${each?` · ≈ ${each} €/visit`:''}</span>
    </div>
    <button class="btn btn--primary paybar__cta" data-go="details">Continue</button>
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
    const best={
      essential:'Starter plan (4 visits/mo at standard gyms & pools)',
      classic:'Daily check-ins across 14,800+ studios, gyms & pools',
      premium:'Daily check-ins + 4 Plus visits (1 massage, spas, EMS)',
      max:'Daily check-ins + 8 Plus visits (2 massages, luxury clubs)'
    }[pl.id]||pl.bestFor;
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
      
      <div class="plans-overview" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:20px 0 16px">
        <div class="plans-overview__card" style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px">
          <div style="font-weight:800;font-size:14px;color:var(--ink);margin-bottom:2px">Essential <span style="font-weight:600;color:var(--navy-soft)">35 €/mo</span></div>
          <div style="font-size:12.5px;color:var(--navy-soft);line-height:1.4"><b>Starter</b> &middot; 4 visits a month at standard gyms &amp; pools.</div>
        </div>
        <div class="plans-overview__card" style="background:#fff;border:1.5px solid var(--ink);border-radius:var(--radius);padding:12px 14px;position:relative">
          <span style="position:absolute;top:-8px;right:10px;background:var(--ink);color:#fff;font-size:10px;font-weight:800;padding:2px 6px;border-radius:999px;text-transform:uppercase">Popular</span>
          <div style="font-weight:800;font-size:14px;color:var(--ink);margin-bottom:2px">Classic <span style="font-weight:600;color:var(--navy-soft)">75 €/mo</span></div>
          <div style="font-size:12.5px;color:var(--navy-soft);line-height:1.4"><b>Most popular</b> &middot; 1 visit every day across 14,800+ venues.</div>
        </div>
        <div class="plans-overview__card" style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px">
          <div style="font-weight:800;font-size:14px;color:var(--ink);margin-bottom:2px">Premium <span style="font-weight:600;color:var(--navy-soft)">115 €/mo</span></div>
          <div style="font-size:12.5px;color:var(--navy-soft);line-height:1.4"><b>Spas &amp; Wellness</b> &middot; Daily visits + 4 Plus visits (1 massage, spas, EMS).</div>
        </div>
        <div class="plans-overview__card" style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px">
          <div style="font-weight:800;font-size:14px;color:var(--ink);margin-bottom:2px">Max <span style="font-weight:600;color:var(--navy-soft)">165 €/mo</span></div>
          <div style="font-size:12.5px;color:var(--navy-soft);line-height:1.4"><b>Ultimate access</b> &middot; Daily visits + 8 Plus visits (2 massages, luxury clubs).</div>
        </div>
      </div>

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
   This screen is reached only by someone who has decided to leave and come back.

   Both screens describe the same four facts — the answers, the plan, the term, and what it
   opens — so both read them from here and cannot drift apart.

   Three counts exist and only one of them is a match (rule 54): places doing what they
   asked (nearby), of those the ones this plan opens (included), and everything else in
   range, which is neither. `included` is the third of those, nearest first. */
function fitSummary() {
  const plan = currentPlan(), match = matchVenues(A());
  const groups = (A().activities||[]).filter(x=>x!==SKIP);
  const pool = match.pool||[];
  const from = (match.areas && match.areas.length) ? match.areas : [match.area || ANYWHERE];
  const cov = groups.length && pool.length ? coverage(groups, pool, plan.id) : null;
  const totals = cov ? cov.totals : null;

  // Resolve routine venues first if user starred places!
  const starredKeys = Object.keys(S.starredVenues || {});
  let included = [];
  if (starredKeys.length) {
    included = starredKeys.map(id => {
      const p = pool.find(x => x.id === id);
      if (p) return p;
      const raw = VENUES.find(x => x.id === id);
      if (!raw) return null;
      const km = Math.round(Math.min(...from.map(x => distanceKm(x, raw))) * 10) / 10;
      return { ...raw, distanceKm: km };
    }).filter(Boolean);
  } else {
    included = cov
      ? [...new Map(cov.rows.flatMap(r=>r.included).map(v=>[v.id,v])).values()].sort((a,b)=>(a.distanceKm||0)-(b.distanceKm||0))
      : [];
  }

  return { plan, match, groups, included, totals, where: whereName(match),
           commitment: commitmentById(S.commitmentId), price: priceFor(plan,S.commitmentId),
           isRec: !S.planOverridden };
}
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
  
  const starredKeys = Object.keys(S.starredVenues || {});
  const savedRoutine = F ? (starredKeys.length
    ? starredKeys.map(id => F.included.find(v => v.id === id) || VENUES.find(v => v.id === id)).filter(Boolean)
    : F.included.slice(0, 3)) : [];
  const morePlaces = F ? Math.max(0, F.included.length - savedRoutine.length) : 0;

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
        <div class="saverecap__label">Your saved routine (${savedRoutine.length} ${plural(savedRoutine.length, 'place', 'places')})</div>
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
