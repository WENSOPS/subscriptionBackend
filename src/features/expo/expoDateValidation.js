/**
 * Shared expo date rules (used by express-validator and unit tests).
 */

export function parseExpoDate(value, label) {
  if (value == null || value === "") {
    throw new Error(`${label} is required`);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`${label} must be a valid date`);
  }
  return d;
}

/** Service window always matches the event window. */
export function serviceDatesFromEvent(eventStart, eventEnd) {
  return {
    serviceStart: eventStart,
    serviceEnd: eventEnd,
  };
}

/**
 * @param {{ eventStart: string, eventEnd: string }} fields
 * @returns {string[]} Human-readable error messages (empty if valid)
 */
export function validateExpoDateFields(fields) {
  const errors = [];
  let eventStart;
  let eventEnd;

  try {
    eventStart = parseExpoDate(fields.eventStart, "Event start");
  } catch (e) {
    errors.push(e.message);
  }
  try {
    eventEnd = parseExpoDate(fields.eventEnd, "Event end");
  } catch (e) {
    errors.push(e.message);
  }

  if (eventStart && eventEnd && eventEnd < eventStart) {
    errors.push("Event end must be on or after event start");
  }

  return errors;
}
