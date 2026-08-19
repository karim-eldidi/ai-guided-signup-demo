/* ---------------- questions ---------------- */
const SKIP = '__skip';
const SKIP_OPTION = { id: SKIP, label: "I'm not sure yet", echo: "I'm not sure yet", icon: 'question' };
const QUESTIONS = [
  { id:'goal', prompt:'What would you love to do more of?', hint:'Pick one or more that fit what you want.', summaryLabel:'Goal', icon:'target', multi:true, placeholder:'Or tell Urby in your own words…', skip:true,
    options:[{id:'move_more',label:'Move more',echo:'I want to move more',icon:'bolt'},{id:'unwind',label:'Unwind',echo:'I want to unwind',icon:'leaf'},{id:'try_new',label:'Try something new',echo:'I want to try something new',icon:'sparkle'}] },
  /* The concrete question the old "what would make it easier?" was dancing around.
     Multi-select, because nobody does exactly one thing — and because this answer is
     what makes the recommendation checkable: these are the activities we then count
     venues for, plan by plan. */
  { id:'activities', prompt:'What would you like to do?', hint:'Pick as many as you like — I&rsquo;ll count the places near you for each one.',
    summaryLabel:'Activities', icon:'grid', multi:true, placeholder:'Or tell Urby in your own words…', optionsFrom:'activityGroups' },
  /* Two areas, not one. People live in one place and work in another, and asking
     them to pick a single neighbourhood makes the search worse than they are.
     Distances below are then measured from whichever of their areas is nearer. */
  { id:'area', prompt:'Where should we search?', hint:'Pick up to 3 &mdash; home, work, or daily routine.',
    summaryLabel:'Area', icon:'pin', multi:true, maxPick:3, placeholder:'Postcode or neighbourhood…', optionsFrom:'areas' },
  { id:'frequency', prompt:'How often would you realistically like to go?', summaryLabel:'Frequency', icon:'calendar', placeholder:'Or tell Urby in your own words…', skip:true,
    options:[{id:'once',label:'About once a week',echo:'About once a week',icon:'level1'},{id:'twice',label:'Twice a week',echo:'Twice a week',icon:'level2'},{id:'often',label:'Three or four times a week',echo:'Three or four times a week',icon:'level3'},{id:'daily',label:'Five times a week or more',echo:'Five times a week or more',icon:'level4'}] }
];
const AREAS = DATA.venues.areas, VENUES = DATA.venues.venues, PLANS = DATA.plans.plans, COMMITMENTS = DATA.plans.commitments;
const RULES = DATA.plans.rules, SOURCES = DATA.plans.sources, KB = DATA.faqs.faqs;
/* The App Catalog. The fact worth surfacing is that it is unlocked by the LENGTH
   of the membership, not the tier — one app on 12 months, two on 24, none on a
   rolling monthly. The published catalogue, its terms and its sources are in
   data/apps.json; nothing here is invented. */
const APPS = (DATA.apps&&DATA.apps.apps)||[], APP_UNLOCK = (DATA.apps&&DATA.apps.activationsByCommitment)||{},
      APP_NOTE = (DATA.apps&&DATA.apps.commitmentNote)||{};
const COMMIT_RANK = { monthly:0, annual:1, biennial:2 };
const appsFor = commitmentId => APPS.filter(a => (COMMIT_RANK[commitmentId]||0) >= (COMMIT_RANK[a.minCommitment]||0));
/* Which apps sit closest to what the visitor said they would do. The categories are
   the catalogue's own (data/apps.json); the join from an activity to a category is
   our judgement, not published fact, so the row is labelled "closest to" and never
   claims a match the way the counted venue lines do (rule 54). The goal answer counts
   for less than the activities, because it is a mood and they are a plan. */
