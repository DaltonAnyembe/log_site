/**
 * Product details page. The product is selected by ?id= and rendered from
 * data/products.json — no hard-coded product content lives in the HTML.
 */

import { FALLBACK_SITE, loadProducts, loadSite } from './data.js';
import { availabilityBadge, escapeHtml, formatPrice, renderLoadError, renderNotice } from './ui.js';

const root = document.querySelector('[data-product-detail]');
const breadcrumbCurrent = document.querySelector('[data-breadcrumb-current]');
const productId = (new URLSearchParams(window.location.search).get('id') ?? '').trim();

function paragraphs(text) {
  return String(text ?? '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');
}

function renderNotFound() {
  if (breadcrumbCurrent) breadcrumbCurrent.textContent = 'Not found';
  renderNotice(root, {
    title: 'Product not found',
    message: 'We could not find a product with that reference. It may have been renamed or removed from data/products.json.',
    actionHtml: '<p class="notice__actions"><a class="button" href="products.html">Browse all products</a></p>'
  });
}

function renderProduct(product, site) {
  const tags = Array.isArray(product.keywords) ? product.keywords.filter(Boolean) : [];
  const specs = Array.isArray(product.specs) ? product.specs.filter((spec) => spec && spec.label) : [];
  const availability = product.availability ?? {};
  const inStock = typeof availability === 'object' ? availability.status !== 'out_of_stock' : true;

  document.title = `${product.name} | ${site.name || FALLBACK_SITE.name}`;
  if (breadcrumbCurrent) breadcrumbCurrent.textContent = product.name;

  root.innerHTML = `
    <article class="product-detail">
      <figure class="product-detail__media">
        <img src="${escapeHtml(product.image || '')}" alt="${escapeHtml(product.imageAlt || product.name || '')}" width="600" height="450" decoding="async">
      </figure>
      <div class="product-detail__info">
        ${product.category ? `<p class="eyebrow">${escapeHtml(product.category)}</p>` : ''}
        <h1 class="product-detail__title">${escapeHtml(product.name || 'Untitled product')}</h1>
        <p class="price price--large">${escapeHtml(formatPrice(product.price, site))}</p>
        <p class="product-detail__status">
          ${availabilityBadge(product)}
          ${product.featured === true ? '<span class="badge badge--featured">Featured</span>' : ''}
          ${product.sku ? `<span class="muted small">Reference: ${escapeHtml(product.sku)}</span>` : ''}
        </p>
        ${product.shortDescription ? `<p class="lede">${escapeHtml(product.shortDescription)}</p>` : ''}
        <div class="prose">${paragraphs(product.description)}</div>
        ${
          specs.length
            ? `<h2 class="detail-subheading">Product details</h2>
               <dl class="spec-list">
                 ${specs
                   .map(
                     (spec) =>
                       `<div class="spec-list__row"><dt>${escapeHtml(spec.label)}</dt><dd>${escapeHtml(spec.value ?? '')}</dd></div>`
                   )
                   .join('')}
               </dl>`
            : ''
        }
        ${
          tags.length
            ? `<p class="tag-list"><span class="tag-list__label">Keywords:</span> ${tags
                .map(
                  (tag) =>
                    `<a class="tag" href="products.html?q=${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>`
                )
                .join(' ')}</p>`
            : ''
        }
        <div class="detail-actions">
          <a class="button" href="products.html">Back to all products</a>
          <a class="button button--secondary" href="contact.html">Ask a question</a>
        </div>
        <p class="muted small">
          ${inStock ? 'This item is available to order.' : 'This item is currently unavailable — contact us for restock details.'}
        </p>
      </div>
    </article>`;
}

async function init() {
  if (!root) return;

  if (!productId) {
    renderNotFound();
    return;
  }

  const [siteResult, productsResult] = await Promise.allSettled([loadSite(), loadProducts()]);

  if (productsResult.status === 'rejected') {
    renderLoadError(root, productsResult.reason);
    return;
  }

  const site = siteResult.status === 'fulfilled' ? { ...FALLBACK_SITE, ...siteResult.value } : FALLBACK_SITE;
  const product = productsResult.value.find((item) => String(item.id) === productId);

  if (!product) {
    renderNotFound();
    return;
  }

  renderProduct(product, site);
}

init();
