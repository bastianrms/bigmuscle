// components/PhotoUpload.tsx
"use client";

import React, { useId, useState, forwardRef, useImperativeHandle } from "react";
import Image from "next/image";

export type PhotoUploadActions = {
  uploadPhoto: (
    userIdFromAction?: string,
    captionFromAction?: string,
    visibilityFromAction?: "public" | "private"
  ) => Promise<void>;

  hasSelectedFile: () => boolean;
  reset: () => void;
};

type Props = {
  userId?: string; // optional
  defaultVisibility?: "public" | "private";

  buttonText?: string;
  iconUrl?: string | null;
  iconSize?: number;

  className?: string;
  isProfilePhoto?: boolean;

  // wie lange success=true bleiben soll (ms)
  successMs?: number;

  // falls du mehrere Uploads auf einer Seite hast
  scope?: string; // default "default"
};

type UploadStateEvent = {
  scope: string;
  success?: boolean;
  isUploading?: boolean;
  error?: string | null;
  imageUrl?: string | null;
};

type UploadApiResponse = {
  success?: boolean;
  error?: string;
  url?: string;
  bytes?: number;
  thumb_url?: string | null;
  medium_url?: string | null;
  xl_url?: string | null;
};

const PhotoUpload = forwardRef<PhotoUploadActions, Props>(
  (
    {
      userId,
      defaultVisibility = "private",
      buttonText = "Upload photo",
      iconUrl = null,
      iconSize = 24,
      className,
      isProfilePhoto = false,
      successMs = 4000,
      scope = "default",
    },
    ref
  ) => {
    const inputId = useId(); // ✅ fixes id-collisions in Plasmic / multiple instances

    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    function emitState(next: Omit<UploadStateEvent, "scope">) {
      if (typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent<UploadStateEvent>("photoUpload:state", {
          detail: { scope, ...next },
        })
      );
    }

    async function uploadFile(
      file: File,
      uidMaybe: string,
      caption: string,
      visibility: "public" | "private"
    ) {
      setError(null);
      setIsUploading(true);
      emitState({ error: null, success: false, isUploading: true });

      const formData = new FormData();
      formData.append("file", file);

      // userId optional (Server nimmt auth user)
      if (uidMaybe) formData.append("userId", uidMaybe);

      formData.append("visibility", visibility);
      formData.append("caption", caption ?? "");
      formData.append("isProfilePhoto", String(isProfilePhoto));

      try {
        const res = await fetch("/api/photos/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        const json = (await res.json()) as UploadApiResponse;

        if (!res.ok || !json?.success) {
          throw new Error(json?.error || "Upload failed");
        }

        const nextUrl: string | null =
          json.medium_url ?? json.xl_url ?? json.thumb_url ?? null;

        setImageUrl(nextUrl);
        setIsUploading(false);

        emitState({
          success: true,
          isUploading: false,
          error: null,
          imageUrl: nextUrl,
        });

        if (successMs > 0) {
          window.setTimeout(() => {
            emitState({ success: false });
          }, successMs);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        console.error(err);

        setError(msg);
        setIsUploading(false);

        emitState({ error: msg, success: false, isUploading: false });
      } finally {
        setIsUploading(false);
        emitState({ isUploading: false });
      }
    }

    useImperativeHandle(ref, () => ({
      async uploadPhoto(
        userIdFromAction?: string,
        captionFromAction?: string,
        visibilityFromAction?: "public" | "private"
      ) {
        const uidMaybe = (userIdFromAction ?? userId ?? "").trim();
        const caption = (captionFromAction ?? "").trim();
        const visibility = visibilityFromAction ?? defaultVisibility;

        if (!fileToUpload) {
          const msg = "Please select a photo first.";
          setError(msg);
          emitState({ error: msg, success: false });
          return;
        }

        if (isUploading) return;

        await uploadFile(fileToUpload, uidMaybe, caption, visibility);
      },

      hasSelectedFile() {
        return !!fileToUpload;
      },

      reset() {
        setFileToUpload(null);
        setImageUrl(null);
        setError(null);
        setIsUploading(false);

        emitState({
          success: false,
          isUploading: false,
          error: null,
          imageUrl: null,
        });
      },
    }));

    function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file) return;

      const previewUrl = URL.createObjectURL(file);

      setFileToUpload(file);
      setImageUrl(previewUrl);
      setError(null);

      emitState({ imageUrl: previewUrl, error: null, success: false });

      // ✅ allow re-selecting the same file again later
      e.target.value = "";
    }

    function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      const previewUrl = URL.createObjectURL(file);

      setFileToUpload(file);
      setImageUrl(previewUrl);
      setError(null);

      emitState({ imageUrl: previewUrl, error: null, success: false });
    }

    return (
      <div className={className}>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          onChange={handleSelect}
          style={{ display: "none" }}
          disabled={isUploading}
        />

        <label
          htmlFor={inputId}
          className={`bm-photo-upload-button ${isDragging ? "dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
        >
          {!isUploading && iconUrl && (
            <Image
              src={iconUrl}
              alt=""
              width={iconSize}
              height={iconSize}
              style={{ objectFit: "contain" }}
            />
          )}

          <span className="bm-photo-upload-text">
            {isUploading ? "Uploading…" : buttonText}
          </span>
        </label>

        {error && (
          <div style={{ color: "red", marginTop: 8, fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        {imageUrl && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: "0.8rem", marginBottom: 4 }}>Preview:</div>
            <Image
              src={imageUrl}
              alt="Uploaded preview"
              width={200}
              height={200}
              style={{ objectFit: "cover", borderRadius: 12 }}
            />
          </div>
        )}
      </div>
    );
  }
);

PhotoUpload.displayName = "PhotoUpload";
export default PhotoUpload;