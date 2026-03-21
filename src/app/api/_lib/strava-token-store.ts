type StravaTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope?: string;
};

let tokens: StravaTokens | null = null;

function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function hasUsableAccessToken(value: StravaTokens | null): value is StravaTokens {
  if (!value) return false;
  return value.expiresAt > nowInSeconds() + 60;
}

async function refreshAccessToken(refreshToken: string): Promise<StravaTokens | null> {
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
    scope: data.scope,
  };
}

export function setStravaTokensFromOAuth(data: {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  scope?: string;
}): boolean {
  if (!data.access_token || !data.refresh_token) return false;
  tokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at ?? nowInSeconds() + (data.expires_in ?? 21600),
    scope: data.scope,
  };
  return true;
}

export async function getStravaAccessToken(
  options?: { forceRefresh?: boolean },
): Promise<string | null> {
  if (!tokens) return null;

  const forceRefresh = options?.forceRefresh ?? false;
  if (!forceRefresh && hasUsableAccessToken(tokens)) {
    return tokens.accessToken;
  }

  const refreshed = await refreshAccessToken(tokens.refreshToken);
  if (!refreshed) return null;
  tokens = refreshed;
  return refreshed.accessToken;
}
