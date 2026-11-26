/**
 * Crypto checkout for the product page: a native <dialog> with one panel per
 * payable method, wallet deep links, copy-to-clipboard fields and a
 * post-payment handoff (order reference + mailto with the transaction hash).
 *
 * Nothing here talks to a server — the site is static, so payments are matched
 * manually against the reference shown in the dialog.
 */

import { escapeHtml, formatPrice } from './ui.js';
import {
  explorerAddressUrl,
  methodQuote,
  orderReference,
  payableMethods,
  paymentLink,
  paymentMailto
} from './payments.js';

const COPY_FEEDBACK_MS = 1600;

function methodNote(method) {
  const custom = typeof method.note === 'string' ? method.note.trim() : '';
  if (custom) return custom;
  if (method.kind === 'btc') {
    return 'Send BTC on the Bitcoin network only. Coins sent on another network cannot be recovered.';
  }
  return `Send ${method.ticker || 'the token'} on ${method.network || 'the same network'} only. Tokens sent on another network cannot be recovered.`;
}

function methodOption(method, checked) {
  const meta = [method.ticker, method.network].filter(Boolean).join(' · ');
  return `
    <label class="pay-method">
      <input class="pay-method__input" type="radio" name="payment-method" value="${escapeHtml(method.id)}"${checked ? ' checked' : ''}>
      <span class="pay-method__text">
        <span class="pay-method__label">${escapeHtml(method.label || method.id)}</span>
        ${meta ? `<span class="pay-method__meta">${escapeHtml(meta)}</span>` : ''}
      </span>
    </label>`;
}

function payPanelMarkup({ method, quote, site, reference, active }) {
  const walletLink = paymentLink(method, quote, {
    label: `Order ${reference}`,
    message: `${method.label || method.id} payment for order ${reference}`
  });
  const explorer = explorerAddressUrl(method);
  const rate = `1 ${method.ticker || 'unit'} = ${formatPrice(quote.rateUsd, site)}`;

  return `
    <section class="pay-panel${active ? ' is-active' : ''}" data-pay-panel="${escapeHtml(method.id)}" aria-label="${escapeHtml(method.label || method.id)} payment"${active ? '' : ' hidden'}>
      <div class="copy-field">
        <div class="copy-field__head">
          <span class="copy-field__label">Amount to send</span>
          <button class="button button--secondary button--small" type="button" data-copy="${escapeHtml(quote.amount)}" data-copy-label="Amount copied">Copy amount</button>
        </div>
        <p class="pay-panel__amount">${escapeHtml(quote.amountLabel)}</p>
      </div>
      <div class="copy-field">
        <div class="copy-field__head">
          <span class="copy-field__label">${escapeHtml(method.label || method.id)} address</span>
          <button class="button button--secondary button--small" type="button" data-copy="${escapeHtml(method.address)}" data-copy-label="Address copied">Copy address</button>
        </div>
        <code class="copy-field__value">${escapeHtml(method.address)}</code>
      </div>
      <div class="pay-panel__actions">
        <a class="button" href="${escapeHtml(walletLink)}" data-wallet-link>Open in wallet</a>
        ${explorer ? `<a class="button button--secondary" href="${escapeHtml(explorer)}" target="_blank" rel="noopener">Check address</a>` : ''}
      </div>
      <p class="pay-panel__rate muted small">Rate used for this order: ${escapeHtml(rate)}. Send exactly the amount above.</p>
      <p class="pay-panel__note">${escapeHtml(methodNote(method))}</p>
      <button class="button button--block" type="button" data-mark-sent="${escapeHtml(method.id)}">I've sent the payment</button>
    </section>`;
}

/** Full checkout dialog markup, or '' when no method can be quoted. */
export function checkoutMarkup({
  product,
  site,
  config,
  reference = orderReference({ prefix: config?.referencePrefix })
}) {
  const priced = payableMethods(config)
    .map((method) => ({ method, quote: methodQuote(method, product?.price) }))
    .filter((entry) => entry.quote);
  if (!product || priced.length === 0) return '';

  const summary = `
    <div class="checkout__summary">
      ${
        product.image
          ? `<img class="checkout__thumb" src="${escapeHtml(product.image)}" alt="" width="78" height="59" loading="lazy" decoding="async">`
          : ''
      }
      <div>
        <p class="checkout__product">${escapeHtml(product.name || 'Item')}</p>
        ${product.sku ? `<p class="muted small">SKU: ${escapeHtml(product.sku)}</p>` : ''}
        <p class="price">${escapeHtml(formatPrice(product.price, site))}</p>
      </div>
    </div>`;

  return `
    <dialog class="checkout" aria-labelledby="checkout-title">
      <div class="checkout__sheet">
        <header class="checkout__head">
          <div>
            <p class="eyebrow">Checkout</p>
            <h2 class="checkout__title" id="checkout-title">Pay with crypto</h2>
          </div>
          <button class="checkout__close" type="button" data-checkout-close aria-label="Close checkout">&times;</button>
        </header>
        ${summary}
        <p class="checkout__reference">
          <span>Order reference</span>
          <strong data-checkout-reference>${escapeHtml(reference)}</strong>
          <button class="link-button" type="button" data-copy="${escapeHtml(reference)}" data-copy-label="Reference copied">Copy</button>
        </p>
        <fieldset class="pay-methods">
          <legend class="pay-methods__legend">Choose a payment method</legend>
          <div class="checkout__method-grid">
            ${priced.map((entry, index) => methodOption(entry.method, index === 0)).join('')}
          </div>
        </fieldset>
        <div class="checkout__panels">
          ${priced.map((entry, index) => payPanelMarkup({ ...entry, site, reference, active: index === 0 })).join('')}
        </div>
        <div class="checkout__sent" data-checkout-sent hidden></div>
        <p class="checkout__note muted small">Send the exact amount to the address shown and keep your order reference. Payments are matched to that reference manually — this page cannot confirm a transfer on its own.</p>
      </div>
    </dialog>`;
}

