/**
 * Opened straight from disk (file://) browsers block ES modules and fetch, so
 * the JSON-driven products, reviews and site details can never render and the
 * pages sit on their "Loading…" placeholders forever.
 *
 * This file is deliberately a classic script (no `type="module"`) so it still
 * runs in that situation and explains how to start the local server instead of
 * leaving a page that looks broken.
 */
(function () {
  if (window.location.protocol !== 'file:') return;

  var target = document.querySelector('main') || document.body;
  if (!target) return;

  var wrapper = document.createElement('div');
  wrapper.className = 'container';
  wrapper.innerHTML =
    '<div class="notice notice--warning" role="alert">' +
    '<h2 class="notice__title">Start the local server to see this content</h2>' +
    '<p>You opened this page directly from disk (<code>file://</code>). Browsers block the ' +
    'JSON data files and scripts this site relies on in that mode, so products and reviews ' +
    'stay on “Loading…”.</p>' +
    '<p>Double-click <code>serve.cmd</code> in the project folder, or run ' +
    '<code>python -m http.server 8000</code> there, then open ' +
    '<a href="http://localhost:8000/">http://localhost:8000/</a>.</p>' +
    '</div>';

  target.insertBefore(wrapper, target.firstChild);

  // Nothing can replace these placeholders in file:// mode, so drop them rather
  // than leaving "Loading…" on screen underneath the notice.
  var statuses = document.querySelectorAll('[data-results-summary]');
  Array.prototype.forEach.call(statuses, function (element) {
    element.textContent = '';
  });

  var placeholders = document.querySelectorAll('p.muted');
  Array.prototype.forEach.call(placeholders, function (element) {
    if (/^Loading\b/.test(element.textContent.trim())) element.remove();
  });
})();
