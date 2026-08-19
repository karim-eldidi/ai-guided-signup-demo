function browseOrigin() {
  const ids = areaIds(S.answers.area);
  const picked = ids.filter(id => id !== 'anywhere').map(id => AREAS.find(a=>a.id===id)).filter(Boolean);
  if (picked.length) return { origins:picked, mine:true, anywhere:false, label:`near ${listWords(picked.map(a=>a.name))}` };
  if (ids.includes('anywhere')) return { origins:[ANYWHERE], mine:true, anywhere:true, label:'across Berlin' };
  const guess = AREAS.find(a=>a.id===DETECTED_AREA) || AREAS[0];
  return { origins:[guess], mine:false, anywhere:false, label:`near ${guess.name}` };
}

/* What the venue page browses: every place in the pilot that does what they asked for,
   inside the distance they asked for, nearest first. Deliberately not matchVenues() —
   that one widens the radius by itself so a recommendation is always possible, and a
   list with a distance control on it must show exactly what the control says it shows. */
function browsePlaces() {
  const o = browseOrigin();
  const radius = RADII.find(x=>x.id===(S.radiusKm||'auto')) || RADII[0];
  const groups = (A().activities||[]).map(groupById).filter(Boolean);
  let list = VENUES.map(v => ({ ...v,
    distanceKm: Math.round(Math.min(...o.origins.map(a=>distanceKm(a,v))) * 10) / 10 }));
  if (groups.length) list = list.filter(v => groups.some(g=>venueInGroup(v,g)));
  list.sort((a,b) => a.distanceKm - b.distanceKm);
  return { ...o, radius, groups, list,
    within: radius.km ? list.filter(v => v.distanceKm <= radius.km) : list };
}

/* One card, two questions. Browsing, the badge answers "what would open this place?" at
   a glance and the card ends in the way into the detail. Searching, they asked about one
   named place, so the foot spells the join out in full with the price (rule 63) and the
   badge comes off rather than say the plan's name twice on one card (rule 33). */
function placeCard(v, opts = {}) {
  const { known = true, from = null, focus = null, priced = false } = opts;
  const plan = currentPlan();
  const inPlan = includedIn(v, plan.id);
  const lowest = firstPlanWithAccess(v);
  const badge = !priced && lowest
    ? `<span class="hit__badge hit__badge--${esc(lowest.id)}">${esc(lowest.name)}</span>` : '';
  const acts = v.activities.slice(0,3).map(a => ACTIVITY_LABELS[a]||a).join(', ');
  const where = known ? `${v.distanceKm} km${from?` from ${esc(from)}`:''}` : 'in Berlin';
  const grpLabel = v.activities.length ? (ACTIVITY_LABELS[v.activities[0]] || v.activities[0]) : 'Fitness';
  const grpIcon = activityIcon(v.activities);

  const isStarred = Boolean(S.starredVenues && S.starredVenues[v.id]);

  const accessBadge = inPlan
    ? (v.tier === 'plus'
        ? `<span class="access-pill access-pill--plus-overlay">${icon('checkThin', 11)} Plus</span>`
        : v.tier === 'premium'
        ? `<span class="access-pill access-pill--premium-overlay">${icon('checkThin', 11)} Premium</span>`
        : `<span class="access-pill access-pill--included-overlay">${icon('checkThin', 11)} Included</span>`)
    : `<span class="access-pill access-pill--locked-overlay venue-card__lock">${icon('lock', 11)} Needs ${v.tier === 'premium' ? 'Premium' : 'Classic'}</span>`;

  return `<div class="activity-card venue-card hit ${inPlan ? '' : 'is-locked'} ${isStarred ? 'is-starred' : ''}" draggable="true" data-drag-venue="${esc(v.id)}" data-drag-name="${esc(v.name)}">
    <div class="activity-card__badges">
      ${badge || accessBadge}
    </div>
    <button class="activity-card__star-btn ${isStarred ? 'is-active' : ''}" type="button" data-toggle-star="${esc(v.id)}" aria-label="${isStarred ? `Remove ${esc(v.name)} from routine` : `Add ${esc(v.name)} to routine`}" title="${isStarred ? 'In your routine' : 'Add to routine'}">
      ${icon(isStarred ? 'starFill' : 'star', 15)}
    </button>
    <button class="activity-card__media-btn hit__media" data-venue="${esc(v.id)}" aria-label="Details about ${esc(v.name)}">
      <span class="activity-card__media">${venueMedia(v, focus ? [focus] : null)}</span>
      <span class="activity-card__icon-badge">${icon(grpIcon, 16)}</span>
    </button>
    <div class="activity-card__content hit__body">
      <div class="activity-card__activity"><b>${esc(grpLabel)}</b></div>
      <button class="activity-card__vname venue-card__name hit__name linkish" data-venue="${esc(v.id)}">${esc(v.name)}</button>
      <div class="activity-card__dist hit__meta">${where} &middot; ${esc(acts)}</div>
      ${priced && lowest ? `<p class="hit__price">Included from <strong>${esc(lowest.name)}</strong>, ${priceFor(lowest, S.commitmentId)} € a month.</p>` : ''}
      <div class="activity-card__actions">
        ${isStarred ? `
          <button class="btn-pill btn-pill--sm btn-pill--starred btn-pill--block" type="button" data-toggle-star="${esc(v.id)}" title="Click to remove from routine">
            ${icon('starFill', 12)} <span>In routine</span>
          </button>
        ` : `
          <button class="btn-pill btn-pill--sm btn-pill--block" type="button" data-toggle-star="${esc(v.id)}">
            ${icon('plus', 11)} <span>Add to routine</span>
          </button>
        `}
      </div>
    </div>
  </div>`;
}

