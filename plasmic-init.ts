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
import { registerChatMessageInput } from "./components-register/ChatMessageInput.register";
import { registerLazyMount } from "./components-register/LazyMount.register";
import { registerChatListData } from "./components-register/ChatListData.register";
import { registerChatMessagesShell } from "./components-register/ChatMessagesShell.register";
import { registerUserProfileHeaderShell } from "./components-register/UserProfileHeaderShell.register";
import { registerUserProfilePhotosGridShell } from "./components-register/UserProfilePhotosGridShell.register";
import { registerPhotoModalGlobalContext } from "@/components-register/PhotoModalGlobalContext.register";
import { registerPhotoModalDataShell } from "@/components-register/PhotoModalDataShell.register";
import { registerPhotoCommentComposerShell } from "@/components-register/PhotoCommentComposerShell.register";
import { registerUnitSystemRadio } from "@/components-register/UnitSystemRadio.register";
import { registerAccountSettingsStatsShell } from "@/components-register/AccountSettingsStatsShell.register";
import { registerUsersNowOnlineShell } from "./components-register/UsersNowOnlineShell.register";
import { registerUsersNowOnlineGlobalTriggerShell } from "./components-register/UsersNowOnlineGlobalTriggerShell.register";
import { registerUsersNewRegisteredShell } from "./components-register/UsersNewRegisteredShell.register";
import { registerUserCardShell } from "./components-register/UserCardShell.register";
import { registerPhotoCardShell } from "./components-register/PhotoCardShell.register";
import { registerPhotoUploadFormShell } from "./components-register/PhotoUploadFormShell.register";
import { registerPhotoManageShell } from "./components-register/PhotoManageShell.register";
import { registerToggleSwitch } from "./components-register/ToggleSwitch.register";
import { registerUserSearchShell } from "./components-register/UserSearchShell.register";
import { registerMyUsernameShell } from "./components-register/MyUsernameShell.register";
import { registerNavActiveLinkShell } from "./components-register/NavActiveLinkShell.register";
import { registerSiteStatsShell } from "./components-register/SiteStatsShell.register";
import { registerChatUnreadCountShell } from "./components-register/ChatUnreadCountShell.register";
import { registerInputFieldNew } from "./components-register/InputFieldNew.register";
import { registerLoginShell } from "./components-register/LoginShell.register";
import { registerSignupShell } from "./components-register/SignupShell.register";
import { registerProfileSetupShell } from "./components-register/ProfileSetupShell.register";
import { registerForgotPasswordShell } from "./components-register/ForgotPasswordShell.register";
import { registerPasswordResetShell } from "./components-register/PasswordResetShell.register";
import { registerAccountDeleteShell } from "./components-register/AccountDeleteShell.register";
import { registerThemeToggleShell } from "./components-register/ThemeToggleShell.register";
import { registerUserUnitSystemShell } from "@/components-register/UserUnitSystemShell";

export const PLASMIC: any = initPlasmicLoader({
  projects: [
    {
      id: "47o2aVEgqSoFh9ckL7WCLR",
      token:
        "AXnSKzhIhcP0uoUs9GOCNEAMNpVyOU3iFUvJOVWzhBX6uZPjK5JSrarnzVAc041Af8nGULs8RL0edYcFXQ",
    },
  ],

// Expliziter Preview-Schalter
preview: process.env.PLASMIC_PREVIEW === "true"
});

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
  importPath: "./components/PhotoUpload",

  // ✅ damit $ctx.photoUploadState verfügbar ist
  providesData: true,

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

    // ✅ optional: wie lange die Success-Notification sichtbar bleibt (ms)
    successMs: {
      type: "number",
      defaultValue: 4000,
      displayName: "Success visible (ms)",
    },
  },

  // 🔥 refActions
  refActions: {
    uploadPhoto: {
      displayName: "Upload photo",
      description:
        "Uploads the selected file to Cloudflare R2 + saves metadata in Supabase.",
      argTypes: [
        { name: "userId", type: "string", displayName: "User ID" },
        { name: "caption", type: "string", displayName: "Caption" },
        {
          name: "visibility",
          type: "choice",
          displayName: "Visibility",
          options: ["public", "private"],
        },
      ],
    },
  },
});


