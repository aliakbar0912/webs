/** Tiny shared helper: trimmed non-empty string from process.env. */

export function readString(key: string): string | undefined {
  const value = process.env[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function readBool(key: string, fallback: boolean): boolean {
  const value = readString(key);
  if (value === undefined) return fallback;
  return value === "1" || value.toLowerCase() === "true";
}
