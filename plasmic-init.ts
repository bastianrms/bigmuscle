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
} from "plasmic-supabase";

// Code Components
import PhotoUpload from "./components/PhotoUpload";
import LocationSelect from "./components/LocationSelect";

export const PLASMIC: any = initPlasmicLoader({
  projects: [
    {
      id: "47o2aVEgqSoFh9ckL7WCLR",
      token:
        "AXnSKzhIhcP0uoUs9GOCNEAMNpVyOU3iFUvJOVWzhBX6uZPjK5JSrarnzVAc041Af8nGULs8RL0edYcFXQ",
    },
  ],
  preview: true,
});

// Code-Component-Registrierungen bündeln
import { registerLoginController } from "./plasmic-inits/code-login-controller";

// einmalig alle registrieren
registerLoginController(PLASMIC);

// Global context
PLASMIC.registerGlobalContext(
  SupabaseUserGlobalContext,
  SupabaseUserGlobalContextMeta
);

// Supabase helper components
PLASMIC.registerComponent(SupabaseProvider, SupabaseProviderMeta);
PLASMIC.registerComponent(SupabaseUppyUploader, SupabaseUppyUploaderMeta);
PLASMIC.registerComponent(
  SupabaseStorageGetSignedUrl,
  SupabaseStorageGetSignedUrlMeta
);

// PhotoUpload
PLASMIC.registerComponent(PhotoUpload, {
  name: "PhotoUpload",
  displayName: "Photo upload (R2)",

  props: {
    userId: { type: "string", displayName: "User ID" },
    defaultVisibility: {
      type: "choice",
      options: ["public", "private"],
      defaultValue: "private",
      displayName: "Default visibility",
    },
    buttonText: {
      type: "string",
      defaultValue: "Upload photo",
      displayName: "Button text",
    },
    iconUrl: { type: "string", displayName: "Icon URL" },
    iconSize: { type: "number", defaultValue: 24, displayName: "Icon size (px)" },
    className: { type: "class" },
    isProfilePhoto: {
      type: "boolean",
      defaultValue: false,
      displayName: "Is profile photo?",
    },
  },

  // 🔥 WICHTIG: refActions statt actions
  refActions: {
    uploadPhoto: {
      displayName: "Upload photo",
      description:
        "Uploads the selected file to Cloudflare R2 + saves metadata in Supabase.",
      argTypes: [
        {
          name: "userId",
          type: "string",
          displayName: "User ID",
        },
      ],
    },
  },
});


PLASMIC.registerComponent(LocationSelect, {
  name: "LocationSelect",
  displayName: "Location select (country + city)",
  props: {
    labelCountry: {
      type: "string",
      defaultValue: "Country",
      displayName: "Label country",
    },
    labelCity: {
      type: "string",
      defaultValue: "City",
      displayName: "Label city",
    },
    placeholderCountry: {
      type: "string",
      defaultValue: "Select country…",
      displayName: "Placeholder country",
    },
    placeholderCity: {
      type: "string",
      defaultValue: "Start typing a city…",
      displayName: "Placeholder city",
    },

    // 🔹 Styling Props (hierarchisch)
    // A. Ganz außen
    wrapperClassName: {
      type: "class",
      displayName: "A. Root wrapper",
    },

    // B. Field-Block (Country / City)
    fieldWrapperClassName: {
      type: "class",
      displayName: "B. Field wrapper (label + input + dropdown)",
    },

    // C. Input + Dropdown (für position: relative)
    innerWrapperClassName: {
      type: "class",
      displayName: "C. Input + dropdown wrapper",
    },

    // D. Labels
    labelClassName: {
      type: "class",
      displayName: "D. Label",
    },

    // E. Inputs
    inputClassName: {
      type: "class",
      displayName: "E. Input fields (country + city)",
    },

    // F. Suggestions-Container (div um UL)
    suggestionsContainerClassName: {
      type: "class",
      displayName: "F. Suggestions container",
    },

    // G. Suggestions-Liste (UL)
    suggestionListClassName: {
      type: "class",
      displayName: "G. Suggestions list (ul)",
    },

    // H. Suggestions-Items (LI)
    suggestionItemClassName: {
      type: "class",
      displayName: "H. Suggestion item (li)",
    },

    // I. Helpertext / Loading
    helperTextClassName: {
      type: "class",
      displayName: "I. Helper / loading text",
    },

    // J. Error Text
    errorClassName: {
      type: "class",
      displayName: "J. Error text",
    },
  },

  // 👉 Element-Aktionen, die im Button als "Run element action" auftauchen
  refActions: {
    saveLocation: {
      description: "Save selected country and city to users table",
      argTypes: [
        {
          name: "userId",
          type: "string",
        },
      ],
    },
  },
} satisfies any);