/**
 * Thin JSON data layer. Every piece of content lives in /data/*.json — there is
 * no database, no CMS and no backend. Edit those files to change the site.
 *
 * Responses are cached per page load so several modules can request the same
 * file without duplicate network calls.
 */

const cache = new Map();

/**
 * Site root resolved from this module's own URL (/assets/js/data.js), so the
 * JSON paths work from the root pages and from /tests/selftest.html alike.
 */
const SITE_ROOT = new URL('../../', import.meta.url);

export async function loadJson(path) {
  const url = new URL(path, SITE_ROOT);
  const key = url.href;
  if (cache.has(key)) return cache.get(key);

  const request = (async () => {
    // no-store: always revalidate JSON against the server so edits to data/*.json
    // show up on reload instead of a stale cached copy.
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Could not load ${path} (HTTP ${response.status}).`);
    }
    try {
      return await response.json();
    } catch (error) {
      throw new Error(`${path} is not valid JSON: ${error.message}`);
    }
  })();

  cache.set(key, request);
  try {
    return await request;
  } catch (error) {
    cache.delete(key);
    throw error;
  }
}

export async function loadSite() {
  const data = await loadJson('data/site.json');
  if (!data || typeof data.site !== 'object' || data.site === null) {
    throw new Error('data/site.json is missing a "site" object.');
  }
  return data.site;
}

export async function loadProducts() {
  const data = await loadJson('data/products.json');
  if (!data || !Array.isArray(data.products)) {
    throw new Error('data/products.json is missing a "products" array.');
  }
  return data.products;
}

export async function loadFaqs() {
  const data = await loadJson('data/faqs.json');
  if (!data || !Array.isArray(data.faqs)) {
    throw new Error('data/faqs.json is missing a "faqs" array.');
  }
  return data.faqs;
}

export async function loadReviews() {
  const data = await loadJson('data/reviews.json');
  if (!data || !Array.isArray(data.reviews)) {
    throw new Error('data/reviews.json is missing a "reviews" array.');
  }
  return { reviews: data.reviews, notice: typeof data.notice === 'string' ? data.notice : '' };
}

export const FALLBACK_SITE = {
  name: 'Sample Supply Co.',
  currency: 'USD',
  locale: 'en-US',
  productsPerPage: 6,
  featuredLimit: 6
};
