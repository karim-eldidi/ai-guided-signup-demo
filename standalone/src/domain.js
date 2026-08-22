/* ---------------- venue matching (ported from src/venues.js) ---------------- */
const GOAL_AFFINITY = {
  move_more:['gym','strength','crossfit','hiit','running','cardio','boxing','bouldering','climbing','swimming','dance'],
  unwind:['yoga','pilates','meditation','sauna','spa','swimming','barre','aqua_fitness'],
  try_new:['bouldering','climbing','dance','boxing','padel','tennis','martial_arts','barre','aqua_fitness','crossfit']
};
const ACTIVITY_LABELS = { gym:'gym', strength:'strength training', crossfit:'CrossFit', hiit:'HIIT', running:'running', cardio:'cardio', boxing:'boxing', bouldering:'bouldering', climbing:'climbing', swimming:'swimming', dance:'dance', yoga:'yoga', pilates:'pilates', meditation:'meditation', sauna:'sauna', spa:'spa', barre:'barre', aqua_fitness:'aqua fitness', tennis:'tennis', padel:'padel', martial_arts:'martial arts', outdoor:'outdoor training', cycling:'indoor cycling' };
function distanceKm(a,b){ const R=6371, rad=d=>d*Math.PI/180;
  const dLat=rad(b.lat-a.lat), dLng=rad(b.lng-a.lng);
  const h=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return Math.round(2*R*Math.asin(Math.sqrt(h))*10)/10; }
/* One answer or two. `area` may now be an array, so everything that reads it goes
   through here rather than assuming a string. */
const areaIds = v => (Array.isArray(v) ? v : (v ? [v] : [])).filter(x => x && x !== SKIP);
/* One label for one or two areas: "Kreuzberg", or "Kreuzberg and Mitte". */
const whereName = match => match && match.anywhere ? 'Berlin'
  : listWords(((match&&match.areas)||[match&&match.area]).filter(Boolean).map(a=>a.name)) || 'your area';
function matchVenues(answers = {}, limit = 6) {
  const ids = areaIds(answers.area);
  const anywhere = ids.includes('anywhere');
  /* Distances are measured from whichever of their areas is nearer — that is the
     only honest number when someone told us about home *and* work. */
  const origins = anywhere ? [ANYWHERE] : (ids.map(id => AREAS.find(a => a.id === id)).filter(Boolean));
  const from = origins.length ? origins : [AREAS[0]];
  const nearestOf = v => Math.min(...from.map(a => distanceKm(a, v)));
  const area = from[0];
  /* what they said they would actually do beats what we inferred from a one-word
     goal; the goal is only the fallback for anyone who skipped this */
  const chosen = activityIdsFor(answers.activities || []);
  const goalList = Array.isArray(answers.goal) ? answers.goal.filter(x => x !== SKIP) : (answers.goal && answers.goal !== SKIP ? [answers.goal] : []);
  const goalAffinities = [...new Set(goalList.flatMap(g => GOAL_AFFINITY[g] || []))];
  const aff = chosen.length ? chosen : goalAffinities;

  const prefs = answers.preferences || (typeof S !== 'undefined' ? S.preferences : null) || {};
  const sportFocus = Array.isArray(prefs.sportFocus) ? prefs.sportFocus : [];
  const minRating = prefs.minRating ? Number(prefs.minRating) : null;
  const strictlyNearMe = Boolean(prefs.strictlyNearMe);

  const scored = VENUES.map(v => {
    const km = nearestOf(v), hits = v.activities.filter(x => aff.includes(x));
    const nearestArea = from.reduce((best,a)=>distanceKm(a,v)<distanceKm(best,v)?a:best, from[0]);
    const focusHits = v.activities.filter(x => sportFocus.includes(x));
    const vRating = v.rating !== undefined ? Number(v.rating) : 4.5;
    const ratingPenalty = minRating && vRating < minRating ? -800 : 0;
    const score = (hits.length > 0 ? 1000 + hits.length * 10 : 0) + (focusHits.length * 200) + ratingPenalty - (anywhere ? km * 0.05 : km);
    return { ...v, rating: vRating, distanceKm: km, nearestArea, affinityHits: hits, score };
  }).sort((x,y) => y.score - x.score);

  let candidates = chosen.length ? scored.filter(v => v.affinityHits.length > 0) : scored;
  if (minRating) {
    const rated = candidates.filter(v => (v.rating || 4.5) >= minRating);
    if (rated.length >= 2) candidates = rated;
  }

  if (anywhere) return { venues: candidates.slice(0,limit), pool: candidates, area, areas: from, radiusKm:null, widened:false, anywhere:true,
                         categories:[...new Set(candidates.slice(0,limit).flatMap(v=>v.activities))] };
  /* An explicit choice wins over the automatic widening. */
  const pick = RADII.find(r => r.id === (typeof S !== 'undefined' && S.radiusKm ? S.radiusKm : 'auto')) || RADII[0];
  let nearby, radiusKm = pick.km, widened = false;
  if (pick.id === 'any') { nearby = candidates; radiusKm = null; }
  else if (pick.id !== 'auto') { nearby = candidates.filter(v => v.distanceKm <= pick.km); }
  else if (strictlyNearMe) {
    nearby = candidates.filter(v => v.distanceKm <= 3.5);
    radiusKm = 3;
    widened = false;
  } else {
    nearby = candidates.filter(v => v.distanceKm <= 3); radiusKm = 3;
    if (nearby.length < 3) { radiusKm = 8; nearby = candidates.filter(v => v.distanceKm <= 8); widened = true; }
    if (nearby.length < 3) { nearby = candidates; radiusKm = null; widened = true; }
  }
  let reachedFurther = false;
  if (chosen.length && !nearby.length) {
    const anywhereMatches = scored.filter(v => v.activities.some(x=>chosen.includes(x)));
    if (anywhereMatches.length) {
      nearby = anywhereMatches;
      reachedFurther = true;
    }
  }
  const venues = nearby.slice(0,limit);
  /* `venues` is what we show — six at most. `pool` is everything within the radius,
     which is what coverage counts: "4 of 6 places" must count all six. */
  return { venues, pool: nearby, area, areas: from, radiusKm, widened, reachedFurther, anywhere:false, categories:[...new Set(venues.flatMap(v=>v.activities))] };
}

