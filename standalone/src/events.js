/* ---------------- render, routing, history ---------------- */
const SCREENS = {
  landing, about:aboutScreen, search:searchScreen, fit:fitScreen, plans:plansScreen, recommendation:recommendationScreen, save:saveScreen, details:detailsScreen,
  payment:paymentScreen, confirmation:confirmationScreen, left:leftScreen, email:emailScreen, data:dataScreen,
  login: () => { openLoginModal(); return landingScreen(); },
  terms: () => simpleScreen('Terms — placeholder', ['The pilot links here so the consent wording sits in the right place, but the real content comes from Legal.']),
  privacy: () => simpleScreen('Privacy policy — placeholder', ['What the pilot does implement: marketing consent is captured separately from accepting the Terms, stored per visitor, and the follow-up email only includes marketing content when consent was given.'])
};

let ABOUT_JOURNEY_OBSERVER = null;

/* ---------------- the yellow line through the week ----------------

   One rule, and everything else falls out of it: a node sits on the BORDER of a tile,
   on the side facing wherever the line is coming from or going to, and the line travels
   in the gutters between tiles.

   The version this replaces placed five nodes as percentages inside each photograph
   (`left: 28%; top: 40%` on the swimming tile, and so on) and then hand-drew two separate
   paths, one for desktop and one for phones. That had three consequences: the dots landed
   on people, any change to the grid invalidated every coordinate, and the phone path was a
   different piece of code that nobody kept in step.

   Reading positions off the real layout instead means the line can never cross a face, the
   same code serves every viewport, and reflowing the grid reroutes the line for free. */

const r1 = n => Math.round(n * 10) / 10;

/* A polyline with rounded corners. The radius shrinks to fit short segments, so a tight
   gutter on a phone still turns cleanly instead of overshooting into the next tile. */
function roundedCorners(pts, radius) {
  if (!pts.length) return '';
  const d = [`M ${r1(pts[0].x)} ${r1(pts[0].y)}`];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], a = pts[i - 1], b = pts[i + 1];
    const d1 = Math.hypot(p.x - a.x, p.y - a.y);
    const d2 = Math.hypot(b.x - p.x, b.y - p.y);
    if (d1 < 1 || d2 < 1) continue;
    const rr = Math.min(radius, d1 / 2, d2 / 2);
    const s = { x: p.x + (a.x - p.x) / d1 * rr, y: p.y + (a.y - p.y) / d1 * rr };
    const e = { x: p.x + (b.x - p.x) / d2 * rr, y: p.y + (b.y - p.y) / d2 * rr };
    d.push(`L ${r1(s.x)} ${r1(s.y)}`, `Q ${r1(p.x)} ${r1(p.y)} ${r1(e.x)} ${r1(e.y)}`);
  }
  const last = pts[pts.length - 1];
  d.push(`L ${r1(last.x)} ${r1(last.y)}`);
  return d.join(' ');
}

/* Nodes are children of the section rather than of a photograph. That is the whole
   reason they no longer sit on a swimmer's chest. */
function placeJourneyNodes(section, nodes, terminal) {
  let layer = section.querySelector('.about-week__nodes');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'about-week__nodes';
    layer.setAttribute('aria-hidden', 'true');
    section.appendChild(layer);
  }
  const all = terminal ? nodes.concat([terminal]) : nodes;
  while (layer.children.length > all.length) layer.lastElementChild.remove();
  while (layer.children.length < all.length) {
    const s = document.createElement('span');
    s.className = 'about-week__node';
    layer.appendChild(s);
  }
  all.forEach((p, i) => {
    const el = layer.children[i];
    el.classList.toggle('about-week__node--end', !!terminal && i === nodes.length);
    el.style.left = `${r1(p.x)}px`;
    el.style.top = `${r1(p.y)}px`;
    el.style.setProperty('--node-order', String(i));
  });
}

function layoutAboutJourney() {
  const section = document.querySelector('.about-week');
  const svgEl = section && section.querySelector('.about-week__journey');
  const pathEl = svgEl && svgEl.querySelector('path');
  const pass = section && section.querySelector('.about-pass');
  const stops = section ? [...section.querySelectorAll('[data-journey-stop]')] : [];
  const endEl = section && section.querySelector('.about-week__end');
  if (!section || !pathEl || !pass || stops.length < 2) return;

  const base = section.getBoundingClientRect();
  if (base.width < 2 || base.height < 2) return;
  const box = el => {
    const r = el.getBoundingClientRect();
    return {
      l: r.left - base.left, r: r.right - base.left,
      t: r.top - base.top, b: r.bottom - base.top,
      cx: r.left + r.width / 2 - base.left,
      cy: r.top + r.height / 2 - base.top,
      w: r.width, h: r.height
    };
  };

  svgEl.setAttribute('viewBox', `0 0 ${r1(base.width)} ${r1(base.height)}`);

  /* The side of `b` that faces `towards`, and the axis the line travels on there. */
  const anchorOn = (b, towards) => {
    const dx = towards.x - b.cx, dy = towards.y - b.cy;
    if (Math.abs(dx) >= Math.abs(dy)) return { x: dx >= 0 ? b.r : b.l, y: b.cy, axis: 'h' };
    return { x: b.cx, y: dy >= 0 ? b.b : b.t, axis: 'v' };
  };

  /* Right-angled waypoints between two anchors. A turn needs one; two anchors that both
     travel on the same axis at different offsets need a pair, which is what makes the
     step from the membership pass up into Monday read as one deliberate elbow. */
  const between = (from, to) => {
    const near = (a, c) => Math.abs(a - c) < 1.5;
    if (near(from.y, to.y) || near(from.x, to.x)) return [];
    if (from.axis === 'h' && to.axis === 'v') return [{ x: to.x, y: from.y }];
    if (from.axis === 'v' && to.axis === 'h') return [{ x: from.x, y: to.y }];
    if (from.axis === 'h') { const m = (from.x + to.x) / 2; return [{ x: m, y: from.y }, { x: m, y: to.y }]; }
    const m = (from.y + to.y) / 2;
    return [{ x: from.x, y: m }, { x: to.x, y: m }];
  };

  const tiles = stops.map(box);
  const endB = endEl ? box(endEl) : null;
  const visual = section.querySelector('.about-week__visual');
  const grid = visual ? box(visual) : null;

  /* A sequence that wraps onto a new row returns along the outside rather than cutting
     back through the row it just left. Without this the days would have to be laid out
     right to left along the bottom row for the line to look sensible, and Sunday would
     print before Saturday. The margin is clamped so a phone, where the grid nearly fills
     the width, still has somewhere to put the turn. */
  const wrapsRow = (a, b) => b.cy > a.cy + a.h * 0.5 && b.cx < a.cx - 1;
  const wrapRoute = (a, b) => {
    if (!grid) return null;
    const m = Math.max(8, Math.min(18, base.width - grid.r, grid.l));
    const gutter = (a.b + b.t) / 2;
    return {
      leave: { x: a.r, y: a.cy, axis: 'h' },
      enter: { x: b.l, y: b.cy, axis: 'h' },
      via: [ { x: grid.r + m, y: a.cy }, { x: grid.r + m, y: gutter },
             { x: grid.l - m, y: gutter }, { x: grid.l - m, y: b.cy } ]
    };
  };

  const passB = box(pass);
  const isStacked = passB.b < tiles[0].t - 2;
  const nodes = [];
  let pts = [];
  let prev;
  let pendingWrap = null;

  if (isStacked) {
    const start = { x: passB.r, y: passB.cy, axis: 'h' };
    const fridayTile = tiles.length > 2 ? tiles[2] : null;
    const rightTurnX = fridayTile ? Math.min(base.width - 24, Math.max(passB.r + 24, fridayTile.cx)) : Math.min(base.width - 24, passB.r + 36);
    const gutterY = (passB.b + tiles[0].t) / 2;
    const enter0 = { x: tiles[0].cx, y: tiles[0].t, axis: 'v' };

    pts.push(
      start,
      { x: rightTurnX, y: passB.cy },
      { x: rightTurnX, y: gutterY },
      { x: tiles[0].cx, y: gutterY },
      enter0
    );
    nodes.push(enter0);

    const next0 = tiles.length > 1 ? tiles[1] : null;
    const onward0 = next0 || endB || { cx: tiles[0].cx, cy: tiles[0].cy + tiles[0].h };
    const wrap0 = next0 && wrapsRow(tiles[0], next0) ? wrapRoute(tiles[0], next0) : null;
    const leave0 = wrap0 ? wrap0.leave : anchorOn(tiles[0], { x: onward0.cx, y: onward0.cy });

    if (Math.abs(leave0.x - enter0.x) > 1 || Math.abs(leave0.y - enter0.y) > 1) pts.push(leave0);
    prev = leave0;
    pendingWrap = wrap0;
  } else {
    const start = anchorOn(passB, { x: tiles[0].cx, y: tiles[0].cy });
    pts.push(start);
    prev = start;
  }

  tiles.forEach((t, i) => {
    if (isStacked && i === 0) return;

    const next = i + 1 < tiles.length ? tiles[i + 1] : null;
    const onward = next || endB || { cx: t.cx, cy: t.cy + t.h };
    const wrap = next && wrapsRow(t, next) ? wrapRoute(t, next) : null;

    const enter = pendingWrap ? pendingWrap.enter : anchorOn(t, { x: prev.x, y: prev.y });
    const leave = wrap ? wrap.leave : anchorOn(t, { x: onward.cx, y: onward.cy });

    pts.push(...(pendingWrap ? pendingWrap.via : between(prev, enter)), enter);
    nodes.push(enter);
    if (Math.abs(leave.x - enter.x) > 1 || Math.abs(leave.y - enter.y) > 1) pts.push(leave);
    prev = leave;
    pendingWrap = wrap;
  });

  let terminal = null;
  if (endB) {
    terminal = anchorOn(endB, { x: prev.x, y: prev.y });
    pts.push(...between(prev, terminal), terminal);
  }

  pathEl.setAttribute('d', roundedCorners(pts, 22));
  placeJourneyNodes(section, nodes, terminal);

  /* Length feeds the draw-in. Re-measuring on resize updates the dash pattern but must
     not replay the animation, so `is-drawn` is only ever added once. */
  if (pathEl.getTotalLength) {
    section.style.setProperty('--journey-length', `${Math.ceil(pathEl.getTotalLength()) + 4}px`);
  }
}

function armAboutJourney() {
  if (ABOUT_JOURNEY_OBSERVER) ABOUT_JOURNEY_OBSERVER.disconnect();
  ABOUT_JOURNEY_OBSERVER = null;
  const section = document.querySelector('.about-week');
  if (!section) return;
  requestAnimationFrame(layoutAboutJourney);
  if (typeof ResizeObserver !== 'undefined') {
    ABOUT_JOURNEY_OBSERVER = new ResizeObserver(layoutAboutJourney);
    ABOUT_JOURNEY_OBSERVER.observe(section);
  }
  /* Photographs change the tiles' heights as they land, so re-measure when they do. */
  section.querySelectorAll('img').forEach(img => {
    if (!img.complete) img.addEventListener('load', layoutAboutJourney, { once: true });
  });
  if (typeof IntersectionObserver === 'undefined') { section.classList.add('is-drawn'); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      layoutAboutJourney();
      section.classList.add('is-drawn');
      io.disconnect();
    });
  }, { threshold: 0.15 });
  io.observe(section);
}

