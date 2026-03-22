import dns from "node:dns/promises";
import { loadBackendEnv } from "./loadEnv.js";

loadBackendEnv();

const DEFAULT_PUBLIC_DNS_SERVERS = ["8.8.8.8", "1.1.1.1"];
const SRV_PROTOCOL = "mongodb+srv:";
const DIRECT_PROTOCOL = "mongodb:";

const normalizeString = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const parseDnsServers = (value) => {
  const configured = normalizeString(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return configured.length > 0 ? configured : DEFAULT_PUBLIC_DNS_SERVERS;
};

const getConfiguredDatabaseUrl = () => {
  const directUrl =
    normalizeString(process.env.DATABASE_URL_DIRECT) ||
    normalizeString(process.env.MONGODB_DIRECT_URL);
  const primaryUrl =
    normalizeString(process.env.DATABASE_URL) ||
    normalizeString(process.env.MONGODB_URI);

  if (directUrl) {
    return {
      url: directUrl,
      source: "env:direct",
    };
  }

  if (!primaryUrl) {
    throw new Error(
      "MongoDB connection string is missing. Set DATABASE_URL or DATABASE_URL_DIRECT."
    );
  }

  return {
    url: primaryUrl,
    source: "env",
  };
};

const parseTxtOptions = (txtRecords = []) => {
  const searchParams = new URLSearchParams();

  for (const record of txtRecords) {
    const value = Array.isArray(record) ? record.join("") : String(record || "");
    const normalized = normalizeString(value);
    if (!normalized) continue;

    const parsed = new URLSearchParams(normalized);
    for (const [key, paramValue] of parsed.entries()) {
      if (!searchParams.has(key)) {
        searchParams.set(key, paramValue);
      }
    }
  }

  return searchParams;
};

const buildDirectMongoUrl = (srvUrl, srvRecords = [], txtRecords = []) => {
  const parsedUrl = new URL(srvUrl);
  const searchParams = new URLSearchParams(parsedUrl.search);
  const txtOptions = parseTxtOptions(txtRecords);

  for (const [key, value] of txtOptions.entries()) {
    if (!searchParams.has(key)) {
      searchParams.set(key, value);
    }
  }

  if (!searchParams.has("tls") && !searchParams.has("ssl")) {
    searchParams.set("tls", "true");
  }
  if (!searchParams.has("retryWrites")) {
    searchParams.set("retryWrites", "true");
  }
  if (!searchParams.has("w")) {
    searchParams.set("w", "majority");
  }

  const authority = srvRecords
    .map((record) => {
      const host = normalizeString(record?.name).replace(/\.$/, "");
      const port = Number(record?.port) || 27017;
      return host ? `${host}:${port}` : "";
    })
    .filter(Boolean)
    .join(",");

  if (!authority) {
    throw new Error("MongoDB SRV expansion returned no shard hosts.");
  }

  const auth =
    parsedUrl.username || parsedUrl.password
      ? `${encodeURIComponent(parsedUrl.username)}:${encodeURIComponent(
          parsedUrl.password
        )}@`
      : "";
  const pathname =
    normalizeString(parsedUrl.pathname) && parsedUrl.pathname !== "/"
      ? parsedUrl.pathname
      : "";
  const queryString = searchParams.toString();

  return `${DIRECT_PROTOCOL}//${auth}${authority}${pathname}${
    queryString ? `?${queryString}` : ""
  }`;
};

const resolveAtlasDnsRecords = async (hostname) => {
  const srvLookupName = `_mongodb._tcp.${hostname}`;
  const publicDnsServers = parseDnsServers(process.env.MONGODB_DNS_SERVERS);

  try {
    const [srvRecords, txtRecords] = await Promise.all([
      dns.resolveSrv(srvLookupName),
      dns.resolveTxt(hostname).catch(() => []),
    ]);

    return {
      srvRecords,
      txtRecords,
      resolutionSource: "system",
      dnsServers: [],
    };
  } catch (systemError) {
    const resolver = new dns.Resolver();
    resolver.setServers(publicDnsServers);

    try {
      const [srvRecords, txtRecords] = await Promise.all([
        resolver.resolveSrv(srvLookupName),
        resolver.resolveTxt(hostname).catch(() => []),
      ]);

      return {
        srvRecords,
        txtRecords,
        resolutionSource: "public-dns",
        dnsServers: publicDnsServers,
        fallbackReason: systemError.message,
      };
    } catch (fallbackError) {
      return {
        srvRecords: [],
        txtRecords: [],
        resolutionSource: "unresolved",
        dnsServers: publicDnsServers,
        fallbackReason: `${systemError.message}; ${fallbackError.message}`,
      };
    }
  }
};

const getDatabaseNameFromUrl = (databaseUrl) => {
  const parsedUrl = new URL(databaseUrl);
  const pathname = normalizeString(parsedUrl.pathname).replace(/^\/+/, "");
  return pathname || "test";
};

export const resolveMongoDatabaseConfig = async () => {
  const configuredUrl = getConfiguredDatabaseUrl();
  const parsedUrl = new URL(configuredUrl.url);

  if (parsedUrl.protocol !== SRV_PROTOCOL) {
    return {
      url: configuredUrl.url,
      databaseName: getDatabaseNameFromUrl(configuredUrl.url),
      source: configuredUrl.source,
      usedFallbackDns: false,
      resolutionSource: "not-needed",
      dnsServers: [],
    };
  }

  const dnsResolution = await resolveAtlasDnsRecords(parsedUrl.hostname);
  if (dnsResolution.srvRecords.length === 0) {
    return {
      url: configuredUrl.url,
      databaseName: getDatabaseNameFromUrl(configuredUrl.url),
      source: `${configuredUrl.source}:srv-unresolved`,
      usedFallbackDns: false,
      resolutionSource: dnsResolution.resolutionSource,
      dnsServers: dnsResolution.dnsServers,
      fallbackReason: dnsResolution.fallbackReason || null,
    };
  }

  return {
    url: buildDirectMongoUrl(
      configuredUrl.url,
      dnsResolution.srvRecords,
      dnsResolution.txtRecords
    ),
    databaseName: getDatabaseNameFromUrl(configuredUrl.url),
    source: `${configuredUrl.source}:srv-expanded`,
    usedFallbackDns: dnsResolution.resolutionSource === "public-dns",
    resolutionSource: dnsResolution.resolutionSource,
    dnsServers: dnsResolution.dnsServers,
    fallbackReason: dnsResolution.fallbackReason || null,
  };
};
