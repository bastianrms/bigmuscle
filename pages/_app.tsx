// pages/_app.tsx
import type { AppProps } from "next/app";

// Import the CSS required for SupabaseUppyUploader globally
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";

import { useEffect, useState } from "react";
import Router from "next/router";
import { DataProvider } from "@plasmicapp/host";

// ✅ add:
import { ThemeProvider } from "@/contexts/ThemeContext";

export default function MyApp({ Component, pageProps }: AppProps) {
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    const start = () => setRouteLoading(true);
    const end = () => setRouteLoading(false);

    Router.events.on("routeChangeStart", start);
    Router.events.on("routeChangeComplete", end);
    Router.events.on("routeChangeError", end);

    return () => {
      Router.events.off("routeChangeStart", start);
      Router.events.off("routeChangeComplete", end);
      Router.events.off("routeChangeError", end);
    };
  }, []);

  return (
    <ThemeProvider>
      <DataProvider name="routeLoading" data={routeLoading}>
        <Component {...pageProps} />
      </DataProvider>
    </ThemeProvider>
  );
}