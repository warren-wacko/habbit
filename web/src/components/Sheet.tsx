"use client";

import { useEffect, useId, useRef } from "react";
import { CloseIcon } from "./icons";

/**
 * Opens and closes a native <dialog> from an `open` flag. The dialog traps
 * focus, closes on Escape and dims the page, and its content only exists while
 * it is open, so every opening starts fresh.
 */
export function useModalDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return ref;
}

/** A bottom sheet: grabber, title, close button, then the content */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useModalDialog(open);
  const titleId = useId();

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // a click on the dimmed area outside the sheet closes it
        if (e.target === ref.current) ref.current?.close();
      }}
      aria-labelledby={titleId}
      className="sheet"
    >
      {open && (
        <div className="flex flex-col gap-4 px-5 pb-6 pt-2.5">
          <span className="grabber" aria-hidden="true" />
          <div className="flex items-center justify-between gap-4">
            <h2 id={titleId} className="display text-[1.375rem]">
              {title}
            </h2>
            <button
              onClick={() => ref.current?.close()}
              aria-label="Close"
              className="icon-btn border-0 bg-track"
            >
              <CloseIcon />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
