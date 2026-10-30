import { hash } from "./auth";
export function normalizeCode(value: unknown) {
  if (typeof value !== "string")
    throw new Error("Enter your private group code.");
  const code = value.trim().toUpperCase();
  if (!/^[A-Z0-9-]{5,40}$/.test(code))
    throw new Error("Use a group code of 5–40 letters, numbers, or hyphens.");
  return code;
}
export function codeHash(value: unknown) {
  return hash(`saturday-poll-group:${normalizeCode(value)}`);
}
