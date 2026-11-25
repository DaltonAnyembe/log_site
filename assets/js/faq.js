/**
 * FAQ page: expandable questions rendered from data/faqs.json, grouped by the
 * optional "category" field. Uses native <details> so no animation or extra
 * JavaScript is needed for the expand/collapse behaviour.
 */

import { loadFaqs } from './data.js';
import { escapeHtml, renderLoadError, renderNotice } from './ui.js';

const list = document.querySelector('[data-faq-list]');
const countLabel = document.querySelector('[data-faq-count]');

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'general';
}

function answerHtml(answer) {
  return String(answer ?? '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');
}

function groupByCategory(faqs) {
  const groups = new Map();
  faqs.forEach((faq) => {
    const category = String(faq.category ?? '').trim() || 'General';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(faq);
  });
  return groups;
}

function render(faqs) {
  if (countLabel) {
    countLabel.textContent = `${faqs.length} question${faqs.length === 1 ? '' : 's'}`;
  }

  list.innerHTML = [...groupByCategory(faqs).entries()]
    .map(([category, items]) => {
      const headingId = `faq-group-${slugify(category)}`;
      const questions = items
        .map(
          (faq) => `
          <details class="faq-item">
            <summary class="faq-item__question">${escapeHtml(faq.question ?? 'Untitled question')}</summary>
            <div class="faq-item__answer">${answerHtml(faq.answer)}</div>
          </details>`
        )
        .join('');

      return `
        <section class="faq-group" aria-labelledby="${headingId}">
          <h2 class="faq-group__heading" id="${headingId}">${escapeHtml(category)}</h2>
          ${questions}
        </section>`;
    })
    .join('');
}

async function init() {
  if (!list) return;

  try {
    const faqs = (await loadFaqs()).filter(Boolean);
    if (faqs.length === 0) {
      renderNotice(list, {
        title: 'No questions yet',
        message: 'Add entries to data/faqs.json and they will appear on this page.'
      });
      return;
    }
    render(faqs);
  } catch (error) {
    renderLoadError(list, error);
    if (countLabel) countLabel.textContent = '';
  }
}

init();
