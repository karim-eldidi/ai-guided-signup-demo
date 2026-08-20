/* ---------------- free-text interpretation (ported from src/urby.js) ---------------- */
const KEYWORDS = {
  goal:{ move_more:['move','fit','fitter','strong','strength','cardio','active','shape','weight','run','gym','muscle','energy'],
         unwind:['unwind','relax','stress','calm','sleep','yoga','stretch','recover','sauna','swim','quiet','mind','burnout'],
         try_new:['new','try','different','variety','explore','bored','climb','dance','box','discover','experiment'] },
  activities:{
    gym:['gym','weights','strength','lift','lifting','crossfit','hyrox','hiit','functional','fitter','stronger','muscle'],
    yoga:['yoga','pilates','barre','meditation','stretch','mobility','reformer','calm'],
    swim:['swim','swimming','pool','lanes','lane','aqua'],
    spa:['sauna','spa','steam','thermal','massage','wellness'],
    climb:['climb','climbing','boulder','bouldering','wall'],
    fight:['box','boxing','martial','mma','kickbox','judo','karate','muay','sparring'],
    dance:['dance','dancing','ballet','salsa','pole','contemporary'],
    cycle:['cycling','spin','spinning','bike','rpm'] },
  frequency:{ once:['once','1x','one time','one session','weekly'], twice:['twice','2x','two times','two sessions','couple'],
              often:['three','3x','four','4x','few times','several'], daily:['five','5x','six','seven','daily','every day','each day'] }
};
function interpret(qid, text) {
  const lower=(text||'').toLowerCase();
  /* Multi-select too, now: "I live in Kreuzberg but work in Mitte" is two answers,
     and two postcodes are two answers. Capped at two, in the order they said them. */
  if (qid==='area') {
    if (/anywhere|any area|all of berlin|not fussy|don'?t mind/.test(lower)) return ['anywhere'];
    const hits=[];
    for (const pc of lower.match(/\b\d{5}\b/g)||[]) if (POSTCODES[pc]) hits.push(POSTCODES[pc]);
    for (const a of AREAS) {
      const n=a.name.toLowerCase();
      if (lower.includes(n)||lower.includes(n.replace('ö','o'))) hits.push(a.id);
    }
    const ids=[...new Set(hits)].filter(id=>AREAS.some(a=>a.id===id)).slice(0,2);
    return ids.length?ids:null;
  }
  /* Multi-select: return every group the text names. "I want to swim and use a
     sauna" is two answers, and treating it as one throws half of it away. */
  if (qid==='activities') {
    const map=KEYWORDS.activities||{};
    const ids=Object.entries(map).filter(([,w])=>w.some(x=>lower.includes(x))).map(([id])=>id)
      .filter(id=>availableGroups().some(g=>g.id===id));
    return ids.length?ids:null;
  }
  const map=KEYWORDS[qid]||{}; let best={id:null,hits:0};
  for (const [id,words] of Object.entries(map)) { const hits=words.filter(w=>lower.includes(w)).length; if (hits>best.hits) best={id,hits}; }
  return best.hits>0?best.id:null;
}
const ACK = { goal:{ move_more:"Great — I'll find nearby activities that fit your routine.", unwind:"Good to know — I'll look for calmer places to reset.", try_new:"Nice — I'll look for a mix you haven't tried yet.", [SKIP]:"No problem — we can work it out as we go." },
  activities:{ _default:"Got it — I'll count the places near you for each of those.", [SKIP]:"That's fine — I'll keep the options broad." },
  area:{ _default:"Thanks — I'm searching there now.", anywhere:"Fine by me — I'll look across the whole city." },
  frequency:{ once:"That helps — I'll match a plan to one session a week.", twice:"That helps — twice a week is a good rhythm.", often:"That helps — I'll look at plans built for frequent visits.", daily:"That helps — I'll look at our widest access.", [SKIP]:"No problem — I'll assume a couple of times a week and you can change it." } };
const ackFor=(qid,aid)=>{
  if (qid==='goal' && Array.isArray(aid)) {
    const list = aid.filter(x=>x&&x!==SKIP);
    if (!list.length) return "No problem — we can work it out as we go.";
    if (list.length === 1) return (ACK.goal||{})[list[0]] || "Great — I'll find nearby activities that fit your routine.";
    if (list.includes('move_more') && list.includes('unwind') && list.includes('try_new')) {
      return "The full package — active workouts, calming recovery, and plenty of new sports to try.";
    }
    if (list.includes('move_more') && list.includes('unwind')) {
      return "Love that balance — active movement combined with time to recharge.";
    }
    if (list.includes('move_more') && list.includes('try_new')) {
      return "Great combination — high-energy training with fresh sports to explore.";
    }
    if (list.includes('unwind') && list.includes('try_new')) {
      return "Wonderful — calming spaces paired with novel activities to discover.";
    }
    return "Great choices — I'll tailor the recommendations to everything you're looking for.";
  }
  return (ACK[qid]||{})[aid]||(ACK[qid]||{})._default||'Thanks — noted.';
};


/* ---------------- Ask Urby: grounded answers, no invention ----------------
   Urby answers only from data/faqs.json, data/plans.json and data/venues.json.
   Every answer carries the source it came from. When nothing matches well
   enough she says she doesn't know and offers a next step — which is what the
   brief asks for, and what a retrieval answer can guarantee and a generated
   one cannot.                                                              */
const STOP = new Set(['a','an','the','is','are','do','does','can','i','me','my','you','your','to','of','in','on','for','and','or','it','with','at','be','if','how','what','when','where','which','who','there','their','this','that','have','has','get','got','am','was','were','will','would','should','could','any','some','so','but','not','no','yes','about','from','as','by','they','we','us']);
const norm = s => (s||'').toLowerCase().replace(/[^\p{L}\p{N}\s€]/gu,' ').replace(/\s+/g,' ').trim();
const toks = s => norm(s).split(' ').filter(w => w.length>2 && !STOP.has(w));

/* activity words a visitor might use, mapped onto our venue activity ids */
const ACTIVITY_WORDS = { pool:'swimming', swim:'swimming', swimming:'swimming', lane:'swimming',
  yoga:'yoga', pilates:'pilates', barre:'barre', meditation:'meditation',
  gym:'gym', weights:'strength', strength:'strength', lifting:'strength', crossfit:'crossfit',
  boxing:'boxing', box:'boxing', martial:'martial_arts', climb:'climbing', climbing:'climbing',
  boulder:'bouldering', bouldering:'bouldering', dance:'dance', dancing:'dance',
  run:'running', running:'running', tennis:'tennis', padel:'padel',
  sauna:'sauna', spa:'spa', massage:'spa', wellness:'spa', hiit:'hiit', cardio:'cardio' };

/* words that name what the visitor wants to know, rather than narrowing it */
const INTENT = new Set(['pause','freeze','suspend','cancel','cancellation','upgrade','downgrade','change plan',
  'cost','price','cheapest','how much','plus','plus check-in','refund','get out','early']);
/* how many entries use each tag — rare tags identify a topic, common ones don't */
const ASK_DF = (() => { const d = {}; for (const f of KB) for (const t of f.tags) d[t] = (d[t]||0)+1; return d; })();

function askUrby(query) {
  const q = norm(query);
  if (!q || toks(q).length === 0) return null;
  const words = toks(q);

  /* (a) a question about what's near a place, answered from the venue data */
  const activity = Object.keys(ACTIVITY_WORDS).find(w => q.includes(w));
  const areaHit = AREAS.find(a => q.includes(norm(a.name)) || q.includes(norm(a.name).replace('ö','o')));
  if (activity && (areaHit || S.answers.area)) {
    const act = ACTIVITY_WORDS[activity];
    const mine = areaIds(S.answers.area);
    const from = areaHit || (mine.includes('anywhere') ? ANYWHERE : AREAS.find(a => a.id === mine[0])) || ANYWHERE;
    const hits = VENUES.map(v => ({ ...v, distanceKm: distanceKm(from, v) }))
      .filter(v => v.activities.includes(act)).sort((x,y) => x.distanceKm - y.distanceKm).slice(0,3);
    if (hits.length) return { kind:'venues', from, activity:act, venues:hits,
      answer:`Yes — ${hits.length === 1 ? 'one option' : hits.length + ' options'} for ${ACTIVITY_LABELS[act]||act} near ${from.name}.`,
      sourceLabel:'our venue data', sourceUrl:null };
    return { kind:'venues-none', answer:`I can't find ${ACTIVITY_LABELS[act]||act} in our sample data near ${from.name}. The real venue list is much larger than this pilot's, so it's worth checking the app.`,
      sourceLabel:'our venue data', sourceUrl:null };
  }

  /* (b) a question about the membership, answered from the FAQ knowledge base.

     Two things make the scoring behave:
     - Rare tags count for more than common ones. A tag that only one entry uses
       ("pause") identifies the topic; one that many share ("plan") does not.
     - Intent words outrank qualifiers. In "can I pause a 12-month membership?"
       the topic is pausing; "12-month" only narrows it. Without this the query
       matched the article about what happens at the end of a 12-month term. */
  const DF = ASK_DF;
  let best = { score:0, faq:null };
  for (const f of KB) {
    let score = 0;
    for (const tag of f.tags) {
      if (!q.includes(tag)) continue;
      if (INTENT.has(tag)) { score += 8; continue; }
      const rarity = 1 + 1.2 / (DF[tag] || 1);
      score += (tag.includes(' ') ? 3.0 : 2.0) * rarity;
    }
    const qw = toks(f.q), aw = toks(f.a);
    for (const w of words) { if (qw.includes(w)) score += 1.6; else if (aw.includes(w)) score += 0.45; }
    if (score > best.score) best = { score, faq:f };
  }
  if (best.faq && best.score >= 3) {
    return { kind:'faq', answer:best.faq.a, question:best.faq.q, score:best.score,
             sourceLabel:'the Urban Sports Club help centre', sourceUrl:SOURCES[best.faq.source] || null };
  }

  /* (c) honest miss */
  return { kind:'unknown',
    answer:"I don't have a reliable answer to that. I only answer from our published plan and venue information, and I'd rather say so than guess.",
    sourceLabel:null, sourceUrl:null };
}

function askBlock(compact, fold) {
  const r = ASK.result;
  let body = '';
  if (r) {
    if (r.kind === 'venues') {
      body = `<div class="ask__answer"><p>${esc(r.answer)}</p>
        <div class="venue-strip" style="margin-top:12px">${r.venues.map(v => venueCard(v)).join('')}</div></div>`;
    } else {
      body = `<div class="ask__answer"><p>${r.answer.replace(/€/g,'&euro;')}</p></div>`;
    }
    body += `<p class="ask__source">${r.sourceLabel
      ? `${icon('info',14)} From ${esc(r.sourceLabel)}${r.sourceUrl?` · <a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">see the original</a>`:''}`
      : `${icon('info',14)} Urby only answers from approved Urban Sports Club information. <button class="linkish" data-ask-contact>Ask a human instead</button>`}</p>`;
  }
  /* Three, not four. A fourth chip earns nothing and costs a line on a phone, where
     the end of this page was already the part testers said they could not process. */
  const examples = ['Can I pause a 12-month membership?','How often can I go?','What are Plus check-ins?'];
  const head = `${ulaAvatar('sm')}<div>
      <div class="ask__title">A specific membership question?</div>
      <div class="ask__sub">Plans, prices, pausing, what&rsquo;s near you. Answered from published information only.</div></div>`;
  const inner = `<form data-form="ask"><div class="ask__row">
      <label for="ask-q-input" class="sr-only">Ask Urby a question</label>
      <input type="text" name="q" id="ask-q-input" value="${esc(ASK.q||'')}" placeholder="Type a question…" aria-label="Ask Urby a question" autocomplete="off">
      <button class="btn btn--secondary" type="submit">Ask</button></div></form>
    ${body}
    ${!r?`<div class="ask__examples">${examples.map(x=>`<button class="chip-sm" data-ask-example="${esc(x)}">${esc(x)}</button>`).join('')}</div>`:
        `<div class="ask__examples"><button class="chip-sm" data-ask-clear>Ask something else</button></div>`}`;
  /* Folded on the recommendation page only. There it is the last thing below the
     decision and the least likely to move anyone, so it costs a click instead of a
     screen. It opens itself the moment there is an answer to show, or submitting a
     question would hide its own answer on the re-render. On a question screen it stays
     a live box — there the ask is the whole point of the column. */
  /* Inside the shelf at the foot of the recommendation it wears the shelf's row: an
     icon, a label, a hint and a chevron, the same as its neighbours. Three folds that
     each looked like a different kind of thing was most of what made that end of the
     page feel like work. */
  if (fold) return `<details class="ask ask--compact ask--fold shelf__row"${r||MOREPICK==='ask'?' open':''}>
    <summary class="shelf__head" data-more="ask"><span class="shelf__icon">${icon('speech',18)}</span><span class="shelf__label">Ask Urby about this membership</span>
      <span class="shelf__hint">plans, prices, pausing, what&rsquo;s near you</span><span class="shelf__chev">${icon('chevron',18)}</span></summary>
    <div class="shelf__body">${inner}</div>
  </details>`;
  return `<section class="ask ${compact?'ask--compact':''}">
    <div class="ask__head">${head}</div>
    ${inner}
  </section>`;
}

/* ---------------- search: the question everybody actually arrives with ----------
   "Is my local yoga studio on this?" Four reviewers went looking for the answer and
   the pilot did not have one: the only field that accepted a place name recorded it
   as demand for the partnerships team. Rule 62.

   Three shapes of query, one shape of answer. A name ("Yogarium"), a thing
   ("swimming in Kreuzberg"), or a place ("Sonnenallee 12"). Whatever comes back ends
   in the consequence that matters — which membership opens it — because a venue
   finder that stops at "yes, we have that" is a directory, and the argument of this
   whole journey is the join between the place and the price. Rule 63.

   The wording layer never decides any of this. The matching is the same deterministic
   pass over data/venues.json that the recommendation uses, so it works with no AI key
   and it cannot invent a venue (rules 1 and 2).                                    */
function searchPlaces(query) {
  const q = norm(query);
  if (!q) return null;
  const words = toks(q);
  /* An area we recognise in the query wins; failing that, one they have already told
     us about; failing that we are honestly city-wide and the screen says so. */
  const areaHit = AREAS.find(a => q.includes(norm(a.name)) || q.includes(norm(a.name).replace('ö','o')));
  const told = areaIds(S.answers.area).filter(id => id !== 'anywhere');
  const from = areaHit || AREAS.find(a => a.id === told[0]) || ANYWHERE;
  const known = Boolean(areaHit) || Boolean(told.length);
  const withKm = v => ({ ...v, distanceKm: distanceKm(from, v) });
  const base = { from, area: areaHit, known, query };

  /* (a) the whole query is a venue name, or contains one. The strongest signal there
     is, so it outranks everything — "LIQUIDROM" is not a request for spas in general. */
  const byWholeName = VENUES.filter(v => { const n = norm(v.name); return n.includes(q) || q.includes(n); })
    .map(withKm).sort((a,b) => a.distanceKm - b.distanceKm);
  if (byWholeName.length) return { ...base, kind:'venue', venues:byWholeName.slice(0,6) };

  /* (b) an activity, optionally anchored to an area we recognised. This has to come
     before the partial-name match below: half the venues in Berlin have a district in
     their name, so "swimming in Kreuzberg" was answering with a bouldering hall and a
     HYROX gym — both genuinely called Kreuzberg, neither of them a pool. */
  const actWord = Object.keys(ACTIVITY_WORDS).find(w => q.includes(w));
  if (actWord) {
    const act = ACTIVITY_WORDS[actWord];
    const hits = VENUES.filter(v => v.activities.includes(act)).map(withKm).sort((a,b) => a.distanceKm - b.distanceKm);
    return hits.length ? { ...base, kind:'activity', activity:act, venues:hits.slice(0,9) }
                       : { ...base, kind:'none', activity:act };
  }

  /* (c) part of a name, for anyone who typed half of one. Words that name a district
     are excluded for the reason above — they identify a neighbourhood, not a place. */
  const AREA_WORDS = new Set(AREAS.flatMap(a => toks(a.name)));
  const nameWords = words.filter(w => w.length > 3 && !AREA_WORDS.has(w));
  const byPartialName = nameWords.length ? VENUES.filter(v => {
    const parts = norm(v.name).split(' ');
    return nameWords.some(w => parts.some(part => part.startsWith(w)));
  }).map(withKm).sort((a,b) => a.distanceKm - b.distanceKm) : [];
  if (byPartialName.length) return { ...base, kind:'venue', venues:byPartialName.slice(0,6) };

  /* (d) a place and nothing else. A street address cannot be geocoded in a pilot with
     no map service, so we measure from the area we did recognise in it and say that
     out loud rather than presenting a number we cannot stand behind (rule 6). */
  if (areaHit) return { ...base, kind:'area', venues:VENUES.map(withKm).sort((a,b) => a.distanceKm - b.distanceKm).slice(0,9),
    approximated: /\d/.test(q) };
  return { ...base, kind:'none' };
}
