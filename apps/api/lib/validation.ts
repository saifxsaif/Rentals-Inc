import { z } from "zod";

export const documentInputSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
});

export const applicationInputSchema = z.object({
  applicantName: z.string().min(2),
  applicantEmail: z.string().email(),
  applicantPhone: z.string().optional(),
  documents: z.array(documentInputSchema).min(1),
});

export type ApplicationInput = z.infer<typeof applicationInputSchema>;

export const decisionInputSchema = z.object({
  decision: z.enum(["approved", "flagged"]),
  notes: z.string().max(500).optional(),
});

export type DecisionInput = z.infer<typeof decisionInputSchema>;