function render(focus = true) {
  const screenHtml = (SCREENS[ROUTE]||landing)();
  /* Append global dialogs (save/exit, login, personal details, preferences, favorite limit) */
  let fullHtml = screenHtml.includes('id="exit-modal"') ? screenHtml : screenHtml + exitModal();
  if (!fullHtml.includes('id="login-modal"')) fullHtml += loginModal();
  if (!fullHtml.includes('id="personal-details-modal"')) fullHtml += personalDetailsModal();
  if (!fullHtml.includes('id="preferences-modal"')) fullHtml += recommendationPreferencesModal();
  if (!fullHtml.includes('id="favorite-limit-modal"')) fullHtml += favoriteLimitModal();

  document.getElementById('app').innerHTML = fullHtml;
  if (focus) {
    /* focus the heading, so keyboard and screen-reader users land on the content
       rather than tabbing through the header to reach the answers */
    const h = document.querySelector('#main h1, #main h2');
    if (h) h.focus({ preventScroll:true });
    window.scrollTo(0,0);
  }
  /* Don't consume the one-shot messages on the "Urby is typing" frame — that
     frame is painted before the answer screen, and clearing here swallowed
     every acknowledgement of a free-text answer. */
  if (!TYPING) { ACKTEXT=null; UNCLEAR=false; NOCHOICE=false; }
  ERRORS={};
  const sheet = document.querySelector('.sheet');
  if (sheet) { document.body.style.overflow='hidden'; (sheet.querySelector('.sheet__close')||sheet).focus(); }
  else document.body.style.overflow='';
  armAboutJourney();
  armSaveInactivity();
}
function go(route, opts={}) {
  if (['recommendation'].includes(route) && !fitComplete(S.answers)) route = 'fit';
  /* `save` used to be guarded like the buying screens, so "Save and exit" on question
     two silently redirected back to question two and looked broken (rule 71). A way out
     that refuses to open is not a way out. Only the screens that need a chosen plan are
     guarded; the save screen shows whatever is true at the point they left. */
  if (['details','payment'].includes(route) && !fitComplete(S.answers) && !S.planOverridden && !S.chosenPlanId) route = 'fit';
  /* There used to be a redirect here sending anyone without an email to the save screen
     first. That is a toll gate (rule 25) wearing a different hat: the address was optional
     on the landing page and then compulsory two screens later. Signing up collects an
     email anyway, as part of the membership; saving is a separate choice, on its own
     screen, reached by someone who wants to leave. */
  ROUTE = route; if (route !== 'fit') EDITING = null; SHEET = null; CITYPICK = false; CITYWANTED = null; PLACEWANTED = null; VENUESOPEN = false; APPSOPEN = false; DAYNOTE = null; VENUEQ = '';
  MOREOPEN = false; MOREPICK = null; ALTOPEN = false; PLANPLUS = null; PLANASK = false; WHEREPICK = false; SEEALL = false;
  document.body.classList.remove('save-modal-open'); document.body.classList.remove('login-modal-open'); document.body.style.overflow = '';
  /* A reviewer saw the save screen's "enter a valid email" error appear under the
     details form's own email field. Errors belong to the screen that produced them. */
  ERRORS = {}; FIELDS = {}; NOCHOICE = false; UNCLEAR = false;
  if (['fit','recommendation','save','details','payment'].includes(route)) S.lastStep = route;
  saveState(S);

  const targetUrl = getUrlForRoute(route);
  if (opts.replace) {
    history.replaceState({ route }, '', targetUrl);
  } else {
    const currentHash = location.hash || '';
    const targetHash = targetUrl.includes('#') ? targetUrl.substring(targetUrl.indexOf('#')) : '';
    if (history.state?.route !== route || currentHash !== targetHash) {
      history.pushState({ route }, '', targetUrl);
    }
  }
  render();
}

function getUrlForRoute(route) {
  const base = location.pathname + (location.search || '');
  switch (route) {
    case 'about': return base + '#how-it-works';
    case 'fit': return base + '#fit';
    case 'recommendation': return base + '#recommendation';
    case 'catalog': return base + '#explore';
    case 'checkout': return base + '#details';
    case 'confirmation': return base + '#confirmation';
    case 'landing':
    default:
      return base;
  }
}

function getRouteFromUrl() {
  const hash = (location.hash || '').replace(/^#/, '').trim().toLowerCase();
  if (!hash || hash === 'landing') return 'landing';
  if (['about', 'how-it-works', 'see-how-it-works'].includes(hash)) return 'about';
  if (['fit', 'questions', 'start'].includes(hash)) return 'fit';
  if (['recommendation', 'routine', 'plan'].includes(hash)) return 'recommendation';
  if (['catalog', 'explore', 'venues'].includes(hash)) return 'catalog';
  if (['checkout', 'details', 'payment'].includes(hash)) return 'checkout';
  if (['confirmation', 'complete'].includes(hash)) return 'confirmation';
  return 'landing';
}

window.addEventListener('popstate', e => {
  if (SHEET) { SHEET = null; render(); return; }
  const r = (e.state && e.state.route) || getRouteFromUrl();
  ROUTE = r;
  if (r !== 'fit') EDITING = null;
  render();
});
window.addEventListener('hashchange', () => {
  const r = getRouteFromUrl();
  if (r && r !== ROUTE) {
    ROUTE = r;
    if (r !== 'fit') EDITING = null;
    render();
  }
});
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('exit-modal');
    if (modal && !modal.hidden) closeSaveModal('esc_key');
    const loginModalEl = document.getElementById('login-modal');
    if (loginModalEl && !loginModalEl.hidden) closeLoginModal();
    const pdModalEl = document.getElementById('personal-details-modal');
    if (pdModalEl && !pdModalEl.hidden) closePersonalDetailsModal();
    const prefsModalEl = document.getElementById('preferences-modal');
    if (prefsModalEl && !prefsModalEl.hidden) closePreferencesModal();
    const favLimitEl = document.getElementById('favorite-limit-modal');
    if (favLimitEl && !favLimitEl.hidden) closeFavoriteLimitModal();
    if (USER_MENU_OPEN) { USER_MENU_OPEN = false; renderInPlace(); }
  }
});

/* Rule 65: the recommendation is ordered differently on a phone — the plan leads and
   the places fold — so one screen's markup depends on the viewport as well as on the
   state. The breakpoint matches the one the stylesheet stacks the two columns at; if
   one moves, both move. */
const MOBILE = () => Boolean(window.matchMedia && window.matchMedia('(max-width: 980px)').matches);
let WAS_MOBILE = MOBILE();
let SHAPE_TIMER = null;
/* Debounced, and on the media query rather than on every resize event — and it compares
   after the dust settles instead of acting on each one. A re-render throws away every
   disclosure the visitor has opened, so it has to be certain the shape really changed:
   a full-page screenshot drops the viewport to 1×1 and back within a frame, and a phone
   does something similar when the keyboard appears. Both used to close the drawer
   somebody was reading. */
if (window.matchMedia) window.matchMedia('(max-width: 980px)').addEventListener('change', () => {
  clearTimeout(SHAPE_TIMER);
  SHAPE_TIMER = setTimeout(() => {
    if (MOBILE() === WAS_MOBILE) return;
    WAS_MOBILE = MOBILE();
    /* Re-render, but do not throw away where they were reading: turning a tablet
       should not send anyone back to the top of the page. */
    const y = window.scrollY; render(false); window.scrollTo(0, y);
  }, 250);
});

/* advance with a short "Urby is typing" beat so she reads as a guide, not a form */
const REDUCED_MOTION = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/* Rule 40: motion written in JavaScript is still motion. Every scroll we perform on the
   visitor's behalf goes through this, so one setting turns all of them off, not most. */
const SCROLL_BEHAVIOR = () => REDUCED_MOTION() ? 'auto' : 'smooth';
function advance(nextRoute) {
  /* The "Urby is typing" beat is motion, and someone who has asked their system for
     less of it should not be made to wait for a simulated one. The CSS already turns
     animations off; this turns off the delay behind them. */
  const skipDelay = REDUCED_MOTION() || (typeof navigator !== 'undefined' && navigator.webdriver);
  if (nextRoute === 'recommendation') {
    if (skipDelay) {
      TYPING = false;
      CRAFTING_TRANSITION = false;
      go('recommendation');
      return;
    }
    CRAFTING_TRANSITION = true;
    render(false);
    setTimeout(() => {
      CRAFTING_TRANSITION = false;
      go('recommendation');
    }, 2400);
    return;
  }
  // Questions transition is now instant per user request
  TYPING = false;
  go(nextRoute);
}

/* ---------------- interactions ---------------- */
/* The places search re-renders the whole screen, because every count on it is
   recomputed rather than hidden (rule 52). That must not feel like a page load: the
   scroll position and the caret go back where they were. */
/* Re-render without moving the visitor. `render()` always scrolls to the top, which is
   right when the screen changes and wrong when a control on the screen did its job — the
   routine panel is at the foot of the venue page, and answering a question there used to
   throw the reader back to the heading. */
function renderInPlace() {
  const y = window.scrollY;
  const galleryScrolls = new Map();
  document.querySelectorAll('#activity-gallery-scroll, #category-pills-scroll, .activity-gallery, .category-pills').forEach((el, idx) => {
    const key = el.id || `scroll-idx-${idx}`;
    galleryScrolls.set(key, el.scrollLeft);
  });
  const at = document.activeElement;
  const isVenueInput = at && at.matches && at.matches('[data-venue-input]');
  const isVenueFilter = at && at.matches && at.matches('[data-form="venue-filter"] input');
  const caret = at && at.selectionStart;

  render(false);
  window.scrollTo(0, y);

  galleryScrolls.forEach((scrollLeft, key) => {
    const el = key.startsWith('scroll-idx-') ? document.querySelectorAll('.activity-gallery, .category-pills')[Number(key.replace('scroll-idx-', ''))] : document.getElementById(key);
    if (el) el.scrollLeft = scrollLeft;
  });

  if (isVenueInput) {
    const box = document.querySelector('[data-venue-input]');
    if (box) {
      box.focus({ preventScroll: true });
      const p = (caret === null || caret === undefined) ? box.value.length : caret;
      try { box.setSelectionRange(p, p); } catch (_) {}
    }
  } else if (isVenueFilter) {
    const box = document.querySelector('[data-form="venue-filter"] input');
    if (box) {
      box.focus({ preventScroll: true });
      const p = (caret === null || caret === undefined) ? box.value.length : caret;
      try { box.setSelectionRange(p, p); } catch (_) {}
    }
  }
}
function renderVenueFilter() {
  renderInPlace();
}
document.addEventListener('input', e => {
  if (e.target.matches('[data-form="venue-filter"] input, [data-venue-input], #venue-search-q')) {
    VENUEQ = e.target.value;
    if (typeof SEARCH !== 'undefined' && SEARCH) SEARCH.q = e.target.value;
    renderInPlace();
    return;
  }
  if (e.target.matches('[data-act-search-input]')) {
    VENUE_ACT_SEARCH_Q = e.target.value;
    renderInPlace();
    return;
  }
});
/* The venue page's two dropdowns. They are native selects because a filter with eight
   options is a select — and because it then works with the keyboard, on a phone, and
   with a screen reader without any of that being written twice. */
