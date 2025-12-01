"use client";

import React, { useState } from "react";
import Image from "next/image";

type Props = {
  userId: string;
  defaultVisibility?: "public" | "private";

  // Text für Button
  buttonText?: string;

  // Icon als Bild-URL
  iconUrl?: string | null;
  iconSize?: number;

  // Wrapper-Klasse aus Plasmic
  className?: string;

  // 💡 Neu: Dieses Upload-Feld markiert das Bild als Profilfoto
  isProfilePhoto?: boolean;
};

const PhotoUpload: React.FC<Props> = ({
  userId,
  defaultVisibility = "private",

  buttonText = "Upload photo",
  iconUrl = null,
  iconSize = 24,

  className,
  isProfilePhoto = false, // default: kein Profilfoto
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setError(null);
    setIsUploading(true);
    setImageUrl(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);
    formData.append("visibility", defaultVisibility);
    // 🔹 neues Flag an die API schicken
    formData.append("isProfilePhoto", String(isProfilePhoto));

    try {
      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });

      const typedData = (await res.json()) as {
        success?: boolean;
        xl_url?: string;
        medium_url?: string;
        thumb_url?: string;
        error?: string;
      };

      if (!res.ok || !typedData.success) {
        throw new Error(typedData.error || "Upload failed");
      }

      // Für Preview: medium_url (oder xl_url fallback)
      if (typedData.medium_url) {
        setImageUrl(typedData.medium_url);
      } else if (typedData.xl_url) {
        setImageUrl(typedData.xl_url);
      }
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Upload failed";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  }

  // Klick-Upload
  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  }

  // Drag & Drop Events
  function handleDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  }

  function handleDragEnter(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  async function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    await uploadFile(file);
  }

  return (
    <div className={className}>
      {/* Hidden native input */}
      <input
        id="bm-photo-input"
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ display: "none" }}
        disabled={isUploading}
      />

      {/* Stylbarer Label-Button = Dropzone */}
      <label
        htmlFor="bm-photo-input"
        className={`bm-photo-upload-button ${isDragging ? "dragging" : ""}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
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
        <div style={{ color: "red", fontSize: "0.9rem", marginTop: 8 }}>
          {error}
        </div>
      )}

      {imageUrl && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: "0.8rem", marginBottom: 4 }}>
            Uploaded image:
          </div>
          <Image
            src={imageUrl}
            alt="Uploaded photo"
            width={200}
            height={200}
            style={{ objectFit: "cover", borderRadius: 12 }}
          />
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;