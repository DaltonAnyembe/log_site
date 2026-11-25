/**
 * Contact form validation rules. Kept separate from the DOM so the rules can be
 * tested directly (see tests/selftest.html).
 */

export const CONTACT_LIMITS = {
  nameMin: 2,
  nameMax: 80,
  subjectMin: 3,
  subjectMax: 120,
  messageMin: 10,
  messageMax: 2000
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function isValidEmail(value) {
  const email = String(value ?? '').trim();
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

/**
 * @param {{name?: string, email?: string, subject?: string, message?: string}} values
 * @returns {{valid: boolean, errors: Record<string, string>}}
 */
export function validateContact(values = {}) {
  const name = String(values.name ?? '').trim();
  const email = String(values.email ?? '').trim();
  const subject = String(values.subject ?? '').trim();
  const message = String(values.message ?? '').trim();
  const errors = {};

  if (!name) {
    errors.name = 'Please enter your name.';
  } else if (name.length < CONTACT_LIMITS.nameMin) {
    errors.name = `Your name must be at least ${CONTACT_LIMITS.nameMin} characters.`;
  } else if (name.length > CONTACT_LIMITS.nameMax) {
    errors.name = `Your name must be ${CONTACT_LIMITS.nameMax} characters or fewer.`;
  }

  if (!email) {
    errors.email = 'Please enter your email address.';
  } else if (!isValidEmail(email)) {
    errors.email = 'Please enter a valid email address, for example name@example.com.';
  }

  if (!subject) {
    errors.subject = 'Please enter a subject.';
  } else if (subject.length < CONTACT_LIMITS.subjectMin) {
    errors.subject = `The subject must be at least ${CONTACT_LIMITS.subjectMin} characters.`;
  } else if (subject.length > CONTACT_LIMITS.subjectMax) {
    errors.subject = `The subject must be ${CONTACT_LIMITS.subjectMax} characters or fewer.`;
  }

  if (!message) {
    errors.message = 'Please enter your message.';
  } else if (message.length < CONTACT_LIMITS.messageMin) {
    errors.message = `Your message must be at least ${CONTACT_LIMITS.messageMin} characters.`;
  } else if (message.length > CONTACT_LIMITS.messageMax) {
    errors.message = `Your message must be ${CONTACT_LIMITS.messageMax} characters or fewer.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
