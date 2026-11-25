/**
 * Reviews page: ratings summary and review cards from data/reviews.json.
 * Entries with "sample": true are labelled as placeholders in the UI so sample
 * content can never be mistaken for genuine customer feedback.
 */

import { FALLBACK_SITE, loadReviews, loadSite } from './data.js';
import { escapeHtml, formatDate, renderLoadError, renderNotice } from './ui.js';

const list = document.querySelector('[data-review-list]');
const summaryBox = document.querySelector('[data-review-summary]');
const noticeBox = document.querySelector('[data-review-notice]');

function stars(rating) {
  const value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return `<p class="stars" aria-label="Rated ${value} out of 5"><span aria-hidden="true">${'★'.repeat(value)}${'☆'.repeat(5 - value)}</span></p>`;
}

/**
 * Summary stars: a partially filled row so an average such as 4.5 draws four
 * and a half stars instead of rounding up to a misleading five.
 */
function averageStars(average) {
  const value = Math.max(0, Math.min(5, Number(average) || 0));
  const percent = (value / 5) * 100;
  return `<p class="stars stars--average" aria-label="Rated ${value.toFixed(1)} out of 5">
    <span class="stars__track" aria-hidden="true">
      <span class="stars__outline">☆☆☆☆☆</span>
      <span class="stars__fill" style="width: ${percent.toFixed(1)}%">★★★★★</span>
    </span>
  </p>`;
}

function timestamp(value) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function renderSummary(reviews, locale) {
  if (!summaryBox) return;
  if (reviews.length === 0) {
    summaryBox.innerHTML = '<p class="muted">No reviews to summarise yet.</p>';
    return;
  }

  const total = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0);
  const average = total / reviews.length;
  const formattedAverage = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(average);
  const sampleCount = reviews.filter((review) => review.sample === true).length;

  summaryBox.innerHTML = `
    <p class="review-summary__score">${escapeHtml(formattedAverage)}<span class="review-summary__outof">/ 5</span></p>
    ${averageStars(average)}
    <p class="muted">Based on ${reviews.length} review${reviews.length === 1 ? '' : 's'}${
      sampleCount > 0 ? ` (${sampleCount} marked as sample)` : ''
    }.</p>`;
}

function renderReviews(reviews, locale) {
  list.innerHTML = reviews
    .map((review) => {
      const rating = Math.max(0, Math.min(5, Math.round(Number(review.rating) || 0)));
      const dateLabel = formatDate(review.date, locale);
      const dateIso = Number.isFinite(new Date(review.date).getTime()) ? new Date(review.date).toISOString().slice(0, 10) : '';

      return `
        <article class="review-card">
          <header class="review-card__header">
            ${stars(rating)}
            ${review.sample === true ? '<span class="badge">Sample review</span>' : ''}
          </header>
          ${review.title ? `<h2 class="review-card__title">${escapeHtml(review.title)}</h2>` : ''}
          <p class="review-card__body">${escapeHtml(review.body ?? '')}</p>
          <footer class="review-card__meta">
            <span class="review-card__author">${escapeHtml(review.author ?? 'Anonymous')}</span>
            ${review.location ? `<span class="muted">· ${escapeHtml(review.location)}</span>` : ''}
            ${dateLabel ? `<time class="muted" datetime="${dateIso}">${escapeHtml(dateLabel)}</time>` : ''}
            ${
              review.product
                ? `<span class="muted">· About <a href="products.html?q=${encodeURIComponent(review.product)}">${escapeHtml(
                    review.product
                  )}</a></span>`
                : ''
            }
          </footer>
        </article>`;
    })
    .join('');
}

async function init() {
  if (!list) return;

  const [siteResult, reviewsResult] = await Promise.allSettled([loadSite(), loadReviews()]);

  if (reviewsResult.status === 'rejected') {
    renderLoadError(list, reviewsResult.reason);
    if (summaryBox) summaryBox.innerHTML = '';
    return;
  }

  const site = siteResult.status === 'fulfilled' ? { ...FALLBACK_SITE, ...siteResult.value } : FALLBACK_SITE;
  const { reviews, notice } = reviewsResult.value;
  const sorted = reviews.filter(Boolean).slice().sort((a, b) => timestamp(b.date) - timestamp(a.date));
  const hasSamples = sorted.some((review) => review.sample === true);

  if (noticeBox) {
    if (notice && hasSamples) {
      renderNotice(noticeBox, {
        title: 'Sample content',
        message: notice,
        variant: 'warning'
      });
    } else {
      noticeBox.innerHTML = '';
    }
  }

  renderSummary(sorted, site.locale || 'en-US');

  if (sorted.length === 0) {
    renderNotice(list, {
      title: 'No reviews yet',
      message: 'Add entries to data/reviews.json and they will appear on this page.'
    });
    return;
  }

  renderReviews(sorted, site.locale || 'en-US');
}

init();
