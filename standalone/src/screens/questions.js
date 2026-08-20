function answerChips(opts = {}) {
  const { label = 'Your fit', compact = true } = opts;
  const given = QUESTIONS.filter(q => isAnswered(S.answers[q.id]));
  if (!given.length) return '';
  return `<div class="chips-row ${compact?'chips-row--compact':''}">
    <div class="chips-row__header">
      ${label ? `<span class="chips-row__label">${esc(label)}</span><span class="chips-row__hint">&middot; Tap any to edit</span>` : `<span class="chips-row__hint">Tap any answer to edit</span>`}
    </div>
    <div class="chips-row__items">
      ${given.map(q => `<button class="answer-chip" type="button" data-edit="${esc(q.id)}"
          aria-label="Change your answer to: ${esc(q.prompt)}" title="Click to edit this answer">
          ${icon(q.icon,13)}<span>${esc(compactAnswerLabel(q.id,S.answers[q.id]))}</span><span class="answer-chip__edit-icon">${icon('pencil',11)}</span></button>`).join('')}
    </div>
  </div>`;
}

function craftingScreen() {
  const city = S.answers.city || S.detectedCity || 'Berlin';
  return `${topbar(1, { stepper: false })}
  <div class="one-col one-col--fit">
    <main class="one-col__main crafting-main" id="main">
      <div class="crafting-card">
        <div class="crafting-avatar-pulse">
          ${ulaAvatar('lg')}
        </div>
        <h1 class="h-question crafting-title" tabindex="-1">Finding your perfect fit...</h1>
        <p class="crafting-sub">Urby is tailoring your membership and routine.</p>
        <div class="crafting-steps">
          <div class="crafting-step crafting-step--1">
            <span class="crafting-step__check">${icon('checkThin', 14)}</span>
            <span>Scanning venues across ${esc(city)}</span>
          </div>
          <div class="crafting-step crafting-step--2">
            <span class="crafting-step__check">${icon('checkThin', 14)}</span>
            <span>Customising your weekly routine</span>
          </div>
          <div class="crafting-step crafting-step--3">
            <span class="crafting-step__check">${icon('checkThin', 14)}</span>
            <span>Matching the best plan for you</span>
          </div>
        </div>
      </div>
    </main>
  </div>`;
}