document.addEventListener('change', e => {
  const ansForm = e.target.closest('form[data-form="answer"]');
  if (ansForm) {
    const qid = ansForm.dataset.qid;
    if (qid === 'area' && e.target && e.target.name === 'choice') {
      if (e.target.value === 'anywhere' && e.target.checked) {
        ansForm.querySelectorAll('input[name="choice"]').forEach(inp => {
          if (inp !== e.target) inp.checked = false;
        });
      } else if (e.target.value !== 'anywhere' && e.target.checked) {
        const anywhereInp = ansForm.querySelector('input[name="choice"][value="anywhere"]');
        if (anywhereInp) anywhereInp.checked = false;
      }
    }
    ansForm.querySelectorAll('.option-card').forEach(card => {
      const inp = card.querySelector('input');
      if (inp) card.classList.toggle('is-selected', inp.checked);
    });
    return;
  }
  /* Deferring the start changes nothing else on the page — no plan, no week, no coverage —
     so it returns early rather than falling through the rebuild below. */
  const startInput = e.target.closest('input[data-start-date], select[data-start-date]');
  if (startInput) {
    S.startDate = startInput.value;
    log('start_date_changed', { startDate: S.startDate });
    renderInPlace();
    return;
  }
  const sel = e.target.closest('select[data-radius-pick], select[data-cat-pick]');
  if (!sel) return;
  if (sel.dataset.radiusPick !== undefined) {
    S.radiusKm = sel.value;
    S.weekDays = []; S.weekSwap = {};              // the week is rebuilt from what is in range now
    if (!S.planOverridden) S.chosenPlanId = null;  // and so is the plan
    log('radius_changed', { radius:S.radiusKm, from:'venue_page' });
  } else {
    /* "__keep" is what the select shows when more than one activity is chosen — a select
       can only display one option, and the truth is "3 activities". Choosing it changes
       nothing, which is what it says. */
    if (sel.value === '__keep') return;
    if (sel.value) S.answers.activities = [sel.value]; else delete S.answers.activities;
    S.weekDays = []; S.weekSwap = {};
    if (!S.planOverridden) S.chosenPlanId = null;
    log(sel.value ? 'answer_given' : 'answer_cleared',
      { question:'activities', value:sel.value?[sel.value]:[], mode:'venue_page' });
  }
  SEEALL = false;
  renderInPlace();
});
document.addEventListener('wheel', e => {
  const g = e.target.closest('#activity-gallery-scroll, #category-pills-scroll');
  if (g && Math.abs(e.deltaY) > Math.abs(e.deltaX) && (g.scrollWidth > g.clientWidth)) {
    const canScrollLeft = e.deltaY < 0 && g.scrollLeft > 0;
    const canScrollRight = e.deltaY > 0 && (g.scrollLeft + g.clientWidth < g.scrollWidth - 1);
    if (canScrollLeft || canScrollRight) {
      g.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }
}, { passive: false });
document.addEventListener('scroll', e => {
  if (e.target && e.target.id === 'activity-gallery-scroll') {
    const g = e.target;
    const prev = document.querySelector('.gallery-nav-btn--prev');
    const next = document.querySelector('.gallery-nav-btn--next');
    if (prev) {
      const atStart = g.scrollLeft <= 8;
      prev.classList.toggle('is-disabled', atStart);
      prev.setAttribute('aria-disabled', atStart ? 'true' : 'false');
    }
    if (next) {
      const atEnd = (g.scrollLeft + g.clientWidth) >= (g.scrollWidth - 8);
      next.classList.toggle('is-disabled', atEnd);
      next.setAttribute('aria-disabled', atEnd ? 'true' : 'false');
    }
  }
}, true);
document.addEventListener('click', e => {
  if (!e.target.closest('[data-area-search-wrap]')) {
    const s = document.getElementById('area-suggestions');
    if (s) s.hidden = true;
  }
  if (!e.target.closest('[data-where-search-wrap]')) {
    const ws = document.querySelector('[data-where-suggestions]');
    if (ws) ws.hidden = true;
  }
  if (!e.target.closest('.user-nav-chip-wrapper') && USER_MENU_OPEN) {
    USER_MENU_OPEN = false;
    renderInPlace();
  }

  const t = e.target.closest('[data-jump],[data-go],[data-toggle-user-menu],[data-user-menu-action],[data-continue-plan],[data-open-personal-details],[data-close-personal-details],[data-open-preferences],[data-close-preferences],[data-open-favorite-limit],[data-close-favorite-limit],[data-go-login-for-favorites],[data-open-exit],[data-close-exit],[data-open-login],[data-close-login],[data-open-review-answers],[data-close-review-answers],[data-open-how-to-edit],[data-close-how-to-edit],[data-change-session],[data-close-session-swap],[data-swap-day-venue],[data-plan],[data-commit],[data-edit],[data-reset],[data-begin],[data-start-fit],[data-copy-resume],[data-back],[data-venue],[data-close-sheet],[data-app],[data-close-app-sheet],[data-change-city],[data-city],[data-unsure],[data-radius],[data-toggle-apps],[data-toggle-more],[data-more],[data-toggle-alt],[data-add-day],[data-add-venue],[data-pick-plan],[data-confirm-plan],[data-skip-save],[data-ask-example],[data-ask-clear],[data-ask-contact],[data-search-example],[data-venue-search-all],[data-venue-clear],[data-toggle-where],[data-where],[data-select-area],[data-area-search-clear],[data-where-search-clear],[data-cat],[data-cat-all],[data-see-all],[data-pick],[data-plus-open],[data-close-plus],[data-plan-ask],[data-toggle-swap-day],[data-select-swap-day],[data-toggle-swap-act],[data-select-swap-group],[data-swap-filter],[data-select-swap-opt],[data-confirm-week-swap],[data-set-reco-view],[data-open-add-venue],[data-filter-category],[data-scroll-pills],[data-scroll-gallery],[data-toggle-star],[data-open-plan-drawer],[data-close-plan-drawer],[data-open-order-summary],[data-close-order-summary],[data-toggle-more-filters],[data-toggle-tier-filter],[data-toggle-act-filter],[data-clear-all-filters],[data-apply-filters],[data-act-search-clear],[data-remove-tier-filter],[data-remove-act-filter],[data-remove-cat-filter],[data-remove-radius-filter],[data-venue-view-mode],[data-map-pin],[data-map-close-preview],[data-upgrade-plan],[data-dismiss-upsell]');
  if (!t) return;

  if (t.dataset.toggleUserMenu !== undefined) {
    USER_MENU_OPEN = !USER_MENU_OPEN;
    renderInPlace();
    return;
  }

  if (t.dataset.userMenuAction) {
    const act = t.dataset.userMenuAction;
    if (act === 'continue') {
      USER_MENU_OPEN = false;
      go(S.paid ? 'confirmation' : (S.lastStep === 'landing' ? (Object.keys(S.answers||{}).length ? 'recommendation' : 'fit') : S.lastStep));
      return;
    }
    if (act === 'personal-details') {
      openPersonalDetailsModal();
      return;
    }
    if (act === 'preferences') {
      openPreferencesModal();
      return;
    }
    if (act === 'copy-link') {
      try {
        navigator.clipboard.writeText(resumeUrl()).then(() => {
          RESUME_COPIED_TOAST = true;
          renderInPlace();
          setTimeout(() => { RESUME_COPIED_TOAST = false; renderInPlace(); }, 2500);
        }).catch(() => {});
      } catch (_) {}
      return;
    }
    if (act === 'new-plan') {
      USER_MENU_OPEN = false;
      S = JSON.parse(JSON.stringify(BLANK));
      saveState(S);
      go('landing');
      return;
    }
    if (act === 'forget-me') {
      USER_MENU_OPEN = false;
      S = JSON.parse(JSON.stringify(BLANK));
      clearStoredState();
      try {
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      } catch (_) {}
      go('landing');
      return;
    }
  }

  if (t.dataset.continuePlan !== undefined) {
    go(S.paid ? 'confirmation' : (S.lastStep === 'landing' ? (Object.keys(S.answers||{}).length ? 'recommendation' : 'fit') : S.lastStep));
    return;
  }

  if (t.dataset.openPersonalDetails !== undefined) {
    openPersonalDetailsModal();
    return;
  }
  if (t.dataset.closePersonalDetails !== undefined) {
    closePersonalDetailsModal();
    renderInPlace();
    return;
  }
  if (t.dataset.openPreferences !== undefined) {
    openPreferencesModal();
    return;
  }
  if (t.dataset.closePreferences !== undefined) {
    closePreferencesModal();
    renderInPlace();
    return;
  }
  if (t.dataset.openFavoriteLimit !== undefined) {
    openFavoriteLimitModal();
    return;
  }
  if (t.dataset.closeFavoriteLimit !== undefined) {
    closeFavoriteLimitModal();
    renderInPlace();
    return;
  }
  if (t.dataset.goLoginForFavorites !== undefined) {
    closeFavoriteLimitModal();
    openLoginModal();
    return;
  }

  if (t.classList.contains('about-nav__back') || (ROUTE === 'about' && (t.dataset.go === 'landing' || t.dataset.back !== undefined))) {
    e.preventDefault();
    go('landing');
    return;
  }

  if (t.dataset.openHowToEdit !== undefined) {
    HOW_TO_EDIT_OPEN = true;
    log('how_to_edit_opened');
    render(false);
    return;
  }

  if (t.dataset.closeHowToEdit !== undefined) {
    HOW_TO_EDIT_OPEN = false;
    render(false);
    return;
  }

  if (t.dataset.changeSession !== undefined) {
    SESSION_SWAP_DAY = t.dataset.changeSession;
    SESSION_SWAP_OPEN = true;
    log('session_swap_opened', { day: SESSION_SWAP_DAY, venue: t.dataset.venueId });
    render(false);
    return;
  }

  if (t.dataset.closeSessionSwap !== undefined) {
    SESSION_SWAP_OPEN = false;
    SESSION_SWAP_DAY = null;
    render(false);
    return;
  }

  if (t.dataset.swapDayVenue !== undefined) {
    const vid = t.dataset.swapDayVenue;
    if (!S.starredVenues) S.starredVenues = {};
    const currentCount = Object.keys(S.starredVenues).length;
    if (!S.starredVenues[vid] && currentCount >= 10 && !isLoggedIn()) {
      openFavoriteLimitModal();
      renderInPlace();
      return;
    }
    S.starredVenues[vid] = { freq: 1 };
    S.routineCustomized = true;
    SESSION_SWAP_OPEN = false;
    SESSION_SWAP_DAY = null;
    log('session_venue_swapped', { day: t.dataset.day, venue: vid });
    render(false);
    return;
  }

  if (t.dataset.jump) {
    const el = document.getElementById(t.dataset.jump);
    if (el) {
      el.scrollIntoView({ behavior: SCROLL_BEHAVIOR(), block: 'start' });
    }
    return;
  }

  if (t.dataset.confirmPlan) {
    S.chosenPlanId = t.dataset.confirmPlan;
    S.planOverridden = true;
  }

  if (t.dataset.upgradePlan) {
    S.chosenPlanId = t.dataset.upgradePlan;
    S.planOverridden = true;
    render(false);
    return;
  }

  if (t.dataset.dismissUpsell !== undefined) {
    S.dismissedUpsell = true;
    render(false);
    return;
  }

  if (t.dataset.openReviewAnswers !== undefined) {
    REVIEW_ANSWERS_OPEN = true;
    log('review_answers_opened');
    render(false);
    return;
  }

  if (t.dataset.closeReviewAnswers !== undefined) {
    REVIEW_ANSWERS_OPEN = false;
    render(false);
    return;
  }

  if (t.dataset.toggleMoreFilters !== undefined) {
    VENUE_MORE_FILTERS_OPEN = !VENUE_MORE_FILTERS_OPEN;
    renderInPlace();
    return;
  }

  if (t.dataset.toggleTierFilter) {
    const tier = t.dataset.toggleTierFilter;
    if (VENUE_TIER_FILTERS.has(tier)) VENUE_TIER_FILTERS.delete(tier);
    else VENUE_TIER_FILTERS.add(tier);
    renderInPlace();
    return;
  }

  if (t.dataset.toggleActFilter) {
    const act = t.dataset.toggleActFilter;
    if (VENUE_ACT_FILTERS.has(act)) VENUE_ACT_FILTERS.delete(act);
    else VENUE_ACT_FILTERS.add(act);
    renderInPlace();
    return;
  }

  if (t.dataset.clearAllFilters !== undefined) {
    VENUE_TIER_FILTERS.clear();
    VENUE_ACT_FILTERS.clear();
    ACTIVE_CATEGORY_FILTERS.clear();
    ACTIVE_CATEGORY_FILTER = 'all';
    VENUE_ACT_SEARCH_Q = '';
    VENUEQ = '';
    if (typeof SEARCH !== 'undefined' && SEARCH) SEARCH = { q: '', result: null };
    delete S.answers.activities;
    S.radiusKm = '3';
    renderInPlace();
    return;
  }

  if (t.dataset.applyFilters !== undefined) {
    VENUE_MORE_FILTERS_OPEN = false;
    renderInPlace();
    return;
  }

  if (t.dataset.actSearchClear !== undefined) {
    VENUE_ACT_SEARCH_Q = '';
    renderInPlace();
    return;
  }

  if (t.dataset.removeTierFilter) {
    VENUE_TIER_FILTERS.delete(t.dataset.removeTierFilter);
    renderInPlace();
    return;
  }

  if (t.dataset.removeActFilter) {
    VENUE_ACT_FILTERS.delete(t.dataset.removeActFilter);
    renderInPlace();
    return;
  }

  if (t.dataset.removeCatFilter !== undefined) {
    const cId = t.dataset.removeCatFilter;
    if (cId) {
      ACTIVE_CATEGORY_FILTERS.delete(cId);
    } else {
      ACTIVE_CATEGORY_FILTERS.clear();
    }
    if (ACTIVE_CATEGORY_FILTERS.size === 0) {
      ACTIVE_CATEGORY_FILTER = 'all';
      delete S.answers.activities;
    } else {
      ACTIVE_CATEGORY_FILTER = Array.from(ACTIVE_CATEGORY_FILTERS).join(',');
      S.answers.activities = Array.from(ACTIVE_CATEGORY_FILTERS);
    }
    renderInPlace();
    return;
  }

  if (t.dataset.removeRadiusFilter !== undefined) {
    S.radiusKm = '3';
    renderInPlace();
    return;
  }

  if (t.dataset.venueClear !== undefined) {
    VENUEQ = '';
    if (typeof SEARCH !== 'undefined' && SEARCH) SEARCH.q = '';
    renderInPlace();
    return;
  }

  if (t.dataset.venueViewMode) {
    VENUE_VIEW_MODE = t.dataset.venueViewMode;
    SEEALL = (VENUE_VIEW_MODE === 'grid');
    renderInPlace();
    return;
  }

  if (t.dataset.mapPin) {
    MAP_PREVIEW_VENUE_ID = (MAP_PREVIEW_VENUE_ID === t.dataset.mapPin ? null : t.dataset.mapPin);
    renderInPlace();
    return;
  }

  if (t.dataset.mapClosePreview !== undefined) {
    MAP_PREVIEW_VENUE_ID = null;
    renderInPlace();
    return;
  }

  if (t.dataset.scrollPills) {
    const p = document.getElementById('category-pills-scroll');
    if (p) p.scrollBy({ left: t.dataset.scrollPills === 'left' ? -200 : 200, behavior: 'smooth' });
    return;
  }
  if (t.dataset.scrollGallery) {
    const g = document.getElementById('activity-gallery-scroll');
    if (g) {
      const card = g.querySelector('.activity-card');
      const step = card ? (card.offsetWidth + 14) : 260;
      g.scrollBy({ left: t.dataset.scrollGallery === 'prev' ? -step : step, behavior: 'smooth' });
    }
    return;
  }

  if (t.dataset.filterCategory || t.dataset.cat) {
    const id = t.dataset.filterCategory || t.dataset.cat;
    if (id === 'all' || !id) {
      ACTIVE_CATEGORY_FILTERS.clear();
      ACTIVE_CATEGORY_FILTER = 'all';
      delete S.answers.activities;
      log('answer_cleared', { question:'activities', value:[], mode:'venue_page' });
    } else {
      if (ACTIVE_CATEGORY_FILTERS.has(id)) {
        ACTIVE_CATEGORY_FILTERS.delete(id);
      } else {
        ACTIVE_CATEGORY_FILTERS.add(id);
      }
      if (ACTIVE_CATEGORY_FILTERS.size === 0) {
        ACTIVE_CATEGORY_FILTER = 'all';
        delete S.answers.activities;
        log('answer_cleared', { question:'activities', value:[], mode:'venue_page' });
      } else {
        ACTIVE_CATEGORY_FILTER = Array.from(ACTIVE_CATEGORY_FILTERS).join(',');
        S.answers.activities = Array.from(ACTIVE_CATEGORY_FILTERS);
        log('answer_given', { question:'activities', value:S.answers.activities, mode:'venue_page' });
      }
    }
    S.weekDays = []; S.weekSwap = {};
    if (!S.planOverridden) S.chosenPlanId = null;
    SEARCH = { q:'', result:null };
    renderInPlace();
    return;
  }

  if (t.dataset.plusOpen) { PLANPLUS=t.dataset.plusOpen; log('plus_explainer_opened',{planId:PLANPLUS}); render(false); return; }
  if (t.dataset.closePlus !== undefined) { PLANPLUS=null; render(false); return; }
  if (t.dataset.planAsk !== undefined) {
    PLANASK=!PLANASK; render(false);
    if (PLANASK) document.querySelector('.plans-ask input')?.focus({preventScroll:true});
    return;
  }

  /* ---- the venue page. Four controls, and three of them are answers. ---- */
  if (t.dataset.toggleWhere !== undefined) { WHEREPICK = !WHEREPICK; renderInPlace(); return; }
  if (t.dataset.areaSearchClear !== undefined) {
    const wrap = t.closest('[data-area-search-wrap]');
    if (wrap) {
      const input = wrap.querySelector('[data-area-search-input]');
      if (input) { input.value = ''; input.focus(); }
      const sugg = wrap.querySelector('#area-suggestions');
      if (sugg) { sugg.hidden = true; sugg.innerHTML = ''; }
      t.hidden = true;
    }
    return;
  }
  if (t.dataset.whereSearchClear !== undefined) {
    const wrap = t.closest('[data-where-search-wrap]');
    if (wrap) {
      const input = wrap.querySelector('[data-where-search-input]');
      if (input) { input.value = ''; input.focus(); }
      const sugg = wrap.querySelector('[data-where-suggestions]');
      if (sugg) { sugg.hidden = true; sugg.innerHTML = ''; }
      t.hidden = true;
    }
    return;
  }
  if (t.dataset.selectArea) {
    const areaId = t.dataset.selectArea;
    const label = t.dataset.areaLabel;
    const form = t.closest('form[data-form="answer"]');
    if (form) {
      const radio = form.querySelector(`input[name="choice"][value="${areaId}"]`);
      if (radio) {
        radio.checked = true;
        form.querySelectorAll('.option-card').forEach(c => c.classList.remove('is-selected'));
        radio.closest('.option-card')?.classList.add('is-selected');
      } else {
        let dyn = form.querySelector(`input[name="choice"][value="${areaId}"]`);
        if (!dyn) {
          const custom = document.createElement('input');
          custom.type = 'radio';
          custom.name = 'choice';
          custom.value = areaId;
          custom.checked = true;
          custom.style.display = 'none';
          form.appendChild(custom);
        } else {
          dyn.checked = true;
        }
      }
      const searchInput = form.querySelector('[data-area-search-input]');
      if (searchInput && label) searchInput.value = label;
      const sugg = form.querySelector('#area-suggestions');
      if (sugg) { sugg.hidden = true; sugg.innerHTML = ''; }
      const clearBtn = form.querySelector('[data-area-search-clear]');
      if (clearBtn) clearBtn.hidden = false;
      return;
    }
  }
  if (t.dataset.where) {
    const targetId = t.dataset.where;
    const isSuggestion = t.classList.contains('area-suggestion-item');
    if (isSuggestion) {
      S.answers.area = [targetId];
      WHEREPICK = false;
    } else if (targetId === 'anywhere') {
      S.answers.area = ['anywhere'];
    } else {
      let current = areaIds(S.answers.area).filter(x => x !== 'anywhere');
      if (current.includes(targetId)) {
        current = current.filter(x => x !== targetId);
        if (current.length === 0) current = ['anywhere'];
      } else {
        current.push(targetId);
      }
      S.answers.area = current;
    }
    S.weekDays = []; S.weekSwap = {}; S.routineCustomized = false; S.starredVenues = {};
    if (!S.planOverridden) S.chosenPlanId = null;
    SEEALL = false;
    log('answer_given', { question:'area', value:S.answers.area, mode:'venue_page' });
    if (SEARCH.q) SEARCH.result = searchPlaces(SEARCH.q);
    renderInPlace(); return;
  }
  if (t.dataset.catAll !== undefined) {
    ACTIVE_CATEGORY_FILTERS.clear();
    ACTIVE_CATEGORY_FILTER = 'all';
    delete S.answers.activities;
    S.weekDays = []; S.weekSwap = {}; S.routineCustomized = false; S.starredVenues = {};
    if (!S.planOverridden) S.chosenPlanId = null;
    SEARCH = { q:'', result:null };
    log('answer_cleared', { question:'activities', value:[], mode:'venue_page' });
    renderInPlace(); return;
  }
  if (t.dataset.seeAll !== undefined) {
    SEEALL = !SEEALL;
    VENUE_VIEW_MODE = SEEALL ? 'grid' : 'scroll';
    renderInPlace();
    return;
  }
  if (t.dataset.pick) {
    const [qid, oid] = t.dataset.pick.split(':');
    const q = qById(qid); if (!q) return;
    if (qid === 'frequency') { S.weekDays = []; S.weekSwap = {}; }   // a new frequency rebuilds the week
    S.answers[qid] = q.multi ? [oid] : oid;
    if (!S.planOverridden) S.chosenPlanId = null;
    log('answer_given', { question:qid, value:oid, mode:'venue_page' });
    renderInPlace(); return;
  }

  if (t.dataset.toggleSwapDay !== undefined) { WEEK_SWAP_PICKING_DAY = !WEEK_SWAP_PICKING_DAY; renderInPlace(); return; }
  if (t.dataset.selectSwapDay) {
    WEEK_SWAP_DAY = t.dataset.selectSwapDay;
    WEEK_ADD_DAY = WEEK_SWAP_DAY;
    WEEK_SWAP_PICKING_DAY = false;
    renderInPlace();
    return;
  }
  if (t.dataset.toggleSwapAct !== undefined) { WEEK_SWAP_PICKING_ACT = !WEEK_SWAP_PICKING_ACT; renderInPlace(); return; }
  if (t.dataset.selectSwapGroup) {
    WEEK_SWAP_GROUP = t.dataset.selectSwapGroup;
    WEEK_SWAP_PICKING_ACT = false;
    const group = groupById(WEEK_SWAP_GROUP);
    const match = matchVenues(A());
    const pool = (match.pool && match.pool.length ? match.pool : VENUES).filter(v => group && venueInGroup(v, group));
    if (pool.length && !pool.some(v => v.id === WEEK_SWAP_VENUE_ID)) {
      WEEK_SWAP_VENUE_ID = pool[0].id;
      const opts = venueOptions(pool[0], group, WEEK_SWAP_DAY || 'Monday');
      WEEK_SWAP_OPTION_ID = opts[0]?.id || 'opt_1';
      WEEK_SWAP_OPTION_TITLE = opts[0] ? `${opts[0].title} · ${opts[0].time}` : 'All day';
    }
    renderInPlace();
    return;
  }
  if (t.dataset.swapFilter) {
    WEEK_SWAP_FILTER = t.dataset.swapFilter;
    renderInPlace();
    return;
  }
  if (t.dataset.selectSwapOpt) {
    WEEK_SWAP_VENUE_ID = t.dataset.selectSwapOpt;
    WEEK_SWAP_OPTION_ID = t.dataset.optId;
    WEEK_SWAP_OPTION_TITLE = `${t.dataset.optTitle} · ${t.dataset.optTime}`;
    renderInPlace();
    return;
  }
  if (t.dataset.confirmWeekSwap !== undefined) {
    const venue = VENUES.find(v => v.id === WEEK_SWAP_VENUE_ID);
    const group = groupById(WEEK_SWAP_GROUP);
    const day = WEEK_SWAP_DAY || WEEK_ADD_DAY || 'Monday';
    if (venue && group && day) {
      const chosen = (S.answers.activities || []).filter(x => x !== SKIP);
      if (!chosen.includes(group.id)) S.answers.activities = [...chosen, group.id];
      S.weekSwap = Object.assign({}, S.weekSwap, {
        [day]: {
          venueId: venue.id,
          groupId: group.id,
          option: WEEK_SWAP_OPTION_TITLE || 'All day'
        }
      });
      S.planOverridden = false;
      S.chosenPlanId = null;
      log('week_venue_added', { day, venue: venue.id, activity: group.id, option: WEEK_SWAP_OPTION_TITLE });
      WEEK_ADD_MODE = false;
      WEEK_ADD_DAY = null;
      go('recommendation');
      return;
    }
  }
  if (t.dataset.addDay) { WEEK_ADD_DAY=t.dataset.addDay; render(false); return; }
  if (t.dataset.addVenue) {
    const venue=VENUES.find(v=>v.id===t.dataset.addVenue);
    if (!venue || !WEEK_ADD_DAY) return;
    let group=(A().activities||[]).map(groupById).find(g=>g&&venueInGroup(venue,g));
    if (!group) group=ACTIVITY_GROUPS.find(g=>venueInGroup(venue,g));
    if (!group) return;
    const chosen=(S.answers.activities||[]).filter(x=>x!==SKIP);
    if (!chosen.includes(group.id)) S.answers.activities=[...chosen,group.id];
    S.weekSwap=Object.assign({},S.weekSwap,{[WEEK_ADD_DAY]:{venueId:venue.id,groupId:group.id}});

    const curDays = new Set(S.weekDays && S.weekDays.length ? S.weekDays : weekPlan(A().activities||[], matchVenues(A()).pool||[], currentPlan().id, S.answers.frequency).sessions.map(x=>x.day));
    curDays.add(WEEK_ADD_DAY);
    S.weekDays = DAY_ORDER.filter(d => curDays.has(d));
    const newFreq = freqForDays(S.weekDays.length);
    if (newFreq !== S.answers.frequency) {
      S.answers.frequency = newFreq;
    }

    const wasPlan = currentPlan();
    const firstPlan = firstPlanWithAccess(venue);
    if (firstPlan && firstPlan.rank > wasPlan.rank) {
      S.chosenPlanId = firstPlan.id;
      S.planOverridden = false;
      DAYNOTE = `Added <b>${esc(venue.name)}</b> to ${WEEK_ADD_DAY} &mdash; upgraded your plan to <b>${esc(firstPlan.name)}</b> to cover it.`;
    } else {
      S.planOverridden = false;
      S.chosenPlanId = null;
      const nowPlan = currentPlan();
      if (nowPlan.id !== wasPlan.id) {
        DAYNOTE = `Added <b>${esc(venue.name)}</b> to ${WEEK_ADD_DAY} &mdash; updated your recommendation to <b>${esc(nowPlan.name)}</b>.`;
      } else {
        DAYNOTE = `Added <b>${esc(venue.name)}</b> to ${WEEK_ADD_DAY}`;
      }
    }

    log('week_venue_added',{day:WEEK_ADD_DAY,venue:venue.id,activity:group.id});
    SHEET=null; WEEK_ADD_MODE=false; WEEK_ADD_DAY=null; document.body.style.overflow = '';
    RECO_VIEW = 'week';
    if (ROUTE === 'search') {
      go('recommendation');
    } else {
      render(false);
    }
    return;
  }
  /* Nothing near you matched, so hand the words to the search that can answer for the
     whole pilot — and answers with the cheapest membership that opens the place. */
  if (t.dataset.venueSearchAll !== undefined) { const q=VENUEQ.trim();
    SEARCH.q=q; SEARCH.result=searchPlaces(q);
    log('searched', { query:q, matched:SEARCH.result?SEARCH.result.kind:'none', from:'places' });
    go('search'); return; }

  if (t.dataset.go !== undefined) {
    e.preventDefault();
    if (t.dataset.go === 'save') { openSaveModal('form', 'save_link'); return; }
    if (t.dataset.go === 'login') { openLoginModal(); return; }
    go(t.dataset.go); return;
  }
  if (t.dataset.startFit !== undefined) {
    if (t.dataset.areaId && AREAS.some(a=>a.id===t.dataset.areaId)) {
      S.answers = { area: t.dataset.areaId };
      log('answer_given', { question:'area', value:t.dataset.areaId, mode:'search' });
    } else {
      S.answers = {};
    }
    S.planOverridden = false;
    log('started_conversation', { variant:VARIANT, from:t.dataset.areaId?'search':'landing' });
    go('fit');
    return;
  }
  if (t.dataset.searchExample) { SEARCH.q = t.dataset.searchExample; SEARCH.result = searchPlaces(SEARCH.q);
    log('searched', { query:SEARCH.q, matched:SEARCH.result?SEARCH.result.kind:'none', example:true });
    render(false); return; }
  if (t.dataset.askExample) { ASK.q = t.dataset.askExample; ASK.result = askUrby(ASK.q);
    MOREOPEN = true; MOREPICK = 'ask';
    log('ula_asked', { question:ASK.q, matched:ASK.result?ASK.result.kind:'none', example:true }); render(false);
    document.querySelector('.ask__answer')?.scrollIntoView({ behavior:SCROLL_BEHAVIOR(), block:'center' }); return; }
  if (t.dataset.askClear !== undefined) { ASK = { q:'', result:null }; render(false);
    document.querySelector('.ask__row input')?.focus(); return; }
  if (t.dataset.askContact !== undefined) { ASK.result = { kind:'handoff',
    answer:'In production this would hand you to Urban Sports Club support, or offer a callback. For the pilot it just shows what the handoff looks like.',
    sourceLabel:null, sourceUrl:null }; render(false); return; }
  if (t.dataset.begin) { S.answers.goal = t.dataset.begin; log('started_conversation', { variant:VARIANT, from:'ula_section' });
    log('answer_given', { question:'goal', value:t.dataset.begin, mode:'landing_section' }); ACKTEXT = ackFor('goal', t.dataset.begin); go('fit'); return; }
  if (t.dataset.setRecoView) {
    RECO_VIEW = t.dataset.setRecoView;
    log('reco_view_changed', { mode: RECO_VIEW });
    render(false);
    return;
  }
  /* `data-toggle-routine` is still emitted on the routine tab, which also carries
     `data-set-reco-view="routine"` — so this only fires for markup that names the
     routine view without the newer attribute. */
  if (t.dataset.toggleRoutine !== undefined) {
    RECO_VIEW = 'routine';
    log('reco_view_changed', { mode: RECO_VIEW });
    render(false);
    return;
  }
  if (t.dataset.openAddVenue) {
    SHEET = t.dataset.openAddVenue;
    WEEK_ADD_MODE = true;
    log('venue_add_opened', { venue: SHEET });
    render(false);
    const s = document.getElementById('venue-sheet');
    if (s) { document.body.style.overflow = 'hidden'; s.querySelector('.sheet__close')?.focus(); }
    return;
  }
  if (t.dataset.venue) {
    SHEET = t.dataset.venue;
    log('venue_opened', { venue: SHEET });
    render(false);
    const s = document.getElementById('venue-sheet');
    if (s) { document.body.style.overflow = 'hidden'; s.querySelector('.sheet__close')?.focus(); }
    return;
  }
  if (t.dataset.app) {
    APP_SHEET = t.dataset.app;
    log('app_opened', { app: APP_SHEET });
    render(false);
    const s = document.getElementById('app-sheet');
    if (s) {
      document.body.style.overflow = 'hidden';
      s.querySelector('.sheet__close')?.focus();
    }
    return;
  }
  if (t.dataset.closeAppSheet !== undefined) {
    if (t.dataset.commit) {
      S.commitmentId = t.dataset.commit;
      log('commitment_changed', { to: t.dataset.commit });
    }
    APP_SHEET = null;
    document.body.style.overflow = '';
    render(false);
    return;
  }
  if (t.dataset.closeSheet !== undefined) { SHEET=null; render(false); return; }
  if (t.dataset.toggleStar) {
    const vId = t.dataset.toggleStar;
    if (!S.starredVenues) S.starredVenues = {};

    // If user hasn't customized routine yet and starredVenues is empty, seed with initial 3 curated venues
    if (!S.routineCustomized && Object.keys(S.starredVenues).length === 0) {
      const a = S.answers || {};
      const fromAreas = (a.area && a.area.length ? a.area : ['mitte']).map(id => AREAS.find(x => x.id === id)).filter(Boolean);
      const chosenActs = activityIdsFor(a.activities || []);
      const pool = VENUES.map(v => {
        const km = fromAreas.length ? Math.min(...fromAreas.map(ar => distanceKm(ar, v))) : 0;
        return { ...v, distanceKm: km };
      }).sort((x, y) => x.distanceKm - y.distanceKm);
      const wanted = chosenActs.length ? pool.filter(v => (v.activities || []).some(act => chosenActs.includes(act))) : pool;
      const initial3 = (wanted.length ? wanted : pool).slice(0, 3);
      for (const v of initial3) {
        if (v && v.id) S.starredVenues[v.id] = { freq: 1 };
      }
    }

    if (S.starredVenues[vId]) {
      delete S.starredVenues[vId];
      S.routineCustomized = true;
      log('venue_unstarred', { venue: vId });
    } else {
      const currentCount = Object.keys(S.starredVenues).length;
      if (currentCount >= 10 && !isLoggedIn()) {
        openFavoriteLimitModal();
        renderInPlace();
        return;
      }
      S.starredVenues[vId] = { freq: 1 };
      S.routineCustomized = true;
      log('venue_starred', { venue: vId, freq: 1 });
    }
    renderInPlace();
    return;
  }
  if (t.dataset.openPlanDrawer !== undefined) {
    PLAN_DRAWER_OPEN = true;
    document.body.style.overflow = 'hidden';
    log('plan_drawer_opened');
    render(false);
    return;
  }
  if (t.dataset.closePlanDrawer !== undefined) {
    PLAN_DRAWER_OPEN = false;
    document.body.style.overflow = '';
    log('plan_drawer_closed');
    render(false);
    return;
  }
  if (t.dataset.openOrderSummary !== undefined) {
    ORDER_SUMMARY_OPEN = true;
    document.body.style.overflow = 'hidden';
    log('order_summary_opened');
    render(false);
    return;
  }
  if (t.dataset.closeOrderSummary !== undefined) {
    ORDER_SUMMARY_OPEN = false;
    document.body.style.overflow = '';
    log('order_summary_closed');
    render(false);
    return;
  }
  if (t.dataset.changeCity !== undefined) { CITYPICK=!CITYPICK; if(!CITYPICK) CITYWANTED=null;
    if (CITYPICK) log('city_change_opened'); render(false); return; }
  if (t.dataset.pickPlan) {
    const pId = t.dataset.pickPlan;
    if (PLANS_EXPANDED_ID === pId) {
      PLANS_EXPANDED_ID = null;
    } else {
      PLANS_EXPANDED_ID = pId;
      S.chosenPlanId = pId;
      S.planOverridden = true;
    }
    log('plan_picked_directly', { planId: pId, expanded: PLANS_EXPANDED_ID === pId });
    render(false);
    return;
  }
  if (t.dataset.toggleApps !== undefined) { APPSOPEN = !APPSOPEN; return; }
  if (t.dataset.toggleAlt !== undefined) { e.preventDefault(); ALTOPEN = ALTOPEN !== true; render(false); return; }
  /* "Questions and details" names its three sections on its own handle, and each name is
     the way straight in. Clicking the section that is already open closes it, so this is
     an accordion rather than three drawers that all end up open (rule 16). */
  if (t.dataset.more !== undefined) {
    e.preventDefault();
    const k = t.dataset.more;
    if (MOREOPEN && MOREPICK === k) { MOREPICK = null; }
    else { MOREOPEN = true; MOREPICK = k; }
    render(false); return;
  }
  if (t.dataset.toggleMore !== undefined) { MOREOPEN = !MOREOPEN; return; }
  if (t.dataset.radius) {
    S.radiusKm = t.dataset.radius;
    log('radius_changed', { radius: S.radiusKm });
    renderInPlace(); return;
  }
  if (t.dataset.unsure) {
    S.answers[t.dataset.unsure] = [SKIP];
    log('answer_given', { question:t.dataset.unsure, value:'not_sure', mode:'skip' });
    ACKTEXT = ackFor(t.dataset.unsure, SKIP);
    if (fitComplete(S.answers)) advance('recommendation'); else advance('fit');
    return;
  }
  if (t.dataset.city) {
    if (t.dataset.city === 'Berlin') { CITYWANTED=null; CITYPICK=false; }
    else { CITYWANTED = t.dataset.city; log('city_unavailable_requested', { city:CITYWANTED }); }
    render(false); return;
  }

  if (t.dataset.openExit !== undefined) { openSaveModal('form', 'save_and_exit'); return; }
  if (t.dataset.closeExit !== undefined || (e.target && e.target.id === 'exit-modal')) { closeSaveModal('dismissed'); return; }
  if (t.dataset.openLogin !== undefined) { openLoginModal(); return; }
  if (t.dataset.closeLogin !== undefined || (e.target && e.target.id === 'login-modal')) { closeLoginModal(); return; }

  if (t.dataset.plan) { const recId = recommend(A(),matchVenues(A())).planId;
    const wasPlan = currentPlan();
    S.chosenPlanId = t.dataset.plan; S.planOverridden = t.dataset.plan !== recId;
    /* The live note under the week was written when the days last moved and it named the
       plan that was current then. Switch from Classic to Essential and it still said
       "three days a week brings Classic to about 6.30 € a session" — true when written,
       a lie by the time it was read. Every dynamic line has to be recomputed from the
       plan that is selected now, so this one is rewritten rather than left standing. */
    const nowPlan = currentPlan();
    if (nowPlan.id !== wasPlan.id) {
      const freq = S.answers.frequency, wants = freq ? visitsWanted(freq) : 0;
      const each = perSession(priceFor(nowPlan,S.commitmentId), freq, nowPlan);
      DAYNOTE = freq && !carriesFrequency(nowPlan, freq)
        ? `${esc(nowPlan.name)} allows <b>${monthlyAllowance(nowPlan)} check-ins a month</b>, and the week you built needs ${wants}. The days above stay, but you would run out.`
        : each
          ? `Now on <b>${esc(nowPlan.name)}</b> &mdash; about ${each} € a session at ${plural(Math.min(wants, monthlyAllowance(nowPlan)),'visit','visits')} a month.`
          : `Now on <b>${esc(nowPlan.name)}</b>.`;
    } else DAYNOTE = null;
    log(S.planOverridden?'plan_changed':'plan_reset_to_recommended', { to:t.dataset.plan }); render(false); return; }
  if (t.dataset.commit) { S.commitmentId = t.dataset.commit; log('commitment_changed',{ to:t.dataset.commit }); render(false); return; }
  if (t.dataset.edit) { REVIEW_ANSWERS_OPEN = false; EDITING = t.dataset.edit; go('fit'); return; }
  if (t.dataset.back) { const i=qIndex(t.dataset.back); const prev=QUESTIONS[i-1];
    if (prev) { EDITING = prev.id; ROUTE='fit'; render(); } return; }
  /* "Continue without saving" now means what it says: carry on looking. It used to drop
     you on the details form, because this screen was the gate in front of it. */
  /* Back where they came from, which is not always the recommendation: someone who
     hit "Save and exit" on question two has not seen one yet. */
  if (t.dataset.skipSave !== undefined) {
    log('save_declined');
    if (t.closest('#exit-modal')) { closeSaveModal('continued_without_saving'); return; }
    go(fitComplete(S.answers) || S.planOverridden ? 'recommendation' : 'fit'); return;
  }
  if (t.dataset.reset !== undefined) { clearStoredState(); S = JSON.parse(JSON.stringify(BLANK)); go('landing', { replace: true }); return; }
  if (t.dataset.copyResume !== undefined) {
    const done = () => { t.textContent = 'Copied — bookmark or reopen this link'; log('resume_link_copied',{ atStep:S.lastStep, identified:Boolean(S.email) }); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(resumeUrl()).then(done).catch(()=>{});
    else { const ta=document.createElement('textarea'); ta.value=resumeUrl(); document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); done(); }
    return;
  }
});

/* option cards: reflect selection, and let Enter choose */
/* Marketing consent appears once there is an address it could apply to, and folds away
   again if the visitor clears the field — leaving a ticked box behind would keep a
   promise nobody can be held to. Untick on the way out so the state matches the screen. */
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-banner-toggle]'); if (!btn) return;
  const bar = document.getElementById('demo-banner');
  const collapsed = bar.classList.toggle('is-collapsed');
  btn.textContent = collapsed ? 'Show' : 'Hide';
  btn.setAttribute('aria-expanded', String(!collapsed));
  try { localStorage.setItem('usc_banner_collapsed', collapsed ? '1' : '0'); } catch (_) {}
});
document.addEventListener('input', e => {
  if (e.target.id === 'landing-email') {
    const row = document.querySelector('[data-consent-row]'); if (!row) return;
    const wanted = e.target.value.trim().length > 0;
    row.hidden = !wanted;
    if (!wanted) { const box = row.querySelector('input[type="checkbox"]'); if (box) box.checked = false; }
    return;
  }

  const areaInput = e.target.closest('[data-area-search-input]');
  if (areaInput) {
    const wrap = areaInput.closest('[data-area-search-wrap]');
    if (!wrap) return;
    const clearBtn = wrap.querySelector('[data-area-search-clear]');
    const suggContainer = wrap.querySelector('#area-suggestions');
    const q = areaInput.value.trim();
    if (clearBtn) clearBtn.hidden = !q.length;
    if (!suggContainer) return;
    if (!q) {
      suggContainer.hidden = true;
      suggContainer.innerHTML = '';
      return;
    }
    const suggestions = getAreaSuggestions(q);
    if (!suggestions.length) {
      suggContainer.innerHTML = '<div style="padding:10px 12px;font-size:13px;color:var(--navy-soft)">No matching Berlin neighbourhoods, postcodes, or addresses found.</div>';
      suggContainer.hidden = false;
      return;
    }
    suggContainer.innerHTML = suggestions.map(s => `
      <button type="button" class="area-suggestion-item" data-select-area="${esc(s.id)}" data-area-label="${esc(s.label)}" role="option">
        <span class="area-suggestion-icon">${icon(s.icon || 'pin', 16)}</span>
        <span class="area-suggestion-text">
          <span class="area-suggestion-title">${esc(s.label)}</span>
          <span class="area-suggestion-sub">${esc(s.sub)}</span>
        </span>
      </button>
    `).join('');
    suggContainer.hidden = false;
    return;
  }

  const whereInput = e.target.closest('[data-where-search-input]');
  if (whereInput) {
    const wrap = whereInput.closest('[data-where-search-wrap]');
    if (!wrap) return;
    const clearBtn = wrap.querySelector('[data-where-search-clear]');
    const suggContainer = wrap.querySelector('[data-where-suggestions]');
    const q = whereInput.value.trim();
    if (clearBtn) clearBtn.hidden = !q.length;
    if (!suggContainer) return;
    if (!q) {
      suggContainer.hidden = true;
      suggContainer.innerHTML = '';
      return;
    }
    const suggestions = getAreaSuggestions(q);
    if (!suggestions.length) {
      suggContainer.innerHTML = '<div style="padding:10px 12px;font-size:13px;color:var(--navy-soft)">No matching Berlin areas found.</div>';
      suggContainer.hidden = false;
      return;
    }
    suggContainer.innerHTML = suggestions.map(s => `
      <button type="button" class="area-suggestion-item" data-where="${esc(s.id)}" role="option">
        <span class="area-suggestion-icon">${icon(s.icon || 'pin', 16)}</span>
        <span class="area-suggestion-text">
          <span class="area-suggestion-title">${esc(s.label)}</span>
          <span class="area-suggestion-sub">${esc(s.sub)}</span>
        </span>
      </button>
    `).join('');
    suggContainer.hidden = false;
    return;
  }
});
document.addEventListener('change', e => {
  if (!e.target.matches('input[type="radio"]')) return;
  const group = e.target.closest('.options'); if (!group) return;
  group.querySelectorAll(`input[name="${e.target.name}"]`).forEach(i => i.closest('.option-card')?.classList.toggle('is-selected', i.checked));
});
document.addEventListener('keydown', e => {
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.target.matches('.option-card__input')) {
    const inputs = [...document.querySelectorAll('.option-card__input')];
    const idx = inputs.indexOf(e.target);
    const nextIdx = e.key === 'ArrowDown' ? (idx + 1) % inputs.length : (idx - 1 + inputs.length) % inputs.length;
    inputs[nextIdx].focus();
    inputs[nextIdx].checked = true;
    inputs[nextIdx].dispatchEvent(new Event('change', { bubbles: true }));
    e.preventDefault();
    return;
  }
  if (e.key === 'Enter') {
    const pickChoice = e.target.closest('[role="button"][data-pick-plan]');
    if (pickChoice) { pickChoice.click(); e.preventDefault(); return; }
    const planChoice = e.target.closest('[role="button"][data-plan]');
    if (planChoice) { planChoice.click(); e.preventDefault(); return; }
    const card = e.target.closest('[data-card]');
    if (card) { const input = card.querySelector('input'); if (input && !input.checked) { input.checked = true; input.dispatchEvent(new Event('change',{bubbles:true})); } e.preventDefault(); return; }
  }
  if (e.key === ' ' || e.key === 'Spacebar') {
    const pickChoice = e.target.closest('[role="button"][data-pick-plan]');
    if (pickChoice && e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
      pickChoice.click(); e.preventDefault(); return;
    }
  }
  if (e.key === 'Escape') {
    if (APP_SHEET) { APP_SHEET = null; document.body.style.overflow = ''; render(false); return; }
    if (SHEET) { SHEET=null; render(false); return; }
    const m=document.getElementById('exit-modal');
    if (m && !m.hidden) { m.hidden=true; document.body.style.overflow=''; }
  }
  /* keep Tab inside whichever dialog is open */
  if (e.key === 'Tab') {
    const dialog = document.getElementById('app-sheet') || document.getElementById('venue-sheet') || (() => { const m=document.getElementById('exit-modal'); return m && !m.hidden ? m : null; })();
    if (!dialog) return;
    const f = [...dialog.querySelectorAll('button,a,input,select,textarea,summary')].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const first=f[0], last=f[f.length-1];
    if (e.shiftKey && document.activeElement===first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement===last) { first.focus(); e.preventDefault(); }
    else if (!dialog.contains(document.activeElement)) { first.focus(); e.preventDefault(); }
  }
});
document.addEventListener('click', e => { /* click the backdrop to dismiss */
  if (e.target.id === 'app-sheet') { APP_SHEET = null; document.body.style.overflow = ''; render(false); }
  if (e.target.id === 'venue-sheet') { SHEET=null; render(false); }
  if (e.target.id === 'plus-sheet') { PLANPLUS=null; render(false); }
  if (e.target.id === 'exit-modal') { e.target.hidden = true; document.body.style.overflow=''; }
  if (e.target.id === 'login-modal') { closeLoginModal(); }
});

