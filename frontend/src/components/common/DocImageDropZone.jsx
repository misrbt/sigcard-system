import { useEffect, useRef, useState } from "react";
import { HiOutlinePhotograph } from "react-icons/hi";

/**
 * Single-image drop zone. Files are sent raw to the backend where
 * Image Intervention handles all resizing and optimisation.
 *
 * Props:
 *   label     — optional label shown above the zone
 *   file      — current File (or null)
 *   onChange  — called with File or null on remove
 *   className — extra wrapper classes
 *   compact   — if true, uses a smaller fixed height instead of aspect-ratio sizing
 */
const DocImageDropZone = ({ label, file, onChange, className = "", compact = false, shape = "auto" }) => {
  const [isDragging, setIsDragging]   = useState(false);
  const [preview, setPreview]         = useState(null);
  const [orientation, setOrientation] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) { setPreview(null); setOrientation(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      setOrientation(h >= w ? "portrait" : "landscape");
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const accept = (raw) => {
    const f = raw instanceof File ? raw : raw?.[0] ?? null;
    if (!f || !f.type.startsWith("image/")) return;
    onChange(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    accept(e.dataTransfer.files[0]);
  };

  const aspectClass = compact
    ? "h-52"
    : shape === "landscape"
    ? "aspect-[4/3]"
    : shape === "portrait"
    ? "aspect-[3/4]"
    : // "auto" — empty state matches landscape so paired drop zones align;
      // once an image is selected it adapts to the actual image orientation
      preview
      ? orientation === "portrait"  ? "aspect-[3/4]"
        : orientation === "landscape" ? "aspect-[4/3]"
        : "aspect-square"
      : "aspect-[4/3]";

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <p className="text-sm font-bold text-slate-700">{label}</p>
      )}

      <div
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200 ${aspectClass} ${
          isDragging
            ? "border-blue-500 bg-blue-100 scale-[1.02] shadow-md"
            : preview
            ? "border-green-400 bg-slate-100 shadow-md cursor-default"
            : "border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 hover:border-blue-400 hover:from-blue-50 hover:to-blue-100 hover:shadow-lg cursor-pointer"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !preview && inputRef.current?.click()}
      >
        {preview ? (
          <div className="group w-full h-full">
            <img src={preview} alt="preview" className="object-contain w-full h-full" onLoad={() => {}} />
            <div className="absolute inset-0 flex items-center justify-center transition-opacity opacity-0 bg-gradient-to-br from-black/70 to-black/50 group-hover:opacity-100">
              <div className="text-center text-white flex flex-col items-center gap-3">
                <HiOutlinePhotograph className="w-8 h-8" />
                <div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                    className="pointer-events-auto px-3 py-1.5 text-[11px] font-bold bg-white text-slate-700 rounded-lg shadow hover:bg-slate-100 transition-colors mr-2"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onChange(null); }}
                    className="pointer-events-auto px-3 py-1.5 text-[11px] font-bold bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
            <div className="absolute p-2 rounded-full shadow-lg right-4 top-4 bg-gradient-to-br from-green-500 to-green-600">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 p-6 text-center h-full justify-center min-h-[180px]">
            <div className="p-5 rounded-full shadow-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <HiOutlinePhotograph className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800">{isDragging ? "Drop image here" : "Drag & drop your file"}</p>
              <p className="mt-2 text-sm text-slate-600">or <span className="font-semibold text-blue-600">click to browse</span></p>
              <p className="mt-2 text-xs text-slate-500">Supports: JPG, PNG (Max 10 MB)</p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ""; }}
      />
    </div>
  );
};

export default DocImageDropZone;
