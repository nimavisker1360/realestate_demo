import { createContext, useCallback, useEffect, useMemo, useState } from "react";

const CurrencyContext = createContext(null);

const BASE_CURRENCY = "USD";
const CACHE_KEY = "exchangeRatesCache_v4";
const LEGACY_CACHE_KEYS = ["exchangeRatesCache_v3"];
const SELECTED_KEY = "selectedCurrency_v2";
const MIGRATION_KEY = "selectedCurrency_migrated_v1";
const SUPPORTED_CURRENCIES = [
  { code: "EUR", symbol: "\u20AC" },
  { code: "GBP", symbol: "\u00A3" },
  { code: "USD", symbol: "$" },
  { code: "TRY", symbol: "\u20BA" },
];

const getDefaultSelectedCurrency = () => {
  const configured = String(
    import.meta.env.VITE_DEFAULT_FIAT_CURRENCY || BASE_CURRENCY
  ).toUpperCase();
  return SUPPORTED_CURRENCIES.some((currency) => currency.code === configured)
    ? configured
    : BASE_CURRENCY;
};

const getTodayKey = () => {
  try {
    return new Date().toLocaleDateString("en-CA");
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

const readCache = () => {
  const keysToCheck = [CACHE_KEY, ...LEGACY_CACHE_KEYS];
  for (const key of keysToCheck) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") continue;
      if (!parsed.rates || typeof parsed.rates !== "object") continue;
      return parsed;
    } catch {
      // continue
    }
  }
  return null;
};

const writeCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
};

const toPositiveNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
};

const readRateFromMap = (ratesMap, code) => {
  if (!ratesMap || typeof ratesMap !== "object") return null;
  const upperCode = String(code || "").toUpperCase();
  return (
    toPositiveNumber(ratesMap?.[upperCode]) ??
    toPositiveNumber(ratesMap?.[upperCode.toLowerCase()]) ??
    null
  );
};

