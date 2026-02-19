"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";

type Visibility = "public" | "private";

type UploadState = {
  success: boolean;
  isUploading: boolean;
  error: string | null;
  imageUrl: string | null;
};

type UploadStateEvent = {
  scope?: string;
  success?: boolean;
  isUploading?: boolean;
  error?: string | null;
  imageUrl?: string | null;
};

type Props = {
  children?: React.ReactNode;

  formDataName?: string;   // default: "photoUploadForm"
  stateDataName?: string;  // default: "photoUploadState"

  defaultCaption?: string;
  defaultVisibility?: Visibility;

  enabled?: boolean;
  scope?: string; // default: "default"
};

type FormCtx = {
  caption: string;
  setCaption: (v: string) => void;

  visibility: Visibility;
  setVisibility: (v: Visibility) => void;

  reset: () => void;
};

export function PhotoUploadFormShell(props: Props) {
  const {
    children,
    formDataName = "photoUploadForm",
    stateDataName = "photoUploadState",
    defaultCaption = "",
    defaultVisibility = "public",
    enabled = true,
    scope = "default",
  } = props;

  const inStudio = !!usePlasmicCanvasContext();

  const [caption, setCaption] = React.useState(defaultCaption);
  const [visibility, setVisibility] = React.useState<Visibility>(defaultVisibility);

  const [uploadState, setUploadState] = React.useState<UploadState>({
    success: false,
    isUploading: false,
    error: null,
    imageUrl: null,
  });

  React.useEffect(() => {
    if (!enabled) return;

    setCaption(defaultCaption);
    setVisibility(defaultVisibility);
    setUploadState({ success: false, isUploading: false, error: null, imageUrl: null });
  }, [enabled, inStudio, defaultCaption, defaultVisibility]);

  React.useEffect(() => {
    if (inStudio) return;
    if (!enabled) return;

    const onState = (ev: Event) => {
      const e = ev as CustomEvent<UploadStateEvent>;
      const detail = e?.detail;
      if (!detail) return;

      if ((detail.scope ?? "default") !== scope) return;

      setUploadState((prev) => ({
        success: typeof detail.success === "boolean" ? detail.success : prev.success,
        isUploading:
          typeof detail.isUploading === "boolean" ? detail.isUploading : prev.isUploading,
        error:
          typeof detail.error === "string"
            ? detail.error
            : detail.error === null
              ? null
              : prev.error,
        imageUrl:
          typeof detail.imageUrl === "string"
            ? detail.imageUrl
            : detail.imageUrl === null
              ? null
              : prev.imageUrl,
      }));
    };

    window.addEventListener("photoUpload:state", onState as EventListener);
    return () => window.removeEventListener("photoUpload:state", onState as EventListener);
  }, [inStudio, enabled, scope]);

  const reset = React.useCallback(() => {
    setCaption(defaultCaption);
    setVisibility(defaultVisibility);
    setUploadState({ success: false, isUploading: false, error: null, imageUrl: null });
  }, [defaultCaption, defaultVisibility]);

  const formCtx: FormCtx = React.useMemo(
    () => ({
      caption,
      setCaption,
      visibility,
      setVisibility,
      reset,
    }),
    [caption, visibility, reset]
  );

  return (
    <DataProvider name={formDataName} data={formCtx}>
      <DataProvider name={stateDataName} data={uploadState}>
        {children}
      </DataProvider>
    </DataProvider>
  );
}

export default PhotoUploadFormShell;