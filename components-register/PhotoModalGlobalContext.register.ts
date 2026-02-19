// components-register/PhotoModalGlobalContext.register.ts
import PhotoModalGlobalContext from "../components/PhotoModalGlobalContext";

export function registerPhotoModalGlobalContext(PLASMIC: any) {
  PLASMIC.registerGlobalContext(PhotoModalGlobalContext, {
    name: "PhotoModalGlobalContext",
    providesData: true,
    props: {},
    globalActions: {
      openPhoto: {
        parameters: [
          { name: "photoId", type: "string" },
          { name: "previewUrl", type: "string" }, // ✅ neu
        ],
      },
      closePhoto: { parameters: [] },
      setPhotoId: { parameters: [{ name: "photoId", type: "string" }] },
      setPreviewUrl: { parameters: [{ name: "previewUrl", type: "string" }] }, // ✅ neu (optional, aber nice)
    },
  });
}