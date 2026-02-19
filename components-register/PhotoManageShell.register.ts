// components-register/PhotoManageShell.register.ts
import type { ComponentMeta } from "@plasmicapp/host";
import PhotoManageShell from "../components/PhotoManageShell";

export function registerPhotoManageShell(PLASMIC: {
  registerComponent: (comp: unknown, meta: ComponentMeta<unknown>) => void;
}) {
  PLASMIC.registerComponent(PhotoManageShell, {
    name: "PhotoManageShell",
    importPath: "../components/PhotoManageShell",
    providesData: true,
    props: {
      enabled: { type: "boolean", defaultValue: true },

      endpoint: { type: "string", defaultValue: "/api/photos/myPhotos" },
      limit: { type: "number", defaultValue: 200 },

      saveEndpoint: { type: "string", defaultValue: "/api/photos/saveVisibilityBatch" },
      deleteEndpoint: { type: "string", defaultValue: "/api/photos/deletePhoto" },

      // NEW
      profileEndpoint: { type: "string", defaultValue: "/api/photos/setProfilePhoto" },

      dataName: { type: "string", defaultValue: "photoManage" },
      fallbackThumbUrl: { type: "string", displayName: "Fallback thumb URL" },

      successHideMs: { type: "number", defaultValue: 2000, displayName: "Success hide (ms)" },

      children: "slot",
    },
  } as ComponentMeta<unknown>);
}

export default registerPhotoManageShell;