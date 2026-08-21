function browseOrigin() {
  const ids = areaIds(S.answers.area);
  const picked = ids.filter(id => id !== 'anywhere').map(id => AREAS.find(a=>a.id===id)).filter(Boolean);
  if (picked.length) return { origins:picked, mine:true, anywhere:false, label:`near ${listWords(picked.map(a=>a.name))}` };
  if (ids.includes('anywhere')) return { origins:[ANYWHERE], mine:true, anywhere:true, label:'across Berlin' };
  const guess = AREAS.find(a=>a.id===DETECTED_AREA) || AREAS[0];
  return { origins:[guess], mine:false, anywhere:false, label:`near ${guess.name}` };
}

const CATALOG_ALL_ACTIVITIES = [
  { id: 'barre', label: 'Barre' },
  { id: 'bouldering', label: 'Bouldering' },
  { id: 'boxing', label: 'Boxing' },
  { id: 'crossfit', label: 'CrossFit' },
  { id: 'cycling', label: 'Cycling' },
  { id: 'dance', label: 'Dance' },
  { id: 'gym', label: 'Gym' },
  { id: 'hiit', label: 'HIIT' },
  { id: 'martial_arts', label: 'Martial arts' },
  { id: 'meditation', label: 'Meditation' },
  { id: 'pilates', label: 'Pilates' },
  { id: 'sauna', label: 'Sauna' },
  { id: 'spa', label: 'Spa' },
  { id: 'strength', label: 'Strength' },
  { id: 'swimming', label: 'Swimming' },
  { id: 'yoga', label: 'Yoga' },
  { id: 'climbing', label: 'Climbing' }
];

/* What the venue page browses: every place in the pilot that does what they asked for,
   inside the distance they asked for, nearest first. Applies search query, distance radius,
   active category pill, membership tiers, and activity sub-filters. */
function browsePlaces() {
  const o = browseOrigin();
  const radius = RADII.find(x=>x.id===(S.radiusKm||'3')) || RADII.find(x=>x.id==='3') || RADII[0];
  const chosenActs = activityIdsFor(A().activities || []);

  let list = VENUES.map(v => {
    const km = Math.round(Math.min(...o.origins.map(a=>distanceKm(a,v))) * 10) / 10;
    const hits = (v.activities || []).filter(x => chosenActs.includes(x));
    const basePct = hits.length > 0 ? 98 : 74;
    const distPenalty = Math.min(28, Math.round(km * 2.5));
    const matchPct = Math.max(45, Math.min(99, basePct - distPenalty));
    return { ...v, distanceKm: km, matchPct };
  });

  // 1. Radius filter:
  let withinRadius = list;
  if (S.radiusKm === '3' || S.radiusKm === 'auto' || !S.radiusKm) {
    withinRadius = list.filter(v => v.distanceKm <= 3);
  } else if (S.radiusKm === '8') {
    withinRadius = list.filter(v => v.distanceKm <= 8);
  } else if (S.radiusKm === 'any') {
    withinRadius = list;
  }

  // 2. Active Category Group Filter (from top category carousel pills):
  let filtered = withinRadius;
  const activeCats = (ACTIVE_CATEGORY_FILTERS && ACTIVE_CATEGORY_FILTERS.size > 0)
    ? Array.from(ACTIVE_CATEGORY_FILTERS)
    : ((ACTIVE_CATEGORY_FILTER && ACTIVE_CATEGORY_FILTER !== 'all') ? ACTIVE_CATEGORY_FILTER.split(',').filter(Boolean) : []);

  if (activeCats.length > 0) {
    const grps = activeCats.map(groupById).filter(Boolean);
    if (grps.length) {
      filtered = filtered.filter(v => grps.some(grp => venueInGroup(v, grp)));
    }
  } else if (S.answers.activities && S.answers.activities.length) {
    const groups = (A().activities || []).map(groupById).filter(Boolean);
    if (groups.length) filtered = filtered.filter(v => groups.some(g => venueInGroup(v, g)));
  }

  // 3. Search query filter (VENUEQ or SEARCH.q):
  const qStr = (VENUEQ || (typeof SEARCH !== 'undefined' && SEARCH && SEARCH.q) || '').trim();
  if (qStr) {
    const nq = norm(qStr);
    filtered = filtered.filter(v =>
      norm(v.name).includes(nq) ||
      norm(v.address || '').includes(nq) ||
      norm(v.area || '').includes(nq) ||
      (v.activities || []).some(a => norm(ACTIVITY_LABELS[a] || a).includes(nq) || norm(a).includes(nq))
    );
  }

  // 4. More filters: Membership access tiers (VENUE_TIER_FILTERS)
  if (VENUE_TIER_FILTERS && VENUE_TIER_FILTERS.size > 0) {
    filtered = filtered.filter(v =>
      Array.from(VENUE_TIER_FILTERS).some(t => includedIn(v, t))
    );
  }

  // 5. More filters: Individual activity tags (VENUE_ACT_FILTERS)
  if (VENUE_ACT_FILTERS && VENUE_ACT_FILTERS.size > 0) {
    filtered = filtered.filter(v =>
      Array.from(VENUE_ACT_FILTERS).some(act => (v.activities || []).includes(act))
    );
  }

  // Sort nearest first
  filtered.sort((a,b) => a.distanceKm - b.distanceKm);
  list.sort((a,b) => a.distanceKm - b.distanceKm);

  return {
    ...o,
    radius,
    groups: (A().activities || []).map(groupById).filter(Boolean),
    list,
    within: filtered,
    totalWithinRadius: withinRadius.length
  };
}