function weekPickBar() {
  if (!WEEK_ADD_MODE) return '';
  const match=matchVenues(A()), plan=currentPlan();
  const days=(S.weekDays&&S.weekDays.length) ? S.weekDays
    : weekPlan(A().activities||[],match.pool||[],plan.id,A().frequency).sessions.map(x=>x.day);
  return `<div class="weekpick">
    <div class="weekpick__copy"><b>Adding to ${WEEK_ADD_DAY?esc(WEEK_ADD_DAY):'your week'}</b>
      <span>Pick a day once, then add any venue directly.</span></div>
    <div class="weekpick__days" role="group" aria-label="Day to change">${days.map(day=>
      `<button class="daybtn ${WEEK_ADD_DAY===day?'is-on':''}" type="button" data-add-day="${esc(day)}" aria-pressed="${WEEK_ADD_DAY===day}">${DAY_SHORT[day]}</button>`).join('')}</div>
  </div>`;
}

/* The panel at the top: where we are looking, the box, and the five shortcuts into the
   activity answer. It is the same on a browse and on a result, because it is the control
   surface for both — what changes underneath it is whether the page is showing a row of
   nearby places or the answer to something typed. */
function findBar() {
  const b = browsePlaces();
  const shortcuts = ['gym','yoga','swim','climb','spa'];
  const cats = availableGroups()
    .filter(g => shortcuts.includes(g.id) || b.groups.some(x=>x.id===g.id))
    .sort((x,y) => (shortcuts.indexOf(x.id)+1||99) - (shortcuts.indexOf(y.id)+1||99));
  const isAll = !b.groups.length;

  return `<section class="findbar">
    <div class="findbar__where">
      <span class="findbar__wheretext">${icon('pin',16)}<span>${S.answers.area ? `Showing places ${esc(b.label)}` : `Looks like you&rsquo;re in <b>${esc(b.origins[0].name)}</b> &mdash; showing places ${esc(b.label)}`}</span></span>
      <button class="linkish strong findbar__wherechange" type="button" data-toggle-where aria-expanded="${WHEREPICK}">${WHEREPICK?'Close':'Change location'}</button>
    </div>
    ${WHEREPICK ? `<div class="wherepick">
      <div class="wherepick__label">Where should we look?</div>
      <div class="wherepick__grid">${optionsFor(qById('area')).map(o=>`<button class="chip-sm ${
        areaIds(S.answers.area).includes(o.id)?'is-current':''}" type="button" data-where="${esc(o.id)}">${esc(o.label)}</button>`).join('')}</div>
      <p class="wherepick__note">${icon('info',16)} <span>This is one of Urby&rsquo;s four questions, so picking here means she won&rsquo;t ask it again.</span></p>
    </div>` : ''}
    <form data-form="search" novalidate class="findbar__searchform">
      <div class="findsearch">
        <label for="venue-search-q" class="sr-only">Search for a place, an activity or an address</label>
        <span class="findsearch__icon" aria-hidden="true">${icon('search',18)}</span>
        <input type="search" name="q" id="venue-search-q" value="${esc(SEARCH.q||'')}"
          placeholder="Venue, activity or address" aria-label="Search for a place, an activity or an address" autocomplete="off">
        <button type="submit" class="findsearch__btn">Search</button>
      </div>
    </form>
    <div class="findbar__cats" role="group" aria-label="Common activities">
      <button class="catchip ${isAll ? 'is-on' : ''}" type="button" data-cat-all aria-pressed="${isAll}">
        <span class="catchip__icon">${icon('sparkle',16)}</span><span>All</span></button>
      ${cats.map(g=>`<button class="catchip ${b.groups.some(x=>x.id===g.id)?'is-on':''}" type="button"
        data-cat="${esc(g.id)}" aria-pressed="${b.groups.some(x=>x.id===g.id)}">
        <span class="catchip__icon">${icon(g.icon,17)}</span><span>${g.label}</span></button>`).join('')}
    </div>
  </section>`;
}

