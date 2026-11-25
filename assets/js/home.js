/**
 * Homepage: editable hero copy (data/site.json) and the featured product
 * selection (items flagged "featured": true in data/products.json).
 */

import { FALLBACK_SITE, loadProducts, loadSite } from './data.js';
import { renderLoadError, renderNotice, renderProductGrid } from './ui.js';

const featuredGrid = document.querySelector('[data-featured-products]');
const heroFields = {
  eyebrow: document.querySelector('[data-hero-eyebrow]'),
  heading: document.querySelector('[data-hero-heading]'),
  text: document.querySelector('[data-hero-text]'),
  note: document.querySelector('[data-hero-note]'),
  primary: document.querySelector('[data-hero-primary]'),
  secondary: document.querySelector('[data-hero-secondary]')
};

function setText(element, value) {
  if (element && typeof value === 'string' && value !== '') element.textContent = value;
}

function setLink(element, config) {
  if (!element || !config || typeof config !== 'object') return;
  if (typeof config.label === 'string' && config.label !== '') element.textContent = config.label;
  if (typeof config.href === 'string' && config.href !== '') element.setAttribute('href', config.href);
}

function applySite(site) {
  const hero = site.hero ?? {};
  setText(heroFields.eyebrow, hero.eyebrow);
  setText(heroFields.heading, hero.heading);
  setText(heroFields.text, hero.text);
  setText(heroFields.note, hero.note);
  setLink(heroFields.primary, hero.primaryCta);
  setLink(heroFields.secondary, hero.secondaryCta);

  const featured = site.featured ?? {};
  setText(document.querySelector('[data-featured-heading]'), featured.heading);
  setText(document.querySelector('[data-featured-text]'), featured.text);
}

async function init() {
  const [siteResult, productsResult] = await Promise.allSettled([loadSite(), loadProducts()]);

  const site = siteResult.status === 'fulfilled' ? { ...FALLBACK_SITE, ...siteResult.value } : FALLBACK_SITE;
  if (siteResult.status === 'fulfilled') applySite(siteResult.value);

  if (productsResult.status === 'rejected') {
    renderLoadError(featuredGrid, productsResult.reason);
    return;
  }

  const limit = Number.parseInt(site.featuredLimit, 10);
  const featured = productsResult.value
    .filter((product) => product && product.featured === true)
    .slice(0, Number.isFinite(limit) && limit > 0 ? limit : 6);

  if (featured.length === 0) {
    renderNotice(featuredGrid, {
      title: 'No featured products yet',
      message: siteResult.value?.featured?.emptyText
        || 'Mark products with "featured": true in data/products.json to show them here.',
      actionHtml: '<p class="notice__actions"><a class="button" href="products.html">Browse all products</a></p>'
    });
    return;
  }

  renderProductGrid(featuredGrid, featured, site, { showFeatured: false });
}

init();
