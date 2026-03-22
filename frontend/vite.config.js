import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const GTM_HEAD_PLACEHOLDER = "<!-- GTM_HEAD -->";
const GTM_BODY_PLACEHOLDER = "<!-- GTM_BODY -->";
const CONFIG_DIR = fileURLToPath(new URL(".", import.meta.url));

const readEnvValue = (env, names) => {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }

  return "";
};

const escapeHtmlAttribute = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const buildGtmHead = (gtmId) => {
  if (!gtmId) return "";

  return `<script>
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({"gtm.start":
      new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!="dataLayer"?"&l="+l:"";j.async=true;j.src=
      "https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,"script","dataLayer",${JSON.stringify(gtmId)});
    </script>`;
};

const buildGtmBody = (gtmId) => {
  if (!gtmId) return "";

  const safeGtmId = escapeHtmlAttribute(gtmId);
  return `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${safeGtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = {
    ...loadEnv(mode, CONFIG_DIR, ""),
    ...Object.fromEntries(
      Object.entries(process.env).filter(([, value]) => typeof value === "string")
    ),
  };
  const gtmId = readEnvValue(env, ["NEXT_PUBLIC_GTM_ID", "VITE_GTM_ID"]);

  return {
    plugins: [
      react(),
      {
        name: "inject-gtm-into-html",
        transformIndexHtml(html) {
          return html
            .replace(GTM_HEAD_PLACEHOLDER, buildGtmHead(gtmId))
            .replace(GTM_BODY_PLACEHOLDER, buildGtmBody(gtmId));
        },
      },
    ],
    build: {
      target: "es2018",
    },
  };
});
