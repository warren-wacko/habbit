// Browser-side helpers for the share picture: colours, fonts, photo loading,
// and getting the finished canvas out as a file. Browser-only, call from
// event handlers and effects, never while rendering on the server.

import type { ShareFonts } from "./shareCard";
import type { HabitColor } from "./types";

// The habit palette lives in CSS (--h-volt, --h-aqua, ...); the canvas needs the value
export function resolveHabitColor(color: HabitColor): string {
  return (
    getComputedStyle(document.documentElement).getPropertyValue(`--h-${color}`).trim() ||
    "#ccf33c"
  );
}

export function readShareFonts(): ShareFonts {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-archivo").trim();
  return { family: v || "sans-serif" };
}

// The canvas can only use a font once it has loaded, including the wide cut
export async function loadShareFonts(fonts: ShareFonts): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load(`800 expanded 100px ${fonts.family}`),
      document.fonts.load(`700 40px ${fonts.family}`),
      document.fonts.load(`600 40px ${fonts.family}`),
    ]);
  } catch {
    // draw with the fallback fonts
  }
}

// Can this browser share a picture file (the native share sheet on phones)?
export function supportsFileShare(): boolean {
  try {
    const probe = new File([""], "x.png", { type: "image/png" });
    return (
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [probe] })
    );
  } catch {
    return false;
  }
}

// Honour the photo's EXIF rotation where the browser supports it
export async function loadPhoto(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return createImageBitmap(file);
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Opens the share sheet. Resolves quietly if the user dismisses it.
export async function shareBlob(
  blob: Blob,
  filename: string,
  title: string,
): Promise<void> {
  const file = new File([blob], filename, { type: "image/png" });
  try {
    await navigator.share({ files: [file], title });
  } catch (err) {
    if ((err as DOMException).name !== "AbortError") throw err;
  }
}
