    <div class="btn-row"><button class="btn btn--primary" data-go="landing">Start the journey</button></div></div></div>`;
  return `<div class="email-page">
    <div style="max-width:620px;margin:0 auto 18px"><p class="small muted" style="margin:0 0 6px">Preview of the follow-up email · nothing is actually sent</p>
      <p class="xsmall muted" style="margin:0">Marketing consent: <strong>${S.marketing?'given':'not given'}</strong>. ${S.marketing?'Offers and inspiration may be included.':'Only the transactional message would be sent — no offers.'}</p></div>
    <div class="email-card">
      <div class="email-hero"><div class="email-hero__photo"><img src="${IMG['/images/email-header.jpg']}" alt=""></div>
        <div class="email-hero__inner"><span class="wordmark">Urban Sports Club</span><h1>Your next move is waiting</h1></div></div>
      <div class="email-body">
        <p>Hi ${esc(cap(first))},</p>
        <p>${goal&&goal!=='Not sure yet'?`Thanks for telling us you want to ${esc(goal.toLowerCase())}.`:'Thanks for starting to look around.'} Urby has saved your answers${area?` and found options ${area==='Anywhere in Berlin'?'across Berlin':'close to '+esc(area)}`:''}.</p>
        ${acts&&acts!=='Not sure yet'?`<p>You said you&rsquo;d do <strong>${esc(acts.toLowerCase())}</strong> — that is exactly what we counted places for.</p>`:''}
        <p>${S.paid?'Your membership is set up — this is what the reminder would have looked like if you had left before finishing.':'Pick up where you left off. There&rsquo;s just a step or two left.'}</p>
        <div class="email-facts"><h3>Your fit so far</h3>
          ${rows.map(r=>`<div class="email-facts__row">${icon(r.i,20)}<span><strong>${esc(r.l)}</strong> · ${esc(r.v)}</span></div>`).join('')}</div>
        <button class="btn btn--primary btn--block" data-go="${S.paid?'confirmation':'recommendation'}">Continue where you left off</button>
        <p class="small muted" style="margin-top:16px">Your answers are saved. You&rsquo;ll return exactly where you left off.</p></div>
      <div class="email-footer">Urban Sports Club · Privacy · Help
        ${S.marketing?'<div style="margin-top:8px">You receive this because you asked us to email you.</div>':''}</div></div>
    <div style="max-width:620px;margin:26px auto 0"><button class="btn btn--secondary btn--block" data-go="data">Journey data</button></div></div>`;
}

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
