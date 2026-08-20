function dataScreen() {
  const order=['landing','fit','recommendation','save','details','payment','converted'];
  const reached = S.paid?'converted':S.lastStep;
  const rows = order.map(step=>{
    const done = order.indexOf(reached)>=order.indexOf(step);
    return `<div style="display:flex;align-items:center;gap:14px;margin-bottom:9px">
      <span class="xsmall" style="width:120px;text-transform:capitalize">${step}</span>
      <span style="flex:1 1 auto;height:22px;background:var(--cream);border-radius:4px;overflow:hidden">
        <span style="display:block;height:100%;width:${done?100:0}%;background:var(--ink)"></span></span>
      <span class="xsmall strong" style="width:34px;text-align:right">${done?1:0}</span></div>`;
  }).join('');
  const answers = QUESTIONS.map(q=>{ const l=answerLabel(q.id,S.answers[q.id]); return l?`${q.summaryLabel}: ${l}`:null; }).filter(Boolean).join(' · ');
  const a=A(), complete=fitComplete(S.answers);
  const rec = complete?recommend(a,matchVenues(a)):null;
  const events = S.events.map(e=>`<tr><td><code>${esc(e.name)}</code></td><td class="xsmall">${e.payload?esc(JSON.stringify(e.payload)):'—'}</td></tr>`).join('');
  return `<header class="topbar"><div class="topbar__left"><button class="wordmark linkish" style="text-decoration:none" data-go="landing">Urban Sports Club</button>
      <div class="xsmall muted">Pilot journey data</div></div><div></div>
    <div class="topbar__right"><button class="link-plain linkish" data-go="landing">Back to the journey</button></div></header>
  <main class="content" style="max-width:1000px" id="main">
    <div class="notice notice--grey">${icon('info',19)}<span>This build tracks one visitor at a time, in this browser. The full version stores every visitor so cohorts can be compared. Variant in use: <strong>${esc(VARIANT)}</strong>.</span></div>
    <div class="card"><div class="fitpanel__label">Journey funnel</div>${rows}</div>
    <div class="card"><div class="fitpanel__label">This visitor</div><dl class="summary-list">
      <div class="summary-row"><dt>Variant</dt><dd>${esc(VARIANT)}</dd></div>
      <div class="summary-row"><dt>Identity</dt><dd>${esc(S.email||'anonymous')} ${S.authMethod?`(${esc(S.authMethod)})`:''}</dd></div>
      <div class="summary-row"><dt>Marketing consent</dt><dd>${S.marketingAsked?(S.marketing?'Yes':'No'):'not asked yet'}</dd></div>
      <div class="summary-row"><dt>Answers</dt><dd style="max-width:60%">${esc(answers||'—')}</dd></div>
      <div class="summary-row"><dt>Recommended</dt><dd>${rec?esc(rec.planName+' · '+rec.appliedRules.join(', ')):'—'}</dd></div>
      <div class="summary-row"><dt>Chosen</dt><dd>${esc(S.chosenPlanId||'—')}${S.planOverridden?' (overridden)':''}</dd></div>
      <div class="summary-row"><dt>Returns via link</dt><dd>${S.returns}</dd></div>
      <div class="summary-row"><dt>Converted</dt><dd>${S.paid?'Yes':'No'}</dd></div></dl></div>
    ${(()=>{ const ip=intentProfile();
      if (!ip.sentence && !ip.said.length && !ip.gaps.length && !ip.signals.length) return '';
      return `<div class="card"><div class="fitpanel__label">What this visitor really wanted</div>
        ${ip.sentence?`<p style="font-size:17px;line-height:1.5;margin:0 0 14px">${ip.sentence}</p>`:''}
        ${ip.said.length?`<div class="fitpanel__label" style="margin-top:6px">In their own words</div>
          <ul class="reasons">${ip.said.map(t=>`<li>${icon('speech',19)}<span>${esc(t)}</span></li>`).join('')}</ul>`:''}
        ${ip.signals.length?`<div class="fitpanel__label" style="margin-top:18px">What they did</div>
          <ul class="reasons">${ip.signals.map(t=>`<li>${icon('checkThin',19)}<span>${t}</span></li>`).join('')}</ul>`:''}
        ${ip.gaps.length?`<div class="fitpanel__label" style="margin-top:18px">Wants we could not serve</div>
          <ul class="reasons">${ip.gaps.map(t=>`<li>${icon('info',19)}<span>${t}</span></li>`).join('')}</ul>
          <p class="xsmall muted" style="margin-top:12px">This is the list worth reading every week. Each line is a question Urby could not answer,
            a city we do not cover, or an answer a visitor did not have &mdash; measured, not guessed.</p>`:''}
        <p class="xsmall muted" style="margin-top:14px">Stopped at: <strong>${esc(ip.stoppedAt)}</strong>.</p></div>`;
    })()}
    <div class="card"><div class="fitpanel__label">Events (${S.events.length})</div>
      <table class="table"><thead><tr><th>Event</th><th>Detail</th></tr></thead>
      <tbody>${events||'<tr><td colspan="2" class="muted">Nothing yet.</td></tr>'}</tbody></table></div>
    <div class="btn-row"><button class="btn btn--secondary" data-go="email">Follow-up email preview</button>
      <button class="btn btn--secondary" data-reset>Start a fresh visitor</button></div></main>`;
}

function simpleScreen(heading, paras) {
  return `<header class="topbar"><div class="topbar__left"><button class="wordmark linkish" style="text-decoration:none" data-go="landing">Urban Sports Club</button></div><div></div>
    <div class="topbar__right"><button class="link-plain linkish" data-go="landing">Back to the journey</button></div></header>
    <main class="content" id="main"><h1 class="h-question" style="margin-top:14px" tabindex="-1">${esc(heading)}</h1>
    ${paras.map(p=>`<p class="lede" style="max-width:60ch;margin-top:12px">${p}</p>`).join('')}</main>`;
}
