import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const CONFIG_DIR = fileURLToPath(new URL(".", import.meta.url));
const ENV_PATHS = [
  path.resolve(CONFIG_DIR, "../.env"),
  path.resolve(CONFIG_DIR, "../../.env"),
];

let envLoaded = false;
const envLoadInfo = {
  attemptedPaths: [...ENV_PATHS],
  loadedPaths: [],
};

export const loadBackendEnv = () => {
  if (envLoaded) return;

  for (const envPath of ENV_PATHS) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const result = dotenv.config({
      path: envPath,
      override: false,
      quiet: true,
    });

    if (result.parsed) {
      envLoadInfo.loadedPaths.push(envPath);
    }
  }

  envLoaded = true;
};

export const getBackendEnvLoadInfo = () => ({
  ...envLoadInfo,
  loadedPaths: [...envLoadInfo.loadedPaths],
});
