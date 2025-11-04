// components/ImageUploader.jsx
import { ImageIcon } from "lucide-react";
import React from "react";

export default function ImageUploader({
  onFileSelect,
  previewUrl = null,
  accept = "image/*",
}) {
  const fileRef = React.useRef(null);
  const MAX_BYTES = 5 * 1024 * 1024;
  const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  const openPicker = () => fileRef.current?.click();

  function handleFileChange(e) {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      if (onFileSelect) onFileSelect(null);
      return;
    }
    if (!ACCEPTED.includes(file.type)) {
      alert("Only JPG / PNG / WEBP / GIF allowed");
      if (onFileSelect) onFileSelect(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      alert("Image too large (max 5MB)");
      if (onFileSelect) onFileSelect(null);
      return;
    }
    if (onFileSelect) onFileSelect(file);
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Small icon button only — no text/title */}
      <button
        onClick={openPicker}
        type="button"
        className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 transition duration-200 flex items-center justify-center"
      >
        <ImageIcon className="w-5 h-5 text-black" />
      </button>
    </>
  );
}
