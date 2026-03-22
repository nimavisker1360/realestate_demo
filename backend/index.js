import app from "./app.js";
import { loadBackendEnv } from "./config/loadEnv.js";
import { databaseConnectionInfo } from "./config/prismaConfig.js";

loadBackendEnv();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Email API available at /api/email`);
  console.log(
    `MongoDB connection strategy: ${databaseConnectionInfo.source}` +
      (databaseConnectionInfo.usedFallbackDns
        ? ` via fallback DNS (${databaseConnectionInfo.dnsServers.join(", ")})`
        : "")
  );
});
