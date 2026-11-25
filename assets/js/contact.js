/**
 * Contact page: client-side validation and submission feedback.
 *
 * NOTE: there is no backend. A valid submission is confirmed in the UI and the
 * form is reset; nothing is transmitted. Replace the submit handler with a call
 * to your own endpoint or mail service when the store goes live.
 */

import { CONTACT_LIMITS, validateContact } from './validate.js';
import { renderNotice } from './ui.js';

const form = document.querySelector('[data-contact-form]');
const feedback = document.querySelector('[data-contact-feedback]');
const FIELD_NAMES = ['name', 'email', 'subject', 'message'];

function fieldElement(name) {
  const element = form?.elements.namedItem(name);
  return element instanceof HTMLElement ? element : null;
}

function readValues() {
  return FIELD_NAMES.reduce((values, name) => {
    const element = fieldElement(name);
    values[name] = element && 'value' in element ? element.value : '';
    return values;
  }, {});
}

function setFieldError(name, message) {
  const errorBox = form.querySelector(`[data-error-for="${name}"]`);
  const input = fieldElement(name);
  if (errorBox) {
    errorBox.textContent = message || '';
    errorBox.hidden = !message;
  }
  if (input) {
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }
}

function applyLimits() {
  const limits = {
    name: CONTACT_LIMITS.nameMax,
    email: 254,
    subject: CONTACT_LIMITS.subjectMax,
    message: CONTACT_LIMITS.messageMax
  };
  Object.entries(limits).forEach(([name, max]) => {
    const element = fieldElement(name);
    if (element) element.maxLength = max;
  });
}

function showFeedback(config) {
  if (!feedback) return;
  renderNotice(feedback, config);
  feedback.hidden = false;
  feedback.focus();
}

function init() {
  if (!form) return;
  applyLimits();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = readValues();
    const { valid, errors } = validateContact(values);

    FIELD_NAMES.forEach((name) => setFieldError(name, errors[name]));

    if (!valid) {
      showFeedback({
        title: 'Please check the form',
        message: 'Some fields need attention. Each problem is listed next to the relevant field.',
        variant: 'error'
      });
      const firstInvalid = FIELD_NAMES.find((name) => errors[name]);
      if (firstInvalid) fieldElement(firstInvalid)?.focus();
      return;
    }

    const name = values.name.trim();
    form.reset();
    FIELD_NAMES.forEach((fieldName) => setFieldError(fieldName, ''));

    showFeedback({
      title: 'Validation passed',
      message: `Thanks, ${name}. Your message passed validation. This demo form is not connected to an email service yet, so nothing was sent — hook it up to your own endpoint when the store goes live.`,
      variant: 'success'
    });
  });

  form.addEventListener('focusout', (event) => {
    const name = event.target?.name;
    if (!FIELD_NAMES.includes(name)) return;
    const { errors } = validateContact(readValues());
    setFieldError(name, errors[name]);
  });

  form.addEventListener('input', (event) => {
    const name = event.target?.name;
    if (!FIELD_NAMES.includes(name)) return;
    const input = fieldElement(name);
    if (input?.getAttribute('aria-invalid') !== 'true') return;
    const { errors } = validateContact(readValues());
    setFieldError(name, errors[name]);
  });
}

init();
