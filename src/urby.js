/**
 * Urby's language layer.
 *
 * Urby has a narrow job here. She may:
 *   - acknowledge an answer in one short sentence
 *   - map a free-text answer onto one of the quick choices
 *   - rephrase an explanation that the rules engine already produced
 *
 * She may NOT choose a plan, invent a price, invent a venue, or state a membership rule.
 * Those come from data/plans.json, data/venues.json and src/recommend.js only.
 *
 * If ANTHROPIC_API_KEY is not set, or the call fails, or it takes too long, every function
 * here falls back to a deterministic result and the journey continues unchanged. The demo
 * never hangs waiting on a model.
 */

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.URBY_MODEL || process.env.ULA_MODEL || 'claude-sonnet-4-5';
const TIMEOUT_MS = Number(process.env.URBY_TIMEOUT_MS || process.env.ULA_TIMEOUT_MS || 3500);

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Tracks the last known state of the AI layer so the UI can show an honest badge. */
export const aiState = { configured: aiConfigured(), lastCallOk: null, lastError: null };

async function callClaude(system, userMessage, maxTokens = 200) {
  if (!aiConfigured()) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: userMessage }]
      })
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
    const json = await res.json();
    const text = (json.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    aiState.lastCallOk = true;
    aiState.lastError = null;
    return text || null;
  } catch (err) {
    aiState.lastCallOk = false;
    aiState.lastError = err.message;
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ *
 * 1. Acknowledgement line after an answer
 * ------------------------------------------------------------------ */

const ACK_FALLBACK = {
  goal: {
    move_more: "Great — I'll find nearby activities that fit your routine.",
    unwind: "Good to know — I'll look for calmer places to reset.",
    try_new: "Nice — I'll look for a mix you haven't tried yet."
  },
  activities: {
    _default: "Got it — I'll count the places near you for each of those."
  },
  area: { _default: "Thanks — I'm searching there now." },
  frequency: {
    once: "That helps — I'll match a plan to one session a week.",
    twice: "That helps — twice a week is a good rhythm.",
    often: "That helps — I'll look at plans built for frequent visits.",
    daily: "That helps — I'll look at our widest access."
  }
};

export function acknowledgeFallback(questionId, answerId) {
  if (questionId === 'goal' && Array.isArray(answerId)) {
    const list = answerId.filter((x) => x && x !== '__skip');
    if (!list.length) return 'No problem — we can work it out as we go.';
    if (list.length === 1) return (ACK_FALLBACK.goal || {})[list[0]] || "Great — I'll find nearby activities that fit your routine.";
    if (list.includes('move_more') && list.includes('unwind') && list.includes('try_new')) {
      return 'The full package — active workouts, calming recovery, and plenty of new sports to try.';
    }
    if (list.includes('move_more') && list.includes('unwind')) {
      return 'Love that balance — active movement combined with time to recharge.';
    }
    if (list.includes('move_more') && list.includes('try_new')) {
      return 'Great combination — high-energy training with fresh sports to explore.';
    }
    if (list.includes('unwind') && list.includes('try_new')) {
      return 'Wonderful — calming spaces paired with novel activities to discover.';
    }
    return "Great choices — I'll tailor the recommendations to everything you're looking for.";
  }
  const forQuestion = ACK_FALLBACK[questionId] || {};
  return forQuestion[answerId] || forQuestion._default || 'Thanks — noted.';
}

export async function acknowledge(questionId, answerId, freeText = null) {
  const fallback = acknowledgeFallback(questionId, answerId);
  if (!aiConfigured() || !freeText) return { text: fallback, source: 'rules' };

  const text = await callClaude(
    [
      'You are Urby, a membership guide for Urban Sports Club.',
      'Write ONE short sentence (max 16 words) acknowledging what the visitor just told you.',
      'Warm, plain, useful. No emoji. No exclamation stacking.',
      'Never mention prices, plan names, venue names, or membership rules. Never promise anything.',
      'Return only the sentence.'
    ].join(' '),
    `The visitor was asked "${questionId}" and wrote: "${freeText}"`,
    80
  );

  if (!text || text.length > 160 || /\d\s*€|€\s*\d|\bEUR\b/i.test(text)) {
    return { text: fallback, source: 'rules' };
  }
  return { text: stripQuotes(text), source: 'ai' };
}

/* ------------------------------------------------------------------ *
 * 2. Mapping free text onto a quick choice
 * ------------------------------------------------------------------ */

const KEYWORDS = {
  goal: {
    move_more: ['move', 'fit', 'fitter', 'strong', 'strength', 'cardio', 'active', 'shape', 'weight', 'run', 'gym', 'muscle', 'energy'],
    unwind: ['unwind', 'relax', 'stress', 'calm', 'sleep', 'yoga', 'stretch', 'recover', 'sauna', 'swim', 'quiet', 'mind', 'burnout'],
    try_new: ['new', 'try', 'different', 'variety', 'explore', 'bored', 'climb', 'dance', 'box', 'discover', 'experiment']
  },
  /* One entry per activity group. Free text here can name several things at once
     ("swim and sauna"), so interpretFallback returns every group it recognises. */
  activities: {
    gym: ['gym', 'weights', 'strength', 'lift', 'lifting', 'crossfit', 'hyrox', 'hiit', 'functional', 'fit', 'fitter', 'stronger', 'muscle'],
    yoga: ['yoga', 'pilates', 'barre', 'meditation', 'stretch', 'mobility', 'reformer', 'calm'],
    swim: ['swim', 'swimming', 'pool', 'lanes', 'lane', 'aqua'],
    spa: ['sauna', 'spa', 'steam', 'thermal', 'massage', 'wellness', 'hot tub'],
    climb: ['climb', 'climbing', 'boulder', 'bouldering', 'wall'],
    fight: ['box', 'boxing', 'martial', 'mma', 'kickbox', 'judo', 'karate', 'muay', 'sparring'],
    dance: ['dance', 'dancing', 'ballet', 'salsa', 'pole', 'contemporary'],
    cycle: ['cycling', 'spin', 'spinning', 'bike', 'indoor cycling', 'rpm']
  },
  frequency: {
    once: ['once', '1x', 'one time', 'one session', 'weekly'],
    twice: ['twice', '2x', 'two times', 'two sessions', 'couple'],
    often: ['three', '3x', 'four', '4x', 'few times', 'several'],
    daily: ['five', '5x', 'six', 'seven', 'daily', 'every day', 'each day']
  }
};

/** Berlin postcode prefixes → sample areas, so a postcode answer resolves sensibly. */
const POSTCODES = {
  '12043': 'neukoelln', '12045': 'neukoelln', '12047': 'neukoelln', '12049': 'neukoelln', '12053': 'neukoelln',
  '10997': 'kreuzberg', '10999': 'kreuzberg', '10961': 'kreuzberg', '10965': 'kreuzberg', '10967': 'kreuzberg',
  '10117': 'mitte', '10178': 'mitte', '10179': 'mitte', '10115': 'mitte', '10119': 'mitte',
  '10435': 'prenzlauer-berg', '10437': 'prenzlauer-berg', '10439': 'prenzlauer-berg', '10405': 'prenzlauer-berg',
  '10243': 'friedrichshain', '10245': 'friedrichshain', '10247': 'friedrichshain', '10249': 'friedrichshain',
  '10707': 'charlottenburg', '10711': 'charlottenburg', '10719': 'charlottenburg', '10585': 'charlottenburg',
  '10777': 'schoeneberg', '10779': 'schoeneberg', '10827': 'schoeneberg', '10829': 'schoeneberg',
  '13347': 'wedding', '13353': 'wedding', '13355': 'wedding', '13357': 'wedding'
};

export function interpretFallback(questionId, text, options = []) {
  const lower = (text || '').toLowerCase();

  /* Multi-select: return every group the text names, not just the best one.
     "I want to swim and use a sauna" is two answers, and treating it as one
     throws away half of what the visitor said. */
  if (questionId === 'activities') {
    const map = KEYWORDS.activities || {};
    const hits = Object.entries(map)
      .filter(([, words]) => words.some((w) => lower.includes(w)))
      .map(([id]) => id);
    const allowed = options.length ? new Set(options.map((o) => o.id)) : null;
    const ids = allowed ? hits.filter((id) => allowed.has(id)) : hits;
    return ids.length ? { optionIds: ids, optionId: ids[0], source: 'keywords' } : { optionId: null, source: 'none' };
  }

  if (questionId === 'area') {
    const pc = lower.match(/\b(\d{5})\b/);
    if (pc && POSTCODES[pc[1]]) return { optionId: POSTCODES[pc[1]], source: 'postcode' };
    const byName = options.find((o) => lower.includes(o.label.toLowerCase().replace('ö', 'o')) || lower.includes(o.label.toLowerCase()));
    if (byName) return { optionId: byName.id, source: 'name' };
    return { optionId: null, source: 'none' };
  }

  const map = KEYWORDS[questionId] || {};
  let best = { optionId: null, hits: 0 };
  for (const [optionId, words] of Object.entries(map)) {
    const hits = words.filter((w) => lower.includes(w)).length;
    if (hits > best.hits) best = { optionId, hits };
  }
  return { optionId: best.hits > 0 ? best.optionId : null, source: best.hits > 0 ? 'keywords' : 'none' };
}

export async function interpretFreeText(questionId, text, options = []) {
  const fallback = interpretFallback(questionId, text, options);
  if (!aiConfigured()) return { ...fallback, usedAi: false };

  const list = options.map((o) => `${o.id} = ${o.label}`).join('; ');
  const answer = await callClaude(
    [
      'You classify a visitor\'s free-text answer onto exactly one predefined option id.',
      'Reply with only the option id, or the word NONE if no option is a reasonable fit.',
      'Do not explain.'
    ].join(' '),
    `Options: ${list}\n\nVisitor wrote: "${text}"\n\nOption id:`,
    20
  );

  if (!answer) return { ...fallback, usedAi: false };
  const cleaned = answer.trim().toLowerCase().replace(/[^a-z_-]/g, '');
  const match = options.find((o) => o.id === cleaned);
  if (!match) return { ...fallback, usedAi: true };
  return { optionId: match.id, source: 'ai', usedAi: true };
}

/* ------------------------------------------------------------------ *
 * 3. Rephrasing the rules-based explanation
 * ------------------------------------------------------------------ */

export async function phraseExplanation(recommendation) {
  const base = recommendation.explanation;
  if (!aiConfigured()) return { text: base, source: 'rules' };

  const text = await callClaude(
    [
      'You are Urby, a membership guide for Urban Sports Club.',
      'Rewrite the given explanation so it reads naturally and kindly, in at most two short sentences.',
      'You may only use facts already present in the text. Do not add or change any number, price, plan name, venue name or rule.',
      'No emoji. Return only the rewritten explanation.'
    ].join(' '),
    base,
    200
  );

  if (!text) return { text: base, source: 'rules' };

  // Guardrail: reject anything that introduces a number the rules did not state.
  const originalNumbers = new Set((base.match(/\d+/g) || []));
  const newNumbers = (text.match(/\d+/g) || []);
  const inventedNumber = newNumbers.some((n) => !originalNumbers.has(n));
  if (inventedNumber || !text.includes(recommendation.planName)) {
    return { text: base, source: 'rules' };
  }
  return { text: stripQuotes(text), source: 'ai' };
}

function stripQuotes(s) {
  return s.replace(/^["'“”]+|["'“”]+$/g, '').trim();
}
