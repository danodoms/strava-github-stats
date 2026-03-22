import Link from "next/link";
import { getStravaAccessToken } from "@/app/api/_lib/strava-token-store";

type HomeProps = {
  searchParams: Promise<{ connected?: string; error?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const sp = await searchParams;
  const connected = !!(await getStravaAccessToken());

  const errorMessage = sp.error
    ? "Could not connect to Strava. Try again."
    : null;

  const buttonClass =
    "inline-flex h-12 min-w-[200px] items-center justify-center rounded-full bg-linear-to-r from-[#FC5200] via-[#ff6b1a] to-[#ff8a4d] px-8 text-sm font-bold tracking-wide text-white shadow-[0_0_32px_-10px_rgba(252,82,0,0.5)] transition hover:brightness-110 active:scale-[0.98]";

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-neutral-950 px-6 py-6 text-white">
      <div className="flex w-full max-w-lg flex-col items-center text-center">
        {errorMessage && (
          <p className="mb-6 text-sm text-red-300" role="alert">
            {errorMessage}
          </p>
        )}

        <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">
          Strava GitHub Stats
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-neutral-400 sm:text-base">
          Your runs and rides as a contribution-style calendar.
        </p>

        <div className="mt-10 flex flex-col items-center gap-5">
          {connected ? (
            <>
              <p className="text-sm text-emerald-400/90" role="status">
                Connected to Strava
              </p>
              <Link href="/athlete/activities" className={buttonClass}>
                View activities & stats
              </Link>
            </>
          ) : (
            <Link href="/api/auth/strava" className={buttonClass}>
              Connect to Strava
            </Link>
          )}
        </div>

        <a
          href="https://www.strava.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-14 flex items-center gap-2"
          aria-label="Powered by Strava"
        >
          <img
            src="/icons/api_logo_pwrdBy_strava_horiz_orange.svg"
            alt="Powered by Strava"
            className="h-8"
            style={{
              display: "block",
              maxWidth: "100%",
              height: "2rem",
            }}
          />
        </a>
      </div>
    </div>
  );
}
