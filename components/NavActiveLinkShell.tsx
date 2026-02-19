// components/NavActiveLinkShell.tsx
"use client";

import * as React from "react";
import { DataProvider } from "@plasmicapp/host";
import { useRouter } from "next/router";

export type NavActiveLinkCtx = {
  path: string;   // "/myphotos"
  asPath: string; // "/myphotos?x=1"
};

type Props = {
  children?: React.ReactNode;
  dataName?: string; // default: "nav"
};

export function NavActiveLinkShell({ children, dataName = "nav" }: Props) {
  const router = useRouter();

  const ctx: NavActiveLinkCtx = React.useMemo(() => {
    const asPath = router.asPath ?? "";
    const path = (asPath.split("?")[0] || "/") as string;
    return { path, asPath };
  }, [router.asPath]);

  return <DataProvider name={dataName} data={ctx}>{children}</DataProvider>;
}

export default NavActiveLinkShell;