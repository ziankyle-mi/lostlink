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

export const STANDARD_YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"] as const;
export const DVM_YEAR_LEVELS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year",
  "6th Year",
] as const;
export const ALL_YEAR_LEVELS = DVM_YEAR_LEVELS;
export const YEAR_LEVELS = ALL_YEAR_LEVELS;

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(80, "Name is too long."),
    email: emailSchema,
    password: passwordSchema,
    agree: z.coerce.boolean().optional().default(false),
    role: z.enum(["student", "faculty", "admin"]).optional().default("student"),
    program: z
      .string()
      .trim()
      .min(1, "Select your degree program or department affiliation."),
    studentId: z.string().trim().optional(),
    yearLevel: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    // Student ID and Year Level are strictly required for students, but not applicable for faculty or admin
    if (data.role === "student" || !data.role) {
      if (!data.studentId || data.studentId.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter your Student ID (e.g. 2024-10144).",
          path: ["studentId"],
        });
      }
      if (!data.yearLevel || data.yearLevel.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select your current year level.",
          path: ["yearLevel"],
        });
      } else {
        const allowed = data.program === "DVM" ? DVM_YEAR_LEVELS : STANDARD_YEAR_LEVELS;
        if (!allowed.includes(data.yearLevel as any)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              data.program === "DVM"
                ? "DVM year level must be between 1st Year and 6th Year."
                : `${data.program || "This"} is a 4-year degree program (1st to 4th Year).`,
            path: ["yearLevel"],
          });
        }
      }
    }
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

/** Office decision on an item that has been unclaimed past the custody window. */
export const custodyDecisionSchema = z.object({
  itemId: z.string().uuid("That item reference is not valid."),
  decision: z.enum(["extend_custody", "mark_donation"]),
});

/** Local dev only: auto-login test button signs in this address. */
export const devLoginSchema = z.object({
  email: emailSchema.optional().default("firstname.lastname@dlsau.edu.ph"),
  next: nextPathSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;