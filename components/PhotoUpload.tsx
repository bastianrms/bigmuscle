"use client";

import React, {
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import Image from "next/image";

// ---- Exportierte Actions für Plasmic ----
export type PhotoUploadActions = {
  // userId kann aus der Action kommen – oder aus den Props
  uploadPhoto: (userIdFromAction?: string) => Promise<void>;
};

type Props = {
  userId?: string; // optionaler Fallback
  defaultVisibility?: "public" | "private";

  buttonText?: string;
  iconUrl?: string | null;
  iconSize?: number;

  className?: string;
  isProfilePhoto?: boolean;
};

const PhotoUpload = forwardRef<PhotoUploadActions, Props>(
  (
    {
      userId, // ⚡ wird jetzt wirklich verwendet
      defaultVisibility = "private",
      buttonText = "Upload photo",
      iconUrl = null,
      iconSize = 24,
      className,
      isProfilePhoto = false,
    },
    ref
  ) => {
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Preview: lokales URL-Objekt oder echte URL vom Backend
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    /**
     * CORE-UPLOAD: wird von uploadPhoto() aufgerufen
     */
    async function uploadFile(file: File, uid: string) {
      setError(null);
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", uid);
      formData.append("visibility", defaultVisibility);
      formData.append("isProfilePhoto", String(isProfilePhoto));

      try {
        const res = await fetch("/api/photos/upload", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || "Upload failed");
        }

        // Backend-URLs überschreiben die lokale Preview
        setImageUrl(json.medium_url || json.xl_url || null);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    }

    /**
     * Handle für Plasmic: uploadPhoto()
     * Kann userId aus der Action ODER aus den Props nutzen.
     */
    useImperativeHandle(ref, () => ({
      async uploadPhoto(userIdFromAction?: string) {
        const uid = userIdFromAction ?? userId;

        if (!fileToUpload) {
          console.warn("[PhotoUpload.uploadPhoto] No file selected.");
          return;
        }

        if (!uid) {
          console.warn("[PhotoUpload.uploadPhoto] No userId provided.");
          return;
        }

        await uploadFile(fileToUpload, uid);
      },
    }));

    /**
     * Datei auswählen → sofort Preview, aber noch kein Upload
     */
    function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file) return;

      setFileToUpload(file);

      const localPreview = URL.createObjectURL(file);
      setImageUrl(localPreview);
    }

    /**
     * Drag & Drop
     */
    function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      setFileToUpload(file);
      const localPreview = URL.createObjectURL(file);
      setImageUrl(localPreview);
    }

    return (
      <div className={className}>
        {/* Hidden File Input */}
        <input
          id="bm-photo-input"
          type="file"
          accept="image/*"
          onChange={handleSelect}
          style={{ display: "none" }}
          disabled={isUploading}
        />

        {/* Styled Button / Dropzone */}
        <label
          htmlFor="bm-photo-input"
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

        {/* Error */}
        {error && (
          <div style={{ color: "red", marginTop: 8, fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        {/* Preview */}
        {imageUrl && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: "0.8rem", marginBottom: 4 }}>Preview:</div>
            <Image
              src={imageUrl}
              alt="Uploaded preview"
              width={200}
              height={200}
              style={{
                objectFit: "cover",
                borderRadius: 12,
              }}
            />
          </div>
        )}
      </div>
    );
  }
);

PhotoUpload.displayName = "PhotoUpload";

export default PhotoUpload;