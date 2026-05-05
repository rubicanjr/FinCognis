import { z } from "zod";

export const EconomicTabSchema = z.enum(["economic", "holidays", "dividends", "splits", "ipo"]);
export const EconomicRangeSchema = z.enum(["yesterday", "today", "tomorrow", "week"]);

export const EconomicEventSchema = z.object({
  id: z.string().min(1),
  time: z.string().min(1),
  currency: z.string().min(1),
  importance: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  eventTitle: z.string().min(1),
  actual: z.string().nullable(),
  forecast: z.string().nullable(),
  previous: z.string().nullable(),
  impactLevel: z.enum(["High", "Medium", "Low"]),
});

export const EconomicMirrorStatusSchema = z.enum(["READY", "LOADING", "SOURCE_UNAVAILABLE"]);

export const EconomicMirrorResponseSchema = z.object({
  status: EconomicMirrorStatusSchema,
  message: z.string().nullable().default(null),
  tab: EconomicTabSchema,
  range: EconomicRangeSchema,
  updatedAt: z.string().nullable(),
  events: z.array(EconomicEventSchema),
});

export type EconomicTab = z.infer<typeof EconomicTabSchema>;
export type EconomicRange = z.infer<typeof EconomicRangeSchema>;
export type EconomicEvent = z.infer<typeof EconomicEventSchema>;
export type EconomicMirrorStatus = z.infer<typeof EconomicMirrorStatusSchema>;
export type EconomicMirrorResponse = z.infer<typeof EconomicMirrorResponseSchema>;

export function isEconomicEvent(payload: unknown): payload is EconomicEvent {
  return EconomicEventSchema.safeParse(payload).success;
}
