"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ActivityCard, type CalendarDatum } from "./ActivityCard";

type StravaActivity = {
  id: number;
  name: string;
  start_date: string;
  distance?: number;
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

function toLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function AthleteActivitesPage() {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [athlete, setAthlete] = useState<StravaAthlete | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const daysToRender: 181 | 363 = 181;

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        const [activitiesRes, athleteRes] = await Promise.all([
          fetch("/api/athlete/activites?per_page=200&page=1"),
          fetch("/api/athlete"),
        ]);
        const activitiesBody = (await activitiesRes.json()) as unknown;
        const athleteBody = (await athleteRes.json()) as unknown;

        if (!activitiesRes.ok) {
          const message =
            typeof activitiesBody === "object" &&
              activitiesBody !== null &&
              "error" in activitiesBody &&
              typeof (activitiesBody as { error: unknown }).error === "string"
              ? (activitiesBody as { error: string }).error
              : "failed_to_fetch_activities";
          throw new Error(message);
        }
        if (!athleteRes.ok) {
          const message =
            typeof athleteBody === "object" &&
              athleteBody !== null &&
              "error" in athleteBody &&
              typeof (athleteBody as { error: unknown }).error === "string"
              ? (athleteBody as { error: string }).error
              : "failed_to_fetch_athlete";
          throw new Error(message);
        }
        if (!Array.isArray(activitiesBody)) {
          throw new Error("unexpected_response_shape");
        }
        if (typeof athleteBody !== "object" || athleteBody === null) {
          throw new Error("unexpected_athlete_shape");
        }

        if (!cancelled) {
          setActivities(activitiesBody as StravaActivity[]);
          setAthlete(athleteBody as StravaAthlete);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "unknown_error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const calendarData = useMemo<CalendarDatum[]>(() => {
    const counts = new Map<string, number>();
    for (const activity of activities) {
      const key = toDateKey(activity.start_date);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const maxCount = Math.max(0, ...counts.values());
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - (daysToRender - 1));

    const data: CalendarDatum[] = [];
    const cursor = new Date(start);
    while (cursor <= today) {
      const date = formatDateOnly(cursor);
      const count = counts.get(date) ?? 0;
      data.push({
        date,
        count,
        level: toLevel(count, maxCount),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return data;
  }, [activities, daysToRender]);

  return (
    <main className="min-h-full bg-[#050810] px-6 py-10 text-white sm:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Athlete Activities
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Visualized from cached data at <code>/api/athlete/activites</code>
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/45 hover:text-white"
          >
            Back Home
          </Link>
        </div>

        {loading && (
          <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
            Loading activities...
          </p>
        )}

        {error && (
          <p className="rounded-xl border border-[#FC5200]/40 bg-[#FC5200]/10 p-4 text-sm text-[#ffd9c7]">
            Failed to load activities: {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <ActivityCard
              athlete={athlete}
              calendarData={calendarData}
            />

            <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
              <h2 className="mb-3 text-lg font-bold">Raw JSON Preview</h2>
              <pre className="max-h-112 overflow-auto rounded-xl bg-black/30 p-4 text-xs leading-relaxed text-white/80">
                {JSON.stringify(activities, null, 2)}
              </pre>
            </section>
            <p className="text-center text-xs tracking-wide text-white/40">
              Powered by Strava
            </p>
          </>
        )}
      </div>
    </main>
  );
}