function explainVenueMatch(venue, answers = {}, plan = null) {
  const reasons = [];
  if (!venue) return { reasons, matchScore: 0, isTopMatch: false, primaryReason: null };

  // 1. Location Proximity
  const areaLabel = venue.nearestArea ? venue.nearestArea.name : (AREAS.find(a=>a.id===venue.area)||{}).name;
  if (venue.distanceKm !== undefined && venue.distanceKm !== null) {
    if (venue.distanceKm <= 1.5) {
      reasons.push({
        type: 'location',
        strong: true,
        text: areaLabel ? `${venue.distanceKm} km from ${areaLabel}` : `${venue.distanceKm} km away`,
        icon: 'map-pin'
      });
    } else {
      reasons.push({
        type: 'location',
        strong: false,
        text: areaLabel ? `${venue.distanceKm} km from ${areaLabel}` : `${venue.distanceKm} km away`,
        icon: 'map-pin'
      });
    }
  }

  // 2. Activity Match
  const rawChosen = answers.activities || [];
  const chosenActs = activityIdsFor(rawChosen);
  const matchingActs = (venue.activities || []).filter(a => chosenActs.includes(a));
  if (matchingActs.length > 0) {
    const grp = ACTIVITY_GROUPS.find(g => g.activities.some(a => matchingActs.includes(a)));
    reasons.push({
      type: 'activity',
      strong: true,
      text: grp ? `Matches your ${grp.label} focus` : 'Matches your activity preference',
      icon: grp ? grp.icon : 'bolt'
    });
  }

  // 3. Goal Synergy
  const goals = Array.isArray(answers.goal)
    ? answers.goal.filter(x => x && x !== SKIP)
    : (answers.goal && answers.goal !== SKIP ? [answers.goal] : []);

  if (goals.includes('unwind') && (venue.activities || []).some(a => ['yoga', 'pilates', 'sauna', 'spa', 'meditation', 'swimming'].includes(a))) {
    reasons.push({
      type: 'goal',
      strong: true,
      text: 'Fits your Unwind & relax goal',
      icon: 'leaf'
    });
  } else if (goals.includes('move_more') && (venue.activities || []).some(a => ['gym', 'strength', 'crossfit', 'hiit', 'boxing'].includes(a))) {
    reasons.push({
      type: 'goal',
      strong: true,
      text: 'Great for your fitness & strength goal',
      icon: 'dumbbell'
    });
  } else if (goals.includes('try_new') && (venue.activities || []).some(a => ['bouldering', 'climbing', 'dance', 'martial_arts', 'padel', 'tennis'].includes(a))) {
    reasons.push({
      type: 'goal',
      strong: true,
      text: 'Great for trying new activities',
      icon: 'sparkles'
    });
  }

  // 4. Plan Access
  if (plan) {
    const planId = typeof plan === 'string' ? plan : plan.id;
    const planObj = typeof plan === 'string' ? (PLANS.find(p => p.id === plan) || { name: plan }) : plan;
    const inc = includedIn(venue, planId);
    if (inc) {
      const accessStr = venue.access && venue.access[planId];
      const visitsDesc = accessStr && !/^not included/i.test(accessStr) ? ` (${accessStr})` : '';
      reasons.push({
        type: 'access',
        strong: true,
        text: `Included in ${planObj.name}${visitsDesc}`,
        icon: 'checkThin'
      });
    }
  }

  const matchScore = reasons.filter(r => r.strong).length;
  const isTopMatch = matchScore >= 3;
  const primaryReason = reasons.find(r => r.strong) || reasons[0] || null;

  return {
    reasons,
    matchScore,
    isTopMatch,
    primaryReason
  };
}

