/**
 * Urban Sports Club — Urby pilot server.
 *
 * Zero npm dependencies: Node's own http module plus its built-in SQLite.
 * Start it with `npm start` (or `node server.js`) and open http://localhost:3000
 *
 * Route map
 *   GET  /                      landing page
 *   POST /start                 identify by email, Google or Apple (demo), set consent
 *   GET  /fit                   Urby's next question  (?edit=<questionId> to change one)
 *   POST /answer                store an answer, then next question or the recommendation
 *   GET  /recommendation        venue matches + recommended plan + why
 *   POST /choose-plan           pick a different plan
 *   POST /choose-commitment     monthly vs 12-month
 *   GET  /details, POST /details
 *   GET  /payment,  POST /payment      (simulated — nothing is charged)
 *   GET  /confirmation
 *   GET  /exit                  "Before you go" outcome, records consent choice
 *   GET  /left                  progress-saved screen with the resume link
 *   GET  /resume/:token         resume a saved journey
 *   GET  /preview/email         follow-up email preview
 *   GET  /admin/journeys        journey data for the demo
 *   GET  /reset                 clear this browser's session
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';

import {
  createSession, getSession, getSessionByToken, updateSession,
  recordEvent, allSessions, eventCounts, latestIdentifiedSession
} from './src/db.js';
import { QUESTIONS, questionById, nextQuestion, isFitComplete, optionsFor } from './src/questions.js';
import { AREAS, matchVenues } from './src/venues.js';
import { recommend, provisionalPlan, planById, commitmentById } from './src/recommend.js';
import { acknowledge, interpretFreeText, phraseExplanation, aiState } from './src/ula.js';

import { landingPage } from './src/views/landing.js';
import { fitPage } from './src/views/fit.js';
import { recommendationPage } from './src/views/recommendation.js';
import { detailsPage } from './src/views/details.js';
import { paymentPage } from './src/views/payment.js';
import { confirmationPage } from './src/views/confirmation.js';
import { emailPreviewPage, emailUnavailablePage } from './src/views/emailPreview.js';
import { adminPage } from './src/views/admin.js';
import { leftPage, simplePage, notFoundPage, expiredLinkPage } from './src/views/misc.js';

const here = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(here, 'public');
const PORT = Number(process.env.PORT || 3000);
const COOKIE = 'usc_sid';

const STEP_LABELS = {
  landing: 'the landing page',
  fit: "Urby's questions",
  recommendation: 'your recommendation',
  details: 'your details',
  payment: 'the payment screen',
  converted: 'a completed signup'
};

/* ------------------------------------------------------------------ *
 * tiny helpers
 * ------------------------------------------------------------------ */

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header
      .split(';')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const i = p.indexOf('=');
        return i < 0 ? [p, ''] : [p.slice(0, i), decodeURIComponent(p.slice(i + 1))];
      })
  );
}

function html(res, body, status = 200, extraHeaders = {}) {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    ...extraHeaders
  });
  res.end(body);
}

function redirect(res, location, extraHeaders = {}) {
  res.writeHead(302, { location, 'cache-control': 'no-store', ...extraHeaders });
  res.end();
}

function sessionCookie(id) {
  return `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1e6) throw new Error('Request body too large');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  /* Checkboxes post the same name several times. Object.fromEntries would keep
     only the last one, which silently threw away every activity but one. */
  const params = new URLSearchParams(raw);
  const out = {};
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key);
    out[key] = all.length > 1 ? all : all[0];
    out[`${key}[]`] = all;
  }
  return out;
}

function baseUrl(req) {
  const host = req.headers.host || `localhost:${PORT}`;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return `${proto}://${host}`;
}

function validEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function firstOfNextMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);
}

/** Ensure a session exists; create one (capturing acquisition source) if not. */
function ensureSession(req, url) {
  const cookies = parseCookies(req);
  let session = getSession(cookies[COOKIE]);
  if (session) return { session, setCookie: null };

  const source = url.searchParams.get('utm_source') || url.searchParams.get('source') || null;
  const campaign = url.searchParams.get('utm_campaign') || url.searchParams.get('campaign') || null;
  session = createSession({ source, campaign });
  recordEvent(session.id, 'session_started', { source, campaign });
  return { session, setCookie: sessionCookie(session.id) };
}

function requireIdentified(session, res) {
  if (!session || !session.email) {
    redirect(res, '/');
    return false;
  }
  return true;
}