export const CurrencyProvider = ({ children }) => {
  const [selectedCurrency, setSelectedCurrency] = useState(
    getDefaultSelectedCurrency
  );
  const [rates, setRates] = useState({ [BASE_CURRENCY]: 1 });
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(SELECTED_KEY);
    const defaultCurrency = getDefaultSelectedCurrency();
    const isSupported =
      saved && SUPPORTED_CURRENCIES.some((c) => c.code === saved);
    const hasMigrated = Boolean(localStorage.getItem(MIGRATION_KEY));

    if (isSupported) {
      if (
        !hasMigrated &&
        saved === BASE_CURRENCY &&
        defaultCurrency !== BASE_CURRENCY
      ) {
        setSelectedCurrency(defaultCurrency);
        localStorage.setItem(SELECTED_KEY, defaultCurrency);
        localStorage.setItem(MIGRATION_KEY, "1");
        return;
      }
      setSelectedCurrency(saved);
      return;
    }

    setSelectedCurrency(defaultCurrency);
  }, []);

  useEffect(() => {
    localStorage.setItem(SELECTED_KEY, selectedCurrency);
  }, [selectedCurrency]);

  useEffect(() => {
    const cached = readCache();
    const todayKey = getTodayKey();
    const requiredCodes = SUPPORTED_CURRENCIES.map((c) => c.code).filter(
      (code) => code !== BASE_CURRENCY
    );
    const cacheHasRequiredRates = requiredCodes.every(
      (code) => cached?.rates?.[code]
    );
    const cacheMatchesBase = cached?.base === BASE_CURRENCY;

    if (
      cached?.date === todayKey &&
      cached?.rates &&
      cacheHasRequiredRates &&
      cacheMatchesBase
    ) {
      setRates({ [BASE_CURRENCY]: 1, ...cached.rates });
      setLastUpdated(cached.date || cached.fetchedAt || null);
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();

    const fetchRates = async () => {
      const apiKey = import.meta.env.VITE_EXCHANGE_RATE_API_KEY;
      const symbolsParam = SUPPORTED_CURRENCIES.map((c) => c.code).join(",");
      const latestParams = new URLSearchParams({
        base: BASE_CURRENCY,
        symbols: symbolsParam,
      });
      if (apiKey) latestParams.set("access_key", apiKey);

      const liveParams = new URLSearchParams({
        source: "USD",
        currencies: symbolsParam,
      });
      if (apiKey) liveParams.set("access_key", apiKey);

      const requestJson = async (url) => {
        const response = await fetch(url, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Failed to fetch exchange rates");
        const payload = await response.json();
        if (payload?.success === false) {
          throw new Error(payload?.error?.info || "Exchange rate API error");
        }
        if (payload?.result === "error") {
          throw new Error(payload?.error || "Exchange rate API error");
        }
        return payload;
      };

      const normalizeRates = (payload) => {
        const buildUsdBasedRates = (sourceCurrency, getSourceToCurrency, date) => {
          const normalizedSource = String(sourceCurrency || BASE_CURRENCY).toUpperCase();
          const sourceToBase =
            normalizedSource === BASE_CURRENCY
              ? 1
              : toPositiveNumber(getSourceToCurrency(BASE_CURRENCY));

          if (!sourceToBase) {
            throw new Error("Missing base currency quote");
          }

          const computedRates = {};
          SUPPORTED_CURRENCIES.forEach(({ code }) => {
            if (code === BASE_CURRENCY) return;

            const sourceToCode =
              code === normalizedSource
                ? 1
                : toPositiveNumber(getSourceToCurrency(code));

            if (!sourceToCode) return;
            computedRates[code] = sourceToCode / sourceToBase;
          });

          return {
            base: BASE_CURRENCY,
            rates: computedRates,
            date: date || null,
          };
        };

        if (payload?.rates && typeof payload.rates === "object") {
          const source = String(
            payload.base || payload.base_code || payload.source || BASE_CURRENCY
          ).toUpperCase();
          return buildUsdBasedRates(
            source,
            (code) => {
              if (String(code).toUpperCase() === source) return 1;
              return readRateFromMap(payload.rates, code);
            },
            payload.date
          );
        }

        if (payload?.quotes && typeof payload.quotes === "object") {
          const source = String(payload.source || BASE_CURRENCY).toUpperCase();
          return buildUsdBasedRates(
            source,
            (code) => {
              if (String(code).toUpperCase() === source) return 1;
              return payload.quotes?.[`${source}${code}`];
            },
            payload.date
          );
        }

        throw new Error("Invalid exchange rate response");
      };

      const providers = [
        `https://api.exchangerate.host/latest?${latestParams.toString()}`,
        `https://api.exchangerate.host/live?${liveParams.toString()}`,
        `https://exchangerate.host/latest?${latestParams.toString()}`,
        "https://open.er-api.com/v6/latest/USD",
        "https://api.exchangerate-api.com/v4/latest/USD",
        `https://api.frankfurter.app/latest?from=${BASE_CURRENCY}&to=${symbolsParam}`,
      ];

      let normalized;
      let lastError = null;

      for (const url of providers) {
        try {
          const payload = await requestJson(url);
          normalized = normalizeRates(payload);
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!normalized) {
        throw lastError || new Error("No exchange rate provider available");
      }

      const nextRates = { [BASE_CURRENCY]: 1, ...normalized.rates };
      const cachePayload = {
        date: normalized?.date || todayKey,
        base: BASE_CURRENCY,
        rates: normalized.rates,
        fetchedAt: new Date().toISOString(),
      };

      if (!isCancelled) {
        setRates(nextRates);
        setLastUpdated(cachePayload.date || cachePayload.fetchedAt || null);
        writeCache(cachePayload);
      }
    };

    fetchRates().catch(() => {
      if (cached?.rates && cacheHasRequiredRates && cacheMatchesBase) {
        setRates({ [BASE_CURRENCY]: 1, ...cached.rates });
        setLastUpdated(cached.date || cached.fetchedAt || null);
      }
    });

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, []);

  const convertAmount = useCallback(
    (amount, fromCurrency = BASE_CURRENCY, toCurrency = selectedCurrency) => {
      const value = Number(amount || 0);
      const fromCode = String(fromCurrency || BASE_CURRENCY).toUpperCase();
      const toCode = String(toCurrency || selectedCurrency).toUpperCase();

      if (!Number.isFinite(value)) return 0;
      if (fromCode === toCode) return value;

      const getRate = (code) => (code === BASE_CURRENCY ? 1 : rates?.[code]);
      const fromRate = getRate(fromCode);
      const toRate = getRate(toCode);

      if (!fromRate || !toRate) return value;

      if (fromCode === BASE_CURRENCY) return value * toRate;
      if (toCode === BASE_CURRENCY) return value / fromRate;

      const amountInBase = value / fromRate;
      return amountInBase * toRate;
    },
    [rates, selectedCurrency]
  );

  const formatMoney = useCallback((amount, currencyCode, locale = "tr-TR") => {
    const value = Number(amount || 0);
    if (!Number.isFinite(value)) return "";
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
        currencyDisplay: "narrowSymbol",
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `${currencyCode} ${Math.round(value).toLocaleString("tr-TR")}`;
    }
  }, []);

  const value = useMemo(
    () => ({
      currencies: SUPPORTED_CURRENCIES,
      selectedCurrency,
      setSelectedCurrency,
      rates,
      lastUpdated,
      convertAmount,
      formatMoney,
      baseCurrency: BASE_CURRENCY,
    }),
    [selectedCurrency, rates, lastUpdated, convertAmount, formatMoney]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;
