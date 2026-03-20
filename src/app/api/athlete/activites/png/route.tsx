import { ImageResponse } from "next/og";
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

  const activitiesUrl = new URL("https://www.strava.com/api/v3/athlete/activities");
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

  const calendarData: Array<{ date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }> = [];
  const cursor = new Date(start);
  const maxCount = Math.max(0, ...counts.values());
  while (cursor <= today) {
    const date = formatDateOnly(cursor);
    const count = counts.get(date) ?? 0;
    calendarData.push({ date, count, level: toLevel(count, maxCount) });
    cursor.setDate(cursor.getDate() + 1);
  }

  const fullName =
    `${athlete.firstname ?? ""} ${athlete.lastname ?? ""}`.trim() ||
    "Strava Athlete";
  const location = [athlete.city, athlete.state, athlete.country]
    .filter(Boolean)
    .join(", ");
  const totalActivities = calendarData.reduce((sum, day) => sum + day.count, 0);
  const activeDays = calendarData.filter((day) => day.count > 0).length;
  const rangeLabel = daysToRender === 363 ? "Last year" : "Last 6 months";
  const columnCount = Math.ceil(calendarData.length / 7);

  const levelColors = ["#ffffff", "#fc7100", "#fc6900", "#fc5c00", "#ffd900"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          padding: "",
          background: "#f97316",
          color: "white",
          fontFamily: "Inter, Arial, sans-serif",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            // border: "1px solid #fdba74",
            // borderRadius: "18px",
            background: "#f97316",
            padding: "20px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", fontSize: "64px", fontWeight: 1000, letterSpacing: "-0.05em" }}>
              {fullName}
            </div>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                background: "white",
                color: "#FC5200",
                borderRadius: "10px",
                padding: "8px 12px",
                fontSize: "32px",
                fontWeight: 700,
              }}
            >
              Powered by Strava
            </div>

          </div>

          <div
            style={{
              display: "flex",
              marginTop: "8px",
              fontSize: "20px",
              color: "#ffedd5",
            }}
          >
            {rangeLabel} - {totalActivities} activities - {activeDays} active days
            {location ? ` - ${location}` : ""}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: "18px",
              background: "#fb923c",
              borderRadius: "14px",
              padding: "14px",
            }}
          >
            <div style={{ display: "flex", gap: "8px" }}>
              {Array.from({ length: columnCount }).map((_, colIndex) => (
                <div
                  key={`col-${colIndex}`}
                  style={{ display: "flex", flexDirection: "column", gap: "8px" }}
                >
                  {Array.from({ length: 7 }).map((__, rowIndex) => {
                    const idx = colIndex * 7 + rowIndex;
                    const day = calendarData[idx];
                    return (
                      <div
                        key={`day-${colIndex}-${rowIndex}`}
                        style={{
                          display: "flex",
                          width: "36px",
                          height: "36px",
                          borderRadius: "4px",
                          background: day ? levelColors[day.level] : "transparent",
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: "auto",
              justifyContent: "center",
              fontSize: "16px",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            Displaying activities from the last {calendarData.length} days
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      // borderRadius: "12px",
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    },
  );
}