/* One card, two questions. Browsing, the badge answers "what would open this place?" at
   a glance and the card ends in the way into the detail. Searching, they asked about one
   named place, so the foot spells the join out in full with the price (rule 63) and the
   badge comes off rather than say the plan's name twice on one card (rule 33). */
function placeCard(v, opts = {}) {
  const { known = true, from = null, focus = null, priced = false } = opts;
  const plan = currentPlan();
  const inPlan = includedIn(v, plan.id);
  const lowest = firstPlanWithAccess(v) || PLANS[0];
  const kindLabel = venueKindLabel(v);
  const acts = (v.activities || []).slice(0,3).map(a => ACTIVITY_LABELS[a]||a).join(', ');
  const where = known ? `${v.distanceKm} km${from?` from ${esc(from)}`:''}` : 'in Berlin';
  const grpIcon = activityIcon(v.activities);

  const isStarred = Boolean(S.starredVenues && S.starredVenues[v.id]);

  const accessBadge = inPlan
    ? (v.tier === 'plus'
        ? `<span class="access-pill access-pill--plus-overlay">${icon('checkThin', 11)} Plus access</span>`
        : v.tier === 'premium'
        ? `<span class="access-pill access-pill--premium-overlay">${icon('checkThin', 11)} Premium access</span>`
        : `<span class="access-pill access-pill--included-overlay">${icon('checkThin', 11)} Included</span>`)
    : `<span class="access-pill access-pill--locked-overlay venue-card__lock">${icon('lock', 11)} Needs ${v.tier === 'premium' ? 'Premium' : 'Classic'}</span>`;

  const matchBadge = v.matchPct
    ? `<span class="activity-card__badge">${v.matchPct}% match</span>`
    : '';

  return `<div class="activity-card venue-card hit ${inPlan ? '' : 'is-locked'} ${isStarred ? 'is-starred' : ''}" draggable="true" data-drag-venue="${esc(v.id)}" data-drag-name="${esc(v.name)}">
    <div class="activity-card__badges">
      ${matchBadge}
      ${accessBadge}
      <span class="sr-only hit__badge hit__badge--${esc(lowest.id)}">${esc(lowest.name)}</span>
    </div>
    <button class="activity-card__star-btn ${isStarred ? 'is-active' : ''}" type="button" data-toggle-star="${esc(v.id)}" aria-label="${isStarred ? `Remove ${esc(v.name)} from routine` : `Add ${esc(v.name)} to routine`}" title="${isStarred ? 'In your routine' : 'Add to routine'}">
      ${icon(isStarred ? 'starFill' : 'star', 15)}
    </button>
    <button class="activity-card__media-btn hit__media" data-venue="${esc(v.id)}" aria-label="Details about ${esc(v.name)}">
      <span class="activity-card__media">${venueMedia(v, focus ? [focus] : null)}</span>
      <span class="activity-card__icon-badge">${icon(grpIcon, 16)}</span>
    </button>
    <div class="activity-card__content hit__body">
      <div class="activity-card__activity"><b>${esc(kindLabel)}</b></div>
      <button class="activity-card__vname venue-card__name hit__name linkish" data-venue="${esc(v.id)}">${esc(v.name)}</button>
      <div class="activity-card__dist hit__meta">${where}${acts?` &middot; ${esc(acts)}`:''}</div>
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

function venueEndCard(b, shown, activeCats = []) {
  const totalCount = shown.length;
  return `<div class="venue-end-card">
    <div class="venue-end-card__badge">${icon('checkThin', 13)} <span>All places shown</span></div>
    <div class="venue-end-card__title">${totalCount} of ${totalCount} ${totalCount === 1 ? 'place' : 'places'} loaded</div>
    <p class="venue-end-card__desc">Want to see more venues across Berlin?</p>
    <div class="venue-end-card__actions">
      ${(S.radiusKm !== '8' && S.radiusKm !== 'any') ? `<button class="chip-sm" type="button" data-radius="8">${icon('pin', 12)} Expand to 8 km</button>` : ''}
      ${(S.radiusKm !== 'any') ? `<button class="chip-sm" type="button" data-radius="any">${icon('city', 12)} Search all Berlin</button>` : ''}
      ${(activeCats && activeCats.length) ? `<button class="chip-sm" type="button" data-cat-all data-filter-category="all">${icon('grid', 12)} View all sports</button>` : ''}
    </div>
  </div>`;
}

function moreFiltersDrawer(filteredCount) {
  if (!VENUE_MORE_FILTERS_OPEN) return '';

  const qAct = (VENUE_ACT_SEARCH_Q || '').trim().toLowerCase();
  const actsToShow = qAct
    ? CATALOG_ALL_ACTIVITIES.filter(a => a.label.toLowerCase().includes(qAct) || a.id.toLowerCase().includes(qAct))
    : CATALOG_ALL_ACTIVITIES;

  return `<div class="more-filters-drawer" id="more-filters-drawer">
    <div class="more-filters__head">
      <h3 class="more-filters__title">More filters</h3>
      <button class="linkish strong more-filters__clear" type="button" data-clear-all-filters>Clear all</button>
    </div>

    <div class="more-filters__section">
      <div class="more-filters__label">Membership access</div>
      <div class="more-filters__tiers">
        ${PLANS.map(p => {
          const isChecked = VENUE_TIER_FILTERS.has(p.id);
          return `<button type="button" class="filter-check-pill ${isChecked ? 'is-checked' : ''}" data-toggle-tier-filter="${esc(p.id)}" aria-pressed="${isChecked}">
            <span class="filter-check-box">${isChecked ? icon('checkThin', 12) : ''}</span>
            <span class="filter-check-name">${esc(p.name)}</span>
          </button>`;
        }).join('')}
      </div>
    </div>

    <div class="more-filters__section">
      <div class="more-filters__label">All activities</div>
      <div class="more-filters__act-search">
        <span class="more-filters__act-search-icon" aria-hidden="true">${icon('search', 14)}</span>
        <input type="text" class="more-filters__act-search-input" placeholder="Find an activity" value="${esc(VENUE_ACT_SEARCH_Q || '')}" data-act-search-input autocomplete="off" aria-label="Find an activity">
        ${VENUE_ACT_SEARCH_Q ? `<button type="button" class="more-filters__act-search-clear" data-act-search-clear aria-label="Clear activity search">${icon('close', 12)}</button>` : ''}
      </div>
      <div class="more-filters__acts-grid">
        ${actsToShow.map(a => {
          const isChecked = VENUE_ACT_FILTERS.has(a.id);
          return `<button type="button" class="filter-check-item ${isChecked ? 'is-checked' : ''}" data-toggle-act-filter="${esc(a.id)}" aria-pressed="${isChecked}">
            <span class="filter-check-box">${isChecked ? icon('checkThin', 12) : ''}</span>
            <span class="filter-check-name">${esc(a.label)}</span>
          </button>`;
        }).join('')}
      </div>
    </div>

    <div class="more-filters__footer">
      <button class="linkish strong more-filters__cancel" type="button" data-toggle-more-filters>Cancel</button>
      <button class="btn btn--primary more-filters__apply" type="button" data-apply-filters>
        Show ${filteredCount} ${filteredCount === 1 ? 'place' : 'places'}
      </button>
    </div>
  </div>`;
}

function venueActiveFilterChips(b) {
  const chips = [];
  if (S.radiusKm === 'any') {
    chips.push(`<span class="filter-chip-tag"><span>📍 All Berlin</span><button type="button" data-remove-radius-filter aria-label="Remove distance filter">${icon('close', 11)}</button></span>`);
  } else if (S.radiusKm === '8') {
    chips.push(`<span class="filter-chip-tag"><span>📍 8 km</span><button type="button" data-remove-radius-filter aria-label="Remove distance filter">${icon('close', 11)}</button></span>`);
  }

  const activeCats = (ACTIVE_CATEGORY_FILTERS && ACTIVE_CATEGORY_FILTERS.size > 0)
    ? Array.from(ACTIVE_CATEGORY_FILTERS)
    : ((ACTIVE_CATEGORY_FILTER && ACTIVE_CATEGORY_FILTER !== 'all') ? ACTIVE_CATEGORY_FILTER.split(',').filter(Boolean) : []);

  if (activeCats.length > 0) {
    activeCats.forEach(cId => {
      const grp = groupById(cId);
      if (grp) {
        chips.push(`<span class="filter-chip-tag"><span>${icon(grp.icon, 12)} ${esc(grp.label)}</span><button type="button" data-remove-cat-filter="${esc(cId)}" aria-label="Remove ${esc(grp.label)} filter">${icon('close', 11)}</button></span>`);
      }
    });
  }

  if (VENUE_TIER_FILTERS && VENUE_TIER_FILTERS.size > 0) {
    Array.from(VENUE_TIER_FILTERS).forEach(tId => {
      const p = PLANS.find(x => x.id === tId);
      chips.push(`<span class="filter-chip-tag"><span>${esc(p ? p.name : tId)}</span><button type="button" data-remove-tier-filter="${esc(tId)}" aria-label="Remove ${esc(p ? p.name : tId)} filter">${icon('close', 11)}</button></span>`);
    });
  }

  if (VENUE_ACT_FILTERS && VENUE_ACT_FILTERS.size > 0) {
    Array.from(VENUE_ACT_FILTERS).forEach(aId => {
      chips.push(`<span class="filter-chip-tag"><span>${esc(ACTIVITY_LABELS[aId] || aId)}</span><button type="button" data-remove-act-filter="${esc(aId)}" aria-label="Remove ${esc(aId)} filter">${icon('close', 11)}</button></span>`);
    });
  }

  if (!chips.length) return '';

  return `<div class="venue-active-filters-row">
    <div class="venue-active-filters-list">${chips.join('')}</div>
    <button class="linkish strong venue-active-filters-clear" type="button" data-clear-all-filters>Clear filters</button>
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

/* Elevated interactive Berlin coordinate map with district landmarks, origin pulse, and interactive pins */
function interactiveBerlinMap(b) {
  const pts = b.within.slice(0, 40);
  if (!pts.length) {
    return `<div class="notice notice--grey" style="margin-top:20px">${icon('info',19)}<span>No venues match the selected filters within this distance.</span></div>`;
  }
  const all = [...pts, ...b.origins];
  const lat0 = all.reduce((s,p)=>s+p.lat,0)/all.length;
  const lng0 = all.reduce((s,p)=>s+p.lng,0)/all.length;
  const kmPerLat = 110.6, kmPerLng = 111.32 * Math.cos(lat0 * Math.PI/180);
  const span = Math.max(1.2, ...all.map(p => Math.max(
    Math.abs((p.lng-lng0)*kmPerLng), Math.abs((p.lat-lat0)*kmPerLat))));
  
  const at = p => {
    const x = (p.lng-lng0)*kmPerLng, y = (p.lat-lat0)*kmPerLat;
    return {
      left: Math.max(4, Math.min(96, 50 + (x/span)*42)).toFixed(1),
      top: Math.max(4, Math.min(96, 50 - (y/span)*42)).toFixed(1)
    };
  };

  const districts = [
    { id: 'mitte', name: 'Mitte', lat: 52.5200, lng: 13.4050 },
    { id: 'pberg', name: 'Prenzlauer Berg', lat: 52.5400, lng: 13.4200 },
    { id: 'fshain', name: 'Friedrichshain', lat: 52.5150, lng: 13.4540 },
    { id: 'xberg', name: 'Kreuzberg', lat: 52.4986, lng: 13.3918 },
    { id: 'neukoelln', name: 'Neukölln', lat: 52.4820, lng: 13.4350 },
    { id: 'charlottenburg', name: 'Charlottenburg', lat: 52.5160, lng: 13.3040 },
    { id: 'schoeneberg', name: 'Schöneberg', lat: 52.4840, lng: 13.3560 }
  ];

  const districtLabels = districts.map(d => {
    const p = at(d);
    if (parseFloat(p.left) < 5 || parseFloat(p.left) > 95 || parseFloat(p.top) < 5 || parseFloat(p.top) > 95) return '';
    return `<div class="berlin-map-district" style="left:${p.left}%;top:${p.top}%;">${esc(d.name)}</div>`;
  }).join('');

  const originMarkers = b.origins.map(a => {
    const p = at(a);
    return `<div class="berlin-map-origin" style="left:${p.left}%;top:${p.top}%;" title="Location: ${esc(a.name)}">
      <div class="berlin-map-origin-pulse"></div>
      <div class="berlin-map-origin-dot">${icon('pin', 12)}</div>
    </div>`;
  }).join('');

  const selectedVenue = pts.find(v => v.id === MAP_PREVIEW_VENUE_ID) || null;

  const pins = pts.map((v, idx) => {
    const p = at(v);
    const isSelected = (v.id === MAP_PREVIEW_VENUE_ID);
    const tierClass = v.tier === 'premium' ? 'map-pin--premium' : (v.tier === 'plus' ? 'map-pin--plus' : 'map-pin--standard');
    return `
      <button type="button" class="berlin-map-pin ${tierClass} ${isSelected ? 'is-selected' : ''}"
        data-map-pin="${esc(v.id)}"
        style="left:${p.left}%;top:${p.top}%;z-index:${isSelected ? 10 : 3};"
        title="${esc(v.name)} — ${v.distanceKm} km"
        aria-label="${esc(v.name)}, ${v.distanceKm} km away">
        <span class="berlin-map-pin__num">${idx + 1}</span>
      </button>
    `;
  }).join('');

  const previewCard = selectedVenue ? `
    <div class="berlin-map-preview-card">
      <button class="berlin-map-preview-close" type="button" data-map-close-preview aria-label="Close preview">${icon('close', 14)}</button>
      <div class="berlin-map-preview-media">
        ${venueMedia(selectedVenue, selectedVenue.activities)}
        <span class="hit__badge hit__badge--plan">${esc(PLANS.find(x => x.id === selectedVenue.tier)?.name || 'Classic')}</span>
      </div>
      <div class="berlin-map-preview-info">
        <h4 class="berlin-map-preview-title" data-venue="${esc(selectedVenue.id)}">${esc(selectedVenue.name)}</h4>
        <div class="berlin-map-preview-meta">${selectedVenue.distanceKm} km &middot; ${(selectedVenue.activities || []).map(a => ACTIVITY_LABELS[a] || a).slice(0, 2).join(', ')}</div>
        <div class="berlin-map-preview-actions">
          <button class="btn btn--secondary btn-sm" type="button" data-star-venue="${esc(selectedVenue.id)}">
            ${Boolean(S.starredVenues && S.starredVenues[selectedVenue.id]) ? '✓ In routine' : '+ Add to routine'}
          </button>
          <button class="btn btn--primary btn-sm" type="button" data-venue="${esc(selectedVenue.id)}">
            View details
          </button>
        </div>
      </div>
    </div>
  ` : '';

  return `
    <div class="berlin-map-view-container">
      <div class="berlin-map-canvas-wrap">
        <div class="berlin-map-grid-bg"></div>
        <svg class="berlin-map-topography" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <!-- Parks -->
          <path d="M36,43 Q44,40 47,46 Q42,51 35,48 Z" fill="#e2ecd8" opacity="0.85" />
          <path d="M48,68 Q58,66 57,76 Q46,78 48,68 Z" fill="#e2ecd8" opacity="0.85" />
          <!-- Spree River -->
          <path d="M 100,56 C 82,60 72,53 62,48 C 54,43 47,45 40,43 C 34,41 26,45 16,43 C 7,42 0,44 0,44" fill="none" stroke="#d2e4f0" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
          <!-- Landwehrkanal -->
          <path d="M 72,56 C 64,61 55,59 45,56 C 39,54 36,47 36,47" fill="none" stroke="#d2e4f0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        ${districtLabels}
        ${originMarkers}
        ${pins}
        ${previewCard}
      </div>
      <div class="berlin-map-footer-note">
        ${icon('info', 14)} <span>Showing ${pts.length} nearest places on interactive map. Tap any pin to preview venue details.</span>
      </div>
    </div>
  `;
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
    ${schematicMap(b)}
  </section>`;
}

/* The foot of the venue page: the one thing browsing cannot tell us. The two filters
   above answer two of Urby's four questions between them, so this panel puts whichever
   of the other two is still open — and never one that has been answered (rule 11).
   Answering here stays here: the way on is the button, not a redirect. */
function routinePanel(opts = {}) {
  const q = ['frequency','goal'].map(qById).find(x => !isAnswered(S.answers[x.id])) || null;
  const left = QUESTIONS.filter(x => !isAnswered(S.answers[x.id])).length;
  const given = QUESTIONS.filter(x => isAnswered(S.answers[x.id]));
  const btnClass = opts.isSecondaryAction ? 'btn btn--secondary' : 'btn btn--primary';
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
          esc(compactAnswerLabel(x.id,S.answers[x.id]))}</span><span class="answer-chip__edit-icon">${icon('pencil',11)}</span></button>`).join('')}</div>` : ''}
    </div>
    <div class="routine__side">
      ${left ? `<button class="${btnClass}" data-go="fit">See my recommendation ${icon('arrowRight',18)}</button>
        <p class="routine__note">${plural(left,'question','questions')} left &mdash; then one membership, with its reasons.</p>`
        : `<button class="${btnClass}" data-go="recommendation">View personalized routine ${icon('arrowRight',18)}</button>
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
  const r = (typeof SEARCH !== 'undefined' && SEARCH && SEARCH.result) || null;
  const from = r ? r.from : browseOrigin().origins[0], known = Boolean(r && r.known);
  const focus = r && r.kind === 'activity' ? r.activity : null;
  const hitCard = v => placeCard(v, { known, from: from && from.name, focus, priced: true });

  const reading = !r
    ? `Type a place, an activity or an address. I check it against the ${VENUES.length} Berlin venues loaded in this pilot and tell you which membership opens each one.`
    : r.kind === 'venue' ? `I read &ldquo;${esc(r.query)}&rdquo; as the name of a place and matched it against all ${VENUES.length} venues loaded here.`
    : r.kind === 'activity' ? `I read that as <b>${esc((ACTIVITY_LABELS[r.activity]||r.activity).toLowerCase())}</b> and looked ${known ? `out from ${esc(from.name)}` : 'right across Berlin'}, nearest first.`
    : r.kind === 'area' ? `I recognised <b>${esc(from.name)}</b> in that, so I have sorted every venue in the pilot by how far it is from there.`
    : `I checked every name and every activity in the pilot&rsquo;s ${VENUES.length} venues${r.activity ? ` for ${esc((ACTIVITY_LABELS[r.activity]||r.activity).toLowerCase())}` : ''}, and nothing matched.`;

  const heading = !r ? 'Find a place you&rsquo;ll want to return to'
    : r.kind === 'venue' ? (r.venues.length === 1
        ? `Yes &mdash; ${esc(r.venues[0].name)} is on Urban Sports Club`
        : `${plural(r.venues.length,'place','places')} matching &ldquo;${esc(r.query)}&rdquo;`)
    : r.kind === 'activity' ? `${plural(r.venues.length,'place','places')} for ${esc(ACTIVITY_LABELS[r.activity]||r.activity)}${known?` near ${esc(from.name)}`:' in Berlin'}`
    : r.kind === 'area' ? `${plural(r.venues.length,'place','places')} near ${esc(from.name)}`
    : `I can&rsquo;t find that in the pilot&rsquo;s venue list`;

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

  const searched = Boolean(r);
  const b = browsePlaces();
  const activeCats = (ACTIVE_CATEGORY_FILTERS && ACTIVE_CATEGORY_FILTERS.size > 0)
    ? Array.from(ACTIVE_CATEGORY_FILTERS)
    : ((ACTIVE_CATEGORY_FILTER && ACTIVE_CATEGORY_FILTER !== 'all') ? ACTIVE_CATEGORY_FILTER.split(',').filter(Boolean) : []);

  const hasActiveFilters = (VENUE_TIER_FILTERS && VENUE_TIER_FILTERS.size > 0) ||
                           (VENUE_ACT_FILTERS && VENUE_ACT_FILTERS.size > 0) ||
                           (activeCats.length > 0) ||
                           Boolean(VENUEQ) ||
                           (S.radiusKm && S.radiusKm !== '3' && S.radiusKm !== 'auto') ||
                           (S.answers.activities && S.answers.activities.length > 0);

  const shown = (SEEALL || VENUE_VIEW_MODE !== 'scroll' || hasActiveFilters) ? b.within : b.within.slice(0, 4);

  const backTarget = (WEEK_ADD_MODE || S.lastStep === 'recommendation' || hasSaveableProgress()) ? 'recommendation' : 'landing';
  const backLabel = WEEK_ADD_MODE ? 'Back to my week' : (backTarget === 'recommendation' ? (MOBILE() ? 'Back' : 'Back to recommendation') : 'Back');
  let routineCount = Object.keys(S.starredVenues || {}).length;
  if (routineCount === 0 && !S.routineCustomized) {
    const chosenActs = activityIdsFor(S.answers.activities || []);
    const fromAreas = (S.answers.area && S.answers.area.length ? S.answers.area : ['mitte']).map(id => AREAS.find(x => x.id === id)).filter(Boolean);
    const poolVal = VENUES.map(v => {
      const km = fromAreas.length ? Math.min(...fromAreas.map(ar => distanceKm(ar, v))) : 0;
      return { ...v, distanceKm: km };
    }).sort((x, y) => x.distanceKm - y.distanceKm);
    const wantedVal = chosenActs.length ? poolVal.filter(v => (v.activities || []).some(act => chosenActs.includes(act))) : poolVal;
    routineCount = (wantedVal.length ? wantedVal : poolVal).slice(0, 3).length;
  }
  const routineLead = routineCount
    ? `${routineCount} ${routineCount === 1 ? 'place' : 'places'} in your routine`
    : 'No places in your routine yet';
  const routineHint = routineCount ? 'Tap any card to add or remove' : 'Star a place to start building it';

  const stickyTray = (backTarget === 'recommendation') ? `
    <div class="paybar search-sticky-bar">
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

  const activeFiltersCount = (VENUE_TIER_FILTERS ? VENUE_TIER_FILTERS.size : 0) + (VENUE_ACT_FILTERS ? VENUE_ACT_FILTERS.size : 0);

  const activeGroupLabels = activeCats.map(cId => groupById(cId)?.label).filter(Boolean);
  const forWhat = activeGroupLabels.length > 0
    ? (activeGroupLabels.length === 1 ? activeGroupLabels[0].toLowerCase() : activeGroupLabels.map(l => l.toLowerCase()).join(' & '))
    : (b.groups.map(g => g.label.toLowerCase()).join(', '));

  const countHeading = forWhat
    ? `${plural(b.within.length, 'place', 'places')} for ${esc(forWhat)} ${esc(b.label)}`
    : `Places ${esc(b.label)}`;

  return `<header class="topbar">
    <div class="topbar__left"><button class="wordmark linkish" style="text-decoration:none" data-go="landing">Urban Sports Club</button></div>
    <div class="topbar__center"></div>
    <div class="topbar__right"><button class="link-plain linkish strong" data-go="${backTarget}">${icon('back', 17)} ${backLabel}</button></div>
  </header>
  <main class="content venuepage" id="main">
    <div class="venuepage__intro">
      <div class="search__guide">${ulaAvatar('sm')}<span>Urby &middot; Membership guide</span></div>
      <h1 class="h-question venuepage__h1" tabindex="-1">${searched ? heading : 'Explore places across Berlin'}</h1>
      <p class="venuepage__subtitle muted">${searched ? (r && r.venues ? `${r.venues.length} results matching your search` : '') : `${VENUES.length} real venues loaded across ${ACTIVITY_GROUPS.length} activity categories`}</p>
    </div>

    <div class="venuepage__layout ${searched ? 'venuepage__layout--searched' : ''}">
      <div class="venuepage__primary">
        <div class="venue-explorer-card">
          ${weekPickBar()}
          
          <div class="venue-filter-container">
            <div class="findbar__where">
              <span class="findbar__wheretext">${icon('pin', 16)}<span>${S.answers.area ? `Showing places ${esc(b.label)}` : `Looks like you&rsquo;re near <b>${esc(b.origins[0].name)}, Berlin</b> &mdash; showing places ${esc(b.label)}`}</span></span>
              <button class="linkish strong findbar__wherechange" type="button" data-toggle-where aria-expanded="${WHEREPICK}">${WHEREPICK ? 'Close' : 'Change location'}</button>
            </div>
            ${WHEREPICK ? `<div class="wherepick">
              <div class="wherepick__label">Where should we look?</div>
              <div class="area-search-wrap wherepick-search-wrap" data-where-search-wrap>
                <div class="area-search-field">
                  <span class="area-search-icon" aria-hidden="true">${icon('search', 15)}</span>
                  <input type="text"
                         class="area-search-input"
                         placeholder="Search neighbourhood, postcode, or address..."
                         aria-label="Search location in Berlin"
                         autocomplete="off"
                         data-where-search-input>
                  <button type="button" class="area-search-clear" data-where-search-clear aria-label="Clear location search" hidden>${icon('close', 12)}</button>
                </div>
                <div class="area-suggestions wherepick-suggestions" data-where-suggestions role="listbox" hidden></div>
              </div>
              <div class="wherepick__shortcuts">
                <span class="wherepick__subheading">Shortcuts</span>
                <div class="wherepick__grid">${AREAS.map(o => `<button class="chip-sm ${areaIds(S.answers.area).includes(o.id) ? 'is-current' : ''}" type="button" data-where="${esc(o.id)}">${esc(o.name)}</button>`).join('')}</div>
              </div>
              <div class="wherepick__anywhere-wrap">
                <button class="chip-sm chip-sm--anywhere ${areaIds(S.answers.area).includes('anywhere') ? 'is-current' : ''}" type="button" data-where="anywhere">
                  ${icon('city', 14)} Anywhere in Berlin
                </button>
              </div>
              <p class="wherepick__note">${icon('info', 16)} <span>This is one of Urby&rsquo;s four questions, so picking here means she won&rsquo;t ask it again.</span></p>
            </div>` : ''}

            <form data-form="search" class="venue-search-bar" role="search">
              <div class="findsearch">
                <span class="findsearch__icon" aria-hidden="true">${icon('search', 16)}</span>
                 <input type="search" name="q" id="venue-search-q" value="${esc(VENUEQ || (typeof SEARCH !== 'undefined' && SEARCH && SEARCH.q) || '')}"
                  placeholder="Search venues, activities, or write down any address..." aria-label="Search venues, activities or addresses with Urby" autocomplete="off" data-venue-input>
                ${(VENUEQ || (typeof SEARCH !== 'undefined' && SEARCH && SEARCH.q)) ? `<button type="button" class="findsearch__clear" data-venue-clear aria-label="Clear search">${icon('close', 12)}</button>` : ''}
                <button class="findsearch__btn" type="submit">Search</button>
              </div>
              <div class="venue-toolbar-filters">
                <label class="pillsel pillsel--radius sr-only"><span class="pillsel__icon">${icon('pin',16)}</span>
                  <select data-radius-pick aria-label="How far to look">
                    ${RADII.map(x=>`<option value="${esc(x.id)}" ${(S.radiusKm||'3')===x.id?'selected':''}>${
                      x.km?`Within ${x.km} km`:'All of Berlin'}</option>`).join('')}
                  </select>
                </label>
                <div class="radius-toggle" role="group" aria-label="Distance radius">
                  <button class="chip-sm ${(!S.radiusKm || S.radiusKm === '3' || S.radiusKm === 'auto') ? 'is-active is-current' : ''}" type="button" data-radius="3">3 km</button>
                  <button class="chip-sm ${S.radiusKm === '8' ? 'is-active is-current' : ''}" type="button" data-radius="8">8 km</button>
                  <button class="chip-sm ${S.radiusKm === 'any' ? 'is-active is-current' : ''}" type="button" data-radius="any">All Berlin</button>
                </div>
                <button class="btn-more-filters ${VENUE_MORE_FILTERS_OPEN || activeFiltersCount > 0 ? 'is-active' : ''}" type="button" data-toggle-more-filters aria-expanded="${VENUE_MORE_FILTERS_OPEN}">
                  ${icon('adjust', 15)} <span>More filters${activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}</span>
                </button>
              </div>
            </form>

            ${searched ? '' : `
              <div class="category-pills-wrap">
                <div class="category-pills" id="category-pills-scroll" role="tablist" aria-label="Filter by sport">
                  <button class="catchip category-pill ${(!activeCats.length && !(S.answers.activities && S.answers.activities.length)) ? 'is-active is-on' : ''}" type="button" data-cat-all data-filter-category="all">
                    ${icon('grid', 13)} <span>All</span>
                  </button>
                  ${ACTIVITY_GROUPS.map(g => {
                    const isSelected = activeCats.includes(g.id) || (S.answers.activities && S.answers.activities.includes(g.id));
                    return `
                      <button class="catchip category-pill ${isSelected ? 'is-active is-on' : ''}" type="button" data-cat="${esc(g.id)}" data-filter-category="${esc(g.id)}">
                        ${icon(g.icon, 13)} <span>${esc(g.label)}</span>
                      </button>
                    `;
                  }).join('')}
                </div>
                <div class="category-pills__fade">
                  <button class="category-pills__mini-btn" type="button" data-scroll-pills="right" aria-label="Scroll sports">
                    ${icon('chevron', 12)}
                  </button>
                </div>
              </div>
            `}
          </div>

          ${moreFiltersDrawer(b.within.length)}

          ${searched ? '' : `
          <section class="placesrow">
            <div class="venue-results-bar">
              <div class="venue-results-bar__left">
                <h2 class="venue-results-bar__title" id="results-count">Places for you</h2>
                <span class="venue-results-bar__count">${searched ? 'Search results' : `${plural(b.within.length, 'place', 'places')} found${b.label ? ` &middot; ${esc(b.label)}` : ''}`}</span>
              </div>
              ${searched ? '' : `
                <div class="venue-results-bar__right">
                  <div class="venue-view-toggle" role="group" aria-label="View mode">
                    <button class="view-toggle-btn view-toggle-btn--gallery ${VENUE_VIEW_MODE === 'scroll' ? 'is-active' : ''}" type="button" data-venue-view-mode="scroll" aria-label="Carousel gallery view" aria-pressed="${VENUE_VIEW_MODE === 'scroll'}" title="Carousel view">
                      ${icon('grid', 14)} <span>Gallery</span>
                    </button>
                    <button class="view-toggle-btn ${VENUE_VIEW_MODE === 'grid' ? 'is-active' : ''}" type="button" data-venue-view-mode="grid" aria-label="Grid layout view" aria-pressed="${VENUE_VIEW_MODE === 'grid'}" title="Grid view">
                      ${icon('checkThin', 14)} <span>Grid</span>
                    </button>
                    <button class="view-toggle-btn ${VENUE_VIEW_MODE === 'map' ? 'is-active' : ''}" type="button" data-venue-view-mode="map" aria-label="Interactive map view" aria-pressed="${VENUE_VIEW_MODE === 'map'}" title="Map view">
                      ${icon('city', 14)} <span>Map</span>
                    </button>
                  </div>
                </div>
              `}
            </div>
            ${venueActiveFilterChips(b)}

            ${VENUE_VIEW_MODE === 'map' ? `
              ${interactiveBerlinMap(b)}
            ` : (shown.length ? `
              ${VENUE_VIEW_MODE === 'grid' ? `
                <div class="hits venue-grid--catalog ${shown.length === 1 ? 'hits--one' : shown.length === 2 ? 'hits--two' : 'hits--row'}">
                  ${shown.map(v => placeCard(v)).join('')}
                </div>
                <div class="venue-grid-end-summary">
                  <span class="venue-grid-end-summary__badge">${icon('checkThin', 13)} All ${shown.length} places shown</span>
                  ${(S.radiusKm !== '8' && S.radiusKm !== 'any') ? `<button class="chip-sm" type="button" data-radius="8">${icon('pin', 12)} Expand to 8 km</button>` : ''}
                  ${(S.radiusKm !== 'any') ? `<button class="chip-sm" type="button" data-radius="any">${icon('city', 12)} Search all Berlin</button>` : ''}
                  ${(activeCats && activeCats.length) ? `<button class="chip-sm" type="button" data-cat-all data-filter-category="all">${icon('grid', 12)} View all sports</button>` : ''}
                </div>
              ` : `
                <div class="activity-gallery-wrap venue-gallery-wrap">
                  ${shown.length > 2 ? `<button class="gallery-nav-btn gallery-nav-btn--prev is-disabled" type="button" data-scroll-gallery="prev" aria-label="Scroll left" title="Scroll left">
                    ${icon('chevron', 14)}
                  </button>` : ''}
                  <div class="activity-gallery venue-carousel-scroll ${shown.length <= 2 ? 'venue-carousel-scroll--few' : ''}" id="activity-gallery-scroll">
                    <div class="venue-carousel-track hits hits--row ${shown.length <= 2 ? 'venue-carousel-track--few' : ''}">
                      ${shown.map(v => placeCard(v)).join('')}
                      ${venueEndCard(b, shown, activeCats)}
                    </div>
                  </div>
                  ${shown.length > 2 ? `<button class="gallery-nav-btn gallery-nav-btn--next ${shown.length <= 4 ? 'is-disabled' : ''}" type="button" data-scroll-gallery="next" aria-label="Scroll right" title="Scroll right">
                    ${icon('chevron', 14)}
                  </button>` : ''}
                </div>
              `}
            ` : `<div class="notice notice--grey">${icon('info', 19)}<span>${b.list.length
                  ? `No venues match all selected filters. Try widening your distance or clearing filters to see more places.`
                  : `Nothing in the pilot&rsquo;s ${VENUES.length} venues matches.`}</span></div>`)}
          </section>
          `}

          ${searched ? `
            <p class="search__read">${icon('sparkle', 17)} <span>${reading}</span></p>
            ${r && r.approximated ? `<p class="xsmall muted" style="margin-top:12px">${icon('info', 14)} The pilot has no map service, so distances are measured from ${esc(from.name)} rather than from your door.</p>` : ''}
            ${r && r.venues && r.venues.length ? `<div class="hits ${r.venues.length === 1 ? 'hits--one' : r.venues.length === 2 ? 'hits--two' : 'hits--row'}">${r.venues.map(hitCard).join('')}</div>` : ''}
            ${miss}
            ${!WEEK_ADD_MODE && r && r.venues && r.venues.length ? `<div class="searchnext">
              <p class="searchnext__line">${icon('sparkle', 18)} <span>Those are the cheapest memberships that open each place. Which one is right for
                <em>you</em> depends on how often you go and what else you want nearby &mdash; four questions and I&rsquo;ll work it out.</span></p>
              <button class="btn btn--primary" data-start-fit ${r.area ? `data-area-id="${esc(r.area.id)}"` : ''}>Find my fit ${icon('arrowRight', 18)}</button>
              <p class="xsmall muted" style="margin-top:12px">Or <button class="linkish strong" data-go="plans">see all four memberships</button>.</p>
            </div>` : ''}
          ` : ''}
        </div>
      </div>

      ${searched ? '' : `
        <aside class="venuepage__aside" aria-label="Personalise your recommendation">
          ${routinePanel()}
        </aside>
      `}
    </div>
  </main>
  ${stickyTray}
  ${venueSheet()}`;
}
