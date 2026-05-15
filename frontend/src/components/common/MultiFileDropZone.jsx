import { useEffect, useRef, useState } from "react";
import { HiOutlinePhotograph, HiOutlineX } from "react-icons/hi";

const FileThumb = ({ file, index, onRemove }) => {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
      {src && <img src={src} alt="" className="w-full h-full object-cover" />}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2">
        <p className="text-[10px] text-white font-semibold text-center line-clamp-2 leading-tight">{file.name}</p>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="mt-0.5 px-2 py-0.5 text-[10px] font-bold rounded-md bg-red-500 hover:bg-red-600 text-white transition-colors"
        >
          Remove
        </button>
      </div>
      <div className="absolute top-1.5 left-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-black/50 text-white text-[10px] font-bold">
        {index + 1}
      </div>
    </div>
  );
};

/**
 * Multi-file drop zone — controlled component.
 *
 * Props:
 *   files     — current File[] array
 *   onChange  — called with new File[] array (add or remove)
 *   label     — optional section label
 *   className — extra wrapper classes
 */
const MultiFileDropZone = ({ files = [], onChange, label, className = "" }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (raw) => {
    const images = Array.from(raw ?? []).filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    onChange([...files, ...images]);
  };

  const removeFile = (index) => onChange(files.filter((_, i) => i !== index));

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <p className="text-sm font-bold text-slate-700">
          {label}{" "}
          <span className="text-slate-400 font-normal text-xs">(multiple allowed)</span>
        </p>
      )}

      {files.length > 0 && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 items-start">
          {files.map((file, idx) => (
            <FileThumb key={`${file.name}-${idx}`} file={file} index={idx} onRemove={removeFile} />
          ))}
        </div>
      )}

      <div
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`group flex flex-col items-center justify-center gap-4 px-6 py-10 cursor-pointer border-2 border-dashed rounded-2xl transition-all ${
          isDragging
            ? "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 scale-[1.01] shadow-lg"
            : "border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 hover:border-blue-400 hover:from-blue-50 hover:to-blue-100 hover:shadow-lg"
        }`}
      >
        <div className={`p-4 rounded-full shadow-lg bg-gradient-to-br transition-colors ${isDragging ? "from-blue-600 to-blue-700" : "from-blue-500 to-blue-600"}`}>
          <HiOutlinePhotograph className="w-7 h-7 text-white" />
        </div>
        <div className="text-center">
          <p className={`text-base font-bold transition-colors ${isDragging ? "text-blue-600" : "text-slate-800"}`}>
            {isDragging ? "Drop files here" : files.length ? "Drop or click to add more" : "Drag & drop your files"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            or <span className="font-semibold text-blue-600">click to browse</span>
          </p>
          <p className="mt-2 text-xs text-slate-500">Supports: JPG, PNG — multiple files allowed</p>
        </div>
        {files.length > 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">
            {files.length} file{files.length !== 1 ? "s" : ""} added
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
};

export default MultiFileDropZone;
