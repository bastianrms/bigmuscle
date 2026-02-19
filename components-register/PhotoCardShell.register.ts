// components-register/PhotoCardShell.register.ts
import type { ComponentMeta } from "@plasmicapp/host";
import PhotoCardShell from "../components/PhotoCardShell";

export function registerPhotoCardShell(PLASMIC: {
  registerComponent: (comp: unknown, meta: ComponentMeta<unknown>) => void;
}) {
  PLASMIC.registerComponent(PhotoCardShell, {
    name: "PhotoCardShell",
    importPath: "../components/PhotoCardShell",
    providesData: true,
    props: {
      enabled: { type: "boolean", defaultValue: true },
      endpoint: { type: "string", defaultValue: "/api/photos/newUploads" },
      initialLimit: { type: "number", defaultValue: 24 },
      pageSize: { type: "number", defaultValue: 24 },
      includeSelf: { type: "boolean", defaultValue: true },
      dataName: { type: "string", defaultValue: "photoCards" },

      fallbackThumbUrl: { type: "string", displayName: "Fallback thumb URL" },

      enableInfiniteScroll: { type: "boolean", defaultValue: true },
      rootMarginPx: { type: "number", defaultValue: 800 },

      children: "slot",
    },
  });
}

export default registerPhotoCardShell;