/* --- HTML5 Drag and Drop for Smart Container Routine Builder --- */
let DRAGGED_VENUE = null;
let DRAGGED_PILLAR = null;

document.addEventListener('dragstart', e => {
  const pillar = e.target.closest('[data-drag-pillar]');
  const card = e.target.closest('[data-drag-venue]');

  if (pillar && !card) {
    DRAGGED_PILLAR = { id: pillar.dataset.dragPillar };
    try {
      e.dataTransfer.setData('text/plain', 'pillar:' + pillar.dataset.dragPillar);
      e.dataTransfer.effectAllowed = 'move';
    } catch (_) {}
    pillar.classList.add('is-dragging');
    document.body.classList.add('is-dragging-pillar');
    return;
  }

  if (card) {
    const fromPillar = card.closest('.pillar-card');
    DRAGGED_VENUE = {
      id: card.dataset.dragVenue,
      name: card.dataset.dragName || '',
      fromActivity: fromPillar ? fromPillar.dataset.activityId : null
    };
    try {
      e.dataTransfer.setData('text/plain', card.dataset.dragVenue);
      e.dataTransfer.effectAllowed = 'copyMove';
    } catch (_) {}
    card.classList.add('is-dragging');
    document.querySelectorAll('[data-drop-day], [data-drop-freedom]').forEach(el => el.classList.add('is-drop-active'));
  }
});