function fitScreen() {
  if (CRAFTING_TRANSITION) return craftingScreen();

  const q = EDITING ? qById(EDITING) : nextQuestion(S.answers);
  if (!q) return recommendationScreen();
  const opts = optionsFor(q);
  const idx = qIndex(q.id);
  const match = matchVenues(A()), prov = provisionalPlan(A(), match);
  const picked = Array.isArray(S.answers[q.id]) ? S.answers[q.id] : (S.answers[q.id] ? [S.answers[q.id]] : []);
  const answeredCount = QUESTIONS.filter(item => isAnswered(S.answers[item.id])).length;
  const canSkip = Boolean(q.multi || q.skip);

  const cards = opts.map(o => `<label class="option-card ${picked.includes(o.id) ? 'is-selected' : ''}" data-card>
      <input class="option-card__input" type="${q.multi ? 'checkbox' : 'radio'}" name="choice" value="${esc(o.id)}" ${picked.includes(o.id) ? 'checked' : ''}>
      <span class="option-card__icon">${icon(o.icon || 'grid', 22)}<span class="option-card__check">${icon('checkThin', 17)}</span></span>
      <span class="option-card__label">${esc(o.label)}${o.sub ? `<span class="option-card__sub">${esc(o.sub)}</span>` : ''}</span></label>`).join('');

  const progressSegments = Array.from({ length: QUESTIONS.length }, (_, k) =>
    `<span class="qcontainer-bar ${k < idx ? 'is-done' : k === idx ? 'is-now' : ''}"></span>`
  ).join('');

  const isLastQuestion = idx === QUESTIONS.length - 1;

  return `${topbar(1, { stepper: false })}<div class="one-col one-col--fit"><main class="one-col__main" id="main">
    <div class="question-card-container">
      <div class="question-card__top">
        <div class="question-card__identity">
          ${ulaAvatar('sm')}
          <div class="question-card__identity-text">
            <span class="question-card__guide-name"><span class="guide-name-full">Urby &middot; Membership guide</span><span class="guide-name-short">Urby guide</span></span>
            <span class="question-card__step">Question ${idx + 1} of ${QUESTIONS.length}</span>
          </div>
        </div>
        <div class="question-card__top-actions">
          ${canSkip ? `<button class="btn-skip-question linkish" type="button" data-unsure="${esc(q.id)}">Skip &rarr;</button>` : ''}
        </div>
      </div>

      <div class="question-card__progress" aria-hidden="true">
        ${progressSegments}
      </div>

      ${ACKTEXT ? `<div class="notice">${icon('sparkle', 19)}<span>${esc(ACKTEXT)}</span></div>` : ''}
      ${UNCLEAR ? `<div class="notice notice--grey">${icon('info', 19)}<span>I didn&rsquo;t quite catch that one — could you pick the closest option below? You can always change it later.</span></div>` : ''}
      ${TYPING ? `<div class="typing" role="status" aria-label="Urby is typing"><span></span><span></span><span></span></div>`
        : `<form data-form="answer" data-qid="${esc(q.id)}">
        <h1 class="h-question" tabindex="-1">${esc(q.prompt)}</h1>
        ${q.id === 'area' ? cityChip() : (q.hint ? `<p class="qhint">${q.hint}</p>` : '')}
        ${q.id === 'area' ? `
          <div class="area-search-wrap" data-area-search-wrap>
            <div class="area-search-field">
              <span class="area-search-icon" aria-hidden="true">${icon('search', 16)}</span>
              <input type="text"
                     class="area-search-input"
                     id="area-search-input"
                     placeholder="Search neighbourhood, postcode (e.g. 10115), or address..."
                     aria-label="Search neighbourhood, postcode, or address"
                     autocomplete="off"
                     data-area-search-input>
              <button type="button" class="area-search-clear" data-area-search-clear aria-label="Clear location search" hidden>${icon('close', 12)}</button>
            </div>
            <div class="area-suggestions" id="area-suggestions" role="listbox" aria-label="Location suggestions" hidden></div>
          </div>

          <div class="area-section">
            <div class="area-section__header">
              <span class="area-section__title">Popular neighbourhoods</span>
              <span class="area-section__hint">Tap to select</span>
            </div>
            <div class="options options--compact area-shortcuts-grid">
              ${AREAS.map(a => {
                const isSel = picked.includes(a.id);
                const venueCount = VENUES.filter(v => v.area === a.id).length;
                return `<label class="option-card ${isSel ? 'is-selected' : ''}" data-card>
                  <input class="option-card__input" type="${q.multi ? 'checkbox' : 'radio'}" name="choice" value="${esc(a.id)}" ${isSel ? 'checked' : ''}>
                  <span class="option-card__icon">${icon('pin', 20)}<span class="option-card__check">${icon('checkThin', 17)}</span></span>
                  <span class="option-card__label">${esc(a.name)}<span class="option-card__sub">${plural(venueCount, 'venue', 'venues')}</span></span>
                </label>`;
              }).join('')}
            </div>
          </div>

          <div class="area-section area-section--anywhere">
            <div class="options options--anywhere">
              <label class="option-card option-card--anywhere ${picked.includes('anywhere') ? 'is-selected' : ''}" data-card>
                <input class="option-card__input" type="${q.multi ? 'checkbox' : 'radio'}" name="choice" value="anywhere" ${picked.includes('anywhere') ? 'checked' : ''}>
                <span class="option-card__icon">${icon('city', 20)}<span class="option-card__check">${icon('checkThin', 17)}</span></span>
                <span class="option-card__label">Anywhere in Berlin<span class="option-card__sub">All ${VENUES.length} venues across the city · No radius limit</span></span>
              </label>
            </div>
          </div>
        ` : `
          <div class="options ${opts.length > 6 ? 'options--compact' : opts.length > 4 ? 'options--chips' : 'options--tiles'}${q.id === 'frequency' ? ' options--stack-mobile' : ''}"${q.maxPick ? ` data-maxpick="${q.maxPick}"` : ''}>${cards}</div>
        `}
        ${NOCHOICE ? `<p class="field-error" role="alert">${q.multi ? 'Pick at least one, or tell Urby in your own words.' : 'Pick one of the options, or tell Urby in your own words.'}</p>` : ''}
        
        <div class="btn-row desktop-cta">
          ${idx > 0 ? `<button class="btn btn--secondary" type="button" data-back="${esc(q.id)}">${icon('back', 18)} Back</button>` : `<button class="btn btn--secondary" type="button" data-go="landing">${icon('back', 18)} Back</button>`}
          <button class="btn btn--primary" type="submit" data-continue style="flex:1 1 auto">${isLastQuestion ? 'See my recommendation &rarr;' : 'Continue &rarr;'}</button>
        </div>

        <div class="ownwords ownwords--discreet">
          <label for="ownwords-input" class="sr-only">Answer in your own words</label>
          <input type="text" name="freeText" id="ownwords-input" placeholder="💬 Or tell Urby in your own words..." aria-label="Answer in your own words" autocomplete="off" value="${esc(S.freeText[q.id] || '')}">
          <button class="ownwords__send" type="submit">Send</button>
        </div>

        <div class="sticky-cta">
          ${idx > 0 ? `<button class="btn btn--secondary" type="button" data-back="${esc(q.id)}" aria-label="Previous question">${icon('back', 18)}</button>` : `<button class="btn btn--secondary" type="button" data-go="landing" aria-label="Back to home">${icon('back', 18)}</button>`}
          <button class="btn btn--primary" type="submit" data-continue>${isLastQuestion ? 'See my recommendation &rarr;' : 'Continue &rarr;'}</button>
        </div>
      </form>`}
    </div>

    <footer class="qactions-foot">
      <span class="qactions-foot__lead">Looking for something else?</span>
      <div class="qactions-foot__links">
        <button class="linkish link-plain font-small text-muted" type="button" data-go="plans">Compare all memberships</button>
        <span class="qactions-foot__dot">&middot;</span>
        <button class="linkish link-plain font-small text-muted" type="button" data-go="search">Explore venues &amp; map</button>
      </div>
    </footer>
  </main></div>${exitModal()}${venueSheet()}${reviewAnswersSheet()}`;
}

/* Reasons for the plan actually on screen.
   The rules produce their reasons for the plan THEY chose. If the visitor
   switches, the person-facts still hold (how often, what they'd do) but every
   plan-specific line has to be recomputed, or the page argues for one plan under
   the heading of another — which is exactly what a tester found confusing. */
