import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ACCESS = "strava_access_token";
const REFRESH = "strava_refresh_token";
const EXPIRES_AT = "strava_expires_at";

type StravaTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function cookieDefaults() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

function hasUsableAccessToken(
  value: StravaTokens | null,
): value is StravaTokens {
  if (!value) return false;
  return value.expiresAt > nowInSeconds() + 60;
}

function readTokensFromCookieStore(
  store: Awaited<ReturnType<typeof cookies>>,
): StravaTokens | null {
  const accessToken = store.get(ACCESS)?.value;
  const refreshToken = store.get(REFRESH)?.value;
  const expiresRaw = store.get(EXPIRES_AT)?.value;
  if (!accessToken || !refreshToken) return null;
  let expiresAt = 0;
  if (expiresRaw != null && expiresRaw !== "") {
    const parsed = parseInt(expiresRaw, 10);
    if (!Number.isFinite(parsed)) return null;
    expiresAt = parsed;
  }
  return { accessToken, refreshToken, expiresAt };
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<StravaTokens | null> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) return null;

  const data = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    expires_in?: number;
    scope?: string;
  };
  if (!data.access_token || !data.refresh_token) return null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at ?? nowInSeconds() + (data.expires_in ?? 21600),
  };
}

function writeTokensToCookieStore(
  store: Awaited<ReturnType<typeof cookies>>,
  tokens: StravaTokens,
): void {
  const maxAgeAccess = Math.max(60, tokens.expiresAt - nowInSeconds());
  const defaults = cookieDefaults();
  store.set(ACCESS, tokens.accessToken, { ...defaults, maxAge: maxAgeAccess });
  store.set(REFRESH, tokens.refreshToken, {
    ...defaults,
    maxAge: 60 * 60 * 24 * 180,
  });
  store.set(EXPIRES_AT, String(tokens.expiresAt), {
    ...defaults,
    maxAge: maxAgeAccess,
  });
}

/** Attach Strava tokens to a redirect (or other) response after OAuth callback. */
export function setStravaAuthCookies(
  response: NextResponse,
  data: {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    expires_in?: number;
    scope?: string;
  },
): boolean {
  if (!data.access_token || !data.refresh_token) return false;
  const tokens: StravaTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at ?? nowInSeconds() + (data.expires_in ?? 21600),
  };
  const defaults = cookieDefaults();
  const maxAgeAccess = Math.max(60, tokens.expiresAt - nowInSeconds());
  response.cookies.set(ACCESS, tokens.accessToken, {
    ...defaults,
    maxAge: maxAgeAccess,
  });
  response.cookies.set(REFRESH, tokens.refreshToken, {
    ...defaults,
    maxAge: 60 * 60 * 24 * 180,
  });
  response.cookies.set(EXPIRES_AT, String(tokens.expiresAt), {
    ...defaults,
    maxAge: maxAgeAccess,
  });
  return true;
}

/** True if the browser session still has Strava credentials (for UI). */
export async function hasStravaOAuthSession(): Promise<boolean> {
  const store = await cookies();
  if (store.get(REFRESH)?.value) return true;
  const tokens = readTokensFromCookieStore(store);
  return hasUsableAccessToken(tokens);
}

/**
 * Resolves a usable Strava access token from request cookies; refreshes when
 * expired and writes new cookies on the outgoing response via the cookies() API.
 */
export async function getStravaAccessToken(options?: {
  forceRefresh?: boolean;
}): Promise<string | null> {
  const store = await cookies();
  let tokens = readTokensFromCookieStore(store);
  const forceRefresh = options?.forceRefresh ?? false;

  if (!tokens) return null;

  if (!forceRefresh && hasUsableAccessToken(tokens)) {
    return tokens.accessToken;
  }

  const refreshed = await refreshAccessToken(tokens.refreshToken);
  if (!refreshed) return null;
  writeTokensToCookieStore(store, refreshed);
  return refreshed.accessToken;
}
