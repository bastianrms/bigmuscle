"use client";

import React, { useState } from "react";

type Props = {
  userId: string;
  defaultVisibility?: "public" | "private";
};

const PhotoUpload: React.FC<Props> = ({
  userId,
  defaultVisibility = "private",
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);
    setImageUrl(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);
    formData.append("visibility", defaultVisibility);

    try {
      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });

      const data: unknown = await res.json();

      // Wir wissen, was unser API-Shape ist
      const typedData = data as {
        success?: boolean;
        url?: string;
        error?: string;
      };

      if (!res.ok || !typedData.success) {
        throw new Error(typedData.error || "Upload failed");
      }

      if (typedData.url) {
        setImageUrl(typedData.url);
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <input type="file" accept="image/*" onChange={handleChange} />

      {isUploading && <div>Uploading…</div>}

      {error && (
        <div style={{ color: "red", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}

      {imageUrl && (
        <div>
          <div style={{ fontSize: "0.8rem" }}>Uploaded image:</div>
          {/* Next/Image können wir später machen, Warnung ist nur Info */}
          <img
            src={imageUrl}
            alt="Uploaded"
            style={{ maxWidth: "200px", borderRadius: "8px" }}
          />
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;