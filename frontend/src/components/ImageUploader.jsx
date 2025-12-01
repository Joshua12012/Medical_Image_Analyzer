// // // components/ImageUpRendersx
// // import { ImageIcon } from "lucide-react";
// // import React from "react";

// // export default function ImageRender({
// //   onFileSelect,
// //   previewUrl = null,
// //   accept = "image/*",
// // }) {
// //   const fileRef = React.useRef(null);
// //   const MAX_BYTES = 5 * 1024 * 1024;
// //   const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// //   const openPicker = () => fileRef.current?.click();

// //   function handleFileChange(e) {
// //     const file = e.target.files?.[0] ?? null;
// //     if (!file) {
// //       if (onFileSelect) onFileSelect(null);
// //       return;
// //     }
// //     if (!ACCEPTED.includes(file.type)) {
// //       alert("Only JPG / PNG / WEBP / GIF allowed");
// //       if (onFileSelect) onFileSelect(null);
// //       return;
// //     }
// //     if (file.size > MAX_BYTES) {
// //       alert("Image too large (max 5MB)");
// //       if (onFileSelect) onFileSelect(null);
// //       return;
// //     }
// //     if (onFileSelect) onFileSelect(file);
// //   }

// //   return (
// //     <>
// //       <input
// //         ref={fileRef}
// //         type="file"
// //         accept={accept}
// //         onChange={handleFileChange}
// //         className="hidden"
// //       />

// //       {/* Small icon button only — no text/title */}
// //       <button
// //         onClick={openPicker}
// //         type="button"
// //         className="p-2 rounded-full hover:opacity-90 transition disabled:opacity-50"
// //         style={{ backgroundColor: "#6891FA" }}
// //       >
// //         <ImageIcon className="w-5 h-5 text-white" />
// //       </button>
// //     </>
// //   );
// // }
// import { ImageIcon } from "lucide-react";
// import React from "react";

// export default function ImageRender({
//   onFileSelect,
//   previewUrl = null,
//   accept = "image/*",
// }) {
//   const fileRef = React.useRef(null);
//   const MAX_BYTES = 5 * 1024 * 1024;
//   const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

//   const openPicker = () => fileRef.current?.click();

//   function handleFileChange(e) {
//     const file = e.target.files?.[0] ?? null;
//     if (!file) {
//       if (onFileSelect) onFileSelect(null);
//       return;
//     }
//     if (!ACCEPTED.includes(file.type)) {
//       alert("Only JPG / PNG / WEBP / GIF allowed");
//       if (onFileSelect) onFileSelect(null);
//       return;
//     }
//     if (file.size > MAX_BYTES) {
//       alert("Image too large (max 5MB)");
//       if (onFileSelect) onFileSelect(null);
//       return;
//     }
//     if (onFileSelect) onFileSelect(file);
//   }

//   return (
//     <>
//       <input
//         ref={fileRef}
//         type="file"
//         accept={accept}
//         onChange={handleFileChange}
//         className="hidden"
//       />

//       <button
//         onClick={openPicker}
//         type="button"
//         className="p-2 rounded-xl hover:opacity-90 transition disabled:opacity-50 bg-[#6891FA] flex items-center justify-center"
//       >
//         <ImageIcon className="w-5 h-5 text-white" />
//       </button>
//     </>
//   );
// }
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
      onFileSelect?.(null);
      return;
    }
    if (!ACCEPTED.includes(file.type)) {
      alert("Only JPG, PNG, WEBP, GIF allowed");
      onFileSelect?.(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      alert("Image too large (max 5MB)");
      onFileSelect?.(null);
      return;
    }
    onFileSelect?.(file);
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

      <button
        type="button"
        onClick={openPicker}
        className="p-3 rounded-2xl duration-200 hover:scale-110"
        title="Upload image"
        style={{borderRadius:'1.5rem', backgroundColor:'gray'}}
      >
        <ImageIcon className="w-4 h-7 text-black" />
      </button>
    </>
  );
}
