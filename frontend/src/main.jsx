import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import { Auth0Provider } from "@auth0/auth0-react";
import { MantineProvider } from "@mantine/core";
import { HelmetProvider } from "react-helmet-async";
import i18n from "./i18n";
import { Analytics } from "@vercel/analytics/react";
import {
  buildLocalizedPath,
  extractLanguageFromPath,
  resolvePreferredLanguage,
} from "./utils/languageRouting";
import { captureAttributionParams } from "./utils/attribution";

captureAttributionParams();

const currentPathLanguage = extractLanguageFromPath(window.location.pathname);

if (!currentPathLanguage) {
  const preferredLanguage = resolvePreferredLanguage("tr");
  window.localStorage.setItem("i18nextLng", preferredLanguage);

  const localizedPath = buildLocalizedPath({
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    language: preferredLanguage,
  });

  window.history.replaceState(null, "", localizedPath);
  i18n.changeLanguage(preferredLanguage);
} else {
  i18n.changeLanguage(currentPathLanguage);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Auth0Provider
      domain="dev-pdz8rd3zuiwyzqzo.us.auth0.com"
      clientId="N7a0UjSNt8egPgXFOZI5EZifFeCekPoP"
      authorizationParams={{
        redirect_uri: window.location.origin,
        scope: "openid profile email",
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      <MantineProvider>
        <HelmetProvider>
          <App />
          <Analytics />
        </HelmetProvider>
      </MantineProvider>
    </Auth0Provider>
  </React.StrictMode>
);
