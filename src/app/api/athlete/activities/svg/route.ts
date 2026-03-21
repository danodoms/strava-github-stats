import { NextRequest, NextResponse } from "next/server";

type StravaActivity = {
  start_date: string;
};

type StravaAthlete = {
  id: number;
  username?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  profile?: string | null;
  profile_medium?: string | null;
};

function toDateKey(dateLike: string): string {
  return new Date(dateLike).toISOString().slice(0, 10);
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function getDaysToRender(request: NextRequest): 181 | 363 {
  const value = request.nextUrl.searchParams.get("days");
  if (value === "363" || value === "365" || value === "1y") return 363;
  if (value === "181" || value === "182" || value === "6m") return 181;
  return 181;
}

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("strava_access_token")?.value;
  if (!accessToken) {
    return NextResponse.json(
      { error: "missing_strava_access_token" },
      { status: 401 },
    );
  }

  const daysToRender = getDaysToRender(request);
  const perPage = request.nextUrl.searchParams.get("per_page") ?? "200";
  const page = request.nextUrl.searchParams.get("page") ?? "1";

  const activitiesUrl = new URL(
    "https://www.strava.com/api/v3/athlete/activities",
  );
  activitiesUrl.searchParams.set("per_page", perPage);
  activitiesUrl.searchParams.set("page", page);

  const [activitiesRes, athleteRes] = await Promise.all([
    fetch(activitiesUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch("https://www.strava.com/api/v3/athlete", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ]);

  if (!activitiesRes.ok || !athleteRes.ok) {
    return NextResponse.json(
      {
        error: "failed_to_fetch_strava_data",
        activities_status: activitiesRes.status,
        athlete_status: athleteRes.status,
      },
      { status: 502 },
    );
  }

  const activitiesBody = (await activitiesRes.json()) as unknown;
  const athleteBody = (await athleteRes.json()) as unknown;

  if (
    !Array.isArray(activitiesBody) ||
    typeof athleteBody !== "object" ||
    !athleteBody
  ) {
    return NextResponse.json(
      { error: "unexpected_response_shape" },
      { status: 500 },
    );
  }

  const activities = activitiesBody as StravaActivity[];
  const athleteRaw = athleteBody as Partial<StravaAthlete>;
  const athlete: StravaAthlete = {
    id: athleteRaw.id ?? 0,
    username: athleteRaw.username ?? null,
    firstname: athleteRaw.firstname ?? null,
    lastname: athleteRaw.lastname ?? null,
    city: athleteRaw.city ?? null,
    state: athleteRaw.state ?? null,
    country: athleteRaw.country ?? null,
    profile: athleteRaw.profile ?? null,
    profile_medium: athleteRaw.profile_medium ?? null,
  };

  const counts = new Map<string, number>();
  for (const activity of activities) {
    const key = toDateKey(activity.start_date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (daysToRender - 1));

  const calendarData: Array<{
    date: string;
    count: number;
    level: 0 | 1 | 2 | 3 | 4;
  }> = [];
  const cursor = new Date(start);
  const maxCount = Math.max(0, ...counts.values());
  while (cursor <= today) {
    const date = formatDateOnly(cursor);
    const count = counts.get(date) ?? 0;
    calendarData.push({ date, count, level: toLevel(count, maxCount) });
    cursor.setDate(cursor.getDate() + 1);
  }

  const cols = Math.ceil(calendarData.length / 7);
  const cell = 10;
  const gap = 3;
  const left = 18;
  const top = 58;
  const gridWidth = cols * (cell + gap) - gap;
  const gridHeight = 7 * (cell + gap) - gap;
  const width = Math.max(760, left * 2 + gridWidth);
  const height = top + gridHeight + 72;

  const fullName =
    `${athlete.firstname ?? ""} ${athlete.lastname ?? ""}`.trim() ||
    "Strava Athlete";
  const location = [athlete.city, athlete.state, athlete.country]
    .filter(Boolean)
    .join(", ");
  const totalActivities = calendarData.reduce((sum, day) => sum + day.count, 0);
  const activeDays = calendarData.filter((day) => day.count > 0).length;
  const rangeLabel = daysToRender === 363 ? "Last year" : "Last 6 months";

  const levelColors = ["#2a2a2a", "#FC5200", "#FD7400", "#FE9544", "#FFB876"];
  const rects = calendarData
    .map((day, index) => {
      const col = Math.floor(index / 7);
      const row = index % 7;
      const x = left + col * (cell + gap);
      const y = top + row * (cell + gap);
      const color = levelColors[day.level];
      return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${color}" />`;
    })
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Strava activity heatmap">
  <rect width="100%" height="100%" fill="#FC5200" rx="16" />
  <text x="${left}" y="28" fill="#ffffff" font-size="20" font-family="Inter, Arial, sans-serif" font-weight="700">${fullName}</text>
  <text x="${left}" y="46" fill="#ffe0cf" font-size="12" font-family="Inter, Arial, sans-serif">${rangeLabel} - ${totalActivities} activities - ${activeDays} active days${location ? ` - ${location}` : ""}</text>
  ${rects}
  <text x="${left}" y="${height - 18}" fill="#ffffff" font-size="12" font-family="Inter, Arial, sans-serif" font-weight="600">Powered by Strava</text>
</svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}
