import React, { useCallback, useMemo, useRef } from "react";
import { Images, Trash } from "lucide-react";
import { fileToDataURL, uid } from "../utils/fsr";

function PhotoVault({ photos = [], onChange }) {
  const inputRef = useRef(null);

  const addFiles = useCallback(
    async (files) => {
      const arr = [];
      for (const file of files) {
        const url = await fileToDataURL(file);
        arr.push({ id: uid(), imageUrl: url, caption: "", createdAt: new Date().toISOString() });
      }
      if (arr.length === 0) return;
      onChange((prev = []) => [...prev, ...arr]);
    },
    [onChange],
  );

  const handleInputChange = useCallback(
    async (event) => {
      const fileList = event.target.files;
      if (!fileList || fileList.length === 0) return;
      await addFiles(fileList);
      event.target.value = "";
    },
    [addFiles],
  );

  const handleRemove = useCallback(
    (id) => {
      onChange((prev = []) => prev.filter((photo) => photo.id !== id));
    },
    [onChange],
  );

  const handleCaptionChange = useCallback(
    (id, value) => {
      onChange((prev = []) =>
        prev.map((photo) => (photo.id === id ? { ...photo, caption: value } : photo)),
      );
    },
    [onChange],
  );

  const photosList = useMemo(() => photos || [], [photos]);

  return (
    <div className="rounded-3xl border shadow-sm p-6 bg-white">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Images size={18} /> Photo Vault
        </h3>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
          />
          <button className="px-3 py-2 rounded-xl border" onClick={() => inputRef.current?.click()}>
            Add Photo(s)
          </button>
        </div>
      </div>
      {photosList.length === 0 ? (
        <p className="text-gray-500 mt-3">
          No photos yet. Use <b>Add Photo(s)</b> to upload field pictures.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {photosList.map((p, idx) => (
            <div key={p.id} className="rounded-2xl border overflow-hidden bg-white">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={`Field photo ${idx + 1}`} className="h-64 w-full object-cover" />
              ) : (
                <div className="h-64 bg-gray-50" />
              )}
              <div className="p-3 flex items-center gap-2">
                <input
                  className="flex-1 rounded-xl border px-3 py-2"
                  placeholder="Caption (optional)"
                  value={p.caption || ""}
                  onChange={(event) => handleCaptionChange(p.id, event.target.value)}
                />
                <button
                  className="p-2 rounded-xl border"
                  onClick={() => handleRemove(p.id)}
                  aria-label={`Remove photo ${idx + 1}`}
                >
                  <Trash size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default React.memo(PhotoVault);
