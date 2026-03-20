import { NextRequest, NextResponse } from "next/server";

const CACHE_TTL_MS = 15 * 60 * 1000;

type CachedEntry = {
  status: number;
  contentType: string;
  body: string;
  expiresAt: number;
};

const activitiesCache = new Map<string, CachedEntry>();

/**
 * Pass-through to Strava's:
 *   GET /api/v3/athlete/activities
 *
 * This endpoint returns Strava's raw JSON response body.
 */
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("strava_access_token")?.value;
  if (!accessToken) {
    return NextResponse.json(
      { error: "missing_strava_access_token" },
      { status: 401 },
    );
  }

  const cacheKey = `${accessToken}:${request.nextUrl.searchParams.toString()}`;
  const cached = activitiesCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return new NextResponse(cached.body, {
      status: cached.status,
      headers: { "Content-Type": cached.contentType },
    });
  }

  const url = new URL("https://www.strava.com/api/v3/athlete/activities");
  url.search = request.nextUrl.searchParams.toString();

  const stravaRes = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const contentType =
    stravaRes.headers.get("content-type") ?? "application/json; charset=utf-8";
  const body = await stravaRes.text();

  // Cache all upstream responses for 15 minutes by default.
  activitiesCache.set(cacheKey, {
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