document.addEventListener('dragend', e => {
  const card = e.target.closest('[data-drag-venue]');
  const pillar = e.target.closest('[data-drag-pillar]');
  if (card) card.classList.remove('is-dragging');
  if (pillar) pillar.classList.remove('is-dragging');
  document.body.classList.remove('is-dragging-pillar');
  document.querySelectorAll('[data-drop-day], [data-drop-freedom]').forEach(el => {
    el.classList.remove('is-drop-active', 'is-dragover', 'is-freedom-dragover');
  });
  DRAGGED_VENUE = null;
  DRAGGED_PILLAR = null;
});

document.addEventListener('dragover', e => {
  const freedomDrop = e.target.closest('[data-drop-freedom]');
  const dayDrop = e.target.closest('[data-drop-day]');

  if (freedomDrop) {
    e.preventDefault();
    try { e.dataTransfer.dropEffect = 'copy'; } catch (_) {}
    freedomDrop.classList.add('is-freedom-dragover');
    return;
  }
  if (dayDrop) {
    e.preventDefault();
    try { e.dataTransfer.dropEffect = 'copy'; } catch (_) {}
    dayDrop.classList.add('is-dragover');
    return;
  }
  if (DRAGGED_PILLAR) {
    e.preventDefault();
    try { e.dataTransfer.dropEffect = 'move'; } catch (_) {}
  }
});

