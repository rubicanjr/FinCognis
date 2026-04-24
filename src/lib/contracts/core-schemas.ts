import { z } from "zod";

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  provider: "google" | "email" | "unknown";
}

export interface AuthSession {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  user: User | null;
}

export interface ThemeConfig {
  mode: "dark" | "light";
  isSystemPreferred: boolean;
  updatedAt: string;
}

export interface ToolData {
  id: "commission" | "correlation" | "stress";
  title: string;
  description: string;
  href: "/tools";
  iconKey: "wallet" | "network" | "shield";
  requiresAuth: true;
  premium: boolean;
}

const UserMetadataSchema = z.object({
  full_name: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  avatar_url: z.url().nullable().optional(),
}).passthrough();

const SupabaseUserPayloadSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  app_metadata: z
    .object({
      provider: z.string().nullable().optional(),
    })
    .passthrough()
    .optional(),
  user_metadata: UserMetadataSchema.optional(),
});

const SupabaseSessionPayloadSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().nullable().optional(),
  expires_at: z.number().nullable().optional(),
  user: SupabaseUserPayloadSchema,
});

export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  fullName: z.string().nullable(),
  avatarUrl: z.url().nullable(),
  provider: z.enum(["google", "email", "unknown"]),
});

export const AuthSessionSchema = z.object({
  isAuthenticated: z.boolean(),
  accessToken: z.string().nullable(),
  refreshToken: z.string().nullable(),
  expiresAt: z.iso.datetime().nullable(),
  user: UserSchema.nullable(),
});

export const ThemeConfigSchema = z.object({
  mode: z.enum(["dark", "light"]),
  isSystemPreferred: z.boolean(),
  updatedAt: z.iso.datetime(),
});

export const ToolDataSchema = z.object({
  id: z.enum(["commission", "correlation", "stress"]),
  title: z.string().min(2),
  description: z.string().min(3),
  href: z.literal("/tools"),
  iconKey: z.enum(["wallet", "network", "shield"]),
  requiresAuth: z.literal(true),
  premium: z.boolean(),
});

export const ToolDataListSchema = z.array(ToolDataSchema).min(1);

function parseProvider(value: string | null | undefined): User["provider"] {
  // 1) Normalize nullable provider value.
  const normalized = (value ?? "").toLowerCase();
  // 2) Return mapped provider value with bounded domain.
  if (normalized === "google") return "google";
  if (normalized === "email") return "email";
  return "unknown";
}

function pickFullName(userMetadata: z.infer<typeof UserMetadataSchema> | undefined): string | null {
  // 1) Resolve explicit full_name first.
  const explicit = userMetadata?.full_name ?? null;
  // 2) Fallback to generic name when needed.
  if (explicit) return explicit;
  return userMetadata?.name ?? null;
}

function sanitizeAvatarUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    // Validate URL shape and normalize invalid values to null.
    // eslint-disable-next-line no-new
    new URL(trimmed);
    return trimmed;
  } catch {
    return null;
  }
}

export function createGuestSession(): AuthSession {
  // 1) Return a strict guest session contract.
  return {
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    user: null,
  };
}

export function parseThemeConfig(payload: unknown): ThemeConfig | null {
  // 1) Validate unknown payload with Zod.
  const parsed = ThemeConfigSchema.safeParse(payload);
  // 2) Return null for invalid payloads.
  if (!parsed.success) return null;
  // 3) Return typed payload for valid inputs.
  return parsed.data;
}

export function parseToolDataList(payload: unknown): ToolData[] | null {
  // 1) Validate unknown payload with Zod.
  const parsed = ToolDataListSchema.safeParse(payload);
  // 2) Return null for invalid payloads.
  if (!parsed.success) return null;
  // 3) Return typed payload for valid inputs.
  return parsed.data;
}

export function parseAuthSession(payload: unknown): AuthSession | null {
  // 1) Validate unknown payload with Zod.
  const parsed = AuthSessionSchema.safeParse(payload);
  // 2) Return null for invalid payloads.
  if (!parsed.success) return null;
  // 3) Return typed payload for valid inputs.
  return parsed.data;
}

export function createAuthSessionFromSupabasePayload(payload: unknown): AuthSession {
  // 1) Validate external Supabase payload.
  const parsed = SupabaseSessionPayloadSchema.safeParse(payload);
  // 2) Return guest contract when payload is invalid.
  if (!parsed.success) {
    return createGuestSession();
  }
  // 3) Build strict internal user/session contracts.
  const fullName = pickFullName(parsed.data.user.user_metadata);
  const authSession: AuthSession = {
    isAuthenticated: true,
    accessToken: parsed.data.access_token,
    refreshToken: parsed.data.refresh_token ?? null,
    expiresAt: parsed.data.expires_at
      ? new Date(parsed.data.expires_at * 1000).toISOString()
      : null,
    user: {
      id: parsed.data.user.id,
      email: parsed.data.user.email,
      fullName,
      avatarUrl: sanitizeAvatarUrl(parsed.data.user.user_metadata?.avatar_url ?? null),
      provider: parseProvider(parsed.data.user.app_metadata?.provider),
    },
  };
  const validated = AuthSessionSchema.safeParse(authSession);
  return validated.success ? validated.data : createGuestSession();
}
