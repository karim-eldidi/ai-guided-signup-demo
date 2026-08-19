function answerChips(opts = {}) {
  const { label = 'Your fit', compact = true } = opts;
  const given = QUESTIONS.filter(q => isAnswered(S.answers[q.id]));
  if (!given.length) return '';
  return `<div class="chips-row ${compact?'chips-row--compact':''}">
    ${label?`<span class="chips-row__label">${esc(label)}</span>`:''}
    <div class="chips-row__items">
      ${given.map(q => `<button class="answer-chip" data-edit="${esc(q.id)}"
          aria-label="Change your answer to: ${esc(q.prompt)}">
          ${icon(q.icon,13)}<span>${esc(compactAnswerLabel(q.id,S.answers[q.id]))}</span>${icon('pencil',12)}</button>`).join('')}
    </div>
  </div>`;
}

function fitScreen() {
  const q = EDITING ? qById(EDITING) : nextQuestion(S.answers);
  if (!q) return recommendationScreen();
  const opts = optionsFor(q);
  const idx = qIndex(q.id);
  const match = matchVenues(A()), prov = provisionalPlan(A(),match);
  /* A multi-select question is real checkboxes, so it still works with no
     JavaScript — same as every other action here. */
  const picked = Array.isArray(S.answers[q.id]) ? S.answers[q.id] : (S.answers[q.id]?[S.answers[q.id]]:[]);
  /* The input is the control: visually hidden but focusable and real size, so Tab
     reaches the group, arrows move within a radio group, Space toggles, and screen
     readers announce the checked state. It used to be 0x0 with opacity:0 and the
     LABEL carried tabindex, which broke all four. */
  const cards = opts.map(o=>`<label class="option-card ${picked.includes(o.id)?'is-selected':''}" data-card>
      <input class="option-card__input" type="${q.multi?'checkbox':'radio'}" name="choice" value="${esc(o.id)}" ${picked.includes(o.id)?'checked':''}>
      <span class="option-card__icon">${icon(o.icon||'grid',22)}<span class="option-card__check">${icon('checkThin',17)}</span></span>
      <span class="option-card__label">${esc(o.label)}${o.sub ? `<span class="option-card__sub">${esc(o.sub)}</span>` : ''}</span></label>`).join('');
  /* Once we know where they are, show what we found — inline, small, and only
     then. Before that there is nothing worth putting in a side panel, and a
     tester told us the panel was a distraction on the first questions. */
  const found = S.answers.area ? (match.venues||[]).slice(0,3) : [];
  return `${topbar(1,{sub:{done:idx,total:QUESTIONS.length}})}<div class="one-col"><main class="one-col__main" id="main">
    <div class="qprogress" style="display:none"><span class="qprogress__label">Question ${idx+1} of ${QUESTIONS.length}</span></div>
    ${answerChips({ label:'' })}
    ${/* Urby introduces herself once, on the first question. She used to repeat the
         previous answer back as a chat bubble on question two — but the chips above
         already show it, so it was the same fact twice, and it pushed the Continue
         button off the first screen. */ idx===0?ulaRow():''}
    ${ACKTEXT?`<div class="notice">${icon('sparkle',19)}<span>${esc(ACKTEXT)}</span></div>`:''}
    ${UNCLEAR?`<div class="notice notice--grey">${icon('info',19)}<span>I didn&rsquo;t quite catch that one — could you pick the closest option below? You can always change it later.</span></div>`:''}
    ${TYPING?`<div class="typing" role="status" aria-label="Urby is typing"><span></span><span></span><span></span></div>`
      :`<form data-form="answer" data-qid="${esc(q.id)}">
      <h1 class="h-question" tabindex="-1">${esc(q.prompt)}</h1>
      ${q.id==='area' ? cityChip() : (q.hint ? `<p class="qhint">${q.hint}</p>` : '')}
      <div class="options ${opts.length>6?'options--compact':opts.length>4?'options--chips':'options--tiles'}${q.id==='frequency'?' options--stack-mobile':''}"${q.maxPick?` data-maxpick="${q.maxPick}"`:''}>${cards}</div>
      ${NOCHOICE?`<p class="field-error" role="alert">${q.multi?'Pick at least one, or tell Urby in your own words.':'Pick one of the options, or tell Urby in your own words.'}</p>`:''}
      ${q.multi&&q.id!=='area'?`<p class="small muted" style="margin:14px 0 0"><button class="linkish" type="button" data-unsure="${esc(q.id)}">I&rsquo;m not sure yet &mdash; surprise me</button></p>`:''}
      <div class="btn-row desktop-cta">
        ${idx>0?`<button class="btn btn--secondary" type="button" data-back="${esc(q.id)}">${icon('back',18)} Back</button>`:`<button class="btn btn--secondary" type="button" data-go="landing">${icon('back',18)} Back</button>`}
        <button class="btn btn--primary" type="submit" data-continue style="flex:1 1 auto">Continue</button></div>
      <div class="ownwords">
        <div class="ownwords__label">${icon('speech',15)} <span>Answer in your own words</span></div>
        <div class="ownwords__row">
          <label for="ownwords-input" class="sr-only">Answer in your own words</label>
          <input type="text" name="freeText" id="ownwords-input" placeholder="${esc(q.placeholder)}" aria-label="Answer in your own words" autocomplete="off">
          <button class="ownwords__send" type="submit">Send</button>
        </div>
      </div>
      <div class="sticky-cta">
        ${idx>0?`<button class="btn btn--secondary" type="button" data-back="${esc(q.id)}" aria-label="Previous question">${icon('back',18)}</button>`:`<button class="btn btn--secondary" type="button" data-go="landing" aria-label="Back to home">${icon('back',18)}</button>`}
        <button class="btn btn--primary" type="submit" data-continue>Continue</button></div>
    </form>`}
  </main></div>${exitModal()}${venueSheet()}`;
}

/* Reasons for the plan actually on screen.
   The rules produce their reasons for the plan THEY chose. If the visitor
   switches, the person-facts still hold (how often, what they'd do) but every
   plan-specific line has to be recomputed, or the page argues for one plan under
   the heading of another — which is exactly what a tester found confusing. */
