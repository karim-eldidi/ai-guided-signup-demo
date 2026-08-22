/* A short orientation page for visitors who do not yet have the product model.
   It explains the network through one changing week, then hands the decision back
   to Urby. Prices and tier detail stay on the plans screen where they can be compared.

   Two things here are load-bearing and easy to undo by accident:

   1. Every photograph we own is portrait (0.56 to 0.69). The week tiles are therefore
      locked to `aspect-ratio: 3/4` in CSS rather than a pixel height. A landscape tile
      crops a portrait photograph to a horizontal band through the middle of the frame,
      which is how this page ended up full of headless torsos. Each tile carries its own
      `--focus` — the vertical point cover should keep — because the subject sits at a
      different height in every frame.

   2. The yellow journey line is drawn by layoutAboutJourney() in events.js from the
      tiles' real positions. Nothing here positions a node. Keep the `data-journey-stop`
      order chronological and let the geometry follow. Both rows read left to right; the
      line wraps around the outside between them, which is why the days stay in order. */
function aboutScreen() {
  const image = name => IMG[`/images/${name}`] || `/images/${name}`;

  /* day, the short activity word, the file, and the vertical focus point that keeps
     the subject's face in frame once `cover` has trimmed the height. */
  const week = [
    { cell:'mon', day:'Mon', act:'Swim',       file:'about-swimming.jpg',   focus:'26%' },
    { cell:'wed', day:'Wed', act:'Yoga',       file:'about-yoga.jpg',       focus:'42%' },
    { cell:'fri', day:'Fri', act:'Strength',   file:'about-strength.jpg',   focus:'16%' },
    { cell:'sat', day:'Sat', act:'Bouldering', file:'about-bouldering.jpg', focus:'46%' },
    { cell:'sun', day:'Sun', act:'Sauna',      file:'about-wellness.jpg',   focus:'24%' }
  ];

  const moments = week.map((m, i) => `<article class="about-week__moment about-week__moment--${m.cell}" data-journey-stop="${i + 1}">
    <img src="${image(m.file)}" alt="" decoding="async" style="object-position:50% ${m.focus}"${i === 0 ? ' fetchpriority="high"' : ' loading="lazy"'}>
    <span class="about-week__tag"><b>${m.day}</b><span class="dot-sep">&middot;</span><span>${m.act}</span></span>
  </article>`).join('');

  /* The "50+" section used to be four photographs, which read as a second, weaker copy
     of the week collage above it — and worse, it said fifty and showed four. Photographs
     communicate instances, not range. What a newcomer actually wants here is "is the
     thing I do included?", so this is a directory rather than a gallery, built from the
     same ACTIVITY_GROUPS Urby asks about. Nothing is written twice; if the data changes,
     this changes. Deliberately un-photographic: the contrast is what makes the week's
     pictures land. */
  const ACTIVITY_NAMES = { crossfit:'CrossFit', hiit:'HIIT', aqua_fitness:'Aqua fitness', martial_arts:'Martial arts' };
  const activityName = id => ACTIVITY_NAMES[id] || id.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

  /* One picture per group, and the count is the argument: eight of them say "lots of
     things" in a way four never could. Where the library has no honest photograph for a
     group we render the branded icon tile instead — the same convention venues without a
     photo already use — rather than captioning a picture with a sport it does not show.
     Squares, because the week below is portraits: same subject, different rhythm. */
  const GROUP_SHOTS = {
    gym:   { file:'about-hiit.jpg',    focus:'34%' },
    yoga:  { file:'about-pilates.jpg', focus:'44%' },
    swim:  { file:'about-swim.jpg',    focus:'30%' },
    spa:   { file:'about-massage.jpg', focus:'46%' },
    climb: { file:'about-climb.jpg',   focus:'44%' },
    fight: { file:'about-boxing.jpg',  focus:'42%' },
    dance: { file:'about-dance.jpg',   focus:'39%' },
    cycle: { file:'about-cycling.jpg', focus:'38%' }
  };

  /* Presentational order only — every group in the data still renders. Left as the data
     order, the three groups we have no photograph for landed side by side and the second
     row read as an unfinished grid. */
  const SHOT_ORDER = ['gym', 'yoga', 'fight', 'spa', 'climb', 'dance', 'swim', 'cycle'];
  const ordered = SHOT_ORDER
    .map(id => ACTIVITY_GROUPS.find(g => g.id === id))
    .filter(Boolean)
    .concat(ACTIVITY_GROUPS.filter(g => !SHOT_ORDER.includes(g.id)));

  const directory = ordered.map(g => {
    const shot = GROUP_SHOTS[g.id];
    const visual = shot
      ? `<div class="about-act__shot"><img src="${image(shot.file)}" alt="" decoding="async" style="object-position:50% ${shot.focus}"></div>`
      : `<div class="about-act__shot about-act__shot--mark">${icon(g.icon, 40)}</div>`;
    return `<article class="about-act about-act--${g.id} ${shot ? 'about-act--photo' : 'about-act--graphic'}">
      ${visual}
      <h3><span class="about-act__mark">${icon(g.icon, 13)}</span>${g.label}</h3>
      <p>${g.activities.map(activityName).join(' &middot; ')}</p>
    </article>`;
  }).join('');

  /* The mock-up shows Urby's real first question and its real options, read from
     QUESTIONS rather than retyped. The version this replaces invented a price and a
     venue count on the same screen. */
  const q1 = QUESTIONS[0];
  const q1Options = q1.options.map(o => `<li><span class="fitphone__ico">${icon(o.icon, 13)}</span>${o.label}</li>`).join('');

  return `<main class="about-page" id="main">
    <header class="about-nav">
      <button class="wordmark linkish" style="text-decoration:none" type="button" data-go="landing">Urban Sports Club</button>
      <button class="about-nav__back" type="button" data-go="landing" data-back>${icon('back', 15)} Back</button>
    </header>

    <section class="about-hero">
      <div class="about-hero__copy">
        <h1 tabindex="-1">Your week changes.<br>Your movement can too.</h1>
        <p class="about-hero__lede">One membership, many participating gyms, studios, pools and wellness venues.</p>
        <button class="about-hero__jump" type="button" data-jump="your-week">See how it works ${icon('arrowDown', 15)}</button>
      </div>
      <div class="about-hero__media" aria-hidden="true">
        <img src="${image('about-hero-motion.jpg')}" alt="" decoding="async" fetchpriority="high">
      </div>
    </section>

    <section class="about-week" id="your-week">
      <svg class="about-week__journey" aria-hidden="true" focusable="false" preserveAspectRatio="none"><path></path></svg>

      <div class="about-week__intro">
        <p class="about-eyebrow">A changing week</p>
        <h2>A week that feels like yours.</h2>
        <p>Swim near work. Yoga near home. Bouldering with friends.</p>
        <div class="about-pass" aria-label="One Urban Sports Club membership">
          <span class="about-pass__mark">${icon('shield', 20)}</span>
          <strong>One membership</strong>
          <span class="about-pass__barcode" aria-hidden="true"></span>
        </div>
        <p class="about-mechanics"><span>Find an included venue</span>${icon('arrowRight', 16)}<span>Book or check in</span></p>
      </div>

      <div class="about-week__visual" aria-label="Five different activities across one week">
        ${moments}
        <p class="about-week__end">Choose differently next week.</p>
      </div>
    </section>

    <section class="about-variety" aria-label="What is included">
      <div class="about-variety__inner">
        <div class="about-variety__header">
          <span class="about-variety__count" aria-hidden="true">50+</span>
          <div>
            <p class="about-eyebrow">Your membership, your mix</p>
            <h2>Ways to move.<br>Ways to unwind.</h2>
            <p>From hard sessions to quiet recovery. Pick something familiar or make tomorrow completely different.</p>
          </div>
        </div>
        <div class="about-directory" aria-label="Activity groups">${directory}</div>
        <button class="about-directory__hint" type="button" data-go="search">Explore the range <span aria-hidden="true">&rarr;</span></button>
      </div>
    </section>

    <section class="about-fit" aria-label="Find the membership that fits you">
      <div class="about-fit__inner">
        <div class="about-fit__copy">
          <h2>Let&rsquo;s find the version that fits your life.</h2>
          <p class="about-fit__lede">Four quick questions. A possible week. The membership that covers it.</p>
          <button class="btn btn--primary about-fit__btn" type="button" data-start-fit>
            <span>Find my fit</span> ${icon('arrowRight', 22)}
          </button>
          <ul class="about-fit__reassure">
            <li>${icon('grid', 15)} Four questions</li>
            <li>${icon('clock', 15)} About two minutes</li>
            <li>${icon('lock', 15)} No email needed</li>
          </ul>
        </div>

        <div class="about-fit__phone" aria-hidden="true">
          <div class="fitphone">
            <div class="fitphone__bar"><span>9:41</span><span class="fitphone__dots"><i></i><i></i></span></div>
            <div class="fitphone__head">
              <span class="fitphone__avatar">${icon('sparkle', 13)}</span>
              <div><b>Urby</b><span>Membership guide</span></div>
            </div>
            <p class="fitphone__ask">${q1.prompt}</p>
            <ul class="fitphone__opts">${q1Options}</ul>
          </div>
        </div>
      </div>
    </section>
  </main>`;
}
