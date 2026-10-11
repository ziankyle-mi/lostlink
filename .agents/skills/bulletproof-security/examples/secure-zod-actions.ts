import { defineAction, ActionError } from "astro:actions";
import { z } from "zod";

// Strict schema validation (rejects extra parameters and prototype tampering)
const SubmitReportSchema = z
  .object({
    type: z.enum(["lost", "found"]),
    name: z.string().trim().min(3, "Name must be at least 3 characters").max(100),
    category: z.string().trim().min(2).max(50),
    location: z.string().trim().min(2).max(100),
    event_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
      .refine((date) => new Date(date) <= new Date(), "Event date cannot be in the future"),
    description: z.string().trim().min(10, "Description must be at least 10 characters").max(2000),
    turnstile_token: z.string().min(1, "Bot check verification required"),
  })
  .strict();

export const serverActions = {
  submitReport: defineAction({
    accept: "form",
    input: SubmitReportSchema,
    handler: async (input, context) => {
      // 1. Authenticate user server-side
      const user = context.locals.user;
      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "You must be signed in to submit a report.",
        });
      }

      // 2. Validate Turnstile token
      const env = context.locals.env;
      const turnstileRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY,
          response: input.turnstile_token,
          remoteip: context.clientAddress || "",
        }),
      });
      const turnstileData = (await turnstileRes.json()) as { success: boolean };
      if (!turnstileData.success) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: "Bot verification failed. Please try again.",
        });
      }

      // 3. Database mutation with scoped user ID
      const { data, error } = await context.locals.supabase
        .from("items")
        .insert({
          type: input.type,
          name: input.name,
          category: input.category,
          location: input.location,
          event_date: input.event_date,
          description: input.description,
          reporter_id: user.id, // Strictly bound to verified session user
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Database insert error:", error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to record report. Please try again.",
        });
      }

      return { success: true, item: data };
    },
  }),
};
