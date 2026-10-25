import { DomainError } from './errors.js';

export function parseIsoDate(value, field, { endOfDay = false } = {}) {
  const datePart = typeof value === 'string' ? /^(\d{4}-\d{2}-\d{2})(?:$|T)/.exec(value)?.[1] : undefined;
  if (!datePart) throw new DomainError('VALIDATION', `${field} must be a valid ISO date`);

  const dateOnlyTime = Date.parse(`${datePart}T00:00:00.000Z`);
  if (Number.isNaN(dateOnlyTime) || new Date(dateOnlyTime).toISOString().slice(0, 10) !== datePart) {
    throw new DomainError('VALIDATION', `${field} must be a valid ISO date`);
  }

  const time = Date.parse(value);
  if (Number.isNaN(time)) throw new DomainError('VALIDATION', `${field} must be a valid ISO date`);

  return endOfDay && value === datePart ? time + 24 * 60 * 60 * 1000 - 1 : time;
}
