"use client";

export function UndoToast({
  name,
  onUndo,
}: {
  name: string;
  onUndo: () => void;
}) {
  return (
    <div role="status" className="toast">
      <span className="min-w-0 truncate text-sm font-semibold">
        Deleted &ldquo;{name}&rdquo;
      </span>
      <button onClick={onUndo} className="btn btn-volt btn-sm shrink-0">
        Undo
      </button>
    </div>
  );
}
