# JSON-driven product catalogue (static, dependency-free)

A small storefront built with plain HTML, CSS and ES modules. There is no build step, no framework,
no database and no cart or checkout — every page reads its content from the JSON files in `data/`.

## Run it

Because the site loads its content with `fetch` from `data/*.json` and uses ES modules, it has to be
served over HTTP — opening `index.html` straight from disk (`file://`) leaves every page stuck on
"Loading…" because browsers block both in that mode.

On Windows, double-click `serve.cmd` in this folder. It starts the server, opens the browser and can
be re-run safely (it reuses a server that is already listening). To use a different port:
`serve.cmd 8080`.

From a terminal instead:

```powershell
cd path\to\logs
python -m http.server 8000
```

Then open <http://localhost:8000/>.

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Hero, featured products (`site.featuredLimit`), quick links |
| `products.html` | Full catalogue, search (`?q=`) and pagination (`?page=`) |
| `product.html` | Single product from `?id=`, with specs and availability; not-found state |
| `faq.html` | FAQs grouped by category from `data/faqs.json` |
| `reviews.html` | Review summary, star ratings and sample-review notice |
| `contact.html` | Client-side validated contact form and store details |
| `tests/selftest.html` | In-browser test suite for search, pagination, validation and data |

The header is one slim row: the brand mark (which links home) plus Products, FAQ, Reviews and
Contact. A Home link is added automatically on every page except the homepage, where it would
just point at the page you are on. Product search sits in the homepage hero and on the
catalogue page, so the header keeps its full width for navigation.

## Content

Everything visible comes from `data/`:

- `site.json` — brand name, tagline, hero copy, footer blurb and footer copyright
  line (`footer.legal`), contact details, `productsPerPage` (6) and `featuredLimit` (6).
  The footer is laid out in three blocks: brand + blurb, Payment Methods, and Support
  links. The Payment Methods entries are plain markup in the `<footer>` of each page —
  edit them there if your payment options change.
- `products.json` — 15 sample products. `featured: true` puts a product on the homepage.
  `availability.status` is one of `in_stock`, `low_stock`, `out_of_stock`, `preorder`.
- `faqs.json` — question/answer/category entries, grouped automatically.
- `reviews.json` — author, rating (1–5), title, body, date and optional product.
  Entries with `"sample": true` trigger the placeholder notice on the reviews page.
  The headline score and stars are the mean of every `rating`, so the current
  eight reviews (four 5★ and four 4★) produce a 4.5 average automatically.

Replace the sample copy and the SVG placeholders in `assets/img/` with real content; no code changes
are needed as long as the JSON keys stay the same.

## Structure

```
assets/css/styles.css     single stylesheet, CSS custom properties, mobile-first
assets/js/core.js         normalize/search/filter/paginate/clampPage/pageNumbers
assets/js/validate.js     email + contact-form validation rules
assets/js/data.js         fetch + cache helpers for the JSON files
assets/js/ui.js           shared card/notice/price/availability renderers
assets/js/nav.js          header nav toggle, active link, site details, current year
assets/js/{home,products,product,faq,reviews,contact}.js   one module per page
assets/js/serve-notice.js file:// guard that explains how to start the local server
serve.cmd                 Windows launcher for `python -m http.server`
data/*.json               all editable content
tests/selftest.html|.js   in-browser tests
```

## Self-test

Serve the site and open <http://localhost:8000/tests/selftest.html>. The page prints one row per
check, writes `data-test-status="pass"` (or `"fail"`) on `<body>` and a summary such as
"35 passed, 0 failed." It also HEAD-checks every product image, so a missing file fails the run.

## Notes and limitations

- The contact form validates in the browser only; nothing is emailed or stored. Wire the submit
  handler in `assets/js/contact.js` to your own endpoint to make it live.
- Search is client-side over name, category, SKU, descriptions and keywords: every whitespace-separated
  token must appear, accents and case are ignored.
- Pagination sizes come from `site.json`; out-of-range `?page=` values clamp to the last page.
- Prices are formatted with `Intl.NumberFormat` using the currency in `site.json`.
