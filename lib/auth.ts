import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { query } from "./db";
export const id = () => randomUUID();
export const token = () => randomBytes(32).toString("base64url");
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function identity() {
  const value = (await cookies()).get("poll_session")?.value;
  if (!value) return null;
  return (
    (
      await query(
        "SELECT * FROM members WHERE session_hash=$1 AND active=true",
        [hash(value)],
      )
    )[0] || null
  );
}
export async function setSession(value: string) {
  (await cookies()).set("poll_session", value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: value ? 60 * 60 * 24 * 180 : 0,
  });
}
