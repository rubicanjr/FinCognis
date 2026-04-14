import { z } from "zod";

export interface UserAuth {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  role: "guest" | "member" | "admin";
  sessionToken: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
}

export interface ThemeConfig {
  mode: "dark" | "light";
  isSystemPreferred: boolean;
  updatedAt: string;
}

export interface ToolInformationSchema {
  id: "commission" | "correlation" | "stress";
  title: string;
  description: string;
  href: "/tools";
  iconKey: "wallet" | "network" | "shield";
  requiresAuth: true;
  premium: boolean;
}

export const UserAuthZodSchema = z.object({
  isAuthenticated: z.boolean(),
  userId: z.string().min(1).nullable(),
  email: z.email().nullable(),
  role: z.enum(["guest", "member", "admin"]),
  sessionToken: z.string().min(12).nullable(),
  issuedAt: z.iso.datetime().nullable(),
  expiresAt: z.iso.datetime().nullable(),
});

export const ThemeConfigZodSchema = z.object({
  mode: z.enum(["dark", "light"]),
  isSystemPreferred: z.boolean(),
  updatedAt: z.iso.datetime(),
});

export const ToolInformationZodSchema = z.object({
  id: z.enum(["commission", "correlation", "stress"]),
  title: z.string().min(2),
  description: z.string().min(3),
  href: z.literal("/tools"),
  iconKey: z.enum(["wallet", "network", "shield"]),
  requiresAuth: z.literal(true),
  premium: z.boolean(),
});

export const ToolInformationListZodSchema = z.array(ToolInformationZodSchema).min(1);

export const LoginPayloadZodSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export const AuthCookiePayloadZodSchema = z.object({
  userId: z.string().min(1),
  email: z.email(),
  role: z.enum(["member", "admin"]),
  sessionToken: z.string().min(12),
  issuedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
});

export function parseUserAuth(payload: unknown): UserAuth | null {
  // 1) Validate the unknown payload with Zod.
  const parsed = UserAuthZodSchema.safeParse(payload);
  // 2) Return null when validation fails.
  if (!parsed.success) {
    return null;
  }
  // 3) Return the typed value when validation succeeds.
  return parsed.data;
}

export function parseThemeConfig(payload: unknown): ThemeConfig | null {
  // 1) Validate the unknown payload with Zod.
  const parsed = ThemeConfigZodSchema.safeParse(payload);
  // 2) Return null when validation fails.
  if (!parsed.success) {
    return null;
  }
  // 3) Return the typed value when validation succeeds.
  return parsed.data;
}

export function parseToolInformationList(payload: unknown): ToolInformationSchema[] | null {
  // 1) Validate the unknown payload with Zod.
  const parsed = ToolInformationListZodSchema.safeParse(payload);
  // 2) Return null when validation fails.
  if (!parsed.success) {
    return null;
  }
  // 3) Return the typed value when validation succeeds.
  return parsed.data;
}