export function registerLocationSelect(PLASMIC: any) {
  PLASMIC.registerComponent(LocationSelect, {
    name: "LocationSelect",
    displayName: "Location select (country + city)",
    importPath: "./components/LocationSelect",

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

      // ✅ NEW: Prefill props (Account Settings)
      initialCountryName: {
        type: "string",
        displayName: "Initial country name",
      },
      initialCountryCode: {
        type: "string",
        displayName: "Initial country code",
      },
      initialCityName: {
        type: "string",
        displayName: "Initial city name",
      },
      initialCityGeonameId: {
        type: "number",
        displayName: "Initial city geoname id",
      },

      // ✅ NEW: event when location changes
      onChangeLocation: {
        type: "eventHandler",
        displayName: "On change location",
        argTypes: [
          {
            name: "loc",
            type: "object",
          },
        ],
      },

      // 🔹 Styling Props
      wrapperClassName: {
        type: "class",
        displayName: "A. Root wrapper",
      },
      fieldWrapperClassName: {
        type: "class",
        displayName: "B. Field wrapper (label + input + dropdown)",
      },
      innerWrapperClassName: {
        type: "class",
        displayName: "C. Input + dropdown wrapper",
      },
      labelClassName: {
        type: "class",
        displayName: "D. Label",
      },
      inputClassName: {
        type: "class",
        displayName: "E. Input fields (country + city)",
      },
      suggestionsContainerClassName: {
        type: "class",
        displayName: "F. Suggestions container",
      },
      suggestionListClassName: {
        type: "class",
        displayName: "G. Suggestions list (ul)",
      },
      suggestionItemClassName: {
        type: "class",
        displayName: "H. Suggestion item (li)",
      },
      helperTextClassName: {
        type: "class",
        displayName: "I. Helper / loading text",
      },
      errorClassName: {
        type: "class",
        displayName: "J. Error text",
      },
    },

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
  } as any);
}

// ChatMessageInput
registerChatMessageInput(PLASMIC);

// LazyMount
registerLazyMount(PLASMIC);

registerChatListData(PLASMIC);

registerChatMessagesShell(PLASMIC);

registerUserProfileHeaderShell(PLASMIC);

registerUserProfilePhotosGridShell(PLASMIC);

registerPhotoModalGlobalContext(PLASMIC);

registerPhotoModalDataShell(PLASMIC);

registerPhotoCommentComposerShell(PLASMIC);

registerUnitSystemRadio(PLASMIC);

registerAccountSettingsStatsShell(PLASMIC);

registerUsersNowOnlineShell(PLASMIC);

registerUsersNowOnlineGlobalTriggerShell(PLASMIC);

registerUsersNewRegisteredShell(PLASMIC);

registerUserCardShell(PLASMIC);

registerPhotoCardShell(PLASMIC);

registerPhotoUploadFormShell(PLASMIC);

registerPhotoManageShell(PLASMIC);

registerToggleSwitch(PLASMIC);

registerUserSearchShell(PLASMIC);

registerMyUsernameShell(PLASMIC);

registerNavActiveLinkShell(PLASMIC);

registerSiteStatsShell(PLASMIC);

registerChatUnreadCountShell(PLASMIC);

registerInputFieldNew(PLASMIC);

registerLoginShell(PLASMIC);

registerSignupShell(PLASMIC);

registerProfileSetupShell(PLASMIC);

registerForgotPasswordShell(PLASMIC);

registerPasswordResetShell(PLASMIC);

registerAccountDeleteShell(PLASMIC);

registerThemeToggleShell(PLASMIC);

registerUserUnitSystemShell(PLASMIC);

registerLocationSelect(PLASMIC);
