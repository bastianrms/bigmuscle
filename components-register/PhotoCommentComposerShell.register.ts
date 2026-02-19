// components-register/PhotoCommentComposerShell.register.ts
import PhotoCommentComposerShell from "@/components/PhotoCommentComposerShell";

export function registerPhotoCommentComposerShell(PLASMIC: any) {
  PLASMIC.registerComponent(PhotoCommentComposerShell, {
    name: "PhotoCommentComposerShell",
    displayName: "Photo comment composer shell (draft + send)",
    providesData: true,
    importPath: "@/components/PhotoCommentComposerShell",
    props: {
      photoId: { type: "string", displayName: "Photo id (uuid)" },
      endpoint: {
        type: "string",
        defaultValue: "/api/photos/comment",
        displayName: "POST Endpoint",
      },
      dataName: {
        type: "string",
        defaultValue: "photoCommentComposerShell",
        displayName: "Data name",
      },
      children: "slot",
    },
  } as any);
}