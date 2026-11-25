/**
 * Catalogue rules: text normalisation, keyword search and pagination.
 * Deliberately free of DOM access so the behaviour can be tested in isolation
 * (see tests/selftest.html).
 */

export const DEFAULT_PAGE_SIZE = 6;

/** Lower-case, strip accents and punctuation so search is forgiving. */
export function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Everything a product can be found by: name, category, SKU, summary, keywords. */
export function searchText(product) {
  if (!product || typeof product !== 'object') return '';
  const keywords = Array.isArray(product.keywords) ? product.keywords : [];
  return normalize(
    [product.name, product.category, product.sku, product.shortDescription, ...keywords]
      .filter(Boolean)
      .join(' ')
  );
}

/** Every word of the query must appear somewhere in the product's search text. */
export function matchesQuery(product, query) {
  const tokens = normalize(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = searchText(product);
  return tokens.every((token) => haystack.includes(token));
}

export function filterProducts(products, query) {
  const list = Array.isArray(products) ? products : [];
  if (normalize(query) === '') return list.slice();
  return list.filter((product) => matchesQuery(product, query));
}

export function normalizePageSize(value) {
  const size = Number.parseInt(value, 10);
  return Number.isFinite(size) && size > 0 ? size : DEFAULT_PAGE_SIZE;
}

export function totalPages(totalItems, pageSize) {
  const size = normalizePageSize(pageSize);
  return Math.max(1, Math.ceil(Math.max(0, Number(totalItems) || 0) / size));
}

/** Clamp any user-supplied page value into the valid 1..total range. */
export function clampPage(page, total) {
  const pages = Math.max(1, Number.parseInt(total, 10) || 1);
  const requested = Number.parseInt(page, 10);
  if (!Number.isFinite(requested)) return 1;
  return Math.min(Math.max(requested, 1), pages);
}

/**
 * Slice one page out of the list. Slicing the deterministic list guarantees
 * that pages never overlap, skip items or return duplicates.
 */
export function paginate(items, page, pageSize) {
  const list = Array.isArray(items) ? items : [];
  const size = normalizePageSize(pageSize);
  const pages = totalPages(list.length, size);
  const current = clampPage(page, pages);
  const startIndex = (current - 1) * size;
  return {
    items: list.slice(startIndex, startIndex + size),
    page: current,
    pageSize: size,
    totalPages: pages,
    totalItems: list.length,
    startIndex
  };
}

/**
 * Page buttons for the pagination control. Returns page numbers plus the
 * string 'gap' wherever an ellipsis should be rendered.
 */
export function pageNumbers(page, total) {
  const pages = Math.max(1, Number.parseInt(total, 10) || 1);
  const current = clampPage(page, pages);

  if (pages <= 7) {
    return Array.from({ length: pages }, (_, index) => index + 1);
  }

  const keep = new Set([1, pages, current]);
  if (current > 1) keep.add(current - 1);
  if (current < pages) keep.add(current + 1);
  if (current <= 4) [2, 3, 4, 5].forEach((value) => keep.add(value));
  if (current >= pages - 3) {
    [pages - 1, pages - 2, pages - 3, pages - 4].forEach((value) => keep.add(value));
  }

  const ordered = [...keep].filter((value) => value >= 1 && value <= pages).sort((a, b) => a - b);
  const result = [];
  ordered.forEach((value, index) => {
    if (index > 0 && value - ordered[index - 1] > 1) result.push('gap');
    result.push(value);
  });
  return result;
}
