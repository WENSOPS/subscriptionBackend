export const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "IDR"]);
export const THREE_DECIMAL = new Set(["KWD", "BHD", "OMR"]);

export const roundForeign = (amount, currency) => {
  if (ZERO_DECIMAL.has(currency)) return Math.ceil(amount);
  if (THREE_DECIMAL.has(currency)) return Math.ceil(amount * 1000) / 1000;
  return Math.ceil(amount * 100) / 100;
};

export const minChargeAmount = (currency) => {
  if (currency === "INR") return 1;
  if (ZERO_DECIMAL.has(currency)) return 1;
  return 0.01;
};

/**
 * Convert an INR amount to a foreign currency charge amount.
 * @param {number} inrAmount
 * @param {string} currency
 * @param {number} rate - INR per 1 unit of foreign currency (from API/Redis)
 */
export const convertINRToForeign = (inrAmount, currency, rate) => {
  if (!rate || rate <= 0) {
    throw new Error("Invalid exchange rate");
  }
  const foreign = roundForeign(inrAmount / rate, currency);
  return Math.max(minChargeAmount(currency), foreign);
};