/* The row of places, its two filters and the way to open it out. Everything here is a
   control rather than a claim: how far we looked is in km and it is a dropdown, what we
   looked for is the activity answer, and the line under it says what it counted (rules
   50, 54 and 56). Nothing says "popular" — the pilot holds no popularity data, and a
   heading may not claim what the data cannot (rule 6). */
function nearbyRow() {
  const b = browsePlaces();
  const shown = SEEALL ? b.within : b.within.slice(0,4);
  const areaName = b.anywhere ? 'the city centre' : b.origins[0].name;
  /* The group's own labels, comma-separated. groupWords() joins with "and", which reads
     as one thing when a label already contains one: "swimming and sauna and spa". */
  const forWhat = b.groups.map(g=>g.label.toLowerCase()).join(', ');
  const title = b.groups.length
    ? `${plural(b.within.length,'place','places')} for ${esc(forWhat)} ${esc(b.label)}`
    : `Places ${esc(b.label)}`;
  const multi = b.groups.length > 1;
  return `<section class="placesrow">
    <div class="placesrow__head">
      <div class="placesrow__title">
        <h2>${title}</h2>
        <p>${b.within.length
          ? `Nearest first, from the ${VENUES.length} real Berlin venues loaded in this pilot.`
          : `None of the ${VENUES.length} venues loaded here match, within this distance.`}</p>
      </div>
      <div class="placesrow__tools">
        <label class="pillsel"><span class="pillsel__icon">${icon('pin',16)}</span>
          <select data-radius-pick aria-label="How far to look">
            ${RADII.map(x=>`<option value="${esc(x.id)}" ${(S.radiusKm||'auto')===x.id?'selected':''}>${
              x.km?`Within ${x.km} km`:'All of Berlin'}</option>`).join('')}
          </select>${icon('chevronDown',15)}</label>
        <label class="pillsel"><span class="pillsel__icon">${icon('grid',16)}</span>
          <select data-cat-pick aria-label="Which activities to show">
            <option value="__keep" ${multi?'selected':''} ${multi?'':'hidden'}>${multi?`${b.groups.length} activities`:'&mdash;'}</option>
            <option value="" ${b.groups.length?'':'selected'}>All activities</option>
            ${availableGroups().map(g=>`<option value="${esc(g.id)}" ${
              !multi && b.groups.length && b.groups[0].id===g.id?'selected':''}>${g.label}</option>`).join('')}
          </select>${icon('chevronDown',15)}</label>
        ${b.within.length>4?`<button class="linkish strong placesrow__all" type="button" data-see-all>${
          SEEALL?'Show fewer places':'See all nearby places'} ${icon('arrowRight',17)}</button>`:''}
      </div>
    </div>
    ${shown.length ? `<div class="hits hits--row">${shown.map(v=>placeCard(v)).join('')}</div>`
      : `<div class="notice notice--grey">${icon('info',19)}<span>${b.list.length
          ? `The nearest is <b>${esc(b.list[0].name)}</b>, ${b.list[0].distanceKm} km away. Widen the distance above and it comes into range.`
          : `Nothing in the pilot&rsquo;s ${VENUES.length} venues does that. Try another activity, or search for the place by name.`}</span></div>`}
  </section>`;
}

/* The foot of the venue page: the one thing browsing cannot tell us. The two filters
   above answer two of Urby's four questions between them, so this panel puts whichever
   of the other two is still open — and never one that has been answered (rule 11).
   Answering here stays here: the way on is the button, not a redirect. */
