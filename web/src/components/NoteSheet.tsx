"use client";

import { useState } from "react";
import { MAX_NOTE } from "@/lib/notes";
import { Sheet } from "./Sheet";

/**
 * A bottom sheet for the note on one day of a habit. Saving empty text removes the note.
 * The parent closes it once the save has gone through.
 */
export function NoteSheet({
  open,
  onClose,
  title,
  initial,
  pending,
  error,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  initial: string;
  pending: boolean;
  error: string | null;
  onSave: (text: string) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <NoteForm initial={initial} pending={pending} error={error} onSave={onSave} />
    </Sheet>
  );
}

function NoteForm({
  initial,
  pending,
  error,
  onSave,
}: {
  initial: string;
  pending: boolean;
  error: string | null;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(initial);
  const left = MAX_NOTE - text.length;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!pending) onSave(text.trim());
      }}
    >
      <div className="field">
        <label htmlFor="note-text">Note</label>
        <textarea
          id="note-text"
          autoFocus
          rows={4}
          maxLength={MAX_NOTE}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="How did it go?"
          className="input min-h-28 resize-none py-3"
        />
        <span className={`text-xs ${left <= 20 ? "text-danger" : "text-muted"}`} aria-live="polite">
          {left} characters left
        </span>
      </div>
      {error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
      <div className={`grid gap-2 ${initial ? "grid-cols-2" : "grid-cols-1"}`}>
        {initial && (
          <button
            type="button"
            className="btn-ghost h-12"
            disabled={pending}
            onClick={() => onSave("")}
          >
            Remove
          </button>
        )}
        <button type="submit" className="btn btn-volt" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
