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
      </Head>

      <SWRConfig value={swrConfig}>
        <Component {...pageProps} />
      </SWRConfig>
    </>
  );
}
