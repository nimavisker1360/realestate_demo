const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const isConfigured = () =>
  Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);

const executePipeline = async (commands) => {
  if (!isConfigured()) return null;

  try {
    const response = await fetch(`${UPSTASH_REDIS_REST_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (_error) {
    return null;
  }
};

export const getCachedJson = async (key) => {
  if (!key) return null;

  const payload = await executePipeline([["GET", key]]);
  const rawValue = payload?.[0]?.result;

  if (typeof rawValue !== "string" || !rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (_error) {
    return null;
  }
};

export const setCachedJson = async (key, value, ttlSeconds = 3600) => {
  if (!key) return false;

  const serialized = JSON.stringify(value);
  const normalizedTtl = Number.isFinite(Number(ttlSeconds))
    ? Math.max(30, Number(ttlSeconds))
    : 3600;

  const payload = await executePipeline([["SETEX", key, normalizedTtl, serialized]]);
  return payload?.[0]?.result === "OK";
};

