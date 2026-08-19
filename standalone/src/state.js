/* ---------------- state ---------------- */
/* `email` is whatever address we hold. `saveOptIn` is the separate fact that the
   visitor ASKED us to keep their progress. A reviewer found the journey claiming
   "Saved to you@example.com" after they had explicitly chosen not to save and
   then typed the address the membership legally requires. Those are two different
   things and the interface must not conflate them. */
const BLANK = { email:null, authMethod:null, saveOptIn:false, marketing:false, marketingAsked:false, answers:{}, freeText:{}, radiusKm:'auto',
                weekDays:[], weekSwap:{}, starredVenues:{},
                chosenPlanId:null, planOverridden:false, commitmentId:'monthly', details:{}, startDate:null,
                paid:false, lastStep:'landing', returns:0, events:[], source:null, campaign:null, variant:VARIANT };
let S = JSON.parse(JSON.stringify(BLANK));
let ASK={q:'',result:null};
/* The last search and its answer. It outlives a route change on purpose: the search
   screen is somewhere you arrive, look, and come back to, and re-typing the name of
   your studio to get back to it would be the search version of asking twice. */
let SEARCH={q:'',result:null};
let ROUTE='landing', ACKTEXT=null, UNCLEAR=false, NOCHOICE=false, EDITING=null, ERRORS={}, FIELDS={}, TYPING=false, SHEET=null, PANEL_OPEN=false;
/* City is "detected" in production (IP or browser location). The pilot only has
   venue data loaded for Berlin, so the chip says so plainly and a Change link
   never lies about coverage — picking another city logs the demand instead. */
let CITYPICK=false, CITYWANTED=null, PLACEWANTED=null, APPSOPEN=false, APP_SHEET=null, DAYNOTE=null;
/* Read while the places grid renders, but nothing sets it any more — the grid/rail toggle
   it backed is gone. False is the layout the screen already shows; the declaration is here
   only so that read keeps working. */
let VENUESOPEN=false;
/* The rows at the foot of the recommendation (apps, questions) are folds, and everything
   inside them re-renders the page — a radius chip, a search, an answer from Urby. So each
   one's open state is held here rather than left to <details>, which would spring shut the
   moment the thing inside it did its job. MOREPICK is which of the three sections inside
   "Questions and details" the visitor asked for, and ALTOPEN is the comparison of all four
   memberships, which starts open because the complaint that made rule 64 was that comparing
   them was hidden. */
let MOREOPEN=false, MOREPICK=null, ALTOPEN=null, PLANPLUS=null, PLANASK=false, PLAN_DRAWER_OPEN=false, ORDER_SUMMARY_OPEN=false;
let WEEK_ADD_MODE=false, WEEK_ADD_DAY=null, WEEK_SWAP_DAY=null, WEEK_SWAP_GROUP=null, WEEK_SWAP_VENUE_ID=null, WEEK_SWAP_OPTION_ID=null, WEEK_SWAP_OPTION_TITLE=null, WEEK_SWAP_FILTER='nearby', WEEK_SWAP_PICKING_DAY=false, WEEK_SWAP_PICKING_ACT=false;
/* Saving is an interruption, not a checkout step. Keep its state outside the route so
   the modal can open and close without moving the visitor or changing browser history. */
let SAVE_MODAL_MODE='form';
const SAVE_IDLE_MS = 15 * 60 * 1000;
let SAVE_IDLE_TIMER = null;
/* What has been typed into the search box above the places. It filters what is already
   near you; the full search screen (rule 63) is the fallback when nothing here matches. */
let VENUEQ='';
/* The venue page. WHEREPICK is its location picker, SEEALL is whether the row of places
   has been opened out into the full list. Neither is an answer, so neither lives in S. */
let WHEREPICK=false, SEEALL=false;
let RECO_VIEW='pillars'; /* 'pillars' (activities gallery) or 'week' (day-by-day schedule) */
/* Read while the routine's places are filtered, but nothing adds to it any more — the
   "hide this venue" control is gone. An empty set filters nothing, which is what the
   screen already does; the declaration is here only so that read keeps working. */
let EXCLUDED_VENUES=new Set();
let ACTIVE_CATEGORY_FILTER='all';
/* In production the neighbourhood comes from the browser or the IP. The pilot has no map
   service, so the page starts from one real Berlin area and says out loud that it guessed
   — the same contract the city chip already keeps (rules 6 and 26). It is never written
   into S.answers: a guess of ours must never come back as something they told us (rule 53). */
const DETECTED_AREA = 'mitte';

const esc = v => String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const log = (name,payload) => S.events.push({ name, payload:payload||null, at:new Date().toISOString() });
const b64e = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const b64d = s => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g,'+').replace(/_/g,'/')))));
const resumeUrl = () => `${location.href.split('#')[0].split('?')[0]}#resume=${b64e(S)}`;
const firstOfNextMonth = (ref = new Date()) => {
  const next = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  return isoDay(next);
};
/* The visitor can defer their start, but only to a real billing date. Offering an arbitrary
   day would assert a term the pilot cannot verify — published memberships begin on the 1st. */
const startDateChoices = (ref = new Date(), count = 3) =>
  Array.from({ length: count }, (_, i) => isoDay(new Date(ref.getFullYear(), ref.getMonth() + 1 + i, 1)));
const fmtDate = iso => {
  if (!iso) return '—';
  if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  const d = new Date(iso);
  return isNaN(d) ? String(iso) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};
const A = () => clean(S.answers);
/* `planById` answers null for an id it does not know, and a resume link is editable text:
   a mangled `#resume=` can carry a `chosenPlanId` that no longer exists, and every screen
   downstream reads `.name` and `.rank` off this. Fall back to what the rules would have
   recommended anyway — that is the honest answer, not a guess — and only then to Classic
   (rank 2), the same published default `recommend()` itself falls back to. */
const currentPlan = () => {
  const r = recommend(A(), matchVenues(A()));
  return planById(S.chosenPlanId) || planById(r.planId) || planByRank(2);
};
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e||'');
const isoDay = dt => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
const dobMax = () => isoDay(new Date());
const dobMin = () => { const n=new Date(); return isoDay(new Date(n.getFullYear()-120, n.getMonth(), n.getDate())); };
