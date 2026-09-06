// pages/_app.js
import Head from "next/head";
import { SWRConfig } from "swr";
import { useMemo } from "react";
import { shareMiddleware } from "../lib/share-client";
import "../styles/globals.css";

export default function MyApp({ Component, pageProps }) {
  const swrConfig = useMemo(() => ({ use: [shareMiddleware(pageProps.slug)] }), [pageProps.slug]);
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* فونت فارسیِ تمیز برای ارقام و متن (شبیه تیکر TGJU) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </Head>

      <SWRConfig value={swrConfig}>
        <Component {...pageProps} />
      </SWRConfig>
    </>
  );
}
