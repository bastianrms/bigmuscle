// pages/inbox/[username].tsx
import * as React from "react";
import type { GetServerSideProps } from "next";
import Error from "next/error";
import { useRouter } from "next/router";
import {
  PlasmicComponent,
  PlasmicRootProvider,
  extractPlasmicQueryData,
  ComponentRenderData,
} from "@plasmicapp/loader-nextjs";
import { PLASMIC } from "@/plasmic-init";
import { useTheme } from "@/contexts/ThemeContext";

type PageProps = {
  plasmicData: ComponentRenderData;
  queryCache: Record<string, unknown>;
};

export default function InboxUserPage({ plasmicData, queryCache }: PageProps) {
  const router = useRouter();
  const { theme } = useTheme(); // ✅ hook immer oben

  if (!plasmicData?.entryCompMetas?.length) {
    return <Error statusCode={404} />;
  }

  const pageMeta = plasmicData.entryCompMetas[0];

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

export const getServerSideProps: GetServerSideProps<PageProps> = async (context) => {
  const usernameParam = context.params?.username;
  const username = Array.isArray(usernameParam) ? usernameParam[0] : usernameParam;

  if (!username) return { notFound: true };

  const plasmicPath = `/inbox/${username}`;
  const plasmicData = await PLASMIC.maybeFetchComponentData(plasmicPath);
  if (!plasmicData) return { notFound: true };

  const pageMeta = plasmicData.entryCompMetas[0];

  const queryCache = await extractPlasmicQueryData(
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      pageRoute={pageMeta.path}
      pageParams={pageMeta.params}
      pageQuery={{ username }}
      globalVariants={[{ name: "Theme", value: "light" }]}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );

  return { props: { plasmicData, queryCache } };
};