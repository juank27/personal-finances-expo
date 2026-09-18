import type { Profile } from "@finanzas/shared";
import type { UpdateProfileInput } from "@finanzas/validators";
import { sql } from "../../db";
import { HttpError } from "../../middleware/error-handler";

export async function getProfile(userId: string): Promise<Profile> {
  const [profile] = await sql<Profile[]>`
    SELECT * FROM profiles WHERE id = ${userId}
  `;

  if (!profile) {
    throw new HttpError(404, "Profile not found", "not_found");
  }

  return profile;
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<Profile> {
  const [profile] = await sql<Profile[]>`
    UPDATE profiles
    SET full_name = ${input.full_name}
    WHERE id = ${userId}
    RETURNING *
  `;

  if (!profile) {
    throw new HttpError(404, "Profile not found", "not_found");
  }

  return profile;
}
