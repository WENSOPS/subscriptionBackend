export const TRIP_TYPES = ["airport-transfer", "8Hr/80Km", "Full day"];

const TRIP_TYPE_ALIASES = {
  "8Hour/80Km": "8Hr/80Km",
};

export function normalizeTripType(tripType) {
  if (typeof tripType !== "string") return tripType;
  const trimmed = tripType.trim();
  return TRIP_TYPE_ALIASES[trimmed] ?? trimmed;
}