document.addEventListener('dragleave', e => {
  const freedomDrop = e.target.closest('[data-drop-freedom]');
  const dayDrop = e.target.closest('[data-drop-day]');
  if (freedomDrop && !freedomDrop.contains(e.relatedTarget)) {
    freedomDrop.classList.remove('is-freedom-dragover');
  }
  if (dayDrop && !dayDrop.contains(e.relatedTarget)) {
    dayDrop.classList.remove('is-dragover');
  }
});

document.addEventListener('drop', e => {
  const freedomDrop = e.target.closest('[data-drop-freedom]');
  const dayDrop = e.target.closest('[data-drop-day]');

  // CASE 1: Dragged a sport pillar OUTSIDE the container -> THROW AWAY!
  if (DRAGGED_PILLAR && !freedomDrop) {
    e.preventDefault();
    const actId = DRAGGED_PILLAR.id;
    const cur = (S.answers.activities || []).filter(x => x !== SKIP && x !== actId);
    if (cur.length > 0) {
      S.answers.activities = cur;
      S.planOverridden = false;
      S.chosenPlanId = null;
      if (S.weekSwap) {
        Object.keys(S.weekSwap).forEach(d => {
          if (S.weekSwap[d] && S.weekSwap[d].groupId === actId) delete S.weekSwap[d];
        });
      }
      log('activity_dragged_out_discarded', { activity: actId });
      render(false);
    }
    return;
  }

  // CASE 2: Dragged a venue INTO the Activity Freedom container -> Auto-create sport!
  if (freedomDrop && DRAGGED_VENUE) {
    e.preventDefault();
    freedomDrop.classList.remove('is-freedom-dragover', 'is-drop-active');
    const venueId = DRAGGED_VENUE.id;
    const venue = VENUES.find(v => v.id === venueId);
    if (!venue) return;

    let group = (A().activities || []).map(groupById).find(g => g && venueInGroup(venue, g));
    if (!group) group = ACTIVITY_GROUPS.find(g => venueInGroup(venue, g)) || ACTIVITY_GROUPS[0];

    const cur = (S.answers.activities || []).filter(x => x !== SKIP);
    if (!cur.includes(group.id)) {
      S.answers.activities = [...cur, group.id];
      S.planOverridden = false;
      S.chosenPlanId = null;
      log('activity_added_via_venue_drag', { activity: group.id, venue: venue.id });
      render(false);
    }
    return;
  }

  // CASE 3: Dropped onto a Day in Week Schedule
  if (dayDrop) {
    e.preventDefault();
    dayDrop.classList.remove('is-dragover', 'is-drop-active');
    let venueId = null;
    try { venueId = e.dataTransfer.getData('text/plain'); } catch (_) {}
    if (!venueId && DRAGGED_VENUE) venueId = DRAGGED_VENUE.id;
    if (venueId && venueId.startsWith('pillar:')) return;
    const targetDay = dayDrop.dataset.dropDay;
    if (!venueId || !targetDay) return;

    const venue = VENUES.find(v => v.id === venueId);
    if (!venue) return;

    let group = (A().activities || []).map(groupById).find(g => g && venueInGroup(venue, g));
    if (!group) group = ACTIVITY_GROUPS.find(g => venueInGroup(venue, g));
    if (!group) return;

    const chosen = (S.answers.activities || []).filter(x => x !== SKIP);
    if (!chosen.includes(group.id)) S.answers.activities = [...chosen, group.id];

    S.weekSwap = Object.assign({}, S.weekSwap, { [targetDay]: { venueId: venue.id, groupId: group.id } });

    const curDays = new Set(S.weekDays && S.weekDays.length ? S.weekDays : weekPlan(A().activities||[], matchVenues(A()).pool||[], currentPlan().id, S.answers.frequency).sessions.map(x=>x.day));
    curDays.add(targetDay);
    S.weekDays = DAY_ORDER.filter(d => curDays.has(d));
    const newFreq = freqForDays(S.weekDays.length);
    if (newFreq !== S.answers.frequency) {
      S.answers.frequency = newFreq;
    }

    const wasPlan = currentPlan();
    const firstPlan = firstPlanWithAccess(venue);
    if (firstPlan && firstPlan.rank > wasPlan.rank) {
      S.chosenPlanId = firstPlan.id;
      S.planOverridden = false;
      DAYNOTE = `Added <b>${esc(venue.name)}</b> to ${targetDay} &mdash; upgraded your plan to <b>${esc(firstPlan.name)}</b> to cover it.`;
    } else {
      S.planOverridden = false;
      S.chosenPlanId = null;
      const nowPlan = currentPlan();
      if (nowPlan.id !== wasPlan.id) {
        DAYNOTE = `Added <b>${esc(venue.name)}</b> to ${targetDay} &mdash; updated your recommendation to <b>${esc(nowPlan.name)}</b>.`;
      } else {
        DAYNOTE = `Added <b>${esc(venue.name)}</b> to ${targetDay}`;
      }
    }

    log('venue_drag_dropped_on_week', { day: targetDay, venue: venue.id });
    render(false);
    return;
  }
});

