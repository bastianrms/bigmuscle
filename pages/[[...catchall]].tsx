import * as React from "react";
import {
  PlasmicComponent,
  extractPlasmicQueryData,
  ComponentRenderData,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import type { GetStaticPaths, GetStaticProps } from "next";

import Error from "next/error";
import { useRouter } from "next/router";
import { PLASMIC } from "@/plasmic-init";

// ✅ add:
import { useTheme } from "@/contexts/ThemeContext";

function PlasmicWithTheme(props: {
  plasmicData: ComponentRenderData;
  queryCache?: Record<string, unknown>;
}) {
  const { plasmicData, queryCache } = props;
  const router = useRouter();
  const pageMeta = plasmicData.entryCompMetas[0];

  const { theme } = useTheme(); // "light" | "dark"

  return (
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      prefetchedQueryData={queryCache}
      pageRoute={pageMeta.path}
      pageParams={pageMeta.params}
      pageQuery={router.query}
      globalVariants={[{ name: "Theme", value: theme }]}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );
}

export default function PlasmicLoaderPage(props: {
  plasmicData?: ComponentRenderData;
  queryCache?: Record<string, unknown>;
}) {
  const { plasmicData, queryCache } = props;

  if (!plasmicData || plasmicData.entryCompMetas.length === 0) {
    return <Error statusCode={404} />;
  }

  // ✅ ThemeProvider removed (now in _app.tsx)
  return <PlasmicWithTheme plasmicData={plasmicData} queryCache={queryCache} />;
}

export const getStaticProps: GetStaticProps = async (context) => {
  const { catchall } = context.params ?? {};
  const plasmicPath =
    typeof catchall === "string"
      ? catchall
      : Array.isArray(catchall)
      ? `/${catchall.join("/")}`
      : "/";

  const plasmicData = await PLASMIC.maybeFetchComponentData(plasmicPath);
  if (!plasmicData) {
    return { props: {} };
  }

  const pageMeta = plasmicData.entryCompMetas[0];

  const queryCache = await extractPlasmicQueryData(
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      pageRoute={pageMeta.path}
      pageParams={pageMeta.params}
      globalVariants={[{ name: "Theme", value: "light" }]} // build-time default ok
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );

  return { props: { plasmicData, queryCache }, revalidate: 60 };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const pageModules = await PLASMIC.fetchPages();

  const excludedPrefixes = ["/inbox"];

  const filtered = pageModules.filter((mod: { path: string }) => {
    return !excludedPrefixes.some(
      (p) => mod.path === p || mod.path.startsWith(p + "/")
    );
  });

  return {
    paths: filtered.map((mod: { path: string }) => ({
      params: { catchall: mod.path.substring(1).split("/") },
    })),
    fallback: "blocking",
  };
};