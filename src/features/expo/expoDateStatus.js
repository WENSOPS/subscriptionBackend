/** Calendar date key (YYYY-MM-DD) — aligned with serializeExpoForClient toDateOnly. */
export function toDateOnlyKey(value) {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Event lifecycle from eventStart / eventEnd only (inclusive calendar days).
 * serviceStart / serviceEnd are never used for ended/live/upcoming.
 *
 * @returns {{
 *   dateStatus: 'upcoming'|'ongoing'|'completed',
 *   isEventEnded: boolean,
 *   isEnded: boolean,
 *   isLive: boolean,
 * }}
 */
export function computeEventDateFields(eventStart, eventEnd, now = new Date()) {
  const todayKey = toDateOnlyKey(now);
  const startKey = toDateOnlyKey(eventStart);
  const endKey = toDateOnlyKey(eventEnd);

  if (!todayKey || !startKey || !endKey) {
    return {
      dateStatus: "upcoming",
      isEventEnded: false,
      isEnded: false,
      isLive: false,
    };
  }

  let dateStatus = "upcoming";
  if (todayKey > endKey) {
    dateStatus = "completed";
  } else if (todayKey >= startKey) {
    dateStatus = "ongoing";
  }

  const isEventEnded = dateStatus === "completed";

  return {
    dateStatus,
    isEventEnded,
    isEnded: isEventEnded,
    isLive: dateStatus === "ongoing",
  };
}

/** @deprecated Use computeEventDateFields(eventStart, eventEnd) — ignores service dates. */
export function computeExpoDateFields(expo, now = new Date()) {
  return computeEventDateFields(expo?.eventStart, expo?.eventEnd, now);
}

/** Public hub/detail: hidden once eventEnd has passed. */
export function isExpoActiveByEventDates(eventStart, eventEnd, now = new Date()) {
  const { isEventEnded, dateStatus } = computeEventDateFields(
    eventStart,
    eventEnd,
    now,
  );
  return !isEventEnded && dateStatus !== "completed";
}
