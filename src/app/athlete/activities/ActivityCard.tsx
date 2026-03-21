import { ActivityCalendar } from "react-activity-calendar";

export type CalendarDatum = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
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

type ActivityCardProps = {
  athlete: StravaAthlete | null;
  calendarData: CalendarDatum[];
};

export function ActivityCard({ athlete, calendarData }: ActivityCardProps) {
  return (
    <div className="flex flex-col max-w-fit gap-4 grow-0 rounded-2xl border-orange-300 border bg-orange-500  p-4">
      <div className="">
        {athlete ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 w-full">
              {athlete.profile_medium || athlete.profile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={athlete.profile_medium ?? athlete.profile ?? ""}
                  alt="Strava profile"
                  className="size-8 rounded-full border border-white/20 object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/5 text-lg font-bold text-white/70">
                  {(athlete.firstname?.[0] ?? "A").toUpperCase()}
                </div>
              )}
              <div className="flex items-center gap-3">
                <p className="text-base tracking-tighter font-bold text-white">
                  {`${athlete.firstname ?? ""} ${athlete.lastname ?? ""}`.trim() ||
                    "Strava Athlete"}
                </p>
              </div>

              <div className="w-min justify-center rounded-lg bg-white p-4 ml-auto">
                <img
                  src="/icons/api_logo_pwrdBy_strava_horiz_orange.svg"
                  alt="Powered by Strava"
                  style={{ maxWidth: "120px", height: "auto" }}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/60">No athlete profile found.</p>
        )}
      </div>

      {calendarData.length > 0 ? (
        <ActivityCalendar
          className=" rounded-lg bg-orange-400 p-4"
          blockMargin={4}
          blockRadius={2}
          data={calendarData}
          maxLevel={4}
          showWeekdayLabels={true}
          showColorLegend={true}
          showMonthLabels={true}
          fontSize={10}
          showTotalCount={false}
          theme={{
            dark: [
              "white",
              "#fc7100",
              "#fc6900",
              "#fc5c00",
              "#FC5200",
            ],
          }}
        />

      ) : (
        <p className="text-sm text-white/60">No activities found.</p>
      )}
      <div className="flex flex-wrap items-center  gap-3">
        <p className="text-xs text-white/80 font-light w-full text-center">
          Displaying activities from the last {calendarData.length} days
        </p>
      </div>
    </div>
  );
}
