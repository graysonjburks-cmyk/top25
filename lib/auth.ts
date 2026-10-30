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
export async function setSession(value: string, groupId?: string) {
  const jar = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: value ? 60 * 60 * 24 * 180 : 0,
  };
  const previous = jar.get("poll_session")?.value;
  if (value && previous && previous !== value) {
    const old = (
      await query(
        "SELECT group_id FROM members WHERE session_hash=$1 AND active=true",
        [hash(previous)],
      )
    )[0];
    if (old) jar.set(`poll_group_${old.group_id}`, previous, options);
  }
  if (groupId) jar.set(`poll_group_${groupId}`, value, options);
  jar.set("poll_session", value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: value ? 60 * 60 * 24 * 180 : 0,
  });
}

export async function groupIdentity(groupId: string) {
  const jar = await cookies();
  const value =
    jar.get(`poll_group_${groupId}`)?.value || jar.get("poll_session")?.value;
  if (!value) return null;
  const member = (
    await query(
      "SELECT * FROM members WHERE group_id=$1 AND session_hash=$2 AND active=true",
      [groupId, hash(value)],
    )
  )[0];
  return member ? { member, secret: value } : null;
}
