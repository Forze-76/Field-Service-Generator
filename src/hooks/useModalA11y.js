import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const getFocusableElements = (container) => {
  if (!container) return [];
  const nodes = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
  return nodes.filter((node) => !node.hasAttribute("disabled") && node.getAttribute("tabindex") !== "-1");
};

export function useModalA11y(isOpen, containerRef, { onClose, returnFocusRef } = {}) {
  const lastActiveElementRef = useRef(null);
  const hasFocusedRef = useRef(false);
  const closeCallbackRef = useRef(onClose);

  useEffect(() => {
    closeCallbackRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      hasFocusedRef.current = false;
      return undefined;
    }

    const node = containerRef?.current;
    if (!node) return undefined;

    lastActiveElementRef.current =
      typeof document !== "undefined" && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusInitial = () => {
      if (hasFocusedRef.current) return;
      const focusable = getFocusableElements(node);
      const target = focusable[0] || node;
      if (target && typeof target.focus === "function") {
        target.focus({ preventScroll: true });
        hasFocusedRef.current = true;
      }
    };

    const handleKeyDown = (event) => {
      if (!isOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeCallbackRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusableElements(node);
      if (!focusable.length) {
        event.preventDefault();
        if (typeof node.focus === "function") {
          node.focus({ preventScroll: true });
        }
        return;
      }
      const activeIndex = focusable.indexOf(document.activeElement);
      let nextIndex = activeIndex;
      if (event.shiftKey) {
        nextIndex = activeIndex <= 0 ? focusable.length - 1 : activeIndex - 1;
      } else {
        nextIndex = activeIndex === focusable.length - 1 ? 0 : activeIndex + 1;
      }
      const next = focusable[nextIndex] || focusable[0];
      if (next && typeof next.focus === "function") {
        event.preventDefault();
        next.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    const raf =
      typeof window !== "undefined" && typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame
        : (cb) => setTimeout(cb, 0);
    const cancel =
      typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function"
        ? window.cancelAnimationFrame
        : (id) => clearTimeout(id);
    const rafId = raf(focusInitial);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      cancel(rafId);
    };
  }, [isOpen, containerRef]);

  useEffect(() => {
    if (isOpen) return;
    const target = returnFocusRef?.current || lastActiveElementRef.current;
    if (target && typeof target.focus === "function") {
      target.focus({ preventScroll: true });
    }
  }, [isOpen, returnFocusRef]);
}

export default useModalA11y;
