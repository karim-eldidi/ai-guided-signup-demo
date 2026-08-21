function reasonsFor(rec, plan, match, groups) {
  const pool = match.pool || match.venues || [];
  const where = whereName(match);
  const out = [];
  const freq = S.answers.frequency;

  if (groups.length) {
    const actLabels = groups.map(id => (groupById(id) || {}).label).filter(Boolean).join(' & ');
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
  const countLabel = cov.totals.included === cov.totals.nearby
    ? `All ${plural(cov.totals.nearby,'place','places')} near you`
    : `${cov.totals.included} of the ${plural(cov.totals.nearby,'place','places')} near you`;

  const comparisonHtml = up ? (() => {
    const upPlan = planById(up.planId);
    const gained = (upPlan.benefits || []).filter(x => !(plan.benefits || []).includes(x)).slice(0, 2);
    return `<div class="cov__comparison cov__comparison--up">
      <p class="cov__line">${icon('star', 16)} <span><b>${esc(up.planName)}</b> adds ${plural(up.addsCount, 'place', 'places')} &mdash; ${up.adds.slice(0, 2).map(v => esc(v.name)).join(', ')}${up.addsCount > 2 ? ` +${up.addsCount - 2}` : ''}${
        gained.length ? `, plus ${gained.map(g => esc(lowerFirst(g))).join(' and ')}` : ''
      }. ${up.delta} € more a month. <button class="linkish strong" data-plan="${esc(up.planId)}">Switch</button></span></p>
    </div>`;
  })() : (down ? `<div class="cov__comparison cov__comparison--down">
    <p class="cov__line cov__down">${icon('info', 16)} <span><b>${esc(down.planName)}</b> covers the same places for ${down.saves} € less. <button class="linkish strong" data-plan="${esc(down.planId)}">Switch</button></span></p>
  </div>` : '');

  return `<div class="cov">
    <p class="cov__summary"><b>${countLabel}</b>
      ${cov.totals.included===1?'is':'are'} on ${esc(plan.name)}.
      <span class="cov__caveat">That count is this pilot&rsquo;s venue data, not the whole network of ${esc(plan.venueCount)}.</span></p>
    ${comparisonHtml}
    <details class="cov__detail-wrap"><summary>Activity by activity</summary>
      <div class="cov__rows">${rows}</div>
      <p class="xsmall muted" style="margin-top:14px">Counted from the visit limits each venue publishes on its own page. Not an estimate.</p>
    </details>
  </div>`;
}

function planDrawer(plan, price, each, commitment, isRec, hereT, cheaperPlan, cheaperT, visitsFor, wp, allPlans) {
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
        <span class="planbox__badge" style="margin-bottom:3px">${isRec ? 'Recommended' : 'Your choice'}</span>
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
      <div class="termpick__perk-banner">
        ${icon('sparkle',12)} <span>${perkText}</span>
      </div>

      <div class="planbox__factshead" style="font-size:13px;font-weight:700;margin-bottom:8px">Included with ${esc(plan.name)}</div>
      <ul class="planbox__facts" style="margin-bottom:14px">
        ${(() => {
          /* Never print a place count we did not count. The old fallback said "6 places"
             whenever coverage could not be computed, which is a number nobody counted. */
          const n = hereT && typeof hereT.included === 'number' ? hereT.included
                  : (wp && wp.sessions ? wp.sessions.filter(s => s.included).length : null);
          if (n === null) return '';
          /* "All 1 place are included" — the count and the verb have to agree. */
          const phrase = n === 1
            ? 'The <b>one place</b> in your routine is included'
            : `All <b>${n} places</b> in your routine are included`;
          return `<li>${icon('checkThin',15)} <span>${phrase}</span></li>`;
        })()}
        <li>${icon('checkThin',15)} <span><b>${visitsFor(plan)} visits</b> each month</span></li>
        ${each?`<li>${icon('checkThin',15)} <span>About <b>${each} €</b> a session</span></li>`:''}
        <li>${icon('checkThin',15)} <span>Flexible &ndash; cancel anytime</span></li>
      </ul>


      ${allPlans ? `
        <details class="drawer-compare" style="margin-top:10px;margin-bottom:14px;border:1px solid var(--border);border-radius:var(--radius);background:#fff">
          <summary style="padding:10px 12px;font-size:13px;font-weight:700;color:var(--navy);cursor:pointer;display:flex;align-items:center;justify-content:space-between">
            <span>Compare memberships</span>
            <span class="planbox__why-chevron">${icon('chevron', 14)}</span>
          </summary>
          <div style="padding:10px 12px 14px;border-top:1px solid var(--border)">
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
  const a = A();
  const baseAnswers = Object.assign({}, S.answers, { radiusKm: S.answers.radiusKm || '3' });
  const baseMatch = matchVenues(baseAnswers);
  const rec = recommend(baseAnswers, baseMatch);
  /* what they said they'd actually do, used by every comparison on this screen */
  const groups = (a.activities||[]).filter(x=>x!==SKIP), groupsForAlt = groups;
  if (!S.planOverridden) S.chosenPlanId = S.chosenPlanId || rec.planId;
  const plan = planById(S.chosenPlanId||rec.planId);
  const isRec = plan.id===rec.planId;
  const price = priceFor(plan,S.commitmentId), commitment = commitmentById(S.commitmentId);
  const match = matchVenues(a);
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
    const from = (match.areas && match.areas.length) ? match.areas : [match.area || ANYWHERE];
    if (typeof v.distanceKm !== 'number') {
      const km = Math.round(Math.min(...from.map(a => distanceKm(a, v))) * 10) / 10;
      const nearestArea = from.reduce((best, a) => distanceKm(a, v) < distanceKm(best, v) ? a : best, from[0]);
      v = { ...v, distanceKm: km, nearestArea };
    }
    if (typeof v.matchPct !== 'number') {
      const chosen = activityIdsFor(a.activities || []);
      const hits = (v.activities || []).filter(x => chosen.includes(x));
      const basePct = hits.length > 0 ? 98 : 72;
      const distPenalty = Math.min(28, Math.round((v.distanceKm || 0) * 2.5));
      const matchPct = Math.max(45, Math.min(99, basePct - distPenalty));
      v = { ...v, matchPct };
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
  } else if (!S.routineCustomized) {
    // Default initial routine from matched venues in their goal/area
    routineVenues = (wanted.length ? wanted : pool).slice(0, 3).map(resolveVenue).filter(Boolean);
  }

  const routineItemsHtml = routineVenues.map(v => {
    const inPlan = includedIn(v, plan.id);
    const grp = ACTIVITY_GROUPS.find(g => venueInGroup(v, g)) || ACTIVITY_GROUPS[0];
    const areaLabel = v.nearestArea ? v.nearestArea.name : (AREAS.find(a => a.id === v.area) || {}).name || '';
    const distLabel = areaLabel ? `${v.distanceKm} km from ${esc(areaLabel)}` : `${v.distanceKm} km away`;
    const statusBadge = inPlan
      ? (v.tier === 'plus'
          ? `<span class="routine-item__badge routine-item__badge--plus">${icon('checkThin', 11)} Plus included</span>`
          : v.tier === 'premium'
          ? `<span class="routine-item__badge routine-item__badge--premium">${icon('checkThin', 11)} Included in Premium</span>`
          : `<span class="routine-item__badge routine-item__badge--included">${icon('checkThin', 11)} Included in ${esc(plan.name)}</span>`)
      : `<span class="routine-item__badge routine-item__badge--upgrade">${icon('lock', 11)} Needs ${v.tier === 'premium' ? 'Premium' : 'Classic'}</span>`;

    return `<li class="routine-item ${inPlan ? '' : 'is-upgrade'}">
      <button class="routine-item__thumb-btn" type="button" data-venue="${esc(v.id)}" aria-label="Details about ${esc(v.name)}">
        <span class="routine-item__thumb">${venueMedia(v)}</span>
      </button>
      <div class="routine-item__content">
        <div class="routine-item__title-row">
          <button class="routine-item__title linkish" type="button" data-venue="${esc(v.id)}"><b>${esc(v.name)}</b></button>
        </div>
        <div class="routine-item__sub routine-item__meta-row">
          ${statusBadge}
          <span class="routine-item__sep">&middot;</span>
          <span class="routine-item__cat">${esc(grp.label)}</span>
          <span class="routine-item__sep">&middot;</span>
          <span class="routine-item__dist">${distLabel}</span>
        </div>
      </div>
      <div class="routine-item__actions">
        <button class="routine-item__remove-btn" type="button" data-toggle-star="${esc(v.id)}" aria-label="Remove ${esc(v.name)} from routine" title="Remove from routine">
          ${icon('trash', 14)}
        </button>
      </div>
    </li>`;
  }).join('');

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

    <div class="routine-card__status" style="display:none" aria-hidden="true">
      <span>Your membership adjusts to cover your favorites.</span>
    </div>
    <div class="routine-card__foot" style="display:none" aria-hidden="true">
      <span>Your membership adjusts to cover your favorites.</span>
    </div>
    ${routineVenues.length ? `<ol class="routine-list">${routineItemsHtml}</ol>` : `
      <div class="routine-empty-state">
        <p>No places in your routine yet. Explore activities and add studios you&rsquo;d like to visit.</p>
        <button class="btn btn--secondary btn--sm" type="button" data-set-reco-view="pillars">Browse activities &rarr;</button>
      </div>
    `}
  </div>`;

  const displayGroups = ACTIVE_CATEGORY_FILTER === 'all'
    ? ACTIVITY_GROUPS
    : ACTIVITY_GROUPS.filter(g => g.id === ACTIVE_CATEGORY_FILTER);

  const curatedCards = [];
  const seenVenueIds = new Set();

  if (nq) {
    const searchHits = pool.filter(v => venueHit(v) && !EXCLUDED_VENUES.has(v.id));
    searchHits.forEach(v => {
      const grp = ACTIVITY_GROUPS.find(g => venueInGroup(v, g)) || ACTIVITY_GROUPS[0];
      curatedCards.push({ grp, v });
      seenVenueIds.add(v.id);
    });
  } else if (ACTIVE_CATEGORY_FILTER === 'all') {
    const userGroups = groups.length ? groups.map(groupById).filter(Boolean) : ACTIVITY_GROUPS;
    userGroups.forEach(grp => {
      const grpVenues = pool.filter(v => venueInGroup(v, grp) && !EXCLUDED_VENUES.has(v.id) && !seenVenueIds.has(v.id));
      const take = (S.radiusKm === 'any' || userGroups.length <= 2) ? grpVenues : grpVenues.slice(0, 4);
      take.forEach(v => {
        curatedCards.push({ grp, v });
        seenVenueIds.add(v.id);
      });
    });
    ACTIVITY_GROUPS.forEach(grp => {
      const grpVenues = pool.filter(v => venueInGroup(v, grp) && !EXCLUDED_VENUES.has(v.id) && !seenVenueIds.has(v.id));
      const take = (S.radiusKm === 'any') ? grpVenues : grpVenues.slice(0, 3);
      take.forEach(v => {
        curatedCards.push({ grp, v });
        seenVenueIds.add(v.id);
      });
    });
  } else {
    displayGroups.forEach(grp => {
      const grpVenues = pool.filter(v => venueInGroup(v, grp) && !EXCLUDED_VENUES.has(v.id));
      grpVenues.forEach(v => {
        if (!seenVenueIds.has(v.id)) {
          curatedCards.push({ grp, v });
          seenVenueIds.add(v.id);
        }
      });
    });
  }

  const isAllBerlin = S.radiusKm === 'any';
  const matchingActivitiesCount = groups.length || ACTIVITY_GROUPS.length;
  const matchingVenuesCount = (hereT && hereT.included) ? hereT.included : (wanted.length || pool.length);

  const activitiesTitle = isAllBerlin
    ? 'Activities across Berlin'
    : `Activities in ${esc(where)}`;

  const activitiesSubtext = nq
    ? `${curatedCards.length} places matching &ldquo;${esc(VENUEQ)}&rdquo;`
    : (ACTIVE_CATEGORY_FILTER === 'all'
        ? (isAllBerlin
            ? `${curatedCards.length} places loaded across ${ACTIVITY_GROUPS.length} activity categories in Berlin`
            : `${curatedCards.length} places across ${matchingActivitiesCount} sports in ${esc(where)}`)
        : (() => {
            const grp = groupById(ACTIVE_CATEGORY_FILTER);
            return `${curatedCards.length} ${curatedCards.length === 1 ? 'place' : 'places'} for ${esc(grp ? grp.label : 'this activity')} ${isAllBerlin ? 'across Berlin' : `in ${esc(where)}`}`;
          })());

  const activitiesGalleryBlock = `<div class="places made-for-you">
    <div class="made-for-you__head">
      <div class="made-for-you__title-wrap">
        <h2 class="made-for-you__title">${activitiesTitle}</h2>
        <p class="made-for-you__sub">${activitiesSubtext}</p>
      </div>
    </div>
    <div class="made-for-you__toolbar">
      <div class="made-for-you__search-box">
        <span class="made-for-you__search-icon">${icon('search', 14)}</span>
        <input type="text" class="made-for-you__search-input" placeholder="AI search for venues &amp; activities with Urby..." value="${esc(VENUEQ||'')}" data-venue-input autocomplete="off" spellcheck="false" aria-label="Search venues or sports in page">
        ${VENUEQ ? `<button class="made-for-you__search-clear" type="button" data-venue-clear aria-label="Clear search">${icon('close', 12)}</button>` : ''}
      </div>
      <div class="made-for-you__filters">
        <div class="radius-toggle radius" role="group" aria-label="Distance radius">
          ${RADII.map(r=>`<button class="radius-toggle__btn chip-sm ${(S.radiusKm||'auto')===r.id?'is-active is-current':''}" type="button" data-radius="${esc(r.id)}">${esc(r.label)}</button>`).join('')}
        </div>
        <button class="btn-explore-inline" type="button" data-go="search" aria-label="Explore all Berlin venues">
          <span>Explore all &rarr;</span>
        </button>
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
      <button class="gallery-nav-btn gallery-nav-btn--prev is-disabled" type="button" data-scroll-gallery="prev" aria-label="Previous activities" aria-disabled="true">
        ${icon('chevron', 16)}
      </button>
      <div class="activity-gallery venue-grid--big is-rail" id="activity-gallery-scroll">
        ${curatedCards.map(({ grp, v }) => {
          const vResolved = resolveVenue(v);
          const inPlan = includedIn(vResolved, plan.id);
          const areaLabel = vResolved.nearestArea ? vResolved.nearestArea.name : (AREAS.find(a=>a.id===vResolved.area)||{}).name || '';
          const distLabel = areaLabel ? `${vResolved.distanceKm} km from ${esc(areaLabel)}` : `${vResolved.distanceKm} km away`;
          const isStarred = Boolean(S.starredVenues && S.starredVenues[vResolved.id]);

          const accessBadge = inPlan
            ? (vResolved.tier === 'plus'
                ? `<span class="access-pill access-pill--plus-overlay">${icon('checkThin', 11)} Plus access</span>`
                : vResolved.tier === 'premium'
                ? `<span class="access-pill access-pill--premium-overlay">${icon('checkThin', 11)} Premium</span>`
                : `<span class="access-pill access-pill--included-overlay">${icon('checkThin', 11)} Included</span>`)
            /* The tier is not the access map. Ask which published plan actually opens this
               venue instead of inferring it, or the badge lies whenever the two disagree. */
            : `<span class="access-pill access-pill--locked-overlay venue-card__lock">${icon('lock', 11)} Needs ${esc((firstPlanWithAccess(vResolved) || {}).name || 'a higher plan')}</span>`;

          const matchBadge = vResolved.matchPct
            ? `<span class="activity-card__badge">${vResolved.matchPct}% match</span>`
            : '';

          return `<div class="activity-card venue-card ${inPlan ? '' : 'is-locked'} ${isStarred ? 'is-starred' : ''}" draggable="true" data-drag-venue="${esc(vResolved.id)}" data-drag-name="${esc(vResolved.name)}">
            <div class="activity-card__badges">
              ${matchBadge}
              ${accessBadge}
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
      <button class="gallery-nav-btn gallery-nav-btn--next" type="button" data-scroll-gallery="next" aria-label="Next activities">
        ${icon('chevron', 16)}
      </button>
    </div>` : (() => {
      const selectedGroup = groupById(ACTIVE_CATEGORY_FILTER);
      const selectedCategoryLabel = selectedGroup ? selectedGroup.label : 'this activity';
      const radiusLabel = (S.radiusKm === '8') ? '8 km' : (S.radiusKm === 'any') ? 'Berlin' : '3 km';
      return `<div class="gallery-empty-state">
        <div class="gallery-empty-state__avatar">${urbyMascotAvatar('md')}</div>
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
          <button class="btn btn--secondary btn--sm" type="button" data-go="search">
            ${icon('search', 13)} <span>Explore all venues &rarr;</span>
          </button>
        </div>
      </div>`;
    })()}
  </div>`;

  const routineCount = routineVenues.length;
  const recoTabs = `<div class="reco-tabs" role="tablist" aria-label="Recommendation view format">
    <button class="reco-tab ${RECO_VIEW==='pillars'?'is-active':''}" type="button" data-set-reco-view="pillars" aria-selected="${RECO_VIEW==='pillars'}">
      Activities &amp; studios
    </button>
    <button class="reco-tab ${RECO_VIEW==='routine'||RECO_VIEW==='week'?'is-active':''}" type="button" data-set-reco-view="routine" data-toggle-routine aria-selected="${RECO_VIEW==='routine'||RECO_VIEW==='week'}">
      ${icon('calendar', 14)} <span>My routine</span> <span class="reco-tab__badge">${routineCount}</span>
    </button>
    ${MOBILE() ? `<button class="reco-tab reco-tab--mobile ${RECO_VIEW==='plan'?'is-active':''}" type="button" data-set-reco-view="plan" aria-selected="${RECO_VIEW==='plan'}">
      ${icon('sparkle', 14)} <span>My Plan</span>
    </button>` : ''}
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

  /* Rule 32: a cheaper plan that opens none of their places is not a saving, it is a trap.
     The box used to show it anyway and then admit it opened nothing, which is the one
     alternative nobody can act on. When the tier below loses everything we compare upwards. */
  const upgradePlan = PLANS.filter(p => p.rank > plan.rank).sort((x, y) => x.rank - y.rank)[0] || null;
  const compareUp = opensNothing(cheaperT);
  const altPlan = compareUp ? upgradePlan : cheaperPlan;
  const altT = compareUp ? totalsFor(upgradePlan) : cheaperT;

  /* ---- the top tier is contextual, not a fourth column ----
     Karim, 19 Aug: four plans confuse visitors and almost nobody picks the top one, so the
     grid offers the three that fit nearly everyone and the top tier appears only when this
     visitor's own answers ask for it. This is presentation. `recommend()` still owns the
     recommendation and nothing here can change it (rule 1).

     The trigger is the published Plus allowance, because that is the only thing the top two
     tiers actually differ on: both are "one check-in per day", so the honest question is not
     how many visits but how many *Plus* visits. What spends a Plus check-in is not guessed
     from a venue's tier either — it is read off the access maps. The tier below that
     publishes `plusCheckIns: 0` states outright that Plus partners are not included, so a
     place this plan opens and that tier does not can only be reached with one of this plan's
     Plus check-ins. Count the sessions in the week this page is already showing that land on
     such a place, multiply by the four weeks every other figure here uses (`visitsWanted`),
     and compare it with `plan.plusCheckIns`. Over the allowance there is a real shortfall to
     answer; at or under it the plan on screen already covers them and the upgrade would be
     sold on nothing. No score, no keyword count, no invented percentage. */
  const topPlan = PLANS.slice().sort((x, y) => y.rank - x.rank)[0] || plan;
  const noPlusTier = PLANS.filter(p => p.rank < plan.rank && !p.plusCheckIns)
    .sort((x, y) => y.rank - x.rank)[0] || null;
  const spendsPlus = v => Boolean(noPlusTier && v) && includedIn(v, plan.id) && !includedIn(v, noPlusTier.id);
  const plusWanted = plan.plusCheckIns
    ? wp.sessions.filter(s => spendsPlus(s.venue)).length * 4 : 0;
  /* Karim, 19 Aug: trigger when the week reaches the allowance, not only when it passes it.
     A visitor whose month already spends all four Plus check-ins has no headroom left — one
     extra spa week and they are short — so "at the cap" is the honest moment to mention the
     bigger allowance. `plusWanted > 0` matters: without it a plan that publishes no Plus
     allowance at all (Classic, 0) would satisfy 0 >= 0 and upsell on nothing. */
  const plusShort = Boolean(topPlan.plusCheckIns > plan.plusCheckIns
    && plusWanted > 0 && plusWanted >= plan.plusCheckIns);
  /* It is also listed whenever it is genuinely on the table: the visitor switched to it, or
     the rules chose it. Hiding the plan somebody is looking at would be the worse lie. */
  const showTop = plusShort || plan.id === topPlan.id || rec.planId === topPlan.id;
  const gridPlans = (showTop ? PLANS.slice() : PLANS.filter(pl => pl.id !== topPlan.id))
    .sort((x, y) => x.rank - y.rank);
  const COUNTWORDS = { 1:'one', 2:'two', 3:'three', 4:'four', 5:'five', 6:'six' };
  /* Counted from what is rendered, so the heading can never claim a row that is not there. */
  const gridCount = COUNTWORDS[gridPlans.length] || String(gridPlans.length);

  /* Rule 64 said all four sit in the grid. That half is superseded by the decision above;
     the rest of it stands — the grid is on the plan card, one tap from the recommendation,
     every row it lists is visible, and the `plans` screen is still one link away for the
     tier this grid is leaving out. */
  const allPlans = `<details class="allplans" ${ALTOPEN ? 'open' : ''}>
    <summary class="allplans__head" data-toggle-alt>
      <span class="allplans__headcopy"><span>Compare memberships</span>
        <small>${esc(listWords(gridPlans.map(pl=>pl.name)))}</small></span>${icon('chevron',18)}</summary>
    <div class="allplans__grid">
      ${gridPlans.map(pl => {
        const p = priceFor(pl, S.commitmentId), t = totalsFor(pl), here = pl.id === plan.id;
        const tag = here
          ? (isRec ? 'Recommended' : 'Your choice')
          : (pl.id === rec.planId
              ? 'Urby&rsquo;s choice'
              : (pl.rank < plan.rank ? 'Cheaper option' : 'More access'));
        const short = a.frequency && !carriesFrequency(pl, a.frequency)
          ? `Not enough for your ${visitsWanted(a.frequency)}-visit routine` : '';
        const fewer = !here && t && hereT && t.nearby && t.included < hereT.included
          ? `${hereT.included-t.included} fewer ${hereT.included-t.included===1?'place':'places'} than ${plan.name}` : '';
        const note = short || fewer;
        return `<div class="allplans__row ${here?'is-current':''}" ${here?'':`data-plan="${esc(pl.id)}" role="button" tabindex="0"`}>
          <div class="allplans__name">${esc(pl.name)}${tag?` <span class="allplans__tag">${tag}</span>`:''}</div>
          <div class="allplans__price">${p} €<small>/mo</small></div>
          <div class="allplans__opens">${visitsFor(pl)} visits${t&&t.nearby
            ? ` &middot; opens ${t.included} of ${t.nearby} ${t.nearby===1?'place':'places'}`
            : ` &middot; ${esc(pl.bestFor.toLowerCase())}`}</div>
          <div class="allplans__act">${here?'':icon('chevron',17)}</div>
          ${note?`<div class="allplans__warn">${icon('info',14)} <span>${esc(note)}</span></div>`:''}
        </div>`;
      }).join('')}
    </div>
    <p class="allplans__foot"><button class="linkish" type="button" data-go="plans">See everything each plan includes${
      showTop?'':`, ${esc(topPlan.name)} included`}</button></p>
  </details>`;

  const planAside = `<div class="planbox">
    <div class="planbox__badge">${isRec ? 'Recommended' : 'Your choice'}</div>
    <div class="planbox__idrow">
      <div class="planbox__name">${esc(plan.name)}</div>
      <div class="planbox__price"><b>${price} €</b> <span>/ month</span></div>
    </div>

    <!-- Commitment tabs: Monthly / 12 mo / 24 mo -->
    <div class="termpick" role="group" aria-label="Membership duration">
      ${COMMITMENTS.map(c => {
        const p = priceFor(plan, c.id);
        return `<button class="termpick__opt ${c.id===S.commitmentId?'is-on':''}" type="button" data-commit="${esc(c.id)}"
          aria-pressed="${c.id===S.commitmentId}"><b>${c.minimumTermMonths===1?'Monthly':c.minimumTermMonths+' months'}</b><span>${p} €/mo</span></button>`;
      }).join('')}
    </div>
    <div class="termpick__perk-banner">
      ${icon('sparkle',13)} <span>${S.commitmentId==='biennial'?'Includes 2 free wellness apps (0 € extra)':S.commitmentId==='annual'?'Includes 1 free wellness app (0 € extra)':'12 & 24 mo include free partner apps'}</span>
    </div>

    <!-- "Why this fits you" collapsed by default -->
    <details class="planbox__why-disclosure">
      <summary class="planbox__why-head">
        <span>Why this fits you</span>
        <span class="planbox__why-chevron">${icon('chevron', 15)}</span>
      </summary>
      <ul class="planbox__facts">
        ${hereT && typeof hereT.included === 'number'
          ? `<li>${icon('checkThin',16)} <span>${hereT.included === 1
              ? 'Your <b>one place</b> is included'
              : `All <b>${hereT.included} places</b> are included`}</span></li>`
          : ''}
        <li>${icon('checkThin',16)} <span><b>${visitsFor(plan)} visits</b> each month</span></li>
        ${wp.perMonth?`<li>${icon('checkThin',16)} <span>Matches your <b>${S.answers.frequency === 'once' ? '1' : S.answers.frequency === 'twice' ? '2' : S.answers.frequency === 'often' ? '3–4' : (S.answers.frequency === 'daily' ? '5+' : (SESSIONS[S.answers.frequency] || '2'))} sessions/wk goal</b> (~${wp.perMonth} visits/mo)</span></li>`:''}
        ${each?`<li>${icon('checkThin',16)} <span>About <b>${each} €</b> a session</span></li>`:''}
        <li>${icon('checkThin',16)} <span>Flexible &ndash; cancel anytime</span></li>
      </ul>
    </details>

    ${MOBILE() ? '' : `<div class="planbox__cta" style="margin-top:16px">
      <button class="btn btn--primary btn--block" data-go="details">Continue with ${esc(plan.name)}</button>
    </div>`}
    <div class="planbox__foot">
      <p class="planbox__fine">${esc(commitment.label)} &middot; no payment yet</p>
      ${S.email?'':`<button class="linkish planbox__save" type="button" data-go="save" data-open-exit>Save this and come back later</button>`}
    </div>

    ${allPlans}
  </div>`;

  const heroBlock = `${ulaRow()}
    <div class="reco-hero-header">
      <h1 class="h-question reco-hero__title" tabindex="-1">Your personalized plan</h1>
      <button class="reco-edit-answers-btn" type="button" data-open-review-answers title="Review and edit your answers">
        ${icon('pencil',13)} <span>Edit answers</span>
      </button>
    </div>
    ${match.reachedFurther?`<div class="notice notice--grey">${icon('info',19)}<span>Nothing in this pilot&rsquo;s venue data does ${esc(groupWords(groups))} right by ${esc(where)}, so I looked across the city. The distances below are real.</span></div>`:''}`;

  const moreRow = `<details class="rowcard rowcard--more"${MOREOPEN?' open':''}>
    <summary class="rowcard__head" data-toggle-more>
      <span class="rowcard__icon">${icon('help',22)}</span>
      <span class="rowcard__text">
        <b>Need more detail?</b>
        <small>The math, the whole network, Urby, terms</small>
      </span>
      <span class="rowcard__chev">${icon('chevron',20)}</span>
    </summary>
    <div class="rowcard__body rowcard__body--flush">
      <div class="more-quick-ask">
        <form data-form="ask" class="more-quick-ask__form">
          <label for="more-ask-input" class="sr-only">Ask Urby a question</label>
          <span class="more-quick-ask__icon">${icon('search',16)}</span>
          <input type="text" name="q" id="more-ask-input" class="more-quick-ask__input"
                 placeholder="Ask Urby about plans, prices, pausing or venues…"
                 value="${esc(ASK.q||'')}" aria-label="Ask Urby a question" autocomplete="off">
          <button class="btn btn--secondary btn--sm more-quick-ask__btn" type="submit">Ask</button>
        </form>
      </div>
      <div class="shelf">
        ${whyBlock}
        <details class="shelf__row"${MOREPICK==='terms'?' open':''}><summary class="shelf__head" data-more="terms"><span class="shelf__icon">${icon('info',18)}</span><span class="shelf__label">Membership details and terms</span>
          <span class="shelf__hint">what&rsquo;s included, limits, cancelling</span><span class="shelf__chev">${icon('chevron',18)}</span></summary>
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

  return `${topbar(1, { stepper: false })}<div class="two-col two-col--reco"><main class="two-col__main" id="main">
    ${heroBlock}
    <section class="reco-canvas-box">
      ${recoTabs}
      <div class="reco-main-canvas">
        <div class="reco-tab-panel reco-tab-panel--pillars" style="${RECO_VIEW==='pillars'?'':'display:none'}">
          ${activitiesGalleryBlock}
        </div>
        <div class="plan-summary" style="display:none" aria-hidden="true"></div>
        <div class="reco-tab-panel reco-tab-panel--routine reco-tab-panel--week" style="${RECO_VIEW==='routine'||RECO_VIEW==='week'?'':'display:none'}">
          ${routineBlock}
        </div>
        ${MOBILE() ? `<div class="reco-tab-panel reco-tab-panel--plan reco-tab-panel--mobile-only" style="${RECO_VIEW==='plan'?'':'display:none'}">
          ${planAside}
        </div>` : ''}
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
    <div class="paybar__pull-handle" data-open-plan-drawer aria-hidden="true"></div>
    <div class="paybar__info" data-open-plan-drawer role="button" tabindex="0" aria-label="View plan breakdown and pricing details">
      <div class="paybar__lead">
        <b>${esc(plan.name)}</b>
        <span class="paybar__details-pill">Details &amp; terms ▴</span>
      </div>
      <span class="paybar__subtext">${price} € / month${each?` · ≈ ${each} €/visit`:''}</span>
    </div>
    <button class="btn btn--primary paybar__cta" data-go="details">Continue</button>
  </div>
  ${planDrawer(plan, price, each, commitment, isRec, hereT, cheaperPlan, cheaperT, visitsFor, wp, allPlans)}
  ${exitModal()}${venueSheet()}${appSheet()}${reviewAnswersSheet()}`;
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


const PLAN_LINE_META = [
  {
    id: 'essential',
    iconEmoji: '📅',
    headline: 'Once a week',
    tierName: 'Essential',
    tierMeta: '4 visits · 5,600+ venues',
    diffColTitle: 'What Essential gives you',
    diffBullets: [
      { icon: 'calendar', text: '4 check-ins each month' },
      { icon: 'pin', text: '5,600+ partner gyms, pools & studios' },
      { icon: 'video', text: 'Up to 4 live online classes' }
    ],
    everythingColTitle: 'Everything in Essential',
    everythingBullets: [
      { icon: 'checkThin', text: 'Flexible starter routine (~1 visit a week)' },
      { icon: 'pin', text: '5,600+ partner venues across Europe' },
      { icon: 'sparkle', text: 'Free access to popular wellbeing apps' }
    ],
    getAllowances: (term, pause) => [
      { icon: 'video', text: 'Up to 4 online classes' },
      { icon: 'play', text: 'Unlimited video on demand' },
      { icon: 'calendar', text: term },
      { icon: 'clock', text: "Cancel with 3 days' notice" },
      { icon: 'pause', text: pause }
    ]
  },
  {
    id: 'classic',
    iconEmoji: '👟',
    headline: 'Move most days',
    tierName: 'Classic',
    tierMeta: 'Daily visits · 14,800+ venues',
    diffColTitle: 'What Classic adds over Essential',
    diffBullets: [
      { icon: 'plus', text: 'Daily check-ins instead of 4 visits/month' },
      { icon: 'pin', text: '9,200+ more venues (14,800+ total)' },
      { icon: 'video', text: 'Up to 30 live online classes (vs 4)' }
    ],
    everythingColTitle: 'Everything in Classic',
    everythingBullets: [
      { icon: 'checkThin', text: 'Visit once every day' },
      { icon: 'pin', text: '14,800+ partner venues & classes' },
      { icon: 'star', text: 'Most popular for everyday sports & fitness' }
    ],
    getAllowances: (term, pause) => [
      { icon: 'video', text: 'Up to 30 online classes' },
      { icon: 'play', text: 'Unlimited video on demand' },
      { icon: 'calendar', text: term },
      { icon: 'clock', text: "Cancel with 3 days' notice" },
      { icon: 'pause', text: pause }
    ]
  },
  {
    id: 'premium',
    iconEmoji: '🪷',
    headline: 'Add spas & recovery',
    tierName: 'Premium',
    tierMeta: 'Daily + 4 Plus visits · includes 1 massage',
    diffColTitle: 'What Premium adds over Classic',
    diffBullets: [
      { icon: 'plus', text: '+4 more Plus visits each month' },
      { icon: 'sparkle', text: '+1 massage each month included' },
      { icon: 'pin', text: '2,900+ more venues (17,700+ total)' }
    ],
    everythingColTitle: 'Everything in Premium',
    everythingBullets: [
      { icon: 'checkThin', text: 'Visit once a day' },
      { icon: 'pin', text: '17,700+ venues across Europe' },
      { icon: 'sparkle', text: '4 Plus visits/mo (day spas, EMS & massage)' }
    ],
    getAllowances: (term, pause) => [
      { icon: 'video', text: 'Up to 30 online classes' },
      { icon: 'play', text: 'Unlimited video on demand' },
      { icon: 'calendar', text: term },
      { icon: 'clock', text: "Cancel with 3 days' notice" },
      { icon: 'pause', text: pause }
    ]
  },
  {
    id: 'max',
    iconEmoji: '💛',
    headline: 'Live exceptionally',
    headSub: 'More Plus visits and recovery every month.',
    tierName: 'Max',
    tierMeta: 'Daily + 8 Plus visits · includes 2 massages',
    diffColTitle: 'What Max adds over Premium',
    diffBullets: [
      { icon: 'plus', text: '+4 more Plus visits each month' },
      { icon: 'sparkle', text: '+1 more massage each month' },
      { icon: 'pin', text: '100+ more venues' }
    ],
    everythingColTitle: 'Everything in Max',
    everythingBullets: [
      { icon: 'checkThin', text: 'Visit once a day' },
      { icon: 'pin', text: '17,800+ venues' },
      { icon: 'sparkle', text: '8 Plus visits each month, including 2 massages' }
    ],
    getAllowances: (term, pause) => [
      { icon: 'video', text: 'Up to 30 online classes' },
      { icon: 'play', text: 'Unlimited video on demand' },
      { icon: 'calendar', text: term },
      { icon: 'clock', text: "Cancel with 3 days' notice" },
      { icon: 'pause', text: pause }
    ]
  }
];

function plansScreen() {
  const given = QUESTIONS.filter(x => isAnswered(S.answers[x.id]));
  const isComplete = fitComplete(S.answers);
  const rec = (isComplete || given.length > 0) ? recommend(S.answers, matchVenues(S.answers)) : null;

  const defaultPlanId = rec ? rec.planId : (PLANS.find(pl => pl.mostPopular) || PLANS[1]).id;
  const selectedPlanId = S.chosenPlanId || defaultPlanId;
  const selectedPlan = PLANS.find(pl => pl.id === selectedPlanId) || PLANS[1];
  const selectedMeta = PLAN_LINE_META.find(pt => pt.id === selectedPlan.id) || PLAN_LINE_META[1];
  const selectedPrice = priceFor(selectedPlan, S.commitmentId);

  const termBadgeText = S.commitmentId === 'annual' ? '12 months · Save 15%' : S.commitmentId === 'biennial' ? '24 months · Save 20%' : 'Monthly';

  const termLabel = S.commitmentId === 'annual' ? '12-month contract' : S.commitmentId === 'biennial' ? '24-month contract' : 'Monthly contract';
  const pauseRule = S.commitmentId === 'monthly' ? 'Pause anytime (1–6 months)' : 'Pausing and downgrading not available';

  const planLines = PLAN_LINE_META.map(pt => {
    const pl = PLANS.find(p => p.id === pt.id) || PLANS[0];
    const price = priceFor(pl, S.commitmentId);
    const isExpanded = PLANS_EXPANDED_ID === pl.id;
    const isSelected = selectedPlan.id === pl.id;
    const isRecommended = rec && rec.planId === pl.id;
    const allowances = pt.getAllowances(termLabel, pauseRule);

    return `<article class="plan-line ${isSelected ? 'is-selected' : ''} ${isExpanded ? 'is-expanded' : ''}" data-pick-plan="${esc(pl.id)}" role="button" tabindex="0" aria-expanded="${isExpanded ? 'true' : 'false'}" ${isSelected ? 'aria-current="true"' : ''}>
      ${isRecommended ? `<div class="plan-badge-reco">${icon('sparkle', 12)}<span>Recommended for your routine</span></div>` : ''}
      <div class="plan-line__header">
        <div class="plan-line__icon-wrap"><span class="plan-line__icon">${pt.iconEmoji}</span></div>
        <div class="plan-line__info">
          <div class="plan-line__headline">${esc(pt.headline)}</div>
          ${pt.headSub && isExpanded ? `<div class="plan-line__headsub">${esc(pt.headSub)}</div>` : ''}
        </div>
        <div class="plan-line__tier">
          <span class="plan-line__tier-name">${esc(pt.tierName)}</span>
          <span class="plan-line__tier-meta">${esc(pt.tierMeta)}</span>
        </div>
        <div class="plan-line__price-wrap">
          <div class="plan-line__price">
            <b>${price} &euro;</b> <span>/ month</span>
          </div>
          <span class="plan-line__chevron">${icon('chevronDown', 18)}</span>
        </div>
      </div>
      ${isExpanded ? `
        <div class="plan-line__expanded">
          <div class="plan-diff-grid">
            <div class="plan-diff-col">
              <h4 class="plan-diff-col__title">${esc(pt.diffColTitle)}</h4>
              <ul class="plan-diff-list">
                ${pt.diffBullets.map(b => `<li><span class="diff-bullet-icon diff-bullet-icon--yellow">${icon(b.icon, 15)}</span> <span>${esc(b.text)}</span></li>`).join('')}
              </ul>
            </div>
            <div class="plan-diff-col">
              <h4 class="plan-diff-col__title">${esc(pt.everythingColTitle)}</h4>
              <ul class="plan-diff-list">
                ${pt.everythingBullets.map(b => `<li><span class="diff-bullet-icon diff-bullet-icon--yellow">${icon(b.icon, 15)}</span> <span>${esc(b.text)}</span></li>`).join('')}
              </ul>
            </div>
            <div class="plan-diff-col">
              <h4 class="plan-diff-col__title">Allowances &amp; terms</h4>
              <ul class="plan-diff-list">
                ${allowances.map(b => `<li><span class="diff-bullet-icon diff-bullet-icon--yellow">${icon(b.icon, 15)}</span> <span>${esc(b.text)}</span></li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      ` : ''}
    </article>`;
  }).join('');

  const fitStrip = `<div class="plans-fit-bar" role="region" aria-label="Your routine fit">
    <div class="plans-fit-bar__left">
      <div class="plans-fit-bar__brand">${ulaAvatar()} <b>Urby</b></div>
      ${given.length > 0 ? `
        <div class="plans-fit-bar__status">
          ${icon('checkFill', 16)}
          <span class="plans-fit-bar__status-label">Your fit</span>
        </div>
        <div class="plans-fit-bar__chips">
          ${given.map(x => `
            <button class="answer-chip" type="button" data-edit="${esc(x.id)}" aria-label="Change answer to: ${esc(x.prompt)}">
              ${icon(x.icon, 14)}
              <span>${esc(compactAnswerLabel(x.id, S.answers[x.id]))}</span>
              <span class="answer-chip__edit-icon">${icon('pencil', 11)}</span>
            </button>
          `).join('')}
        </div>
      ` : `
        <div class="plans-fit-bar__prompt">
          <span>Not sure which plan fits you best? Answer 4 quick questions for a personalized routine.</span>
        </div>
      `}
    </div>
    <div class="plans-fit-bar__right">
      ${given.length > 0 ? `
        <button class="linkish plans-fit-bar__edit-all" type="button" data-go="fit">
          Edit answers ${icon('pencil', 12)}
        </button>
      ` : `
        <button class="btn btn--secondary plans-fit-bar__cta" type="button" data-go="fit">
          Find my fit ${icon('arrowRight', 14)}
        </button>
      `}
    </div>
  </div>`;

  const stickyBar = `<div class="plans-sticky-bar">
    <div class="plans-sticky-bar__left">
      <div class="plans-sticky-bar__name"><b>${esc(selectedPlan.name)}</b> &middot; ${selectedPrice} &euro;/mo</div>
      <div class="plans-sticky-bar__sub">${S.commitmentId === 'annual' ? '12-month commitment' : S.commitmentId === 'biennial' ? '24-month commitment' : 'Monthly &middot; Cancel anytime'}</div>
    </div>
    <button class="btn btn--primary plans-sticky-bar__cta" type="button" data-go="details">
      Choose ${esc(selectedPlan.name)} and continue ${icon('arrowRight', 16)}
    </button>
  </div>`;

  return `${topbar(1, { stepper: false, savedNote: Boolean(S.email && S.saveOptIn) })}<main class="content plans-page" id="main">
    <div class="plans-page-header">
      <h1 class="h-question" tabindex="-1">Choose your membership</h1>
      <div class="commit-row" role="group" aria-label="Membership commitment duration">${COMMITMENTS.map(c => {
        const isCur = c.id === S.commitmentId;
        const termLabel = c.minimumTermMonths === 1 ? 'Monthly' : `${c.minimumTermMonths} months`;
        const savingBadge = c.id === 'annual' ? '<span class="commit-save-pill">Save 15%</span>' : c.id === 'biennial' ? '<span class="commit-save-pill">Save 20%</span>' : '';
        return `<button class="commit-tab ${isCur ? 'is-current' : ''}" type="button" data-commit="${esc(c.id)}" aria-pressed="${isCur}"><span>${esc(termLabel)}</span>${savingBadge}</button>`;
      }).join('')}</div>
    </div>

    ${fitStrip}

    <div class="plans-layout">
      <div class="plans-main">
        <section class="plans-options-card" aria-label="Membership options">
          <div class="plan-lines-group">${planLines}</div>

          <div class="plans-always-banner">
            <span class="always-sparkle">✦</span>
            <span><strong>Always included:</strong> on-site activities &middot; online classes &middot; video on demand</span>
          </div>
        </section>

        <div class="plans-nav-row">
          <button class="btn btn--secondary btn-back-plan" type="button" data-go="recommendation">
            ${icon('arrowLeft', 16)} Back
          </button>
        </div>
      </div>

      <aside class="plans-layout__sidebar">
        <div class="plan-summary-card">
          <div class="plan-summary-card__head">
            <div class="plan-summary-card__icon">${selectedMeta.iconEmoji}</div>
            <h3 class="plan-summary-card__name">${esc(selectedPlan.name)}</h3>
          </div>

          <div class="plan-summary-card__price-row">
            <div class="plan-summary-card__price">
              <b>${selectedPrice} &euro;</b> <span>/ month</span>
            </div>
            <div class="plan-summary-card__term-badge">${esc(termBadgeText)}</div>
          </div>

          <p class="plan-summary-card__reason">
            ${rec && rec.planId === selectedPlan.id ? esc(selectedMeta.headSub || 'Fits your weekly routine and covers your target venues.') : esc(selectedMeta.headSub || 'All-inclusive access to fitness, sports, and wellness.')}
          </p>

          <button class="btn btn--primary plan-summary-card__cta" type="button" data-go="details">
            Choose ${esc(selectedPlan.name)} and continue ${icon('arrowRight', 16)}
          </button>

          ${given.length > 0 ? `
            <button class="linkish plan-summary-card__routine-link" type="button" data-go="recommendation">
              View personalized routine &rarr;
            </button>
          ` : `
            <button class="linkish plan-summary-card__routine-link" type="button" data-go="fit">
              Get a personalized routine &rarr;
            </button>
          `}
        </div>

        <button class="routine__save plan-summary__save" type="button" data-go="save">
          ${icon('bookmark', 20)}
          <span>
            <b>Save for later</b>
            <small>Keeps your answers and brings you back here.</small>
          </span>
        </button>
      </aside>
    </div>
    ${stickyBar}
  </main>${plusSheet()}${exitModal()}`;
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
