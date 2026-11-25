/**
 * Site-wide chrome: active navigation link, mobile menu, search prefill and
 * editable branding / contact details sourced from data/site.json.
 */

import { loadSite } from './data.js';

function setText(selector, value) {
  if (typeof value !== 'string' || value === '') return;
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value;
  });
}

function applySite(site) {
  if (!site) return;

  setText('[data-site-name]', site.name);
  setText('[data-site-description]', site.description);
  setText('[data-site-blurb]', site.footer?.blurb);
  setText('[data-site-legal]', site.footer?.legal);

  const contact = site.contact ?? {};
  document.querySelectorAll('[data-contact]').forEach((element) => {
    const key = element.dataset.contact;
    const value = contact[key];
    if (typeof value !== 'string' || value === '') return;

    element.textContent = value;
    if (key === 'email' && element.tagName === 'A') {
      element.setAttribute('href', `mailto:${value}`);
    }
    if (key === 'phone' && element.tagName === 'A') {
      const href = typeof contact.phoneHref === 'string' && contact.phoneHref ? contact.phoneHref : value;
      element.setAttribute('href', `tel:${href.replace(/[^\d+]/g, '')}`);
    }
  });
}

function markActiveNav() {
  const current = document.body.dataset.page;
  if (!current) return;
  document.querySelectorAll('[data-nav]').forEach((link) => {
    if (link.dataset.nav === current) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

function setupMobileMenu() {
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-primary-nav]');
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  nav.addEventListener('click', (event) => {
    if (event.target instanceof HTMLAnchorElement) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
}

function prefillSearch() {
  const query = new URLSearchParams(window.location.search).get('q');
  if (!query) return;
  document.querySelectorAll('[data-search-input]').forEach((input) => {
    if (input.value === '') input.value = query;
  });
}

function stampYear() {
  document.querySelectorAll('[data-current-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
}

async function init() {
  markActiveNav();
  setupMobileMenu();
  prefillSearch();
  stampYear();

  try {
    applySite(await loadSite());
  } catch (error) {
    // The static HTML already contains the placeholder branding, so a failed
    // site.json request is handled by the page-level content loader.
    console.warn('Site settings could not be loaded:', error.message);
  }
}

init();