const APP_MATCH = {
  gym:['Home fitness','Fitness'],      yoga:['Yoga','Mobility','Movement'],
  swim:['Fitness','Recovery'],         spa:['Recovery','Sleep','Meditation'],
  climb:['Mobility','Fitness'],        fight:['Fitness','Home fitness'],
  dance:['Movement','Fitness'],        cycle:['Fitness','Running']
};
const APP_MATCH_GOAL = {
  move_more:['Home fitness','Running','Fitness'],
  unwind:['Meditation','Sleep','Recovery','Mental'],
  try_new:['Movement','Focus','Yoga']
};
function rankApps(list, groupIds, goal) {
  const strong = new Set(groupIds.flatMap(g => APP_MATCH[g] || []));
  const goalList = Array.isArray(goal) ? goal.filter(x => x !== SKIP) : (goal && goal !== SKIP ? [goal] : []);
  const soft = new Set(goalList.flatMap(g => APP_MATCH_GOAL[g] || []));
  const score = a => (strong.has(a.category) ? 2 : 0) + (soft.has(a.category) ? 1 : 0);
  const ranked = list.map((a,i) => ({ a, i, s:score(a) }))
    .sort((x,y) => y.s - x.s || x.i - y.i);
  return { list: ranked.map(x => x.a), matched: ranked.length > 0 && ranked[0].s > 0 };
}
/* Real logos, from each app's own domain, with a lettered tile underneath for the
   ones we do not hold a domain for. We do not draw a logo we do not have. */
const appLogo = a => `<span class="appcard__logo">${a.domain
  ? `<img src="https://www.google.com/s2/favicons?domain=${esc(a.domain)}&sz=128" alt="" loading="lazy" onerror="this.remove()">`
  : ''}<b>${esc(a.name.replace(/[^A-Za-z]/g,'').charAt(0)||'?')}</b></span>`;
const ANYWHERE = { id:'anywhere', name:'Anywhere in Berlin', lat:52.5200, lng:13.4050 };
/* Real Urban Sports Club cities in Germany. Only Berlin has venues loaded here. */
const CITIES = ['Berlin','Hamburg','Munich','Cologne','Frankfurt','Stuttgart','D\u00fcsseldorf','Leipzig'];
/* Venue data uses fine-grained activity ids ('strength', 'barre'…). Nobody picks
   from a list of seventeen, so Urby offers eight groups and each expands to the ids
   behind it. Groups are disjoint, so "3 of 4 places" can never double-count. */
const ACTIVITY_GROUPS = [
  { id:'gym',   label:'Gym & strength',          short:'gym and strength',          icon:'dumbbell', activities:['gym','strength','crossfit','hiit'] },
  { id:'yoga',  label:'Yoga & pilates',          short:'yoga and pilates',          icon:'leaf',     activities:['yoga','pilates','barre','meditation'] },
  { id:'swim',  label:'Swimming',                short:'swimming',                  icon:'waves',    activities:['swimming','aqua_fitness'] },
  { id:'spa',   label:'Sauna & spa',             short:'sauna and spa',             icon:'spa',      activities:['sauna','spa'] },
  { id:'climb', label:'Climbing',                short:'climbing',                  icon:'mountain', activities:['bouldering','climbing'] },
  { id:'fight', label:'Boxing & martial arts',   short:'boxing and martial arts',   icon:'glove',    activities:['boxing','martial_arts'] },
  { id:'dance', label:'Dance',                   short:'dance',                     icon:'music',    activities:['dance'] },
  { id:'cycle', label:'Indoor cycling',          short:'indoor cycling',            icon:'bolt',     activities:['cycling','cardio'] }
];
const groupById = id => ACTIVITY_GROUPS.find(g=>g.id===id) || null;
const venueInGroup = (v,g) => v.activities.some(a=>g.activities.includes(a));
/* never offer a group the loaded data cannot show */
const availableGroups = () => ACTIVITY_GROUPS.filter(g => VENUES.some(v=>venueInGroup(v,g)));
const activityIdsFor = (ids=[]) => [...new Set(ids.flatMap(id=>(groupById(id)||{activities:[]}).activities))];
const plural = (n,one,many) => `${n} ${n===1?one:many}`;
const groupWords = (ids=[]) => {
  const gs = ids.map(groupById).filter(Boolean);
  if (!gs.length) return '';
  if (gs.length===1) return gs[0].short;
  if (gs.length===2) return `${gs[0].short} and ${gs[1].short}`;
  return gs.map(g=>g.label.toLowerCase()).join(', ');
};

