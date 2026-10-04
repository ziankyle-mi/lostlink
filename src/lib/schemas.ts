import { z } from "zod";

/** Field validation for every step. Keep messages short and plain. */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required.")
  .max(254, "Email is too long.")
  .email("Enter a valid email address.");

export const nextPathSchema = z
  .string()
  .trim()
  .max(200)
  .optional()
  .default("/");

export const googleSignInSchema = z.object({
  next: nextPathSchema,
});

export const emptySchema = z.object({}).passthrough();

export const devLoginSchema = z.object({
  email: emailSchema,
  next: nextPathSchema,
});

export type DevLoginInput = z.infer<typeof devLoginSchema>;