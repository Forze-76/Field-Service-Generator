import React, { useRef, useState } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { fileToDataURL, uid } from "../utils/fsr";

function MultiPhotoUpload({ photos = [], onChange, helperText }) {
  const inputRef = useRef(null);
  const [isDragging, setDragging] = useState(false);

  const handleFiles = async (list) => {
    if (!onChange || !list?.length) return;
    const files = Array.from(list);
    const payloads = await Promise.all(
      files.map(async (file) => ({ id: uid(), imageUrl: await fileToDataURL(file) })),
    );
    onChange([...(photos || []), ...payloads]);
  };

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-2xl p-4 text-center transition ${
          isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer?.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          className="px-4 py-2 rounded-xl border bg-white flex items-center gap-2 mx-auto"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={16} /> Upload photos
        </button>
        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center gap-1">
          <ImagePlus size={14} /> Drag & drop or upload multiple images
        </div>
        {helperText ? <div className="text-xs text-gray-400 mt-1">{helperText}</div> : null}
      </div>
      {photos?.length ? (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group rounded-xl overflow-hidden border">
              {photo.imageUrl ? (
                <img src={photo.imageUrl} alt="Entry" className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-sm text-gray-400">
                  No image
                </div>
              )}
              <button
                type="button"
                className="absolute top-2 right-2 p-1 rounded-full bg-white/90 border text-red-600 opacity-0 group-hover:opacity-100"
                onClick={() => onChange((photos || []).filter((item) => item.id !== photo.id))}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default MultiPhotoUpload;