/* ---------------- coverage (ported from src/coverage.js) ----------------
   The question the pricing page never answers: which places near me can I
   actually use on this membership, for the things I actually do? Counted from
   the per-plan visit limits each venue publishes. Never estimated. */
const NOT_INCLUDED = /^not included/i;
function includedIn(venue, planId) {
  if (venue.access && typeof venue.access[planId] === 'string') return !NOT_INCLUDED.test(venue.access[planId]);
  const plan = PLANS.find(p=>p.id===planId);
  if (plan && Array.isArray(plan.venueTiers) && venue.tier) return plan.venueTiers.includes(venue.tier);
  return false;
}
const firstPlanWithAccess = v => PLANS.slice().sort((a,b)=>a.rank-b.rank).find(p=>includedIn(v,p.id)) || null;

function coverage(groupIds = [], venues = [], planId = 'classic') {
  const groups = (groupIds.length ? groupIds.map(groupById).filter(Boolean) : ACTIVITY_GROUPS)
    .filter(g => venues.some(v => venueInGroup(v,g)));
  const rows = groups.map(group => {
    const nearby = venues.filter(v => venueInGroup(v,group));
    const included = nearby.filter(v => includedIn(v,planId));
    const locked = nearby.filter(v => !includedIn(v,planId));
    const unlockedBy = [...new Set(locked.map(v=>(firstPlanWithAccess(v)||{}).id).filter(Boolean))]
      .map(id=>PLANS.find(p=>p.id===id)).filter(Boolean).sort((a,b)=>a.rank-b.rank);
    return { groupId:group.id, label:group.label, short:group.short, icon:group.icon,
             nearby, included, locked, unlockedBy, fullyCovered:locked.length===0, none:included.length===0 };
  });
  const inc = new Set(rows.flatMap(r=>r.included.map(v=>v.id)));
  const nb  = new Set(rows.flatMap(r=>r.nearby.map(v=>v.id)));
  return { rows, totals:{ included:inc.size, nearby:nb.size,
    groupsCovered:rows.filter(r=>!r.none).length, groupsAsked:rows.length,
    groupsMissing:rows.filter(r=>r.none).map(r=>r.short) } };
}

/* The honest upsell: the cheapest plan above this one that opens at least one more
   place they said they would use, and exactly which places. Null when there is
   nothing real to offer — which is the point of computing it rather than claiming it. */
