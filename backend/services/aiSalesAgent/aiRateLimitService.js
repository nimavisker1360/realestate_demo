const store = new Map();

const now = () => Date.now();

export const consumeAiRateLimit = ({
  key,
  limit = 30,
  windowMs = 60 * 1000,
} = {}) => {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) {
    return { allowed: true, remaining: limit, resetAt: now() + windowMs };
  }

  const currentTime = now();
  const existing = store.get(normalizedKey);

  if (!existing || existing.resetAt <= currentTime) {
    const record = {
      count: 1,
      resetAt: currentTime + windowMs,
    };
    store.set(normalizedKey, record);
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt: record.resetAt,
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  store.set(normalizedKey, existing);

  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
};
