"use client";

import React from "react";
import { useRouter } from "next/router";
import {
  PlasmicRootProvider,
  PlasmicComponent,
} from "@plasmicapp/loader-nextjs";
import { PLASMIC } from "../plasmic-init";

export default function UserProfilePlasmic() {
  const router = useRouter();
  const { user_id, ...restQuery } = router.query;

  if (!user_id || typeof user_id !== "string") {
    return null; // optional Loader
  }

  return (
    <PlasmicRootProvider
      loader={PLASMIC}
      // wichtig für $ctx.params.user_id in Plasmic:
      pageRoute={router.pathname}
      pageParams={{ user_id }}
      pageQuery={router.query}
    >
      {/* HIER den Namen deiner Plasmic-Userseite eintragen */}
      <PlasmicComponent component="User Profile Page" />
    </PlasmicRootProvider>
  );
}