const qById = id => QUESTIONS.find(q => q.id === id);
const qIndex = id => QUESTIONS.findIndex(q => q.id === id);
function optionsFor(q) {
  if (q.optionsFrom === 'areas') {
    const venueCountFor = id => VENUES.filter(v => v.area === id).length;
    return [
      ...AREAS.map(a => ({ id:a.id, label:a.name, sub:`${plural(venueCountFor(a.id),'venue','venues')} · ~3 km`, echo:`I'm looking around ${a.name}`, icon:'pin' })),
      { id:'anywhere', label:'Anywhere in Berlin', sub:`All ${VENUES.length} venues across city`, echo:"I'm open to anywhere in Berlin", icon:'city' }
    ];
  }
  if (q.optionsFrom === 'activityGroups') return availableGroups().map(g => ({ id:g.id, label:g.label, echo:`I'd do ${g.short}`, icon:g.icon }));
  return q.skip ? [...q.options, SKIP_OPTION] : q.options;
}
/* an answer counts as given when it is truthy — and, for multi-select, non-empty */
const isAnswered = v => Array.isArray(v) ? v.length>0 : Boolean(v);
const nextQuestion = a => QUESTIONS.find(q => !isAnswered(a[q.id])) || null;
const fitComplete = a => QUESTIONS.every(q => isAnswered(a[q.id]));
const listWords = i => i.length<=1 ? (i[0]||'') : `${i.slice(0,-1).join(', ')} and ${i[i.length-1]}`;
const answerLabel = (qid,v) => {
  if (!isAnswered(v)) return null;
  if (Array.isArray(v)) { if (v.includes(SKIP)) return 'Not sure yet';
    const opts=optionsFor(qById(qid));
    const names=v.map(id=>(groupById(id)||opts.find(x=>x.id===id)||{}).label).filter(Boolean);
    return names.length?listWords(names):null; }
  if (v===SKIP) return "Not sure yet";
  const o=optionsFor(qById(qid)).find(x=>x.id===v); return o?o.label:String(v);
};
const compactAnswerLabel = (qid,v) => {
  if (!isAnswered(v)) return null;
  if (qid==='frequency') {
    const map={once:'1x / wk',about_once:'1x / wk',twice:'2x / wk',often:'3–4x / wk',three_four:'3–4x / wk',daily:'5+x / wk',five_plus:'5+x / wk'};
    return map[v]||answerLabel(qid,v);
  }
  if (qid==='goal') {
    const map={move_more:'Move more',unwind:'Unwind',try_new:'Try new sports'};
    if (Array.isArray(v)) {
      if (v.includes(SKIP)) return 'Not sure';
      const names = v.map(id => map[id] || (optionsFor(qById(qid)).find(x=>x.id===id)||{}).label).filter(Boolean);
      if (!names.length) return null;
      if (names.length===1) return names[0];
      if (names.length===2) return `${names[0]} & ${names[1]}`;
      return `${names[0]} +${names.length-1}`;
    }
    return map[v]||answerLabel(qid,v);
  }
  if (Array.isArray(v)) { if (v.includes(SKIP)) return 'Not sure';
    const opts=optionsFor(qById(qid));
    const names=v.map(id=>(groupById(id)||opts.find(x=>x.id===id)||{}).label).filter(Boolean);
    if (!names.length) return null;
    if (names.length===1) return names[0];
    if (names.length===2) return `${names[0]} & ${names[1]}`;
    return `${names[0]} +${names.length-1}`; }
  if (v===SKIP) return 'Not sure';
  const o=optionsFor(qById(qid)).find(x=>x.id===v); return o?o.label:String(v);
};
const answerEcho  = (qid,v) => {
  if (!isAnswered(v)) return null;
  if (Array.isArray(v)) { if (v.includes(SKIP)) return "I'm not sure what I'd do yet";
    const opts=optionsFor(qById(qid));
    if (qid==='area') { const n=v.map(id=>(opts.find(x=>x.id===id)||{}).label).filter(Boolean);
      return n.length?`I'd look around ${listWords(n)}`:null; }
    const names=v.map(id=>(groupById(id)||{}).short).filter(Boolean); return names.length?`I'd do ${listWords(names)}`:null; }
  const o=optionsFor(qById(qid)).find(x=>x.id===v); return o?(o.echo||o.label):String(v);
};
/* strip "not sure" before the rules see it — the rules treat it as unknown */
const clean = a => Object.fromEntries(Object.entries(a)
  .map(([k,v]) => [k, Array.isArray(v) ? v.filter(x=>x!==SKIP) : v])
  .filter(([,v]) => Array.isArray(v) ? v.length>0 : (v && v !== SKIP)));
