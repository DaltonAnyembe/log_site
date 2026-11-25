/**
 * Products page: JSON catalogue, keyword search and pagination.
 * The query lives in the URL (?q=...&page=...) so search results survive
 * pagination, reloads, bookmarking and the browser back button.
 */

import { FALLBACK_SITE, loadProducts, loadSite } from './data.js';
import { filterProducts, paginate, pageNumbers } from './core.js';
import { renderLoadError, renderProductGrid, renderNotice } from './ui.js';

const grid = document.querySelector('[data-product-grid]');
const summary = document.querySelector('[data-results-summary]');
const pagination = document.querySelector('[data-pagination]');
const searchForm = document.querySelector('[data-catalogue-search]');
const searchInput = searchForm?.querySelector('[data-search-input]');
const clearLink = document.querySelector('[data-clear-search]');

const params = new URLSearchParams(window.location.search);
const query = (params.get('q') ?? '').trim();
const requestedPage = params.get('page');

function buildPageUrl(page) {
  const search = new URLSearchParams();
  if (query) search.set('q', query);
  if (page > 1) search.set('page', String(page));
  const queryString = search.toString();
  return `products.html${queryString ? `?${queryString}` : ''}`;
}

function renderPagination(result) {
  if (!pagination) return;

  if (result.totalItems === 0) {
    pagination.innerHTML = '';
    pagination.hidden = true;
    return;
  }

  pagination.hidden = false;

  const previous =
    result.page > 1
      ? `<a class="page-link" href="${buildPageUrl(result.page - 1)}" rel="prev">Previous</a>`
      : '<span class="page-link is-disabled" aria-disabled="true">Previous</span>';

  const next =
    result.page < result.totalPages
      ? `<a class="page-link" href="${buildPageUrl(result.page + 1)}" rel="next">Next</a>`
      : '<span class="page-link is-disabled" aria-disabled="true">Next</span>';

  const numbers = pageNumbers(result.page, result.totalPages)
    .map((value) => {
      if (value === 'gap') return '<span class="page-gap" aria-hidden="true">…</span>';
      if (value === result.page) {
        return `<span class="page-link is-current" aria-current="page">${value}</span>`;
      }
      return `<a class="page-link" href="${buildPageUrl(value)}" aria-label="Page ${value}">${value}</a>`;
    })
    .join('');

  pagination.innerHTML = `
    <p class="pagination__status">Page ${result.page} of ${result.totalPages}</p>
    <div class="pagination__controls">
      ${previous}
      <span class="pagination__pages">${numbers}</span>
      ${next}
    </div>`;
}

function renderSummary(result) {
  if (!summary) return;
  if (result.totalItems === 0) {
    summary.textContent = query
      ? `No products match “${query}”.`
      : 'No products are listed in the catalogue yet.';
    return;
  }
  const first = result.startIndex + 1;
  const last = result.startIndex + result.items.length;
  const suffix = query ? ` for “${query}”` : '';
  summary.textContent = `Showing ${first}–${last} of ${result.totalItems} products${suffix}.`;
}

function renderEmptyState() {
  const action = query
    ? '<p class="notice__actions"><a class="button" href="products.html">Clear search and show all products</a></p>'
    : '<p class="notice__actions"><a class="button" href="index.html">Back to home</a></p>';

  renderNotice(grid, {
    title: query ? 'No matching products' : 'No products listed yet',
    message: query
      ? `We could not find anything matching “${query}”. Try a different word, or clear the search to browse the full catalogue.`
      : 'Add entries to data/products.json and they will appear here automatically.',
    actionHtml: action
  });
}

function wireSearchForm() {
  if (!searchForm || !searchInput) return;
  if (query) searchInput.value = query;
  if (clearLink) clearLink.hidden = query === '';

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = searchInput.value.trim();
    window.location.href = value
      ? `products.html?q=${encodeURIComponent(value)}`
      : 'products.html';
  });
}

async function init() {
  const [siteResult, productsResult] = await Promise.allSettled([loadSite(), loadProducts()]);

  if (productsResult.status === 'rejected') {
    renderLoadError(grid, productsResult.reason);
    if (summary) summary.textContent = '';
    return;
  }

  const site = siteResult.status === 'fulfilled' ? { ...FALLBACK_SITE, ...siteResult.value } : FALLBACK_SITE;
  const products = productsResult.value;

  wireSearchForm();

  const matches = filterProducts(products, query);
  const result = paginate(matches, requestedPage, site.productsPerPage);

  renderSummary(result);
  if (result.totalItems === 0) {
    renderEmptyState();
  } else {
    renderProductGrid(grid, result.items, site);
  }
  renderPagination(result);

  if (requestedPage !== null && String(result.page) !== requestedPage) {
    window.history.replaceState(null, '', buildPageUrl(result.page));
  }
}

init();