function routinePanel() {
  const q = ['frequency','goal'].map(qById).find(x => !isAnswered(S.answers[x.id])) || null;
  const left = QUESTIONS.filter(x => !isAnswered(S.answers[x.id])).length;
  const given = QUESTIONS.filter(x => isAnswered(S.answers[x.id]));
  return `<section class="routine">
    <div class="routine__who">${ulaAvatar()}<b>Urby</b></div>
    <div class="routine__mid">
      <h2 class="routine__title">Make this fit your routine</h2>
      ${q ? `<p class="routine__q">${q.prompt}</p>
        <div class="routine__opts">${optionsFor(q).map(o=>`<button class="pill" type="button"
          data-pick="${esc(q.id)}:${esc(o.id)}">${o.id===SKIP?'Not sure yet':esc(o.label)}</button>`).join('')}</div>`
        : `<p class="routine__q">That is everything I ask &mdash; ${left?'nearly ':''}ready when you are.</p>`}
      ${given.length ? `<div class="routine__fit">${icon('checkFill',18)}<span class="routine__fitlabel">Your fit</span>
        ${given.map(x=>`<button class="answer-chip" data-edit="${esc(x.id)}"
          aria-label="Change your answer to: ${esc(x.prompt)}">${icon(x.icon,15)}<span>${
          esc(answerLabel(x.id,S.answers[x.id]))}</span>${icon('pencil',14)}</button>`).join('')}</div>` : ''}
    </div>
    <div class="routine__side">
      ${left ? `<button class="btn btn--primary" data-start-fit>See my recommendation ${icon('arrowRight',18)}</button>
        <p class="routine__note">${plural(left,'question','questions')} left &mdash; then one membership, with its reasons.</p>`
        : `<button class="btn btn--primary" data-go="recommendation">See my recommendation ${icon('arrowRight',18)}</button>
        <p class="routine__note">Built from your four answers, and yours to change.</p>`}
      <button class="routine__save" type="button" data-go="save">${icon('bookmark',20)}
        <span><b>Save these places for later</b><small>Keeps your answers and brings you back here.</small></span></button>
    </div>
  </section>`;
}

/* What a search comes back with. Every row ends in the same place — the cheapest
   membership that opens this venue — because that join is the only thing this
   journey knows that a venue list does not (rule 63). The row never claims a
   distance we cannot measure: with no area to measure from it says "in Berlin"
   rather than a number counted from the middle of the city (rule 6). */
function venueOptions(v, group, day) {
  const gId = group ? group.id : ((v.activities && v.activities[0]) || 'gym');
  if (gId === 'swim' || (v.activities && v.activities.includes('swimming'))) {
    return [
      { id: 'opt_1', title: 'Open swimming', time: 'All day' },
      { id: 'opt_2', title: 'Aqua fitness', time: '18:30' },
      { id: 'opt_3', title: 'Swim training', time: '20:00' }
    ];
  }
  if (gId === 'yoga' || (v.activities && v.activities.includes('yoga'))) {
    return [
      { id: 'opt_1', title: 'Vinyasa flow', time: '18:00' },
      { id: 'opt_2', title: 'Hatha yoga', time: '19:30' },
      { id: 'opt_3', title: 'Yin yoga', time: '20:45' }
    ];
  }
  if (gId === 'climb' || (v.activities && (v.activities.includes('bouldering') || v.activities.includes('climbing')))) {
    return [
      { id: 'opt_1', title: 'Open bouldering', time: 'All day' },
      { id: 'opt_2', title: 'Bouldering intro', time: '18:30' },
      { id: 'opt_3', title: 'Technique workshop', time: '20:00' }
    ];
  }
  if (gId === 'fight' || (v.activities && (v.activities.includes('boxing') || v.activities.includes('martial_arts')))) {
    return [
      { id: 'opt_1', title: 'Boxing conditioning', time: '18:00' },
      { id: 'opt_2', title: 'Kickboxing basics', time: '19:15' },
      { id: 'opt_3', title: 'Open gym & bags', time: 'All day' }
    ];
  }
  if (gId === 'dance' || (v.activities && v.activities.includes('dance'))) {
    return [
      { id: 'opt_1', title: 'Contemporary dance', time: '18:30' },
      { id: 'opt_2', title: 'Hip hop', time: '19:45' },
      { id: 'opt_3', title: 'Open practice', time: 'All day' }
    ];
  }
  if (gId === 'cycle' || (v.activities && v.activities.includes('cycling'))) {
    return [
      { id: 'opt_1', title: 'Interval ride', time: '18:00' },
      { id: 'opt_2', title: 'Power cycle', time: '19:15' },
      { id: 'opt_3', title: 'Endurance ride', time: '20:15' }
    ];
  }
  if (gId === 'spa' || (v.activities && (v.activities.includes('spa') || v.activities.includes('sauna')))) {
    return [
      { id: 'opt_1', title: 'Day pass & sauna', time: 'All day' },
      { id: 'opt_2', title: 'Evening wellness session', time: '18:00' }
    ];
  }
  return [
    { id: 'opt_1', title: 'Open gym', time: 'All day' },
    { id: 'opt_2', title: 'HIIT training', time: '18:00' },
    { id: 'opt_3', title: 'Strength & conditioning', time: '19:00' }
  ];
}

