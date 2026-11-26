# JSON-driven product catalogue (static, dependency-free)

A small storefront built with plain HTML, CSS and ES modules. There is no build step, no framework,
no database and no server-side code — every page reads its content from the JSON files in `data/`.

Checkout is a client-side hand-off to a crypto wallet: `product.html` has a **Buy now** button that
opens a dialog with a Bitcoin (BIP21) and/or USDT (EIP-681) payment request, the receiving address,
a copy button and an order reference. Payments are confirmed manually — see
[Crypto checkout](#crypto-checkout).

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
| `product.html` | Single product from `?id=`, with specs, availability and the crypto **Buy now** checkout |
| `faq.html` | FAQs grouped by category from `data/faqs.json` |
| `reviews.html` | Review summary, star ratings and sample-review notice |
| `contact.html` | Client-side validated contact form and store details |
| `tests/selftest.html` | In-browser test suite for search, pagination, validation, data and the payment helpers |

The header is one slim row: the brand mark (which links home) plus Products, FAQ, Reviews and
Contact. A Home link is added automatically on every page except the homepage, where it would
just point at the page you are on. Product search sits in the homepage hero and on the
catalogue page, so the header keeps its full width for navigation.

## Content

Everything visible comes from `data/`:

- `site.json` — brand name, tagline, hero copy, footer blurb and footer copyright
  line (`footer.legal`), contact details, `productsPerPage` (6), `featuredLimit` (6) and the
  `payments` block that drives the crypto checkout (see below).
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

## Crypto checkout

`product.html` renders a **Buy now** button whenever the product is in stock and at least one
payment method in `site.payments` is payable. The button opens a native `<dialog>` with:

- one radio option per payable method (the first one is preselected);
- the amount due in that currency, the receiving address with a copy button, and an
  "Open in wallet" deep link;
- a short network note (send only BTC on the Bitcoin network / only USDT ERC-20 on Ethereum);
- an order reference such as `SSC-261126-8F3K` (`SSC` + UTC date + four random base-32 characters);
- an **I've sent the payment** button that swaps in a confirmation panel with a `mailto:` link
  pre-filled with the product, method, amount, address and an empty `Transaction hash:` slot.

Wallets are addressed with standard URIs, so a phone or extension wallet can pre-fill the transfer:

```
bitcoin:bc1qv8epx678qzs5e7nr4ftjtypm9vg3zhtwrckjpf?amount=0.00068421
ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7@1/transfer?address=0x7E2474834091A0Aa7aCc02a92468BE41A0c5722b&uint256=65000000
```

### Configure it in `data/site.json`

```json
"payments": {
  "referencePrefix": "SSC",
  "methods": {
    "btc": {
      "kind": "btc",
      "label": "Bitcoin",
      "ticker": "BTC",
      "network": "Bitcoin network",
      "address": "bc1qv8epx678qzs5e7nr4ftjtypm9vg3zhtwrckjpf",
      "rateUsd": 95000,
      "decimals": 8,
      "explorer": "https://mempool.space/address/"
    },
    "usdt": {
      "kind": "erc20",
      "label": "Tether USDT",
      "ticker": "USDT",
      "network": "Ethereum (ERC-20)",
      "address": "0x7E2474834091A0Aa7aCc02a92468BE41A0c5722b",
      "contract": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      "chainId": 1,
      "rateUsd": 1,
      "decimals": 6,
      "explorer": "https://etherscan.io/address/"
    }
  }
}
```

- `rateUsd` is **the only price source** — there is no rate API. It is how many USD one whole
  coin is worth, so a $65 order at `rateUsd: 95000` asks for `0.00068421 BTC`. Update it whenever
  you want a new quote; a stale rate means the customer over- or underpays. The shipped `95000` is a
  placeholder, not a live ticker.
- `kind` is `btc` or `erc20`. `btc` needs a valid mainnet bech32 address (checksum included);
  `erc20` needs a checksummed-looking `0x…` address, the token `contract` and the EVM `chainId`.
  A method with a missing/invalid address is skipped silently, so remove the key or fix the value.
- `decimals` is the currency's minor-unit precision (8 for BTC, 6 for USDT) and controls both the
  displayed amount and the `uint256` value in the EIP-681 link.
- `explorer` is the base URL used by the "Check address" link; point it at the testnet explorer
  (and swap the addresses) if you want to rehearse with test funds. Bitcoin validation only accepts
  mainnet `bc1…` addresses.
- Orders are quoted in USD from `product.price` and rounded to the method's precision (never below
  one minor unit). Card payments, Lightning and other tokens are not implemented.

### Matching payments (no server)

Nothing is verified on-chain and no database is written. Each checkout shows a fresh reference, and
the confirmation `mailto:` is the hand-off: the customer sends it from the contact address with the
transaction hash pasted in. To fulfil an order:

1. Watch the receiving address in the explorer (or a wallet notification); mempool.space and
   Etherscan both show incoming transfers.
2. Compare the amount and the time with the reference the customer quoted, and confirm the payment
   is confirmed/final (one or more blocks; more for large BTC amounts).
3. Only then release the product. If a transaction hash is supplied, look it up directly — it is
   unambiguous, the reference alone is not, because on-chain transfers carry no memo.

## Structure

```
assets/css/styles.css     single stylesheet, CSS custom properties, mobile-first
assets/js/core.js         normalize/search/filter/paginate/clampPage/pageNumbers
assets/js/validate.js     email + contact-form validation rules
assets/js/data.js         fetch + cache helpers for the JSON files
assets/js/payments.js     payment config, address checks, quotes, BIP21/EIP-681 links, references
assets/js/checkout.js     checkout dialog markup, copying, method switching, mailto hand-off
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
"60 passed, 0 failed." It also HEAD-checks every product image, so a missing file fails the run.
The payment checks cover address validation (including the bech32 checksum), quoting, both wallet
URI builders, the order reference and the generated checkout markup.

## Notes and limitations

- The contact form validates in the browser only; nothing is emailed or stored. Wire the submit
  handler in `assets/js/contact.js` to your own endpoint to make it live.
- Search is client-side over name, category, SKU, descriptions and keywords: every whitespace-separated
  token must appear, accents and case are ignored.
- Pagination sizes come from `site.json`; out-of-range `?page=` values clamp to the last page.
- Prices are formatted with `Intl.NumberFormat` using the currency in `site.json`.
- Crypto checkout is a static hand-off, not a payment processor: the browser quotes the price from
  `payments.methods.*.rateUsd` (no live feed), builds a wallet URI and shows a reference. Nothing is
  stored, no order is created, and payments are matched by hand — see
  [Matching payments](#matching-payments-no-server). Shipping, fees, taxes and refunds are out of
  scope, and an outgoing transaction can never be reversed, so confirm every payment before
  delivering.
