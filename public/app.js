/* Urban Sports Club — Urby pilot
   All progressive enhancement. Every screen works without this file:
   the option cards are real radio inputs and every action is a form submit. */

(function () {
  'use strict';

  /* --- option cards: reflect the checked radio -------------------------- */
  document.querySelectorAll('[data-option-group], .options').forEach(function (group) {
    group.addEventListener('change', function (event) {
      if (!event.target.matches('input[type="radio"]')) return;
      var name = event.target.name;
      group.querySelectorAll('input[type="radio"][name="' + name + '"]').forEach(function (input) {
        var card = input.closest('.option-card');
        if (card) card.classList.toggle('is-selected', input.checked);
      });
    });

    // Selecting with the keyboard should also work with Enter.
    group.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter') return;
      var card = event.target.closest('.option-card');
      if (!card) return;
      var input = card.querySelector('input[type="radio"]');
      if (input && !input.checked) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        event.preventDefault();
      }
    });
  });

  /* --- "Your fit so far" collapsible on mobile ------------------------- */
  var fitToggle = document.querySelector('[data-toggle-fitpanel]');
  var fitContents = document.getElementById('fitpanel-contents');
  if (fitToggle && fitContents) {
    fitToggle.addEventListener('click', function () {
      var open = fitContents.classList.toggle('is-open');
      fitToggle.setAttribute('aria-expanded', String(open));
    });
  }

  /* --- free-text field on mobile --------------------------------------- */
  var freeToggle = document.querySelector('[data-toggle-freetext]');
  var freeField = document.querySelector('[data-freetext]');
  if (freeToggle && freeField) {
    freeToggle.addEventListener('click', function () {
      freeField.classList.add('is-open');
      freeToggle.style.display = 'none';
      var input = freeField.querySelector('input');
      if (input) input.focus();
    });
  }

  /* --- exit / consent modal -------------------------------------------- */
  var modal = document.getElementById('exit-modal');
  var lastFocused = null;
  function openModal() {
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.hidden = false;
    var focusable = modal.querySelector('a, button');
    if (focusable) focusable.focus();
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }
  document.querySelectorAll('[data-open-exit]').forEach(function (el) {
    el.addEventListener('click', openModal);
  });
  document.querySelectorAll('[data-close-exit]').forEach(function (el) {
    el.addEventListener('click', closeModal);
  });
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });
  }

  /* --- Urby demo section on the landing page ---------------------------- */
  var demoGroup = document.getElementById('ula-demo-options');
  var demoAnswer = document.getElementById('ula-demo-answer');
  if (demoGroup && demoAnswer) {
    demoGroup.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-demo-answer]');
      if (!btn) return;
      demoGroup.querySelectorAll('.option-card').forEach(function (c) {
        c.classList.remove('is-selected');
      });
      btn.classList.add('is-selected');
      demoAnswer.textContent = btn.getAttribute('data-demo-answer');
      demoAnswer.classList.add('is-visible');
    });
  }

  /* --- keep the two Continue buttons (desktop + sticky) in sync -------- */
  var form = document.getElementById('answer-form');
  if (form) {
    form.addEventListener('submit', function () {
      form.querySelectorAll('[data-continue]').forEach(function (b) {
        b.disabled = true;
        b.textContent = 'One moment…';
      });
    });
  }
})();