function upsell(groupIds = [], venues = [], planId = 'classic', commitmentId = 'monthly') {
  const current = PLANS.find(p=>p.id===planId); if (!current) return null;
  const mine = new Set(coverage(groupIds,venues,planId).rows.flatMap(r=>r.included.map(v=>v.id)));
  for (const plan of PLANS.filter(p=>p.rank>current.rank).sort((a,b)=>a.rank-b.rank)) {
    const added = coverage(groupIds,venues,plan.id).rows.flatMap(r=>r.included).filter(v=>!mine.has(v.id));
    const unique = [...new Map(added.map(v=>[v.id,v])).values()];
    if (unique.length) return { planId:plan.id, planName:plan.name,
      delta: priceFor(plan,commitmentId) - priceFor(current,commitmentId), adds:unique, addsCount:unique.length };
  }
  return null;
}

/* The mirror image. Recommending down when the data supports it is what makes
   recommending up credible. */
/* The cheapest plan that loses them nothing — and that can still carry the visits
   they told us about. Two corrections live here. It used to walk DOWN one tier and
   stop, so a five-times-a-week visitor on Max was moved to Premium and told Classic
   covered the same places, which meant the page argued against its own
   recommendation. And it ignored the monthly check-in allowance entirely, so
   "cheapest with equal coverage" could be a plan that permits four visits a month. */
function downsell(groupIds = [], venues = [], planId = 'classic', commitmentId = 'monthly', frequency = null) {
  const current = PLANS.find(p=>p.id===planId); if (!current) return null;
  const mine = new Set(coverage(groupIds,venues,planId).rows.flatMap(r=>r.included.map(v=>v.id)));
  if (!mine.size) return null;
  for (const plan of PLANS.filter(p=>p.rank<current.rank).sort((a,b)=>a.rank-b.rank)) {
    if (frequency && !carriesFrequency(plan, frequency)) continue;
    const theirs = new Set(coverage(groupIds,venues,plan.id).rows.flatMap(r=>r.included.map(v=>v.id)));
    if ([...mine].every(id=>theirs.has(id)))
      return { planId:plan.id, planName:plan.name, saves: priceFor(current,commitmentId) - priceFor(plan,commitmentId) };
  }
  return null;
}

/* ---------------- a possible week (ported from src/weekplan.js) ----------------
   The screen used to open with a price, which reads like a checkout. This turns the
   same answers into a week: which day, which activity, which real venue, how far,
   and what the plan gets you there. A plan, not a promise — nothing is booked. */
/* How far to look. "auto" is the original behaviour — 3 km, widening only when that
   finds fewer than three places — and the others are explicit choices, because Karim
   asked what happens when someone wants to reach further for more to choose from. */
/* Measured, not felt. "Walking distance" was the first option's label and nobody could
   say what it meant — 1 km? fifteen minutes? from where? A number is checkable, and the
   count line below the rail says which radius actually got used, because 'auto' widens
   when three places cannot be found inside 3 km. */
const RADII = [{ id:'auto', label:'3 km', km:3 }, { id:'8', label:'8 km', km:8 }, { id:'any', label:'all Berlin', km:null }];
const SESSIONS = { once:1, twice:2, often:3, daily:5 };
/* What the plan actually permits in a month, from the published fields that were
   already in plans.json and that the rules were ignoring. Essential is "4 check-ins
   a month, in total"; every other plan is one a day, so ~30. This is a HARD limit,
   not a preference: a plan that cannot carry the frequency someone gave us must
   never be recommended for it, and must never be priced as if it could. */
const monthlyAllowance = plan => !plan ? 0 : (plan.dailyCheckIn ? 30 : (plan.checkInsPerMonth || 0));
const visitsWanted = freq => (SESSIONS[freq] || 2) * 4;
const visitsFor = (pl, freq = S.answers.frequency) => freq && freq !== SKIP ? Math.min(monthlyAllowance(pl), visitsWanted(freq)) : monthlyAllowance(pl);
const carriesFrequency = (plan, freq) => monthlyAllowance(plan) >= visitsWanted(freq);
const DAY_SPREAD = { 1:['Wednesday'], 2:['Tuesday','Saturday'], 3:['Monday','Wednesday','Saturday'],
                     4:['Monday','Wednesday','Friday','Sunday'], 5:['Monday','Tuesday','Thursday','Friday','Sunday'] };
