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
import {
  bitcoinUri,
  ethereumTransferUri,
  explorerAddressUrl,
  formatUnits,
  isBitcoinAddress,
  isEvmAddress,
  methodQuote,
  orderReference,
  payableMethods,
  paymentConfig,
  paymentLink,
  paymentMailto
} from '../assets/js/payments.js';
import { checkoutMarkup } from '../assets/js/checkout.js';

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

function testPayments() {
  const config = paymentConfig({});
  const methods = payableMethods(config);
  const btc = methods.find((method) => method.id === 'btc');
  const usdt = methods.find((method) => method.id === 'usdt');

  check('default config exposes Bitcoin and USDT', Boolean(btc && usdt));
  check('bitcoin address passes validation', isBitcoinAddress('bc1qv8epx678qzs5e7nr4ftjtypm9vg3zhtwrckjpf'));
  check('truncated bitcoin address is rejected', !isBitcoinAddress('bc1qv8epx678qzs5e7nr4ftjtypm9vg3zhtwrckjq'));
  check('a single mistyped bitcoin character is rejected', !isBitcoinAddress('bc1qv8epx678qzs5e7nr4ftjtypm9vg3zhtwrckjpg'));
  check('usdt address passes validation', isEvmAddress('0x7E2474834091A0Aa7aCc02a92468BE41A0c5722b'));
  check('short usdt address is rejected', !isEvmAddress('0x7E2474834091A0Aa7aCc02a92468BE41A0c5722'));

  equal('formatUnits renders satoshis', formatUnits(68421, 8), '0.00068421');
  equal('formatUnits keeps stablecoin cents', formatUnits(65000000, 6, 2), '65.00');

  const btcQuote = methodQuote(btc, 65);
  equal('$65 at $95,000 quotes 0.00068421 BTC', btcQuote.amount, '0.00068421');
  equal('bitcoin quote is labelled with the ticker', btcQuote.amountLabel, '0.00068421 BTC');

  const usdtQuote = methodQuote(usdt, 65);
  equal('$65 quotes 65.00 USDT', usdtQuote.amount, '65.00');
  equal('USDT units use six decimals', usdtQuote.units, 65000000);
  check('zero prices are not quoted', methodQuote(btc, 0) === null);

  equal(
    'bitcoin link carries amount and label',
    bitcoinUri({ address: btc.address, amount: '0.00068421', label: 'Order SSC-1' }),
    'bitcoin:bc1qv8epx678qzs5e7nr4ftjtypm9vg3zhtwrckjpf?amount=0.00068421&label=Order%20SSC-1'
  );
  equal(
    'eip-681 builder encodes the USDT transfer',
    ethereumTransferUri({ contract: usdt.contract, address: usdt.address, units: 65000000, chainId: 1 }),
    'ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7@1/transfer?address=0x7E2474834091A0Aa7aCc02a92468BE41A0c5722b&uint256=65000000'
  );
  equal(
    'paymentLink uses the bitcoin scheme',
    paymentLink(btc, btcQuote),
    'bitcoin:bc1qv8epx678qzs5e7nr4ftjtypm9vg3zhtwrckjpf?amount=0.00068421'
  );
  equal('explorer link targets the btc address', explorerAddressUrl(btc), `https://mempool.space/address/${btc.address}`);
  equal(
    'order reference uses the UTC date and code',
    orderReference({ prefix: 'SSC', now: new Date('2026-11-26T12:00:00Z'), random: () => 0 }),
    'SSC-261126-AAAA'
  );
  check(
    'mailto link pre-fills the reference',
    paymentMailto({
      email: 'hello@example.com',
      product: { name: 'Cash App' },
      method: usdt,
      quote: usdtQuote,
      reference: 'SSC-261126-AAAA'
    }).includes('SSC-261126-AAAA')
  );

  const incomplete = paymentConfig({ methods: { btc: { address: 'not-an-address' } } });
  check(
    'invalid addresses remove the method from checkout',
    !payableMethods(incomplete).some((method) => method.id === 'btc')
  );

  const site = { currency: 'USD', locale: 'en-US', contact: { email: 'hello@example.com' } };
  const product = { id: 'cash-app', name: 'Cash App', price: 65, sku: 'CA-65', image: 'assets/img/cash-app.svg' };
  const markup = checkoutMarkup({ product, site, config, reference: 'SSC-261126-AAAA' });
  check(
    'checkout markup shows both wallet links',
    markup.includes('bitcoin:bc1qv8epx678qzs5e7nr4ftjtypm9vg3zhtwrckjpf') &&
      markup.includes('ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7@1/transfer')
  );
  check('checkout markup shows the order reference', markup.includes('SSC-261126-AAAA'));
  check(
    'checkout markup escapes product names',
    !checkoutMarkup({ product: { ...product, name: '<img src=x>' }, site, config, reference: 'SSC-TEST' }).includes('<img src=x')
  );
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

  check(
    'site.json publishes the bitcoin receiving address',
    site.payments?.methods?.btc?.address === 'bc1qv8epx678qzs5e7nr4ftjtypm9vg3zhtwrckjpf'
  );
  check(
    'site.json publishes the usdt receiving address',
    site.payments?.methods?.usdt?.address === '0x7E2474834091A0Aa7aCc02a92468BE41A0c5722b'
  );

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
testPayments();

testData()
  .catch((error) => {
    check('unexpected error while running tests', false, error instanceof Error ? error.message : String(error));
  })
  .finally(report);