const aiBadge = () =>
  aiState.configured
    ? aiState.lastCallOk === false
      ? 'Urby’s AI layer is configured but unreachable right now — she is running on the built-in rules instead.'
      : 'Urby’s wording is AI-assisted. Her recommendation always comes from the product rules, never from the model.'
    : 'Urby is running on the built-in product rules. Set ANTHROPIC_API_KEY to enable the AI wording layer.';

/* ------------------------------------------------------------------ *
 * static files
 * ------------------------------------------------------------------ */

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

async function serveStatic(pathname, res) {
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(PUBLIC_DIR, safe);
  if (!filePath.startsWith(PUBLIC_DIR)) return false;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return false;
    const body = await readFile(filePath);
    res.writeHead(200, {
      'content-type': MIME[extname(filePath)] || 'application/octet-stream',
      'content-length': body.length,
      'cache-control': 'public, max-age=300'
    });
    res.end(body);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * shared page context
 * ------------------------------------------------------------------ */

function journeyContext(session) {
  const answers = session.answers || {};
  const match = matchVenues(answers);
  const provisional = provisionalPlan(answers, match);
  return { answers, match, provisional };
}

/* ------------------------------------------------------------------ *
 * router
 * ------------------------------------------------------------------ */

const server = createServer(async (req, res) => {
  const url = new URL(req.url, baseUrl(req));
  const path = url.pathname.replace(/\/+$/, '') || '/';

  try {
    if (req.method === 'GET' && (await serveStatic(path, res))) return;

    /* ---------- landing ---------- */
    if (path === '/' && req.method === 'GET') {
      const { session, setCookie } = ensureSession(req, url);
      if (session.last_step === 'landing') recordEvent(session.id, 'landing_viewed');
      const resumed = url.searchParams.get('resumed') === '1';
      const body = landingPage({ resumed, email: session.email || '' });
      return html(res, body, 200, setCookie ? { 'set-cookie': setCookie } : {});
    }

    /* ---------- identify ---------- */
    if (path === '/start' && req.method === 'POST') {
      const { session, setCookie } = ensureSession(req, url);
      const form = await readBody(req);
      const provider = form.provider;
      const marketing = form.marketing === 'yes';

      let email = (form.email || '').trim();
      let authMethod = 'email';

      if (provider === 'google' || provider === 'apple') {
        // Demo SSO: no live credentials in the pilot, so we mint a clearly fake identity.
        authMethod = provider;
        if (!validEmail(email)) email = `demo.${provider}.user@example.com`;
      } else if (!validEmail(email)) {
        const body = landingPage({ error: 'Please enter a valid email address so we can save your progress.', email });
        return html(res, body, 200, setCookie ? { 'set-cookie': setCookie } : {});
      }

      updateSession(session.id, {
        email,
        auth_method: authMethod,
        marketing_consent: marketing,
        consent_asked: true,
        last_step: 'fit'
      });
      recordEvent(session.id, 'identified', { authMethod, marketing });

      return redirect(res, '/fit', setCookie ? { 'set-cookie': setCookie } : {});
    }

    /* ---------- Urby's questions ---------- */
    if (path === '/fit' && req.method === 'GET') {
      const { session, setCookie } = ensureSession(req, url);
      if (!requireIdentified(session, res)) return;

      const editId = url.searchParams.get('edit');
      const question = editId ? questionById(editId) : nextQuestion(session.answers);

      if (!question) return redirect(res, '/recommendation', setCookie ? { 'set-cookie': setCookie } : {});

      updateSession(session.id, { last_step: 'fit' });
      const { answers, match, provisional } = journeyContext(session);

      const body = fitPage({
        question,
        answers,
        match,
        provisional,
        areas: AREAS,
        areaOptions: AREAS,
        ack: url.searchParams.get('ack') || null,
        editing: Boolean(editId),
        notUnderstood: url.searchParams.get('unclear') === '1',
        aiBadge: aiBadge()
      });
      return html(res, body, 200, setCookie ? { 'set-cookie': setCookie } : {});
    }

    if (path === '/answer' && req.method === 'POST') {
      const { session } = ensureSession(req, url);
      if (!requireIdentified(session, res)) return;

      const form = await readBody(req);
      const question = questionById(form.questionId);
      if (!question) return redirect(res, '/fit');

      const options = optionsFor(question, AREAS);
      const answers = { ...(session.answers || {}) };
      const rawText = (form.freeText || '').trim();
      let ackText = null;

      const chosen = (form['choice[]'] || []).filter((id) => options.some((o) => o.id === id));

      if (question.multi && chosen.length) {
        answers[question.id] = chosen;
        recordEvent(session.id, 'answer_given', { question: question.id, value: chosen, mode: 'choice' });
      } else if (!question.multi && chosen.length) {
        answers[question.id] = chosen[0];
        recordEvent(session.id, 'answer_given', { question: question.id, value: chosen[0], mode: 'choice' });
      } else if (rawText) {
        const interpreted = await interpretFreeText(question.id, rawText, options);
        if (!interpreted.optionId) {
          recordEvent(session.id, 'free_text_unclear', { question: question.id, text: rawText });
          return redirect(res, `/fit?edit=${question.id}&unclear=1`);
        }
        answers[question.id] = question.multi
          ? (interpreted.optionIds || [interpreted.optionId])
          : interpreted.optionId;
        answers._freeText = { ...(answers._freeText || {}), [question.id]: rawText };
        recordEvent(session.id, 'answer_given', {
          question: question.id,
          value: interpreted.optionId,
          mode: 'free_text',
          interpretedBy: interpreted.source,
          text: rawText
        });
        const ack = await acknowledge(question.id, interpreted.optionId, rawText);
        ackText = ack.text;
      } else {
        return redirect(res, `/fit?edit=${question.id}`);
      }

      updateSession(session.id, { answers });
      const updated = getSession(session.id);

      if (isFitComplete(updated.answers)) return redirect(res, '/recommendation');

      const query = ackText ? `?ack=${encodeURIComponent(ackText)}` : '';
      return redirect(res, `/fit${query}`);
    }

    /* ---------- recommendation ---------- */
    if (path === '/recommendation' && req.method === 'GET') {
      const { session, setCookie } = ensureSession(req, url);
      if (!requireIdentified(session, res)) return;
      if (!isFitComplete(session.answers)) return redirect(res, '/fit');

      const { answers, match } = journeyContext(session);
      const recommendation = recommend(answers, match);
      const phrased = await phraseExplanation(recommendation);

      const isFirstTime = !session.recommendation || session.recommendation.planId !== recommendation.planId;
      // If the visitor never overrode the plan, the choice follows the recommendation —
      // so changing an earlier answer visibly changes what they are about to buy.
      updateSession(session.id, {
        recommendation,
        last_step: 'recommendation',
        chosen_plan_id: session.plan_overridden ? session.chosen_plan_id : recommendation.planId
      });
      if (isFirstTime) {
        recordEvent(session.id, 'recommendation_shown', {
          planId: recommendation.planId,
          rules: recommendation.appliedRules,
          venueCount: match.venues.length
        });
      }

      const current = getSession(session.id);
      const body = recommendationPage({
        recommendation,
        explanation: phrased.text,
        answers,
        match,
        areas: AREAS,
        chosenPlanId: current.chosen_plan_id,
        commitmentId: current.commitment_id,
        aiBadge: aiBadge()
      });
      return html(res, body, 200, setCookie ? { 'set-cookie': setCookie } : {});
    }

    if (path === '/choose-plan' && req.method === 'POST') {
      const { session } = ensureSession(req, url);
      if (!requireIdentified(session, res)) return;
      const form = await readBody(req);
      if (planById(form.planId)) {
        const backToRecommended = session.recommendation && form.planId === session.recommendation.planId;
        updateSession(session.id, {
          chosen_plan_id: form.planId,
          plan_overridden: !backToRecommended
        });
        recordEvent(session.id, backToRecommended ? 'plan_reset_to_recommended' : 'plan_changed', {
          to: form.planId,
          recommended: session.recommendation ? session.recommendation.planId : null
        });
      }
      return redirect(res, '/recommendation');
    }

    if (path === '/choose-commitment' && req.method === 'POST') {
      const { session } = ensureSession(req, url);
      if (!requireIdentified(session, res)) return;
      const form = await readBody(req);
      const commitment = commitmentById(form.commitmentId);
      updateSession(session.id, { commitment_id: commitment.id });
      recordEvent(session.id, 'commitment_changed', { to: commitment.id });
      return redirect(res, '/recommendation');
    }

    /* ---------- details ---------- */
    if (path === '/details' && req.method === 'GET') {
      const { session, setCookie } = ensureSession(req, url);
      if (!requireIdentified(session, res)) return;
      if (!isFitComplete(session.answers)) return redirect(res, '/fit');

      updateSession(session.id, { last_step: 'details' });
      recordEvent(session.id, 'details_viewed');
      const body = detailsPage({
        plan: session.chosen_plan_id || (session.recommendation && session.recommendation.planId) || 'classic',
        commitmentId: session.commitment_id,
        details: session.details || { email: session.email },
        email: session.email
      });
      return html(res, body, 200, setCookie ? { 'set-cookie': setCookie } : {});
    }

    if (path === '/details' && req.method === 'POST') {
      const { session } = ensureSession(req, url);
      if (!requireIdentified(session, res)) return;
      const form = await readBody(req);

      const details = {
        firstName: (form.firstName || '').trim(),
        lastName: (form.lastName || '').trim(),
        email: (form.email || '').trim(),
        birthDate: (form.birthDate || '').trim(),
        phone: (form.phone || '').trim(),
        street: (form.street || '').trim(),
        postcode: (form.postcode || '').trim(),
        city: (form.city || '').trim()
      };

      const errors = {};
      if (!details.firstName) errors.firstName = 'We need your first name for the membership.';
      if (!details.lastName) errors.lastName = 'We need your last name for the membership.';
      if (!validEmail(details.email)) errors.email = 'Please check this email address.';
      if (!details.birthDate) errors.birthDate = 'Venues check age on entry, so this one is required.';
      if (!details.street) errors.street = 'Please add your street and number.';
      if (!/^\d{4,5}$/.test(details.postcode)) errors.postcode = 'Please enter a valid postcode.';
      if (!details.city) errors.city = 'Please add your city.';

      if (Object.keys(errors).length) {
        recordEvent(session.id, 'details_validation_failed', { fields: Object.keys(errors) });
        const body = detailsPage({
          plan: session.chosen_plan_id || 'classic',
          commitmentId: session.commitment_id,
          details,
          errors,
          email: session.email
        });
        return html(res, body, 200);
      }

      updateSession(session.id, {
        details,
        email: details.email,
        start_date: session.start_date || firstOfNextMonth(),
        last_step: 'payment'
      });
      recordEvent(session.id, 'details_completed');
      return redirect(res, '/payment');
    }

    /* ---------- payment ---------- */
    if (path === '/payment' && req.method === 'GET') {
      const { session, setCookie } = ensureSession(req, url);
      if (!requireIdentified(session, res)) return;
      if (!session.details) return redirect(res, '/details');

      updateSession(session.id, { last_step: 'payment' });
      recordEvent(session.id, 'payment_viewed');
      const body = paymentPage({
        planId: session.chosen_plan_id || 'classic',
        commitmentId: session.commitment_id,
        details: session.details,
        startDate: session.start_date || firstOfNextMonth()
      });
      return html(res, body, 200, setCookie ? { 'set-cookie': setCookie } : {});
    }

    if (path === '/payment' && req.method === 'POST') {
      const { session } = ensureSession(req, url);
      if (!requireIdentified(session, res)) return;
      if (!session.details) return redirect(res, '/details');

      const form = await readBody(req);
      const method = form.method === 'card' ? 'card' : 'sepa';

      // Simulated only. No payment provider is contacted and no card data is collected.
      updateSession(session.id, { payment_status: 'simulated_paid', last_step: 'converted' });
      recordEvent(session.id, 'payment_simulated', {
        method,
        planId: session.chosen_plan_id,
        commitment: session.commitment_id
      });
      recordEvent(session.id, 'converted', { planId: session.chosen_plan_id });
      return redirect(res, '/confirmation');
    }

    if (path === '/confirmation' && req.method === 'GET') {
      const { session, setCookie } = ensureSession(req, url);
      if (!requireIdentified(session, res)) return;
      if (session.payment_status !== 'simulated_paid') return redirect(res, '/payment');

      const body = confirmationPage({
        planId: session.chosen_plan_id || 'classic',
        commitmentId: session.commitment_id,
        details: session.details,
        startDate: session.start_date,
        email: session.email,
        marketingConsent: session.marketing_consent,
        resumeUrl: `${baseUrl(req)}/resume/${session.resume_token}`
      });
      return html(res, body, 200, setCookie ? { 'set-cookie': setCookie } : {});
    }

    /* ---------- leaving and coming back ---------- */
    if (path === '/exit' && req.method === 'GET') {
      const { session } = ensureSession(req, url);
      const choice = url.searchParams.get('consent');
      if (choice === 'yes') updateSession(session.id, { marketing_consent: true, consent_asked: true });
      if (choice === 'no') updateSession(session.id, { marketing_consent: false, consent_asked: true });
      recordEvent(session.id, 'exit_intent', { consent: choice, atStep: session.last_step });
      return redirect(res, '/left');
    }

    if (path === '/left' && req.method === 'GET') {
      const { session } = ensureSession(req, url);
      if (!requireIdentified(session, res)) return;
      const body = leftPage({
        resumeUrl: `${baseUrl(req)}/resume/${session.resume_token}`,
        marketingConsent: session.marketing_consent,
        email: session.email,
        lastStepLabel: STEP_LABELS[session.last_step] || session.last_step
      });
      return html(res, body, 200);
    }

    if (path.startsWith('/resume/') && req.method === 'GET') {
      const token = path.slice('/resume/'.length);
      const session = getSessionByToken(token);
      if (!session) return html(res, expiredLinkPage(), 404);

      updateSession(session.id, { returned_count: session.returned_count + 1 });
      recordEvent(session.id, 'returned', { returnNumber: session.returned_count + 1, toStep: session.last_step });

      const target =
        session.payment_status === 'simulated_paid'
          ? '/confirmation'
          : session.last_step === 'payment'
            ? '/payment'
            : session.last_step === 'details'
              ? '/details'
              : session.last_step === 'recommendation'
                ? '/recommendation'
                : isFitComplete(session.answers)
                  ? '/recommendation'
                  : session.email
                    ? '/fit'
                    : '/?resumed=1';

      return redirect(res, target, { 'set-cookie': sessionCookie(session.id) });
    }

    /* ---------- follow-up email preview ---------- */
    if (path === '/preview/email' && req.method === 'GET') {
      const cookies = parseCookies(req);
      const session = getSession(cookies[COOKIE]) || latestIdentifiedSession();
      if (!session || !session.email) return html(res, emailUnavailablePage(), 200);

      const { answers, match, provisional } = journeyContext(session);
      const body = emailPreviewPage({
        session,
        answers,
        areas: AREAS,
        provisional,
        marketingConsent: session.marketing_consent,
        resumeUrl: `${baseUrl(req)}/resume/${session.resume_token}`,
        lastStepLabel: STEP_LABELS[session.last_step] || session.last_step
      });
      recordEvent(session.id, 'followup_email_previewed');
      return html(res, body, 200);
    }

    /* ---------- journey data ---------- */
    if (path === '/admin/journeys' && req.method === 'GET') {
      const body = adminPage({ sessions: allSessions(200), counts: eventCounts(), areas: AREAS, aiState });
      return html(res, body, 200);
    }

    /* ---------- utilities and stubs ---------- */
    if (path === '/reset' && req.method === 'GET') {
      return redirect(res, '/', { 'set-cookie': `${COOKIE}=; Path=/; HttpOnly; Max-Age=0` });
    }

    if (path === '/login' && req.method === 'GET') {
      return html(
        res,
        simplePage({
          title: 'Log in',
          heading: 'Log in is out of scope for the pilot',
          paragraphs: [
            'Existing members would go to the current Urban Sports Club login. The pilot deliberately avoids creating a second authentication system.',
            'To see the new journey, <a href="/" style="text-decoration:underline">start as a new visitor</a>.'
          ]
        }),
        200
      );
    }

    if (path === '/legal/terms' || path === '/legal/privacy' || path === '/unsubscribe') {
      const map = {
        '/legal/terms': ['Terms', 'Terms and conditions'],
        '/legal/privacy': ['Privacy', 'Privacy policy'],
        '/unsubscribe': ['Unsubscribe', 'Unsubscribe']
      };
      const [title, heading] = map[path];
      return html(
        res,
        simplePage({
          title,
          heading: `${heading} — placeholder`,
          paragraphs: [
            'The pilot links to these pages so the consent and terms wording sits in the right place, but the real content comes from Legal.',
            'What the pilot does implement: marketing consent is captured separately from accepting the Terms, it is stored per visitor, and the follow-up email only includes marketing content when consent was given.'
          ]
        }),
        200
      );
    }

    /* ---------- 404 ---------- */
    return html(res, notFoundPage(), 404);
  } catch (err) {
    console.error(`[error] ${req.method} ${req.url}`, err);
    return html(
      res,
      simplePage({
        title: 'Something went wrong',
        heading: 'Something went wrong',
        paragraphs: [
          'The pilot hit an unexpected error. Your saved progress is untouched.',
          `<code>${String(err.message).replace(/[<>&]/g, '')}</code>`
        ]
      }),
      500
    );
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  Urban Sports Club — Urby pilot');
  console.log(`  → http://localhost:${PORT}`);
  console.log('');
  console.log(`  Urby language layer: ${aiState.configured ? 'AI enabled' : 'product rules only (set ANTHROPIC_API_KEY to enable AI wording)'}`);
  console.log(`  Questions: ${QUESTIONS.length}   Venues: sample Berlin dataset   Payment: simulated`);
  console.log('');
});
