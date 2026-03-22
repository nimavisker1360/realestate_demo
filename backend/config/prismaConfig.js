import pkg from "@prisma/client";
import { MongoClient } from "mongodb";
import { loadBackendEnv } from "./loadEnv.js";
import { resolveMongoDatabaseConfig } from "./databaseConfig.js";

loadBackendEnv();

const { PrismaClient } = pkg;
const databaseConfig = await resolveMongoDatabaseConfig();
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseConfig.url,
    },
  },
});

// MongoDB native client for raw queries
const mongoClient = new MongoClient(databaseConfig.url);
let db = null;

const getMongoDb = async () => {
  if (!db) {
    await mongoClient.connect();
    db = mongoClient.db(databaseConfig.databaseName);
  }
  return db;
};

export const databaseConnectionInfo = {
  source: databaseConfig.source,
  usedFallbackDns: databaseConfig.usedFallbackDns,
  resolutionSource: databaseConfig.resolutionSource,
  dnsServers: databaseConfig.dnsServers,
  databaseName: databaseConfig.databaseName,
  fallbackReason: databaseConfig.fallbackReason || null,
};

export { prisma, getMongoDb };
