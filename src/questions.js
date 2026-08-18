/**
 * Urby's question set.
 *
 * One question at a time. Each has quick choices plus an optional free-text answer.
 * Editing this file is the only thing needed to change, reorder, add or remove a question —
 * the conversation screen, the "Your fit so far" panel and the resume logic all read from here.
 */

import { availableGroups, groupById } from './activities.js';
import { VENUES } from './venues.js';

export const QUESTIONS = [
  {
    id: 'goal',
    prompt: 'What would you love to do more of?',
    hint: 'Pick one or more that fit what you want.',
    summaryLabel: 'Goal',
    icon: 'target',
    multi: true,
    allowFreeText: true,
    freeTextPlaceholder: 'Or tell Urby in your own words…',
    options: [
      { id: 'move_more', label: 'Move more', echo: 'I want to move more', icon: 'bolt' },
      { id: 'unwind', label: 'Unwind', echo: 'I want to unwind', icon: 'leaf' },
      { id: 'try_new', label: 'Try something new', echo: 'I want to try something new', icon: 'sparkle' }
    ]
  },
  {
    /* The concrete question the old "what would make it easier?" was dancing around.
       Multi-select, because nobody does exactly one thing — and because the answer
       is what makes the recommendation checkable: these are the activities we then
       count venues for, plan by plan. */
    id: 'activities',
    prompt: 'What would you like to do?',
    hint: 'Pick as many as you like — I’ll count the places near you for each one.',
    summaryLabel: 'Activities',
    icon: 'grid',
    multi: true,
    allowFreeText: true,
    freeTextPlaceholder: 'Or tell Urby in your own words…',
    optionsFrom: 'activityGroups'
  },
  {
    id: 'area',
    prompt: 'Where should we search?',
    summaryLabel: 'Area',
    icon: 'pin',
    allowFreeText: true,
    freeTextPlaceholder: 'Postcode or neighbourhood…',
    // Options are generated from data/venues.json areas at request time.
    optionsFrom: 'areas'
  },
  {
    id: 'frequency',
    prompt: 'How often would you realistically like to go?',
    summaryLabel: 'Frequency',
    icon: 'calendar',
    allowFreeText: true,
    freeTextPlaceholder: 'Or tell Urby in your own words…',
    options: [
      { id: 'once', label: 'About once a week', echo: 'About once a week', icon: 'one' },
      { id: 'twice', label: 'Twice a week', echo: 'Twice a week', icon: 'two' },
      { id: 'often', label: 'Three or four times a week', echo: 'Three or four times a week', icon: 'three' },
      { id: 'daily', label: 'Five times a week or more', echo: 'Five times a week or more', icon: 'four' }
    ]
  }
];

export function questionById(id) {
  return QUESTIONS.find((q) => q.id === id) || null;
}

/** An answer counts as given when it is truthy — and, for multi-select, non-empty. */
export function isAnswered(value) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

/** The first question that has no answer yet, or null when the flow is complete. */
export function nextQuestion(answers = {}) {
  return QUESTIONS.find((q) => !isAnswered(answers[q.id])) || null;
}

export function isFitComplete(answers = {}) {
  return QUESTIONS.every((q) => isAnswered(answers[q.id]));
}

export function answeredCount(answers = {}) {
  return QUESTIONS.filter((q) => isAnswered(answers[q.id])).length;
}

/**
 * Resolve an answer value to a human-readable label.
 * Free-text answers are stored as { freeText: '...' } and shown verbatim.
 */
export function answerLabel(questionId, value, areas = []) {
  if (!isAnswered(value)) return null;
  if (Array.isArray(value)) {
    const q = questionById(questionId);
    const opts = q ? optionsFor(q, areas) : [];
    const names = value.map((id) => (groupById(id) || opts.find((o) => o.id === id) || {}).label).filter(Boolean);
    return names.length ? listWords(names) : null;
  }
  if (typeof value === 'object' && value.freeText) return value.freeText;
  const q = questionById(questionId);
  if (!q) return String(value);
  if (q.optionsFrom === 'areas') {
    const area = areas.find((a) => a.id === value);
    return area ? area.name : String(value);
  }
  const opt = (q.options || []).find((o) => o.id === value);
  return opt ? opt.label : String(value);
}

export function answerEcho(questionId, value, areas = []) {
  if (!isAnswered(value)) return null;
  if (Array.isArray(value)) {
    const q = questionById(questionId);
    const opts = q ? optionsFor(q, areas) : [];
    if (questionId === 'area') {
      const n = value.map((id) => (opts.find((x) => x.id === id) || {}).label).filter(Boolean);
      return n.length ? `I'd look around ${listWords(n)}` : null;
    }
    if (questionId === 'goal') {
      const n = value.map((id) => (opts.find((x) => x.id === id) || {}).echo || (opts.find((x) => x.id === id) || {}).label).filter(Boolean);
      return n.length ? listWords(n) : null;
    }
    const names = value.map((id) => (groupById(id) || {}).short).filter(Boolean);
    return names.length ? `I'd do ${listWords(names)}` : null;
  }
  if (typeof value === 'object' && value.freeText) return value.freeText;
  const q = questionById(questionId);
  if (q && q.optionsFrom === 'areas') {
    const area = areas.find((a) => a.id === value);
    return area ? `I'm looking around ${area.name}` : String(value);
  }
  const opt = q && (q.options || []).find((o) => o.id === value);
  return opt ? opt.echo || opt.label : String(value);
}

/** Options for a question, injecting area options from the venue dataset. */
export function optionsFor(question, areas = []) {
  if (question.optionsFrom === 'areas') {
    return areas.map((a) => ({ id: a.id, label: a.name, echo: `I'm looking around ${a.name}`, icon: 'pin' }));
  }
  if (question.optionsFrom === 'activityGroups') {
    return availableGroups(VENUES).map((g) => ({ id: g.id, label: g.label, echo: `I'd do ${g.short}`, icon: g.icon }));
  }
  return question.options || [];
}

function listWords(items) {
  if (items.length <= 1) return items[0] || '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