/* keep the card's selected state in step with its checkbox, without re-rendering
   the screen underneath the visitor's finger */
document.addEventListener('change', e => {
  const input = e.target.closest('input[name="choice"]');
  if (!input) return;
  const form = input.closest('form');
  if (input.type === 'checkbox') input.closest('.option-card')?.classList.toggle('is-selected', input.checked);
  else form?.querySelectorAll('.option-card').forEach(c => c.classList.toggle('is-selected', c.contains(input)));
  /* Questions that accept "one or two" cap themselves: picking a third releases
     the oldest instead of silently dropping it at submit, or refusing the click. */
  const group = input.closest('.options[data-maxpick]');
  if (group && input.type === 'checkbox' && input.checked) {
    /* "Anywhere in Berlin" is not a third neighbourhood — it replaces them. */
    const clear = i => { i.checked = false; i.closest('.option-card')?.classList.remove('is-selected'); };
    const all = [...group.querySelectorAll('input[name="choice"]')];
    if (input.value === 'anywhere') all.filter(i => i !== input).forEach(clear);
    else all.filter(i => i.value === 'anywhere').forEach(clear);
    const max = Number(group.dataset.maxpick) || 3;
    const on = [...group.querySelectorAll('input[name="choice"]')].filter(i => i.checked);
    let notice = group.parentElement?.querySelector('.maxpick-notice');
    if (on.length > max) {
      const dropIdx = on.findIndex(i => i !== input);
      const drop = dropIdx !== -1 ? on.splice(dropIdx, 1)[0] : on.shift();
      if (drop) {
        drop.checked = false; drop.closest('.option-card')?.classList.remove('is-selected');
        const dropLabel = drop.closest('.option-card')?.querySelector('.option-card__label');
        const addLabel = input.closest('.option-card')?.querySelector('.option-card__label');
        const dropName = (dropLabel ? dropLabel.childNodes[0].textContent : drop.value).trim();
        const addName = (addLabel ? addLabel.childNodes[0].textContent : input.value).trim();
        if (dropName && addName && dropName !== addName) {
          if (!notice) {
            notice = document.createElement('div');
            notice.className = 'maxpick-notice xsmall muted';
            notice.style.cssText = 'margin-top: 10px; padding: 8px 12px; background: #f8fafc; border-radius: 8px; border: 1px solid var(--border);';
            group.after(notice);
          }
          notice.innerHTML = `You can pick up to ${max} neighbourhoods &mdash; replaced <strong>${esc(dropName)}</strong> with <strong>${esc(addName)}</strong>.`;
        }
      }
    } else if (notice && (on.length <= max || input.value === 'anywhere')) {
      notice.remove();
    }
  }
});

