import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import { 
  SupabaseProvider, 
  SupabaseProviderMeta,
  SupabaseUserGlobalContext,
  SupabaseUserGlobalContextMeta,
  SupabaseUppyUploader,
  SupabaseUppyUploaderMeta,
  SupabaseStorageGetSignedUrl,
  SupabaseStorageGetSignedUrlMeta,
} from "plasmic-supabase"

// ⭐ Wichtig: Deinen PhotoUpload importieren
import PhotoUpload from "./components/PhotoUpload";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "47o2aVEgqSoFh9ckL7WCLR",
      token: "AXnSKzhIhcP0uoUs9GOCNEAMNpVyOU3iFUvJOVWzhBX6uZPjK5JSrarnzVAc041Af8nGULs8RL0edYcFXQ",
    },
  ],

  // By default Plasmic will use the last published version of your project.
  // For development, you can set preview to true, which will use the unpublished
  // project, allowing you to see your designs without publishing.  Please
  // only use this for development, as this is significantly slower.
  preview: true,
});

//Register global context
PLASMIC.registerGlobalContext(SupabaseUserGlobalContext, SupabaseUserGlobalContextMeta)

//Register components
PLASMIC.registerComponent(SupabaseProvider, SupabaseProviderMeta);
PLASMIC.registerComponent(SupabaseUppyUploader, SupabaseUppyUploaderMeta);
PLASMIC.registerComponent(SupabaseStorageGetSignedUrl, SupabaseStorageGetSignedUrlMeta);

// ⭐ Unser neues PhotoUpload registrieren
PLASMIC.registerComponent(PhotoUpload, {
  name: "PhotoUpload",
  description: "Upload photos to R2 and save metadata to Supabase",
  props: {
    userId: {
      type: "string",
      displayName: "User ID",
      description: "Supabase user_id assigned to this photo",
      defaultValueHint: "example-user-id",
    },
    defaultVisibility: {
      type: "choice",
      options: ["public", "private"],
      displayName: "Default Visibility",
      description: "Initial visibility of the uploaded photo",
      defaultValue: "private",
    },
  },
});