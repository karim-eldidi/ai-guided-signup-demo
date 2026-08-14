import { page, esc, wordmark } from './layout.js';
import { icon } from './icons.js';
import { QUESTIONS, answerLabel } from '../questions.js';

/**
 * Journey data for the demo.
 *
 * This is the part that turns the concept into a measurable experiment: source and
 * campaign, every completed step, the answers given, the recommendation shown,
 * where the visitor left, whether they came back, and whether they converted.
 */
export function adminPage({ sessions, counts, areas, aiState }) {
  const funnelOrder = ['landing', 'fit', 'recommendation', 'details', 'payment', 'converted'];
  const funnel = funnelOrder.map((step) => ({
    step,
    count: sessions.filter((s) => reachedAtLeast(s, step, funnelOrder)).length
  }));

  const maxCount = Math.max(1, ...funnel.map((f) => f.count));

  const funnelRows = funnel
    .map(
      (f) => `<div style="display:flex;align-items:center;gap:14px;margin-bottom:9px">
        <span class="xsmall" style="width:120px;text-transform:capitalize">${esc(f.step)}</span>
        <span style="flex:1 1 auto;height:22px;background:var(--cream);border-radius:4px;overflow:hidden">
          <span style="display:block;height:100%;width:${(f.count / maxCount) * 100}%;background:var(--ink)"></span>
        </span>
        <span class="xsmall strong" style="width:34px;text-align:right">${f.count}</span>
      </div>`
    )
    .join('');

  const rows = sessions
    .map((s) => {
      const answerSummary = QUESTIONS.map((q) => {
        const label = answerLabel(q.id, s.answers[q.id], areas);
        return label ? `${q.summaryLabel}: ${label}` : null;
      })
        .filter(Boolean)
        .join(' · ');

      const status =
        s.payment_status === 'simulated_paid'
          ? '<span class="badge badge--ok">Converted</span>'
          : `<span class="badge badge--grey">${esc(s.last_step)}</span>`;

      return `<tr>
        <td><code>${esc(s.id.slice(0, 8))}</code></td>
        <td>${esc(s.email || '—')}<div class="xsmall muted">${esc(s.auth_method || '')}</div></td>
        <td>${esc(s.source || 'direct')}<div class="xsmall muted">${esc(s.campaign || '')}</div></td>
        <td>${status}</td>
        <td>${s.marketing_consent ? 'Yes' : 'No'}</td>
        <td class="xsmall">${esc(answerSummary || '—')}</td>
        <td class="xsmall">${s.recommendation ? `${esc(s.recommendation.planName)} · ${esc((s.recommendation.appliedRules || []).join(', '))}` : '—'}</td>
        <td class="xsmall">${s.chosen_plan_id ? esc(s.chosen_plan_id) : '—'}</td>
        <td style="text-align:center">${s.returned_count}</td>
        <td class="xsmall">${esc(new Date(s.updated_at).toLocaleString('en-GB'))}</td>
      </tr>`;
    })
    .join('');

  const eventRows = counts
    .map((c) => `<tr><td><code>${esc(c.name)}</code></td><td style="text-align:right">${c.count}</td></tr>`)
    .join('');

  const body = `
<header class="topbar"><div class="topbar__left">${wordmark()}<div class="xsmall muted">Pilot journey data</div></div>
<div></div><div class="topbar__right"><a class="link-plain" href="/">Back to the journey</a></div></header>

<main class="content" style="max-width:1280px" id="main">
  <div class="notice notice--grey">
    ${icon('info', 19)}
    <span>Everything here is logged locally by the pilot for demonstration. Urby language layer:
      <strong>${aiState.configured ? 'AI configured' : 'rules only (no API key set)'}</strong>${
        aiState.configured && aiState.lastCallOk === false ? ` — last call failed, falling back to rules` : ''
      }.</span>
  </div>

  <div class="card">
    <div class="fitpanel__label">Journey funnel (${sessions.length} visitor${sessions.length === 1 ? '' : 's'})</div>
    ${funnelRows}
  </div>

  <div class="card">
    <div class="fitpanel__label">Visitors</div>
    <div style="overflow-x:auto">
      <table class="table">
        <thead><tr>
          <th>Session</th><th>Identity</th><th>Source</th><th>Status</th><th>Marketing</th>
          <th>Answers</th><th>Recommended (rules fired)</th><th>Chosen</th><th>Returns</th><th>Updated</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="10" class="muted">No visitors yet. Walk the journey once and refresh.</td></tr>'}</tbody>
      </table>
    </div>
  </div>

  <div class="card">
    <div class="fitpanel__label">Events</div>
    <table class="table" style="max-width:420px">
      <thead><tr><th>Event</th><th style="text-align:right">Count</th></tr></thead>
      <tbody>${eventRows || '<tr><td colspan="2" class="muted">No events yet.</td></tr>'}</tbody>
    </table>
  </div>

  <div class="btn-row">
    <a class="btn btn--secondary" href="/preview/email">Follow-up email preview</a>
    <a class="btn btn--secondary" href="/reset">Start a fresh visitor</a>
  </div>
</main>`;

  return page({ title: 'Journey data', body, showBanner: false });
}

function reachedAtLeast(session, step, order) {
  const reached = session.payment_status === 'simulated_paid' ? 'converted' : session.last_step;
  return order.indexOf(reached) >= order.indexOf(step);
}
