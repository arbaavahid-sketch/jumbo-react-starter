// pages/_app.js
import Head from "next/head";
import "../styles/globals.css";

export default function MyApp({ Component, pageProps }) {
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

      <Component {...pageProps} />
    </>
  );
}
