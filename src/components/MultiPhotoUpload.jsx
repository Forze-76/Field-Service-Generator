import React, { useCallback, useMemo, useRef } from "react";
import { Camera, Trash2 } from "lucide-react";
import { fileToDataURL, uid } from "../utils/fsr";

function MultiPhotoUpload({ photos = [], onChange, disabled = false }) {
  const inputRef = useRef(null);
  const photosList = useMemo(() => photos || [], [photos]);

  const handleFiles = useCallback(
    async (fileList) => {
      if (!fileList || fileList.length === 0 || disabled) return;
      const items = Array.from(fileList);
      const results = [];
      for (const file of items) {
        try {
          const imageUrl = await fileToDataURL(file);
          results.push({ id: uid(), imageUrl });
        } catch (err) {
          console.error("Failed to read file", err);
        }
      }
      if (results.length) {
        onChange([...(photos || []), ...results]);
      }
    },
    [photos, onChange, disabled],
  );

  const onDrop = useCallback(
    async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled) return;
      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) return;
      await handleFiles(files);
    },
    [handleFiles, disabled],
  );

  const onInputChange = useCallback(
    async (event) => {
      const files = event.target.files;
      await handleFiles(files);
      if (event.target) {
        event.target.value = "";
      }
    },
    [handleFiles],
  );

  const removePhoto = useCallback(
    (id) => {
      onChange((photos || []).filter((photo) => photo.id !== id));
    },
    [photos, onChange],
  );

  return (
    <div className="space-y-3">
      <div
        className={`rounded-2xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition ${
          disabled
            ? "opacity-60 cursor-not-allowed"
            : "hover:border-blue-400 hover:bg-blue-50/50"
        }`}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        onDragOver={(event) => {
          if (disabled) return;
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={onDrop}
      >
        <div className="flex flex-col items-center gap-2 text-sm text-gray-600">
          <Camera size={22} className="text-blue-500" />
          <div className="font-medium">Tap or drop photos</div>
          <div className="text-xs text-gray-400">You can add multiple photos at once.</div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onInputChange}
        disabled={disabled}
      />
      {photosList.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {photosList.map((photo, idx) => (
            <div key={photo.id} className="relative w-28 h-28 rounded-2xl overflow-hidden border bg-gray-50">
              <img src={photo.imageUrl} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
              {!disabled && (
                <button
                  type="button"
                  className="absolute top-1 right-1 rounded-full bg-white/90 p-1 shadow"
                  onClick={() => removePhoto(photo.id)}
                  title="Remove photo"
                  aria-label="Remove photo"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MultiPhotoUpload;
