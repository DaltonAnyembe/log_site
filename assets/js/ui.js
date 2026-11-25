/** Shared rendering helpers: escaping, prices, availability labels, cards. */

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

export function productUrl(product) {
  return `product.html?id=${encodeURIComponent(String(product?.id ?? ''))}`;
}

const AVAILABILITY_STYLES = {
  in_stock: { label: 'In stock', modifier: 'in' },
  low_stock: { label: 'Low stock', modifier: 'low' },
  out_of_stock: { label: 'Out of stock', modifier: 'out' },
  preorder: { label: 'Pre-order', modifier: 'pre' }
};

export function availabilityFor(product) {
  const raw = product?.availability;
  const source = typeof raw === 'string' ? { status: raw } : raw && typeof raw === 'object' ? raw : {};
  const status = String(source.status ?? '').trim().toLowerCase();
  const style = AVAILABILITY_STYLES[status] ?? { label: 'Availability on request', modifier: 'unknown' };
  return { label: String(source.label ?? '').trim() || style.label, modifier: style.modifier };
}

export function availabilityBadge(product) {
  const { label, modifier } = availabilityFor(product);
  return `<span class="availability availability--${modifier}">${escapeHtml(label)}</span>`;
}

export function formatPrice(price, site) {
  const amount = Number(price);
  if (!Number.isFinite(amount)) return 'Price on request';
  const locale = site?.locale || 'en-US';
  const currency = site?.currency || 'USD';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch (error) {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(value, locale = 'en-US') {
  const text = String(value ?? '').trim();
  // Treat plain YYYY-MM-DD values as local dates so they never shift a day.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  } catch (error) {
    return date.toISOString().slice(0, 10);
  }
}

export function productCard(product, site, options = {}) {
  const url = escapeHtml(productUrl(product));
  const name = escapeHtml(product.name || 'Untitled product');
  const category = product.category ? escapeHtml(product.category) : '';
  const description = escapeHtml(product.shortDescription || product.description || '');
  const image = escapeHtml(product.image || '');
  const imageAlt = escapeHtml(product.imageAlt || '');
  const showFeatured = options.showFeatured ?? product.featured === true;

  return `
    <article class="product-card">
      <a class="product-card__media" href="${url}" tabindex="-1" aria-hidden="true">
        <img src="${image}" alt="${imageAlt}" width="600" height="450" loading="lazy" decoding="async">
      </a>
      <div class="product-card__body">
        ${showFeatured ? '<p class="product-card__flag"><span class="badge badge--featured">Featured</span></p>' : ''}
        ${category ? `<p class="product-card__category">${category}</p>` : ''}
        <h3 class="product-card__title"><a href="${url}">${name}</a></h3>
        <p class="product-card__description">${description}</p>
        <p class="product-card__meta">
          <span class="price">${escapeHtml(formatPrice(product.price, site))}</span>
          ${availabilityBadge(product)}
        </p>
        <a class="button button--block" href="${url}">View details</a>
      </div>
    </article>`;
}

export function renderProductGrid(container, products, site, options = {}) {
  if (!container) return;
  container.innerHTML = products.map((product) => productCard(product, site, options)).join('');
}

export function renderNotice(container, { title, message, actionHtml = '', variant = 'info' }) {
  if (!container) return;
  const role = variant === 'error' ? 'alert' : 'status';
  container.innerHTML = `
    <div class="notice notice--${variant}" role="${role}">
      ${title ? `<h2 class="notice__title">${escapeHtml(title)}</h2>` : ''}
      <p>${escapeHtml(message)}</p>
      ${actionHtml}
    </div>`;
}

export function renderLoadError(container, error) {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error.');
  if (!container) return;
  container.innerHTML = `
    <div class="notice notice--error" role="alert">
      <h2 class="notice__title">Content could not be loaded</h2>
      <p>${escapeHtml(message)}</p>
      <p>This site reads all content from local JSON files, so it must be served over HTTP. Double-click <code>serve.cmd</code> in the project folder (or run <code>python -m http.server 8000</code> there) and open <code>http://localhost:8000/</code>.</p>
    </div>`;
}