function changeWeekScreen() {
  const day = WEEK_SWAP_DAY || WEEK_ADD_DAY || 'Monday';
  const match = matchVenues(A());
  const wp = weekPlan(A().activities || [], match.pool || [], currentPlan().id, A().frequency);
  const scheduledSession = wp.sessions.find(s => s.day === day) || wp.sessions[0];
  const group = groupById(WEEK_SWAP_GROUP || (scheduledSession ? scheduledSession.groupId : (A().activities || [])[0] || 'gym')) || ACTIVITY_GROUPS[0];
  const prevVenue = (scheduledSession && scheduledSession.venue) || null;
  const whereAreas = whereName(match);

  let venuesForGroup = (match.pool && match.pool.length ? match.pool : VENUES)
    .filter(v => venueInGroup(v, group))
    .sort((a, b) => (a.distanceKm || 99) - (b.distanceKm || 99));

  if (WEEK_SWAP_FILTER === 'classes') {
    venuesForGroup = venuesForGroup.filter(v => (v.goodToKnow && /class|session|timetable/i.test(v.goodToKnow)) || v.tier === 'plus' || v.tier === 'premium');
  } else if (WEEK_SWAP_FILTER === 'premium') {
    venuesForGroup = venuesForGroup.filter(v => v.tier === 'premium' || v.tier === 'plus');
  }

  const selectedVenue = (WEEK_SWAP_VENUE_ID && VENUES.find(v => v.id === WEEK_SWAP_VENUE_ID)) || venuesForGroup[0] || VENUES[0];
  const selectedVenueId = selectedVenue ? selectedVenue.id : null;
  const opts = selectedVenue ? venueOptions(selectedVenue, group, day) : [];
  const selectedOptId = WEEK_SWAP_OPTION_ID || (opts[0] ? opts[0].id : 'opt_1');
  const activeOpt = opts.find(o => o.id === selectedOptId) || opts[0];
  const selectedOptTitle = activeOpt ? `${activeOpt.title} · ${activeOpt.time}` : 'All day';

  const daysList = (S.weekDays && S.weekDays.length) ? S.weekDays : wp.sessions.map(x => x.day);

  return `
    <header class="topbar change-week-topbar">
      <div class="topbar__left">
        <button class="icon-btn linkish" type="button" data-go="recommendation" aria-label="Back to recommendation">
          ${icon('back', 19)}
        </button>
      </div>
      <div class="topbar__center font-semibold"><b>Change ${esc(day)}</b></div>
      <div class="topbar__right">
        <button class="linkish change-cancel-btn" type="button" data-go="recommendation">Cancel</button>
      </div>
    </header>

    <main class="content change-week-page weekpick" id="main">
      <div class="change-week-head">
        <h1 class="h-question change-week-title" tabindex="-1">Choose a venue for ${esc(day)}</h1>
        ${prevVenue ? `<div class="change-replacing-banner">Replacing ${esc(prevVenue.name)}</div>` : ''}
      </div>

      <div class="change-selector-card">
        <div class="change-selector-row" data-toggle-swap-day role="button" tabindex="0">
          <div class="change-selector-icon">${icon('calendar', 22)}</div>
          <div class="change-selector-text">
            <div class="change-selector-label">Day</div>
            <div class="change-selector-val">${esc(day)}</div>
          </div>
          <button class="change-selector-action linkish strong" type="button" data-toggle-swap-day>Change</button>
        </div>
        ${WEEK_SWAP_PICKING_DAY ? `
          <div class="change-picker-drawer">
            <div class="change-picker-pills">
              ${daysList.map(d => `<button class="chip-sm ${d === day ? 'is-current' : ''}" type="button" data-select-swap-day="${esc(d)}">${esc(d)}</button>`).join('')}
            </div>
          </div>
        ` : ''}
        <div class="change-selector-divider"></div>
        <div class="change-selector-row" data-toggle-swap-act role="button" tabindex="0">
          <div class="change-selector-icon">${icon(group.icon || 'waves', 22)}</div>
          <div class="change-selector-text">
            <div class="change-selector-label">Activity</div>
            <div class="change-selector-val">${esc(group.label)}</div>
          </div>
          <button class="change-selector-action linkish strong" type="button" data-toggle-swap-act>Change</button>
        </div>
        ${WEEK_SWAP_PICKING_ACT ? `
          <div class="change-picker-drawer">
            <div class="change-picker-pills">
              ${ACTIVITY_GROUPS.map(g => `<button class="chip-sm ${g.id === group.id ? 'is-current' : ''}" type="button" data-select-swap-group="${esc(g.id)}">${icon(g.icon, 15)} <span>${esc(g.label)}</span></button>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <div class="change-places-head">
        <h2 class="change-places-title">Places that work on ${esc(day)}</h2>
        <p class="change-places-sub">Near ${esc(whereAreas)}</p>
      </div>

      <div class="change-filters-row">
        <button class="filter-chip ${WEEK_SWAP_FILTER==='nearby'?'is-active':''}" type="button" data-swap-filter="nearby">Nearby</button>
        <button class="filter-chip ${WEEK_SWAP_FILTER==='classes'?'is-active':''}" type="button" data-swap-filter="classes">Has classes</button>
        <button class="filter-chip ${WEEK_SWAP_FILTER==='premium'?'is-active':''}" type="button" data-swap-filter="premium">Premium</button>
        <button class="filter-chip filter-chip--icon ${WEEK_SWAP_FILTER==='all'?'is-active':''}" type="button" data-swap-filter="all" aria-label="All filters">${icon('adjust', 17)}</button>
      </div>

      <div class="change-venues-list">
        ${venuesForGroup.length ? venuesForGroup.map(v => {
          const isSelected = v.id === selectedVenueId;
          const vOpts = venueOptions(v, group, day);
          const tierLabel = v.tier === 'premium' ? 'Premium' : v.tier === 'plus' ? 'Plus' : 'Standard';
          return `
            <div class="venue-class-card ${isSelected ? 'is-selected-venue' : ''}">
              <div class="venue-class-card__media">
                <span class="venue-class-card__badge ${v.tier==='premium'?'badge--premium':v.tier==='plus'?'badge--plus':'badge--standard'}">${tierLabel}</span>
                ${venueMedia(v, group.activities)}
              </div>
              <div class="venue-class-card__body">
                <h3 class="venue-class-card__name">${esc(v.name)}</h3>
                <p class="venue-class-card__meta">${v.distanceKm || '0.9'} km &middot; ${esc(AREAS.find(a=>a.id===v.area)?.name || v.area || 'Berlin')}</p>
                <div class="venue-class-card__options-label">Choose a ${esc(day)} option</div>
                <div class="venue-class-card__options-list">
                  ${vOpts.map((opt, idx) => {
                    const isOptChosen = (isSelected && selectedOptId === opt.id) || (isSelected && !WEEK_SWAP_OPTION_ID && idx === 0);
                    return `
                      <label class="venue-opt-item ${isOptChosen ? 'is-chosen' : ''}" data-select-swap-opt="${esc(v.id)}" data-opt-id="${esc(opt.id)}" data-opt-title="${esc(opt.title)}" data-opt-time="${esc(opt.time)}">
                        <input type="radio" name="venue_opt_${esc(v.id)}" value="${esc(opt.id)}" ${isOptChosen ? 'checked' : ''}>
                        <span class="venue-opt-radio">${icon(isOptChosen ? 'radioChecked' : 'radioUnchecked', 19)}</span>
                        <span class="venue-opt-title">${esc(opt.title)}</span>
                        <span class="venue-opt-time">${esc(opt.time)}</span>
                      </label>
                    `;
                  }).join('')}
                </div>
                <button class="linkish strong venue-class-card__details-link" type="button" data-venue="${esc(v.id)}">View venue details</button>
              </div>
            </div>
          `;
        }).join('') : `
          <div class="notice notice--grey" style="margin-top:20px">${icon('info',19)}<span>No venues found for ${esc(group.label)} with this filter near ${esc(whereAreas)}.</span></div>
        `}
      </div>
    </main>

    <div class="change-sticky-bar">
      <div class="change-sticky-bar__left">
        <div class="change-sticky-bar__dayact"><b>${esc(day)} &middot; ${esc(group.label)}</b></div>
        <div class="change-sticky-bar__sub">${esc(selectedVenue ? selectedVenue.name : 'Selected place')} &middot; ${esc(selectedOptTitle)}</div>
      </div>
      <button class="btn btn--primary change-sticky-bar__cta" type="button" data-confirm-week-swap>
        Update my week
      </button>
    </div>
    ${venueSheet()}
  `;
}

function searchScreen() {
  if (WEEK_ADD_MODE) return changeWeekScreen();
  const r = SEARCH.result;
  const from = r ? r.from : ANYWHERE, known = Boolean(r && r.known);
  /* The typed examples that used to sit under the box are gone: the five activity chips
     in the panel do the same job — "I don't know what to type" — and they do it by
     answering one of Urby's questions rather than by filling the field in for you. */
  /* When the search named an activity, the icon shows that activity — a pool that also
     runs yoga classes was coming back from a swimming search under a leaf. */
  const focus = r && r.kind === 'activity' ? r.activity : null;

  /* A result is a card with the venue's own photograph, not a row of text. Somebody
     typing the name of their studio is asking "is this the place I mean?" as much as
     "is it on the list?", and a line of type cannot answer the first one. It is the
     same card the row below browses with — one shape on one page (rule 72) — but with
     the join to a membership spelled out, because that is what was asked. */
  const hitCard = v => placeCard(v, { known, from: from && from.name, focus, priced:true });

  /* Urby says how she read the query before she answers it. The matching is the same
     deterministic pass over data/venues.json that the recommendation uses — no model
     chooses any of this (rules 1 and 2) — so the line can state exactly what it did:
     which of the three readings it took, and how much data it took it over (rule 6).
     It is also the only honest way to make the search feel like a guide rather than a
     database: a guide tells you what it understood, so you can correct it. */
  const reading = !r
    ? `Type a place, an activity or an address. I check it against the ${VENUES.length} Berlin venues
       loaded in this pilot and tell you which membership opens each one.`
    : r.kind === 'venue' ? `I read &ldquo;${esc(r.query)}&rdquo; as the name of a place and matched it against
        all ${VENUES.length} venues loaded here.`
    : r.kind === 'activity' ? `I read that as <b>${esc((ACTIVITY_LABELS[r.activity]||r.activity).toLowerCase())}</b>
        and looked ${known ? `out from ${esc(from.name)}` : 'right across Berlin'}, nearest first.`
    : r.kind === 'area' ? `I recognised <b>${esc(from.name)}</b> in that, so I have sorted every venue in the
        pilot by how far it is from there.`
    : `I checked every name and every activity in the pilot&rsquo;s ${VENUES.length} venues${r.activity
        ? ` for ${esc((ACTIVITY_LABELS[r.activity]||r.activity).toLowerCase())}` : ''}, and nothing matched.`;

  /* Browsing, the page is titled by what it is for. Once something has been searched the
     title is the answer to it — the heading is the result, not a label above one. */
  const heading = !r ? 'Find a place you&rsquo;ll want to return to'
    : r.kind === 'venue' ? (r.venues.length === 1
        ? `Yes &mdash; ${esc(r.venues[0].name)} is on Urban Sports Club`
        : `${plural(r.venues.length,'place','places')} matching &ldquo;${esc(r.query)}&rdquo;`)
    : r.kind === 'activity' ? `${plural(r.venues.length,'place','places')} for ${esc(ACTIVITY_LABELS[r.activity]||r.activity)}${known?` near ${esc(from.name)}`:' in Berlin'}`
    : r.kind === 'area' ? `${plural(r.venues.length,'place','places')} near ${esc(from.name)}`
    : `I can&rsquo;t find that in the pilot&rsquo;s venue list`;

  /* A miss is the one moment this pilot can collect something nobody else in the
     funnel can: the place someone wishes were there (rule 12). It also has to be
     honest that the real network is far larger than the sample loaded here. */
  const miss = r && r.kind === 'none' ? `
    <div class="notice notice--grey">${icon('info',19)}<span>This pilot has ${VENUES.length} real Berlin venues loaded, not the whole network of ${esc(PLANS[PLANS.length-1].venueCount)} &mdash; so a miss here does not mean a miss on Urban Sports Club.</span></div>
    <div class="search-empty-discover" style="margin:16px 0 20px">
      <p class="small muted" style="margin-bottom:8px">Try searching for popular activities or neighborhoods:</p>
      <div class="chips-row" style="margin-bottom:0">
        <button class="chip-sm" type="button" data-search-example="Bouldering">🧗 Bouldering</button>
        <button class="chip-sm" type="button" data-search-example="Yoga">🧘 Yoga</button>
        <button class="chip-sm" type="button" data-search-example="Swimming">🏊 Swimming</button>
        <button class="chip-sm" type="button" data-search-example="Prenzlauer Berg">📍 Prenzlauer Berg</button>
        <button class="chip-sm" type="button" data-search-example="Kreuzberg">📍 Kreuzberg</button>
      </div>
    </div>
    ${PLACEWANTED ? `<div class="notice" style="margin-top:14px">${icon('checkThin',19)}<span>Noted &mdash; <b>${esc(PLACEWANTED)}</b>.
        It shows up in the <button class="linkish" data-go="data">journey data</button> as a place members are asking for.</span></div>`
      : `<form data-form="place-demand" class="partnerask__form" style="margin-top:16px">
        <input type="text" name="place" value="${esc(SEARCH.q||'')}" placeholder="Name the place we should add" aria-label="A place we should add">
        <button class="btn btn--secondary" type="submit">Tell the partnerships team</button></form>`}` : '';

  /* Karim's venue page, 14 August. One column, in the order the visitor's own questions
     arrive in: where am I looking, what am I looking for, what is there — and only then
     the guide asking the one thing the row above cannot tell her.

     A searched query and a browsed row are never both on screen. They are two answers to
     the same question, and showing both would put two lists and two calls to action on
     one screen (rules 8 and 9): a result gets the hits and the way into the four
     questions, and browsing gets the row and the panel at the foot. */
  const searched = Boolean(r);
  const backTarget = (WEEK_ADD_MODE || S.lastStep === 'recommendation' || hasSaveableProgress()) ? 'recommendation' : 'landing';
  const backLabel = WEEK_ADD_MODE ? 'Back to my week' : (backTarget === 'recommendation' ? 'Back to recommendation' : 'Back');
  /* The tray reports what is actually starred. A placeholder count read as a promise the
     routine had not earned yet, which is the one thing this screen must never do. */
  const routineCount = Object.keys(S.starredVenues || {}).length;
  const routineLead = routineCount
    ? `${routineCount} ${routineCount === 1 ? 'place' : 'places'} in your routine`
    : 'No places in your routine yet';
  const routineHint = routineCount ? 'Tap any card to add or remove' : 'Star a place to start building it';
  const stickyTray = (backTarget === 'recommendation') ? `
    <div class="paybar search-sticky-bar">
      <div class="paybar__pull-handle" data-go="recommendation" aria-hidden="true"></div>
      <div class="paybar__info" data-go="recommendation" role="button" tabindex="0" aria-label="Back to your routine">
        <div class="paybar__lead">
          <b>${routineLead}</b>
        </div>
        <span class="paybar__subtext">${routineHint}</span>
      </div>
      <button class="btn btn--primary paybar__cta" type="button" data-go="recommendation">
        ${routineCount ? 'Build my routine' : 'Back to recommendation'} &rarr;
      </button>
    </div>
  ` : '';

  return `<header class="topbar"><div class="topbar__left"><button class="wordmark linkish" style="text-decoration:none" data-go="landing">Urban Sports Club</button></div><div></div>
    <div class="topbar__right"><button class="link-plain linkish strong" data-go="${backTarget}">${icon('back',17)} ${backLabel}</button></div></header>
    <main class="content venuepage" id="main">
    <div class="venuepage__intro">
      <div class="search__guide">${ulaAvatar('sm')}<span>Urby &middot; Membership guide</span></div>
      <h1 class="h-question venuepage__h1" tabindex="-1">${WEEK_ADD_MODE ? (WEEK_ADD_DAY ? `Choose a venue for ${esc(WEEK_ADD_DAY)}` : 'Choose an activity or venue for your week') : heading}</h1>
    </div>
    <div class="venuepage__layout ${searched?'venuepage__layout--searched':''}">
    <div class="venuepage__primary">
      ${weekPickBar()}
      ${findBar()}
      ${searched ? '' : nearbyRow()}
      ${searched ? `<p class="search__read">${icon('sparkle',17)} <span>${reading}</span></p>` : ''}
      ${r && r.approximated ? `<p class="xsmall muted" style="margin-top:12px">${icon('info',14)} The pilot has no map service, so distances are measured from ${esc(from.name)} rather than from your door.</p>` : ''}
      ${r && r.venues && r.venues.length ? `<div class="hits ${r.venues.length===1?'hits--one':'hits--row'}">${r.venues.map(hitCard).join('')}</div>` : ''}
      ${miss}
      ${!WEEK_ADD_MODE && r && r.venues && r.venues.length ? `<div class="searchnext">
      <p class="searchnext__line">${icon('sparkle',18)} <span>Those are the cheapest memberships that open each place. Which one is right for
        <em>you</em> depends on how often you go and what else you want nearby &mdash; four questions and I&rsquo;ll work it out.</span></p>
      <button class="btn btn--primary" data-start-fit ${r.area?`data-area-id="${esc(r.area.id)}"`:''}>Find my fit ${icon('arrowRight',18)}</button>
      <p class="xsmall muted" style="margin-top:12px">Or <button class="linkish strong" data-go="plans">see all four memberships</button>.</p>
      </div>` : ''}
    </div>
    ${searched ? '' : `<aside class="venuepage__aside" aria-label="Personalise your recommendation">${routinePanel()}</aside>`}
    </div>
  </main>${stickyTray}${venueSheet()}`;
}

/* The answers you have given, as chips you can tap to change.
   A tester went looking for her earlier choices and could not find them: they
   were in a side panel that only showed them, and in a disclosure at the very
   bottom of the recommendation. Now they sit at the top of whatever screen you
   are on, and each one is the edit control for itself. */
