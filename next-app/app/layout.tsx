import Script from "next/script";
import type { ReactNode } from "react";
import {
  GA_MEASUREMENT_ID,
  GOOGLE_ADS_ID,
  GTM_ID,
} from "../lib/analytics";

const gtmBootstrapScript = GTM_ID
  ? `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${GTM_ID}');
    `
  : null;

const googleTagConfigScript = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  window.gtag = window.gtag || gtag;
  gtag('js', new Date());
  gtag('config', '${GA_MEASUREMENT_ID}', {
    send_page_view: true
  });
  ${
    GOOGLE_ADS_ID
      ? `gtag('config', '${GOOGLE_ADS_ID}');`
      : ""
  }
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {gtmBootstrapScript ? (
          <Script id="google-tag-manager" strategy="beforeInteractive">
            {gtmBootstrapScript}
          </Script>
        ) : null}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {googleTagConfigScript}
        </Script>
      </head>
      <body>
        {GTM_ID ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              title="Google Tag Manager"
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        ) : null}
        {children}
      </body>
    </html>
  );
}