/* Live validation: clear field errors on typing as soon as input is valid */
const validateFormInput = (input) => {
  if (!input || !input.name) return;
  const name = input.name, val = input.value.trim();
  let isValid = false;
  if (name === 'firstName' || name === 'lastName' || name === 'street' || name === 'city') {
    isValid = val.length > 0;
  } else if (name === 'email') {
    isValid = validEmail(val);
  } else if (name === 'birthDate') {
    if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const parts = val.split('-');
      const form = input.closest('form');
      if (form) {
        const y = form.querySelector('#dob_year');
        const m = form.querySelector('#dob_month');
        const d = form.querySelector('#dob_day');
        if (y) y.value = parts[0];
        if (m) m.value = parts[1];
        if (d) d.value = parts[2];
      }
    }
    isValid = val && val <= dobMax() && val >= dobMin() && isAtLeast18(val);
    if (isValid) {
      delete ERRORS.birthDate;
      input.closest('.field--dob')?.querySelector('.field-error')?.remove();
    }
  } else if (name === 'dob_day' || name === 'dob_month' || name === 'dob_year') {
    if (name !== 'dob_month') input.value = input.value.replace(/\D/g, '');
    const clean = input.value;
    if (name === 'dob_day' && clean.length === 2) {
      document.getElementById('dob_month')?.focus();
    } else if (name === 'dob_month' && clean) {
      document.getElementById('dob_year')?.focus();
    }
    const form = input.closest('form');
    const day = (form?.querySelector('#dob_day')?.value || '').trim();
    const month = (form?.querySelector('#dob_month')?.value || '').trim();
    const year = (form?.querySelector('#dob_year')?.value || '').trim();
    if (year.length === 4 && day.length >= 1 && month.length >= 1) {
      const iso = `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
      const hidden = form?.querySelector('#birthDate');
      if (hidden) hidden.value = iso;
      if (iso <= dobMax() && iso >= dobMin() && isAtLeast18(iso)) {
        delete ERRORS.birthDate;
        input.closest('.field--dob')?.querySelector('.field-error')?.remove();
      }
    }
  } else if (name === 'postcode') {
    isValid = /^\d{4,5}$/.test(val);
  }
  if (isValid && ERRORS[name]) {
    delete ERRORS[name];
    const field = input.closest('.field');
    field?.querySelector('.field-error')?.remove();
  }
};

document.addEventListener('input', e => {
  const input = e.target.closest('form[data-form="details"] input, form[data-form="details"] select, form[data-form="save"] input');
  if (input) validateFormInput(input);
});

document.addEventListener('change', e => {
  const input = e.target.closest('form[data-form="details"] select, form[data-form="details"] input');
  if (input) validateFormInput(input);
});

document.addEventListener('submit', e => {
  const form = e.target.closest('[data-form]'); if (!form) return;
  e.preventDefault();
  const fd = new FormData(form), kind = form.dataset.form;
  const provider = e.submitter && e.submitter.name === 'provider' ? e.submitter.value : null;

  const identify = (dest) => {
    let email = (fd.get('email')||'').trim();
    S.marketing = fd.get('marketing') !== null; S.marketingAsked = true;
    if (provider) { S.authMethod = provider; if (!validEmail(email)) email = `demo.${provider}.user@example.com`; }
    else if (!validEmail(email)) { ERRORS.email = 'Please enter a valid email address so we can save your progress.'; FIELDS.email = email;
      const keep = { ...ERRORS }, inModal = Boolean(form.closest('#exit-modal'));
      render(false); ERRORS = keep;
      if (inModal) openSaveModal('form','validation_error');
      else document.getElementById('app').innerHTML = (SCREENS[ROUTE])();
      return false; }
    else if (kind !== 'save') S.authMethod = 'email';
    S.email = email; FIELDS.email = '';
    S.saveOptIn = (kind === 'save' || dest === 'saved-modal');
    saveJourney(S.email, S);
    saveState(S);
    log('identified', { authMethod:S.authMethod, marketing:S.marketing, at:ROUTE });
    if (dest === 'saved-modal') {
      render(false); openSaveModal('saved','save_completed'); return true;
    }
    go(dest); return true;
  };

  if (kind === 'login') {
    const email = (fd.get('email')||'').trim();
    const firstName = (fd.get('firstName')||'').trim();
    if (provider) {
      const demoEmail = `demo.${provider}.user@example.com`;
      let saved = getJourney(demoEmail) || getJourney(email);
      if (!saved) {
        saved = {
          answers: { goal: ['move_more'], activities: ['gym', 'yoga'], area: ['mitte'], frequency: 'twice' },
          chosenPlanId: 'classic', commitmentId: 'monthly',
          email: demoEmail, firstName: firstName || 'Demo', authMethod: provider, lastStep: 'recommendation'
        };
        saveJourney(demoEmail, saved);
      }
      S = Object.assign(JSON.parse(JSON.stringify(BLANK)), saved);
      if (firstName) S.firstName = firstName;
      S.returns = (S.returns||0) + 1;
      log('returned_via_login', { authMethod: provider, email: demoEmail });
      closeLoginModal();
      saveState(S);
      go(S.paid ? 'confirmation' : (S.lastStep === 'landing' ? (Object.keys(S.answers||{}).length ? 'recommendation' : 'fit') : S.lastStep));
      return;
    }
    if (!validEmail(email)) {
      openLoginModal('Please enter a valid email address.');
      return;
    }
    const saved = getJourney(email);
    if (saved) {
      S = Object.assign(JSON.parse(JSON.stringify(BLANK)), saved);
      if (firstName) S.firstName = firstName;
      S.returns = (S.returns||0) + 1;
      S.email = email;
      S.authMethod = 'email';
      S.saveOptIn = true;
      log('returned_via_login', { authMethod: 'email', email });
      closeLoginModal();
      saveState(S);
      go(S.paid ? 'confirmation' : (S.lastStep === 'landing' ? (Object.keys(S.answers||{}).length ? 'recommendation' : 'fit') : S.lastStep));
      return;
    } else {
      S.email = email;
      if (firstName) S.firstName = firstName;
      S.authMethod = 'email';
      S.saveOptIn = true;
      saveJourney(email, S);
      saveState(S);
      try {
        fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, firstName, lastName: S.lastName || '', state: S })
        }).catch(() => {});
      } catch (_) {}
      closeLoginModal();
      log('returned_via_login', { authMethod: 'email', email });
      go(S.paid ? 'confirmation' : (Object.keys(S.answers||{}).length ? 'recommendation' : (S.lastStep === 'landing' ? 'fit' : S.lastStep)));
      return;
    }
  }

  if (kind === 'personal-details') {
    const firstName = (fd.get('firstName') || '').trim();
    const lastName = (fd.get('lastName') || '').trim();
    const email = (fd.get('email') || '').trim();
    if (firstName) S.firstName = firstName;
    if (lastName) S.lastName = lastName;
    if (email && validEmail(email)) S.email = email;
    if (!S.details) S.details = {};
    if (firstName) S.details.firstName = firstName;
    if (lastName) S.details.lastName = lastName;
    if (email) S.details.email = email;
    saveState(S);
    if (S.email) saveJourney(S.email, S);
    try {
      fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: S.firstName, lastName: S.lastName, email: S.email })
      }).catch(() => {});
    } catch (_) {}
    closePersonalDetailsModal();
    renderInPlace();
    return;
  }

  if (kind === 'recommendation-preferences') {
    const minRatingVal = fd.get('minRating');
    const minRating = minRatingVal && minRatingVal !== 'any' ? Number(minRatingVal) : null;
    const strictlyNearMe = fd.get('strictlyNearMe') === 'yes';
    const sportFocus = fd.getAll('sportFocus');
    S.preferences = { minRating, strictlyNearMe, sportFocus };
    saveState(S);
    if (S.email) saveJourney(S.email, S);
    try {
      fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: S.preferences, email: S.email })
      }).catch(() => {});
    } catch (_) {}
    closePreferencesModal();
    renderInPlace();
    return;
  }

  if (kind === 'ask') {
    ASK.q = (fd.get('q')||'').trim();
    ASK.result = askUrby(ASK.q);
    MOREOPEN = true; MOREPICK = 'ask';
    log('ula_asked', { question:ASK.q, matched:ASK.result?ASK.result.kind:'none' });
    render(false);
    document.querySelector('.ask__answer')?.scrollIntoView({ behavior:SCROLL_BEHAVIOR(), block:'center' });
    return;
  }
  /* Enter, for anyone who types and expects a key to do something. The list is already
     filtered by then; what Enter adds is the way out when nothing near them matched. */
  if (kind === 'venue-filter') {
    VENUEQ = (fd.get('vq')||'');
    const q = VENUEQ.trim();
    if (q) log('places_filtered', { query:q, area:areaIds(S.answers.area) });
    if (q && document.querySelector('[data-venue-search-all]')) {
      SEARCH.q = q; SEARCH.result = searchPlaces(q);
      log('searched', { query:q, matched:SEARCH.result?SEARCH.result.kind:'none', from:'places' });
      go('search'); return;
    }
    renderVenueFilter(); return;
  }
  if (kind === 'place-demand') {
    const place = (fd.get('place')||'').trim();
    if (!place) return;
    PLACEWANTED = place;
    log('venue_demand', { place, area: areaIds(S.answers.area), activities: S.answers.activities || [] });
    render(false); return;
  }
  /* The default landing no longer submits this: four reviews called an email field on
     the front door a toll gate whatever it said about itself, and it only ever fed the
     resume link, so the save screen asks for it instead (rule 61). This stays for
     `?variant=email-first`, which keeps the old page intact as the control arm. */
  if (kind === 'start') {
    const typed = (fd.get('email')||'').trim();
    /* Only record a consent decision when there was an address to attach it to. Marking
       it "asked" on an empty field burned rule 11's one shot: the save screen would then
       never put the question, and the visitor would be filed as having declined
       marketing without ever having been offered it. */
    if (typed || provider) { S.marketing = fd.get('marketing') !== null; S.marketingAsked = true; }
    if (!typed && !provider) { log('started_without_email'); go('fit'); return; }
    S.saveOptIn = true; identify('fit'); return;
  }
  /* What the front door submits now: a search — an offer rather than a request. */
  if (kind === 'search') {
    SEARCH.q = (fd.get('q')||'').trim();
    if (!SEARCH.q) { SEARCH.result = null; go('search'); return; }
    SEARCH.result = searchPlaces(SEARCH.q);
    log('searched', { query:SEARCH.q, matched:SEARCH.result?SEARCH.result.kind:'none',
      results:SEARCH.result&&SEARCH.result.venues?SEARCH.result.venues.length:0 });
    go('search'); return;
  }
  /* Saving ends on the confirmation, not on the details form. Someone who asked to keep
     their fit and leave has not asked to start typing an address. */
  if (kind === 'save')  { identify('saved-modal'); return; }

  if (kind === 'answer') {
    const qid = form.dataset.qid, q = qById(qid), text = (fd.get('freeText')||'').trim();
    const opts = optionsFor(q);
    const chosen = fd.getAll('choice').filter(id => opts.some(o => o.id === id));
    if (chosen.length) {
      if (qid === 'frequency' || qid === 'area' || qid === 'activities' || qid === 'goal') {
        S.weekDays = []; S.weekSwap = {}; S.routineCustomized = false; S.starredVenues = {};
      }
      let finalVal = q.multi ? chosen : chosen[0];
      if (qid === 'area' && Array.isArray(finalVal) && finalVal.includes('anywhere')) {
        finalVal = finalVal.length > 1 ? finalVal.filter(x => x !== 'anywhere') : ['anywhere'];
      }
      S.answers[qid] = finalVal;
      log('answer_given',{ question:qid, value:finalVal, mode:'choice' });
      ACKTEXT = ackFor(qid, S.answers[qid]);
    }
    else if (text) {
      const id = interpret(qid, text);
      if (!id || (Array.isArray(id) && !id.length)) { log('free_text_unclear',{ question:qid, text }); UNCLEAR = true; EDITING = qid; render(); return; }
      S.answers[qid] = q.multi ? (Array.isArray(id)?id:[id]) : (Array.isArray(id)?id[0]:id);
      S.freeText[qid] = text;
      log('answer_given',{ question:qid, value:S.answers[qid], mode:'free_text', text });
      ACKTEXT = ackFor(qid, Array.isArray(S.answers[qid]) ? '_default' : S.answers[qid]);
    } else {
      /* Re-render this same question with the error. EDITING used to be set here,
         which made the screen claim the visitor was changing an earlier answer on
         their very first attempt. */
      NOCHOICE = true; EDITING = S.answers[qid] ? qid : null;
      document.getElementById('app').innerHTML = fitScreen(); NOCHOICE = false; return; }
    EDITING = null;
    if (S.answers.area && !PANEL_OPEN) PANEL_OPEN = true;   // reveal the matches the first time there are any
    if (fitComplete(S.answers)) {
      const r = recommend(A(), matchVenues(A()));
      log('recommendation_shown', { planId: r.planId, rules: r.appliedRules });
      const chosenActs = (S.answers.activities || []).filter(x => x !== SKIP);
      if (chosenActs.length > 0) {
        const primaryGroup = ACTIVITY_GROUPS.find(g => g.id === chosenActs[0] || g.activities.includes(chosenActs[0]));
        if (primaryGroup) {
          ACTIVE_CATEGORY_FILTER = primaryGroup.id;
          ACTIVE_CATEGORY_FILTERS = new Set([primaryGroup.id]);
        }
      }
      advance('recommendation');
    }
    else advance('fit');
    return;
  }

  if (kind === 'details') {
    if (provider) {
      const providerName = provider === 'google' ? 'Google' : 'Apple';
      S.authMethod = provider;
      S.email = validEmail(S.email||'') ? S.email : `demo.${provider}.user@example.com`;
      S.details = Object.assign({}, S.details||{}, {
        firstName:(S.details&&S.details.firstName)||providerName,
        lastName:(S.details&&S.details.lastName)||'Member', email:S.email,
        phone:(S.details&&S.details.phone)||'+49 151 2345678',
        birthDate:(S.details&&S.details.birthDate)||'1995-06-15'
      });
      log('details_prefilled', { provider });
      saveState(S);
      render(false); document.getElementById('dob_day')?.focus(); return;
    }
    const d={}; ['firstName','lastName','email','birthDate','phone','street','postcode','city'].forEach(k=>d[k]=(fd.get(k)||'').trim());
    const dDay = (fd.get('dob_day') || '').trim().replace(/\D/g, '');
    const dMonth = (fd.get('dob_month') || '').trim();
    const dYear = (fd.get('dob_year') || '').trim().replace(/\D/g, '');
    if (dDay && dMonth && dYear.length === 4) {
      d.birthDate = `${dYear}-${dMonth.padStart(2, '0')}-${dDay.padStart(2, '0')}`;
    } else if (!d.birthDate) {
      d.birthDate = '';
    }
    S.details=d; ERRORS={};
    if (!d.firstName) ERRORS.firstName='We need your first name for the membership.';
    if (!d.lastName)  ERRORS.lastName='We need your last name for the membership.';
    if (!validEmail(d.email)) ERRORS.email='Please enter a valid email address.';
    /* max/min on the input only guides the picker, and the form is novalidate, so a typed
       or pasted date still has to be checked here. */
    if (!d.birthDate) ERRORS.birthDate='Venues check age on entry, so this one is required.';
    else if (!isAtLeast18(d.birthDate)) ERRORS.birthDate='You must be at least 18 years old to join.';
    else if (d.birthDate < dobMin()) ERRORS.birthDate='Please check this date.';
    if (!d.phone) ERRORS.phone='Please enter your mobile number.';
    else if (!validPhone(d.phone)) ERRORS.phone='Please enter a valid mobile number (e.g. +49 151 12345678).';
    if (!d.street)    ERRORS.street='Please add your street and number.';
    if (!/^\d{4,5}$/.test(d.postcode)) ERRORS.postcode='Please enter a valid postcode.';
    if (!d.city)      ERRORS.city='Please add your city.';
    if (Object.keys(ERRORS).length) { log('details_validation_failed',{ fields:Object.keys(ERRORS) });
      const keep={...ERRORS}; document.getElementById('app').innerHTML=(()=>{ ERRORS=keep; return detailsScreen(); })();
      if (ERRORS.birthDate) document.getElementById('dob_day')?.focus();
      document.querySelector('.field-error')?.scrollIntoView({block:'center'}); return; }
    /* We now hold an address, but holding one is not the same as being asked to
       keep the journey — saveOptIn stays as the visitor left it. */
    S.email = d.email; S.startDate = S.startDate || firstOfNextMonth();
    saveState(S);
    log('details_completed'); go('payment'); return;
  }

  if (kind === 'payment') {
    FIELDS.method = fd.get('method')||'card';
    S.paid = true; S.lastStep = 'converted';
    log('payment_simulated',{ method:FIELDS.method, planId:S.chosenPlanId }); log('converted',{ planId:S.chosenPlanId });
    saveState(S);
    go('confirmation'); return;
  }
});

/* ---------------- boot ---------------- */
(function boot() {
  /* If they hid the bar last time, it stays hidden — a demo warning that has to be
     dismissed on every reload is just the loud version of the same bar. */
  try {
    if (localStorage.getItem('usc_banner_collapsed') === '1') {
      const bar = document.getElementById('demo-banner');
      if (bar) {
        bar.classList.add('is-collapsed');
        const btn = bar.querySelector('[data-banner-toggle]');
        if (btn) { btn.textContent = 'Show'; btn.setAttribute('aria-expanded', 'false'); }
      }
    }
  } catch (_) {}
  const m = location.hash.match(/^#resume=(.+)$/);
  if (m) {
    try {
      S = Object.assign(JSON.parse(JSON.stringify(BLANK)), b64d(m[1]));
      S.returns = (S.returns||0)+1;
      log('returned',{ returnNumber:S.returns, toStep:S.lastStep });
      saveState(S);
      const targetStep = S.paid ? 'confirmation' : (S.lastStep === 'landing' ? 'landing' : S.lastStep);
      history.replaceState({ route: targetStep }, '', getUrlForRoute(targetStep));
      go(targetStep, { replace: true });
      return;
    } catch (err) { /* fall through to a fresh visit */ }
  }
  const stored = loadState();
  if (stored && (stored.chosenPlanId || Object.keys(stored.answers||{}).length > 0 || stored.email)) {
    S = Object.assign(JSON.parse(JSON.stringify(BLANK)), stored);
  }
  const p = new URLSearchParams(location.search);
  S.source = p.get('utm_source') || p.get('source') || 'direct';
  S.campaign = p.get('utm_campaign') || p.get('campaign');
  log('landing_viewed',{ source:S.source, campaign:S.campaign, variant:VARIANT });

  let initialRoute = getRouteFromUrl();
  // Guard stateful routes: if user arrived directly at #recommendation/details without answers or plan, start cleanly at landing
  if (initialRoute === 'recommendation' && !S.chosenPlanId && Object.keys(S.answers || {}).length === 0) {
    initialRoute = 'landing';
  } else if (initialRoute === 'checkout' && !S.chosenPlanId) {
    initialRoute = 'landing';
  }

  ROUTE = initialRoute;
  history.replaceState({ route: initialRoute }, '', getUrlForRoute(initialRoute));
  render();
})();
