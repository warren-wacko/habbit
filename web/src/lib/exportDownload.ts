import { API_URL, tokenStore } from "./api";

export type ExportFormat = "json" | "csv";

/** The file name the server suggests, or a sensible one if it sent none */
export function exportFileName(header: string | null, format: ExportFormat, today: string): string {
  const match = header?.match(/filename="([^"]+)"/);
  const name = match?.[1];
  // only trust a plain file name: no folders, no odd characters
  return name && /^[\w.-]+$/.test(name) ? name : `habbit-export-${today}.${format}`;
}

/**
 * Downloads everything the user has as a file. The export needs the sign-in token, so a
 * plain link will not do: it is fetched with the token and saved from memory.
 */
export async function downloadExport(format: ExportFormat, today: string): Promise<void> {
  const token = tokenStore.get();
  const res = await fetch(`${API_URL}/api/habits/export?format=${format}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Couldn't download your data. Try again.");

  const blob = await res.blob();
  const name = exportFileName(res.headers.get("Content-Disposition"), format, today);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // let the browser start the save before the temporary address goes away
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
