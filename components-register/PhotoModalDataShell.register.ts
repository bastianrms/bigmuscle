// components-register/PhotoModalDataShell.register.ts
import PhotoModalDataShell from "../components/PhotoModalDataShell";

export function registerPhotoModalDataShell(PLASMIC: any) {
  PLASMIC.registerComponent(PhotoModalDataShell, {
    name: "PhotoModalDataShell",
    displayName: "Photo modal data shell (API + Studio dummy)",
    providesData: true,
    importPath: "@/components/PhotoModalDataShell",
    props: {
      enabled: {
        type: "boolean",
        defaultValue: true,
        displayName: "Enabled (fetch only when true)",
      },
      endpoint: {
        type: "string",
        defaultValue: "/api/photos/PhotoModalQuery",
        displayName: "GET Endpoint",
      },
      photoId: {
        type: "string",
        displayName: "Photo id (uuid) from global context",
      },
      commentsLimit: {
        type: "number",
        defaultValue: 30,
        displayName: "Comments limit",
      },
      photoDataName: {
        type: "string",
        defaultValue: "photoModalPhoto",
        displayName: "Photo data name",
      },
      commentsDataName: {
        type: "string",
        defaultValue: "photoModalComments",
        displayName: "Comments data name",
      },
      stateDataName: {
        type: "string",
        defaultValue: "photoModalState",
        displayName: "State data name",
      },
      children: "slot",
    },
  } as any);
}