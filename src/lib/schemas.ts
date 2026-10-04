import { z } from "zod";

/** Field validation for every step. Keep messages short and plain. */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required.")
  .max(254, "Email is too long.")
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Password is too long.");

export const nextPathSchema = z
  .string()
  .trim()
  .max(200)
  .optional()
  .default("/");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required.").max(72, "Password is too long."),
  remember: z.coerce.boolean().optional().default(false),
  next: nextPathSchema,
});

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(80, "Name is too long."),
  email: emailSchema,
  password: passwordSchema,
  agree: z.coerce.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string().min(1, "Confirm your password."),
  })
  .refine((values) => values.password === values.confirm, {
    message: "Passwords must match.",
    path: ["confirm"],
  });

export const emptySchema = z.object({}).passthrough();

/** Local dev only: auto-login test button signs in this address. */
export const devLoginSchema = z.object({
  email: emailSchema.optional().default("firstname.lastname@dlsau.edu.ph"),
  next: nextPathSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;