/** Success block shown after "I've sent the payment". */
export function sentMarkup({ product, site, method, quote, reference }) {
  const mailto = paymentMailto({ email: site?.contact?.email, product, method, quote, reference });
  const actions = [
    mailto ? `<a class="button" href="${escapeHtml(mailto)}">Email transaction hash</a>` : '',
    '<a class="button button--secondary" href="contact.html">Contact us</a>'
  ]
    .filter(Boolean)
    .join(' ');

  return `
    <div class="notice notice--success" role="status">
      <h3 class="notice__title">Payment marked as sent</h3>
      <p>We will match ${escapeHtml(quote.amountLabel)} on ${escapeHtml(method.network || method.label || method.id)} to reference <strong>${escapeHtml(reference)}</strong> once the transfer is confirmed.</p>
      <p>Send the transaction hash so we can find your payment.</p>
      <p class="notice__actions">${actions}</p>
    </div>`;
}


async function copyValue(value) {
  const text = String(value ?? '');
  if (!text) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    // Clipboard API can be blocked (permissions, insecure context); fall back.
  }

  try {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.top = '-1000px';
    document.body.append(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    return copied;
  } catch (error) {
    return false;
  }
}

function flashButton(button, message) {
  if (!button) return;
  if (!button.dataset.copyOriginal) button.dataset.copyOriginal = button.textContent;
  if (button.dataset.copyTimer) window.clearTimeout(Number(button.dataset.copyTimer));

  button.textContent = message;
  button.dataset.copyTimer = String(
    window.setTimeout(() => {
      button.textContent = button.dataset.copyOriginal;
      delete button.dataset.copyTimer;
    }, COPY_FEEDBACK_MS)
  );
}

/**
 * Render the checkout dialog once and wire it to the "Buy now" trigger.
 * Returns the dialog element, or null when the product cannot be paid for.
 */
export function mountCheckout({ product, site, config, trigger }) {
  if (!trigger) return null;

  const reference = orderReference({ prefix: config?.referencePrefix });
  const markup = checkoutMarkup({ product, site, config, reference });
  if (!markup) return null;

  const host = document.createElement('div');
  host.innerHTML = markup;
  const dialog = host.querySelector('dialog');
  if (!dialog) return null;
  document.body.append(dialog);

  const priced = payableMethods(config)
    .map((method) => ({ method, quote: methodQuote(method, product.price) }))
    .filter((entry) => entry.quote);

  const selectMethod = (id) => {
    dialog.querySelectorAll('[data-pay-panel]').forEach((panel) => {
      const active = panel.dataset.payPanel === id;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });
  };

  dialog.querySelectorAll('input[name="payment-method"]').forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked) selectMethod(input.value);
    });
  });

  dialog.addEventListener('click', async (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target === dialog || target.closest('[data-checkout-close]')) {
      dialog.close();
      return;
    }

    const copyButton = target.closest('[data-copy]');
    if (copyButton) {
      const copied = await copyValue(copyButton.dataset.copy);
      flashButton(copyButton, copied ? copyButton.dataset.copyLabel || 'Copied' : 'Select the text');
      return;
    }

    const sentButton = target.closest('[data-mark-sent]');
    if (sentButton) {
      const entry = priced.find((item) => item.method.id === sentButton.dataset.markSent);
      const sent = dialog.querySelector('[data-checkout-sent]');
      if (entry && sent) {
        sent.innerHTML = sentMarkup({ product, site, method: entry.method, quote: entry.quote, reference });
        sent.hidden = false;
        sent.setAttribute('tabindex', '-1');
        sent.focus({ preventScroll: true });
        sent.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  });

  trigger.addEventListener('click', () => {
    if (dialog.open) return;
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  });

  return dialog;
}

