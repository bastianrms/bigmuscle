// components-register/PhotoUploadFormShell.register.ts
import type { ComponentMeta } from "@plasmicapp/host";
import PhotoUploadFormShell from "../components/PhotoUploadFormShell";

export function registerPhotoUploadFormShell(PLASMIC: {
  registerComponent: (comp: unknown, meta: ComponentMeta<unknown>) => void;
}) {
  PLASMIC.registerComponent(PhotoUploadFormShell, {
    name: "PhotoUploadFormShell",
    displayName: "Photo upload form shell",
    importPath: "../components/PhotoUploadFormShell",
    providesData: true,

    props: {
      enabled: { type: "boolean", defaultValue: true },

      dataName: {
        type: "string",
        defaultValue: "photoUploadForm",
        displayName: "Data name",
      },

      defaultVisibility: {
        type: "choice",
        options: ["public", "private"],
        defaultValue: "public",
        displayName: "Default visibility",
      },

      defaultCaption: {
        type: "string",
        defaultValue: "",
        displayName: "Default caption",
      },

      children: "slot",
    },
  });
}

export default registerPhotoUploadFormShell;