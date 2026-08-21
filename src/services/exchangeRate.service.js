import { getKey, setKey } from "../config/redis/redis.utils.js";
import { EXCHANGE_RATES_KEY } from "../config/redis/redis.keys.js";
import { EXCHANGE_RATES_TTL } from "../config/redis/redis.constants.js";

const FETCH_TIMEOUT_MS = 10_000;

let refreshPromise = null;

function parseApiResponse(data) {
  if (data?.conversion_rates && data.result === "success") {
    return {
      rates: data.conversion_rates,
      date: data.time_last_update_utc || new Date().toISOString().slice(0, 10),
    };
  }

  if (data?.rates && typeof data.rates === "object") {
    return {
      rates: data.rates,
      date: data.date || new Date().toISOString().slice(0, 10),
    };
  }

  throw new Error("Invalid ExchangeRate-API response");
}

function buildInrPerForeignMap(rates) {
  const inrPerForeign = { INR: 1 };
  for (const [code, foreignPerInr] of Object.entries(rates)) {
    const rate = Number(foreignPerInr);
    if (rate > 0) {
      inrPerForeign[code.toUpperCase()] = 1 / rate;
    }
  }
  return inrPerForeign;
}

function parseCachedPayload(cached) {
  const parsed = JSON.parse(cached);
  if (parsed?.rates && typeof parsed.rates === "object") {
    return parsed;
  }
  throw new Error("Invalid cached exchange rates");
}

async function fetchLiveRates() {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  if (apiKey) {
    try {
      return await fetchRatesFromUrl(
        `https://v6.exchangerate-api.com/v6/${apiKey}/latest/INR`,
      );
    } catch (err) {
      console.warn("[exchangeRate] v6 API failed, trying v4:", err.message);
    }
  }

  return fetchRatesFromUrl("https://api.exchangerate-api.com/v4/latest/INR");
}

async function fetchRatesFromUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`ExchangeRate-API responded with ${response.status}`);
    }

    const data = await response.json();
    return parseApiResponse(data);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch all ExchangeRate-API rates and store INR-per-1-foreign in Redis.
 */
async function fetchAndCacheRates() {
  try {
    const { rates, date } = await fetchLiveRates();
    const inrPerForeign = buildInrPerForeignMap(rates);

    const payload = {
      rates: inrPerForeign,
      date,
      fetchedAt: new Date().toISOString(),
      source: "exchangerate-api",
    };

    await setKey(EXCHANGE_RATES_KEY, JSON.stringify(payload), EXCHANGE_RATES_TTL);
    return payload;
  } catch (err) {
    const stale = await getKey(EXCHANGE_RATES_KEY);
    if (stale) {
      try {
        console.warn("[exchangeRate] API failed, using existing Redis cache");
        return parseCachedPayload(stale);
      } catch {
        // ignore corrupt cache
      }
    }
    throw new Error(`Failed to fetch exchange rates: ${err.message}`);
  }
}

/**
 * Returns the full cached rate map. Reads Redis first, refreshes from API on miss.
 */
export const getExchangeRates = async () => {
  const cached = await getKey(EXCHANGE_RATES_KEY);
  if (cached) {
    try {
      return parseCachedPayload(cached);
    } catch {
      // fall through to refresh
    }
  }

  if (!refreshPromise) {
    refreshPromise = fetchAndCacheRates().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

/**
 * Returns how many INR equal 1 unit of the given currency.
 * @param {string} currency - ISO 4217 code
 */
export const getExchangeRate = async (currency) => {
  const code = (currency || "INR").toUpperCase();
  if (code === "INR") return 1;

  const { rates } = await getExchangeRates();
  const rate = rates[code];
  if (!rate || rate <= 0) {
    throw new Error(`Exchange rate unavailable for ${code}`);
  }
  return rate;
};

/** ISO codes available from the cached rate feed (includes INR). */
export const getSupportedRateCurrencies = async () => {
  const { rates } = await getExchangeRates();
  return Object.keys(rates);
};

export const isSupportedCurrency = async (currency) => {
  const code = (currency || "INR").toUpperCase();
  if (code === "INR") return true;
  const { rates } = await getExchangeRates();
  return Boolean(rates[code] && rates[code] > 0);
};
