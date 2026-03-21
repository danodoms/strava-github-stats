import { NextRequest, NextResponse } from "next/server";
import { setStravaTokensFromOAuth } from "../../../_lib/strava-token-store";

function redirectUri(request: NextRequest): string {
  return (
    process.env.STRAVA_REDIRECT_URI ??
    `${request.nextUrl.origin}/api/auth/strava/callback`
  );
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const stravaError = request.nextUrl.searchParams.get("error");

  if (stravaError) {
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(stravaError)}`,
    );
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/?error=config`);
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(request),
  });

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${origin}/?error=token_exchange_failed`);
  }

  const data = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    expires_in?: number;
    scope?: string;
  };

  const stored = setStravaTokensFromOAuth(data);
  if (!stored) {
    return NextResponse.redirect(`${origin}/?error=token_store_failed`);
  }

  return NextResponse.redirect(`${origin}/?connected=1`);
}
