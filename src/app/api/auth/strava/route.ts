import { NextRequest, NextResponse } from "next/server";

function redirectUri(request: NextRequest): string {
  return (
    process.env.STRAVA_REDIRECT_URI ??
    `${request.nextUrl.origin}/api/auth/strava/callback`
  );
}

export async function GET(request: NextRequest) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "STRAVA_CLIENT_ID is not configured" },
      { status: 500 },
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(request),
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read",
  });

  return NextResponse.redirect(
    `https://www.strava.com/oauth/authorize?${params.toString()}`,
  );
}