const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAY_SHORT = { Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri', Saturday:'Sat', Sunday:'Sun' };
/* Days they picked win over the days we guessed. Frequency follows the days,
   because "I'd go Tue and Sat" is a more honest answer than a dropdown. */
const freqForDays = n => n<=1?'once' : n===2?'twice' : n<=4?'often' : 'daily';

function weekPlan(groupIds = [], venues = [], planId = 'classic', frequency = 'twice') {
  const chosenDays = (S.weekDays||[]).filter(d=>DAY_ORDER.includes(d));
  const starredEntries = Object.entries(S.starredVenues || {}).filter(([id, meta]) => (typeof meta === 'number' ? meta > 0 : meta && meta.freq > 0));
  const starredVenueList = starredEntries.map(([id, meta]) => {
    const v = venues.find(x => x.id === id);
    const freq = typeof meta === 'number' ? meta : (meta.freq || 1);
    return v ? { venue: v, freq } : null;
  }).filter(Boolean);

  const starredCount = starredVenueList.reduce((acc, item) => acc + item.freq, 0);
  const baseCount = chosenDays.length || SESSIONS[frequency] || 2;
  const count = Math.max(baseCount, starredCount);
  const days = chosenDays.length
    ? DAY_ORDER.filter(d=>chosenDays.includes(d))
    : (DAY_SPREAD[Math.min(5, count)] || DAY_SPREAD[2]);
  const groups = (groupIds.length ? groupIds.map(groupById).filter(Boolean) : ACTIVITY_GROUPS)
    .filter(g => venues.some(v => venueInGroup(v,g)));
  const wantedVisits = count*4, allowedVisits = monthlyAllowance(planById(planId));
  const overAllowance = allowedVisits > 0 && wantedVisits > allowedVisits;
  if (!groups.length && !starredVenueList.length) return { sessions:[], perMonth:Math.min(wantedVisits, allowedVisits||wantedVisits), wantedVisits, allowedVisits, overAllowance, note:null };

  const candidateSessions = [];
  starredVenueList.forEach(({ venue, freq }) => {
    for (let f = 0; f < freq; f++) {
      const g = ACTIVITY_GROUPS.find(grp => venueInGroup(venue, grp)) || { id: 'other', label: 'Workout', icon: 'bolt' };
      candidateSessions.push({
        groupId: g.id,
        activity: g.label,
        icon: g.icon,
        venue,
        distanceKm: venue.distanceKm,
        isStarred: true
      });
    }
  });

  const used = new Set(starredVenueList.map(s => s.venue.id));
  const sessions = days.map((day,i) => {
    const custom = (S.weekSwap||{})[day];
    const customVenue = custom && typeof custom === 'object' ? venues.find(v=>v.id===custom.venueId) : null;
    const customGroup = customVenue && custom.groupId ? groupById(custom.groupId) : null;

    if (customVenue) {
      const group = customGroup || ACTIVITY_GROUPS.find(grp => venueInGroup(customVenue, grp)) || { id: 'other', label: 'Workout', icon: 'bolt' };
      const included = includedIn(customVenue, planId);
      return {
        day, groupId: group.id, activity: group.label, icon: group.icon, venue: customVenue,
        distanceKm: customVenue.distanceKm, included, access: accessLabel(customVenue, planId),
        alternatives: 1,
        needs: included ? null : firstPlanWithAccess(customVenue),
        isStarred: Boolean(S.starredVenues && S.starredVenues[customVenue.id])
      };
    }

    if (i < candidateSessions.length) {
      const cand = candidateSessions[i];
      const included = includedIn(cand.venue, planId);
      return {
        day,
        groupId: cand.groupId,
        activity: cand.activity,
        icon: cand.icon,
        venue: cand.venue,
        distanceKm: cand.distanceKm,
        included,
        access: accessLabel(cand.venue, planId),
        alternatives: 1,
        needs: included ? null : firstPlanWithAccess(cand.venue),
        isStarred: true
      };
    }

    const group = groups[i % groups.length] || ACTIVITY_GROUPS[0];
    const forGroup = venues.filter(v => venueInGroup(v,group)).sort((a,b)=>a.distanceKm-b.distanceKm);
    const preferred = forGroup.filter(v => includedIn(v,planId));
    const swapped = custom;
    const pick = (swapped && forGroup.find(v=>v.id===swapped))
      || preferred.find(v=>!used.has(v.id)) || preferred[0] || forGroup.find(v=>!used.has(v.id)) || forGroup[0];
    if (!pick) return null;
    used.add(pick.id);
    const included = includedIn(pick, planId);
    return { day, groupId:group.id, activity:group.label, icon:group.icon, venue:pick,
             distanceKm:pick.distanceKm, included, access:accessLabel(pick,planId),
             alternatives: forGroup.length,
             needs: included ? null : firstPlanWithAccess(pick),
             isStarred: false };
  }).filter(Boolean);
  const planName = (planById(planId)||{}).name || 'this plan';
  return { sessions, perMonth:Math.min(wantedVisits, allowedVisits||wantedVisits), wantedVisits, allowedVisits, overAllowance,
           note: overAllowance
             ? `This week is about ${wantedVisits} visits a month, and ${planName} allows ${allowedVisits}. Pick fewer days, or move up a plan.`
             : sessions.some(x=>!x.included) ? 'One of these needs a higher plan — swap it, or open it below.' : null };
}
/* The most persuasive number on the page, so it has to be the honest one: divided
   by the visits you can actually take, never by the visits you hoped for. Dividing
   35 € by 8 gave 4.40 € a session on a plan that allows 4. */
const perSession = (price, frequency='twice', plan=null) => {
  const wanted = visitsWanted(frequency);
  const perMonth = plan ? Math.min(wanted, monthlyAllowance(plan)) : wanted;
  return perMonth ? Math.round((price/perMonth)*10)/10 : null;
};
const accessLabel = (v,planId) => (v.access && typeof v.access[planId]==='string')
  ? v.access[planId] : (includedIn(v,planId) ? 'included' : 'not included here');

/* ---------------- recommendation rules (ported from src/recommend.js) ---------------- */
const planById = id => PLANS.find(p=>p.id===id)||null;
const planByRank = r => PLANS.find(p=>p.rank===r)||null;
const commitmentById = id => COMMITMENTS.find(c=>c.id===id)||COMMITMENTS[0];
const priceFor = (plan,cid) => plan[commitmentById(cid).priceField];
const FREQ_BASE = { once:1, twice:2, often:3, daily:4 };
const FREQ_WORDS = { once:'about once a week', twice:'twice a week', often:'three or four times a week', daily:'five or more times a week' };
const lowerFirst = s => s ? s.charAt(0).toLowerCase()+s.slice(1) : s;

function recommend(answers = {}, match = { venues:[], categories:[] }) {
  const reasons=[], appliedRules=[], notes=[];
  let rank = FREQ_BASE[answers.frequency] ?? 2;
  if (answers.frequency) { appliedRules.push('frequency-base'); reasons.push(`You said you'd realistically go ${FREQ_WORDS[answers.frequency]||'a couple of times a week'}.`); }
  else notes.push('You weren’t sure how often yet, so we assumed a couple of sessions a week. Change it any time.');
  /* Two rules used to bump the tier on a keyword — "you said unwind, so Classic".
     A tester was pushed to 75 € for one session a week that way, and the page then
     priced it at ~20 € a visit. Every bump above frequency now needs evidence: a
     named venue that the cheaper plan does not include. */
  const groups = (answers.activities||[]).filter(Boolean);
  const pool = match.pool || match.venues || [];

  /* The only rule that can move someone up on grounds other than frequency, and it
     needs proof: something they said they'd do, zero included venues near them on
     this plan, and at least one on a higher plan. It names both. */
  if (groups.length && pool.length) {
    const rankBefore = rank;
    const gaps = coverage(groups, pool, (planByRank(rank)||planByRank(2)).id).rows.filter(r=>r.none && r.unlockedBy.length);
    if (gaps.length) {
      const needed = gaps.map(r=>r.unlockedBy[0]).sort((a,b)=>a.rank-b.rank)[0];
      const gap = gaps.find(r=>r.unlockedBy.some(p=>p.id===needed.id));
      const target = Math.min(needed.rank, 3);   // never jump to the top plan on coverage alone
      if (target > rank) {
        rank = target; appliedRules.push('activity-not-covered');
        const from = planByRank(rankBefore)||planByRank(2);
        reasons.push(`Nowhere near you that does ${gap.short} is included on ${from.name} — the closest, ${gap.locked[0].name}, needs ${needed.name}.`);
      }
    }
  }

  const closeBy = (match.venues||[]).filter(v=>v.distanceKm<=2.5);
  if (closeBy.length>=3 && rank>2 && (answers.frequency==='twice'||answers.frequency==='once')) {
    /* only trim if the cheaper plan still covers everything they asked for — saving
       someone 40 € by quietly removing a venue they wanted is not a favour */
    const here = coverage(groups, pool, (planByRank(rank)||planByRank(2)).id);
    const trimmed = coverage(groups, pool, 'classic');
    if (here.totals.included === trimmed.totals.included) {
      rank = 2; appliedRules.push('nearby-sufficient');
      reasons.push(`${closeBy.length} of your places are within 2.5 km, and Classic already covers all of them.`);
    }
  }
  if (rank===4 && answers.frequency!=='daily'){ rank=3; appliedRules.push('cap-top-plan'); }

  /* Never sell a tier whose only advantage is something they did not ask for.
     Runs last, so it can undo any bump above it. */
  if (groups.length && pool.length) {
    const asIs = planByRank(rank)||planByRank(2);
    const cheaper = downsell(groups, pool, asIs.id, S.commitmentId, answers.frequency);
    const cheapPlan = cheaper ? planById(cheaper.planId) : null;
    /* ...but only down to a plan that can still carry the visits they told us about.
       Without that last clause this rule dropped a twice-a-week visitor to Essential
       because the venue happened to be included there — 8 visits a month against an
       allowance of 4. Coverage is not the only constraint. */
    if (cheapPlan && cheapPlan.rank < rank && carriesFrequency(cheapPlan, answers.frequency)) {
      rank = cheapPlan.rank; appliedRules.push('no-upsell-without-benefit');
      reasons.push(`${cheapPlan.name} opens the same places near you as ${asIs.name}, for ${cheaper.saves} € a month less — so I didn't put you on ${asIs.name}.`);
    }
  }

  /* The last word, and a hard one. The frequency they gave us is a floor on the
     monthly check-in allowance, not a hint: no rule above may leave them on a plan
     whose published allowance cannot carry it. An external reviewer found exactly
     that failure — "twice a week" recommended on 4 check-ins a month — and it is the
     one kind of error that discredits every other number on the page. */
  if (answers.frequency) {
    const need = visitsWanted(answers.frequency);
    const floor = PLANS.filter(p=>monthlyAllowance(p) >= need).sort((a,b)=>a.rank-b.rank)[0];
    if (floor && floor.rank > rank) {
      const was = planByRank(rank)||planByRank(2);
      rank = floor.rank; appliedRules.push('frequency-allowance-floor');
      /* the reason that argued for the plan we just left is now false */
      for (let i=reasons.length-1;i>=0;i--) if (reasons[i].includes("didn't put you on")) reasons.splice(i,1);
      reasons.push(`${was.name} allows only ${monthlyAllowance(was)} check-ins a month, and ${FREQ_WORDS[answers.frequency]} is about ${need}. ${floor.name} is the cheapest plan that carries that.`);
    } else if (!floor) {
      notes.push(`No plan covers ${need} check-ins a month — the most any plan allows is one a day.`);
    }
  }

  const plan = planByRank(rank)||planByRank(2);

  const areaName = whereName(match);
  const cats=(match.categories||[]).length;
  const top=[...new Set((match.venues||[]).flatMap(v=>v.affinityHits||[]))].slice(0,3).map(a=>ACTIVITY_LABELS[a]||a);
  const goalList = Array.isArray(answers.goal)
    ? answers.goal.filter(x => x && x !== SKIP)
    : (answers.goal && answers.goal !== SKIP ? [answers.goal] : []);

  if (goalList.length === 1) {
    const g = goalList[0];
    const GOAL_REASON = {
      move_more: top.length?`You want to move more, so we prioritised ${listWords(top)} near you.`:'You want to move more, so we prioritised regular training venues near you.',
      unwind:'You want to unwind, so we prioritised calmer studios, pools and sauna.',
      try_new:'You want to try something new, so we mixed venue types instead of repeating one.'
    };
    if (GOAL_REASON[g]) reasons.push(GOAL_REASON[g]);
  } else if (goalList.length > 1) {
    const hasMove = goalList.includes('move_more');
    const hasUnwind = goalList.includes('unwind');
    const hasTryNew = goalList.includes('try_new');

    if (hasMove && hasUnwind && hasTryNew) {
      reasons.push('You want to stay active, recharge and try new things, so we balanced high-energy workouts, recovery spas and novel studio styles.');
    } else if (hasMove && hasUnwind) {
      reasons.push('You want to move more and unwind, so we balanced regular workout places with calming yoga, pools and recovery spots.');
    } else if (hasMove && hasTryNew) {
      reasons.push('You want to move more and explore new sports, so we prioritised active variety across different fitness and studio formats.');
    } else if (hasUnwind && hasTryNew) {
      reasons.push('You want to unwind while trying new things, so we curated relaxing wellness alongside fresh movement and class styles.');
    }
  }
  /* the reason that answers the real question: how many of the places I'd actually
     use does this plan let me into? */
  let cov = groups.length && pool.length ? coverage(groups, pool, plan.id) : null;
  if (cov && !cov.totals.nearby) cov = null;   // "0 of the 0 places" is not a sentence
  if (cov) {
    reasons.push(`Of the ${plural(cov.totals.nearby,'place','places')} near ${areaName} ${cov.totals.nearby===1?'that does':'that do'} ${groupWords(groups)}, ${plan.name} lets you into ${cov.totals.included}.`);
    if (cov.totals.groupsMissing.length) notes.push(`${plan.name} does not include anywhere near you for ${cov.totals.groupsMissing.join(' or ')}.`);
  } else if (closeBy.length) reasons.push(`${closeBy.length} of your matches are within 2.5 km of ${areaName}.`);
  reasons.push(`${plan.name} opens ${plan.venueCount} venues, and gives you ${lowerFirst(plan.checkInModel)}.`);

  if (match.widened) notes.push('We had to look a little further out to find enough options near you.');
  if (!groups.length) notes.push('You haven’t told me which activities you’d actually do, so these matches are broad.');
  if (!answers.goal) notes.push('You haven’t told us what you want from it yet, so these matches are broad.');

  let explanation = `${plan.name} fits because ${lowerFirst(reasons[0]||'you want to get moving')}`;
  if ((match.venues||[]).length) {
    explanation += ` We found ${match.venues.length} venues around ${areaName}`;
    if (top.length) explanation += ` covering ${listWords(top)}`;
    explanation += '.';
  }
  explanation += ` ${plan.shortReason}.`;

  /* One short sentence for the headline decision. When we know what they'd do, the
     useful thing to say is how much of it this plan actually opens. */
  const headline = cov
    ? `It lets you into ${cov.totals.included} of the ${plural(cov.totals.nearby,'place','places')} near ${areaName} that do ${groupWords(groups)}.`
    : answers.frequency
      ? `Because you'd go ${FREQ_WORDS[answers.frequency]}${(match.venues||[]).length ? ` and there are ${match.venues.length} venues around ${areaName}` : ''}.`
      : `Based on what you've told me so far${(match.venues||[]).length ? `, and ${match.venues.length} venues around ${areaName}` : ''}.`;

  return { planId:plan.id, planName:plan.name, price:plan.priceMonthly, reasons, notes, appliedRules, headline,
           coverage: cov, groups, explanation: explanation.replace(/\s+/g,' ').trim() };
}
function provisionalPlan(answers, match) {
  if (!answers.goal && !answers.frequency) return null;
  const r = recommend(answers, match);
  return { planId:r.planId, planName:r.planName, price:r.price, shortReason: planById(r.planId).shortReason };
}
