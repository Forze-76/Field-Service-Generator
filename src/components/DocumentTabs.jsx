import React, { useEffect, useMemo, useRef, useState } from "react";

function DocumentTabs({ documents, activeId, onSelect, onReorder }) {
  const docs = Array.isArray(documents) ? documents : [];
  const [order, setOrder] = useState(docs);
  const [draggingId, setDraggingId] = useState(null);
  const [startIndex, setStartIndex] = useState(-1);
  const [movedId, setMovedId] = useState(null);
  const containerRef = useRef(null);
  const itemRefs = useRef(new Map());

  useEffect(() => {
    setOrder(docs);
  }, [docs.map((d) => d.id).join("|")]);

  useEffect(() => {
    if (!movedId) return;
    const btn = itemRefs.current.get(movedId);
    if (btn && typeof btn.focus === "function") {
      // Keep focus on the moved tab for a11y
      btn.focus();
    }
    setMovedId(null);
  }, [order, movedId]);

  const indexOfId = (id) => order.findIndex((d) => d.id === id);

  const moveToIndex = (from, to) => {
    if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return order;
    const next = order.slice();
    const [spliced] = next.splice(from, 1);
    next.splice(to, 0, spliced);
    setOrder(next);
    onReorder?.(next);
    setMovedId(spliced.id);
    return next;
  };

  const handleKeyDown = (event, id) => {
    const isAlt = event.altKey || event.ctrlKey || event.metaKey;
    if (!isAlt) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const from = indexOfId(id);
      const to = event.key === "ArrowLeft" ? Math.max(0, from - 1) : Math.min(order.length - 1, from + 1);
      moveToIndex(from, to);
    }
  };

  const getHoverIndex = (clientX) => {
    const entries = order.map((d) => [d.id, itemRefs.current.get(d.id)]);
    const boxes = entries
      .map(([id, el], i) => ({ id, i, rect: el ? el.getBoundingClientRect() : null }))
      .filter((b) => b.rect);
    if (!boxes.length) return -1;
    // Find the closest slot by center distance
    let best = { i: -1, dist: Infinity };
    for (const b of boxes) {
      const center = b.rect.left + b.rect.width / 2;
      const dist = Math.abs(center - clientX);
      if (dist < best.dist) best = { i: b.i, dist };
    }
    return best.i;
  };

  const handlePointerDown = (event, id) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDraggingId(id);
    setStartIndex(indexOfId(id));
  };

  const handlePointerMove = (event) => {
    if (!draggingId) return;
    const over = getHoverIndex(event.clientX);
    if (over < 0) return;
    const from = indexOfId(draggingId);
    if (from !== over) {
      // live preview snap by reordering immediately
      const next = order.slice();
      const [item] = next.splice(from, 1);
      next.splice(over, 0, item);
      setOrder(next);
    }
  };

  const handlePointerUp = (event) => {
    if (!draggingId) return;
    const endIndex = indexOfId(draggingId);
    const from = startIndex;
    const to = endIndex;
    setDraggingId(null);
    setStartIndex(-1);
    if (from !== to && from >= 0 && to >= 0) {
      onReorder?.(order);
      setMovedId(draggingId);
    }
  };

  const handleClick = (e, id) => {
    if (draggingId) {
      e.preventDefault();
      return;
    }
    onSelect?.(id);
  };

  return (
    <div
      ref={containerRef}
      className="rounded-2xl border bg-white p-2 flex items-center gap-2 overflow-x-auto"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="tablist"
    >
      {order.map((doc) => (
        <button
          key={doc.id}
          ref={(el) => {
            if (el) itemRefs.current.set(doc.id, el);
            else itemRefs.current.delete(doc.id);
          }}
          className={`px-3 py-2 rounded-xl border cursor-grab active:cursor-grabbing ${
            activeId === doc.id ? "bg-blue-600 text-white border-blue-600" : "bg-white"
          }`}
          onPointerDown={(e) => handlePointerDown(e, doc.id)}
          onClick={(e) => handleClick(e, doc.id)}
          onKeyDown={(e) => handleKeyDown(e, doc.id)}
          title={doc.done ? "Completed" : "Not completed"}
          role="tab"
          aria-selected={activeId === doc.id}
          tabIndex={0}
        >
          <span
            className="mr-2 inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: doc.done ? "#22c55e" : "#d1d5db" }}
          ></span>
          {doc.name}
        </button>
      ))}
      {order.length === 0 && <div className="text-sm text-gray-500 px-2 py-1">No documents</div>}
    </div>
  );
}

export default DocumentTabs;
