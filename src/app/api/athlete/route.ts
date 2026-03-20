import { NextRequest, NextResponse } from "next/server";

const CACHE_TTL_MS = 15 * 60 * 1000;

type CachedEntry = {
  status: number;
  contentType: string;
  body: string;
  expiresAt: number;
};

const athleteCache = new Map<string, CachedEntry>();

/**
 * Pass-through to Strava's:
 *   GET /api/v3/athlete
 *
 * Returns raw upstream response and caches by default for 15 minutes.
 */
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("strava_access_token")?.value;
  if (!accessToken) {
    return NextResponse.json(
      { error: "missing_strava_access_token" },
      { status: 401 },
    );
  }

  const cacheKey = accessToken;
  const cached = athleteCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return new NextResponse(cached.body, {
      status: cached.status,
      headers: { "Content-Type": cached.contentType },
    });
  }

  const stravaRes = await fetch("https://www.strava.com/api/v3/athlete", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const contentType =
    stravaRes.headers.get("content-type") ?? "application/json; charset=utf-8";
  const body = await stravaRes.text();

  athleteCache.set(cacheKey, {
    status: stravaRes.status,
    contentType,
    body,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return new NextResponse(body, {
    status: stravaRes.status,
    headers: { "Content-Type": contentType },
  });
}
