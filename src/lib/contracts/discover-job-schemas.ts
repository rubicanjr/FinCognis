import { z } from "zod";
import { AnalyzeResponseSchema } from "@/lib/contracts/universal-asset-schemas";

export const DiscoveryJobStatusSchema = z.enum(["pending", "processing", "completed", "failed"]);

export const DiscoveryJobSchema = z.object({
  id: z.string().min(1),
  status: DiscoveryJobStatusSchema,
  data: AnalyzeResponseSchema.partial().nullable(),
  progress: z.number().min(0).max(100),
  expiresAt: z.number().int().positive(),
  error: z.string().min(1).optional(),
});

export const DiscoveryJobAcceptedSchema = z.object({
  jobId: z.string().min(1),
  statusEndpoint: z.string().min(1),
  status: DiscoveryJobStatusSchema,
  progress: z.number().min(0).max(100),
  expiresAt: z.number().int().positive(),
});

export const DiscoveryJobStatusResponseSchema = z.object({
  job: DiscoveryJobSchema,
});

export type DiscoveryJob = z.infer<typeof DiscoveryJobSchema>;
export type DiscoveryJobAccepted = z.infer<typeof DiscoveryJobAcceptedSchema>;
export type DiscoveryJobStatusResponse = z.infer<typeof DiscoveryJobStatusResponseSchema>;
