import { page, esc, topbar, ulaRow, exitModal } from './layout.js';
import { icon } from './icons.js';
import { fitPanel } from './fitpanel.js';
import { QUESTIONS, optionsFor, answerEcho } from '../questions.js';

/**
 * The Urby conversation screen — one question at a time, quick choices plus free text.
 */
export function fitPage({
  question,
  answers,
  match,
  provisional,
  areas,
  areaOptions,
  ack = null,
  editing = false,
  notUnderstood = false,
  aiBadge = null
}) {
  const options = optionsFor(question, areaOptions);
  const answeredIds = QUESTIONS.filter((q) => answers[q.id]).map((q) => q.id);
  const lastAnswered = answeredIds.length ? answeredIds[answeredIds.length - 1] : null;
  const echo = lastAnswered ? answerEcho(lastAnswered, answers[lastAnswered], areas) : null;
  const current = answers[question.id] || null;

  /* A multi-select question is real checkboxes, so it still works with no
     JavaScript — same as every other action in this app. */
  const chosen = Array.isArray(current) ? current : current ? [current] : [];
  const optionCards = options
    .map((o) => {
      const checked = chosen.includes(o.id) ? 'checked' : '';
      const selected = chosen.includes(o.id) ? 'is-selected' : '';
      return `<label class="option-card ${selected}">
        <input type="${question.multi ? 'checkbox' : 'radio'}" name="choice" value="${esc(o.id)}" ${checked} style="position:absolute;opacity:0;width:0;height:0">
        <span class="option-card__icon">${icon(o.icon || 'grid', 21)}</span>
        <span class="option-card__label">${esc(o.label)}</span>
        <span class="option-card__check">${icon('checkThin', 17)}</span>
      </label>`;
    })
    .join('');

  const main = `<main class="two-col__main" id="main">
    ${
      echo && !editing
        ? `${ulaRow()}<div class="bubble">${esc(echo)}</div>`
        : ''
    }
    ${ack ? `<div class="notice">${icon('sparkle', 19)}<span>${esc(ack)}</span></div>` : ''}
    ${
      notUnderstood
        ? `<div class="notice notice--grey">${icon('info', 19)}<span>I didn&rsquo;t quite catch that one — could you pick the closest option below? You can always change it later.</span></div>`
        : ''
    }

    ${ulaRow()}
    <form method="POST" action="/answer" id="answer-form">
      <input type="hidden" name="questionId" value="${esc(question.id)}">
      <h1 class="h-question">${esc(question.prompt)}</h1>

      <div class="options ${options.length > 4 ? 'options--compact' : ''}" data-option-group>${optionCards}</div>

      <div class="btn-row desktop-cta">
        <button class="btn btn--primary btn--block" type="submit" data-continue>Continue</button>
      </div>

      <button class="mobile-freetext-toggle" type="button" data-toggle-freetext>
        ${icon('speech', 20)} Answer in my own words
      </button>

      <div class="freetext" data-freetext>
        ${icon('speech', 20)}
        <input type="text" name="freeText" placeholder="${esc(question.freeTextPlaceholder || 'Or tell Urby in your own words…')}"
               aria-label="Answer in your own words" autocomplete="off">
        <button type="submit" data-freetext-submit>Send</button>
      </div>

      ${
        editing
          ? `<p class="small muted" style="margin-top:18px">You&rsquo;re changing an earlier answer. Your recommendation updates as soon as you continue.</p>`
          : ''
      }

      <div class="sticky-cta">
        <button class="btn btn--primary btn--block" type="submit" data-continue>Continue</button>
      </div>
    </form>

    ${aiBadge ? `<p class="xsmall muted ai-badge">${esc(aiBadge)}</p>` : ''}
  </main>`;

  const body = `
${topbar({ step: 1, savedNote: true })}
<div class="two-col">
  ${main}
  ${fitPanel({
    answers,
    match,
    provisional,
    areas,
    answeredCount: answeredIds.length,
    totalQuestions: QUESTIONS.length
  })}
</div>
${exitModal({ consentAlreadyGiven: false })}
`;

  return page({ title: question.prompt, body });
}
