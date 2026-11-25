/**
 * Browser self-test harness for the shared catalogue, validation and data rules.
 * Open /tests/selftest.html over HTTP and check the summary line, or load the
 * page headless and look for data-test-status="pass" on <body>.
 */

import {
  clampPage,
  filterProducts,
  matchesQuery,
  normalize,
  pageNumbers,
  paginate,
  totalPages
} from '../assets/js/core.js';
import { CONTACT_LIMITS, isValidEmail, validateContact } from '../assets/js/validate.js';
import { loadFaqs, loadProducts, loadReviews, loadSite } from '../assets/js/data.js';

const results = [];
const resultsList = document.querySelector('[data-test-results]');
const summary = document.querySelector('[data-test-summary]');

function check(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail: pass ? '' : detail });
}

function equal(name, actual, expected) {
  check(name, Object.is(actual, expected), `expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}

function report() {
  const failed = results.filter((result) => !result.pass).length;
  resultsList.innerHTML = results
    .map(
      (result) => `
        <li class="test-result" data-status="${result.pass ? 'pass' : 'fail'}">
          <span>${result.name}${result.detail ? `<span class="test-result__detail">${result.detail}</span>` : ''}</span>
          <span class="test-result__status">${result.pass ? 'PASS' : 'FAIL'}</span>
        </li>`
    )
    .join('');
  summary.textContent = `${results.length - failed} passed, ${failed} failed.`;
  document.body.dataset.testStatus = failed === 0 ? 'pass' : 'fail';
}

function testSearch() {
  equal('normalize strips case, accents and punctuation', normalize('  Crème-Brûlée! '), 'creme brulee');

  const pourOver = { name: 'Ceramic Pour-Over Set', keywords: ['coffee', 'brewer'] };
  check('query tokens can appear in any order', matchesQuery(pourOver, 'coffee ceramic'));
  check('every query token must match', !matchesQuery(pourOver, 'coffee glass'));
  check('accents are ignored when searching', matchesQuery({ name: 'Café Mug' }, 'cafe mug'));
  equal(
    'blank query keeps the whole catalogue',
    filterProducts([{ name: 'A' }, { name: 'B' }], '   ').length,
    2
  );
}

function testPagination() {
  const items = Array.from({ length: 14 }, (_, index) => ({ id: index + 1 }));
  equal('14 items at 6 per page gives 3 pages', totalPages(items.length, 6), 3);

  const seen = new Set();
  const sizes = [];
  for (let page = 1; page <= 3; page += 1) {
    const slice = paginate(items, page, 6);
    slice.items.forEach((item) => seen.add(item.id));
    sizes.push(slice.items.length);
  }
  equal('page sizes are 6, 6 and 2', sizes.join(','), '6,6,2');
  equal('pages cover all 14 items with no duplicates', seen.size, 14);

  const outOfRange = paginate(items, 99, 6);
  equal('out-of-range page clamps to the last page', outOfRange.page, 3);
  equal('clamped last page holds the remainder', outOfRange.items.length, 2);
  equal('clampPage handles 0', clampPage(0, 3), 1);
  equal('clampPage handles 99', clampPage(99, 3), 3);
  equal('clampPage handles non-numeric input', clampPage('abc', 3), 1);
  equal('pageNumbers shows the first window', pageNumbers(1, 10).join(' '), '1 2 3 4 5 gap 10');
  equal('pageNumbers shows a middle window', pageNumbers(5, 10).join(' '), '1 gap 4 5 6 gap 10');
  equal('pageNumbers lists short ranges in full', pageNumbers(3, 3).join(' '), '1 2 3');
}

function testValidation() {
  check('valid email accepted', isValidEmail('name@example.com'));
  check('email without a dot rejected', !isValidEmail('name@example'));
  check('email containing spaces rejected', !isValidEmail('na me@example.com'));

  const good = validateContact({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    subject: 'Order question',
    message: 'Could you tell me when this item is back in stock?'
  });
  check('complete form passes validation', good.valid && Object.keys(good.errors).length === 0);

  const empty = validateContact({});
  equal('empty form reports four errors', Object.keys(empty.errors).length, 4);

  const short = validateContact({ name: 'A', email: 'not-an-email', subject: 'Hi', message: 'Too short' });
  check(
    'short name, subject and message are flagged',
    Boolean(short.errors.name && short.errors.subject && short.errors.message)
  );
  check('invalid email is flagged', Boolean(short.errors.email));
  check('message minimum is 10 characters', CONTACT_LIMITS.messageMin === 10);
}

async function testData() {
  const [site, products, faqs, reviews] = await Promise.all([
    loadSite(),
    loadProducts(),
    loadFaqs(),
    loadReviews()
  ]);

  equal('catalogue holds 15 products', products.length, 15);
  equal('product ids are unique', new Set(products.map((product) => product.id)).size, products.length);
  check(
    'every product has a name, numeric price and image',
    products.every(
      (product) =>
        product.name && Number.isFinite(product.price) && typeof product.image === 'string' && product.image.length > 0
    )
  );
  check(
    'every product has a summary and description',
    products.every(
      (product) =>
        typeof product.shortDescription === 'string' &&
        product.shortDescription.length > 0 &&
        typeof product.description === 'string' &&
        product.description.length > 0
    )
  );

  const featured = products.filter((product) => product.featured === true);
  check(
    'featured count matches site.featuredLimit',
    featured.length === site.featuredLimit,
    `featured ${featured.length}, limit ${site.featuredLimit}`
  );
  equal('site page size is 6', site.productsPerPage, 6);

  equal('FAQ questions are unique', new Set(faqs.map((faq) => faq.question)).size, faqs.length);
  check(
    'every FAQ has an answer',
    faqs.every((faq) => typeof faq.answer === 'string' && faq.answer.trim().length > 0)
  );

  check(
    'review ratings are whole numbers from 1 to 5',
    reviews.reviews.every((review) => Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5)
  );
  check(
    'sample reviews are backed by a visible notice',
    reviews.reviews.some((review) => review.sample === true) ? reviews.notice.length > 0 : true
  );

  const images = [...new Set(products.map((product) => product.image))];
  // Resolve image paths against the site root, not the /tests/ folder.
  const siteRoot = new URL('../', import.meta.url);
  const imageChecks = await Promise.all(
    images.map(async (path) => {
      try {
        const response = await fetch(new URL(path, siteRoot), { method: 'HEAD', cache: 'no-cache' });
        return response.ok;
      } catch (error) {
        return false;
      }
    })
  );
  check(
    'every product image resolves over HTTP',
    imageChecks.every(Boolean),
    `${imageChecks.filter((ok) => !ok).length} missing of ${images.length}`
  );
}

testSearch();
testPagination();
testValidation();

testData()
  .catch((error) => {
    check('unexpected error while running tests', false, error instanceof Error ? error.message : String(error));
  })
  .finally(report);

