import Link from "next/link";

type HomeProps = {
  searchParams: Promise<{ connected?: string; error?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const sp = await searchParams;
  const banner =
    sp.connected === "1"
      ? { tone: "success" as const, text: "You’re connected to Strava." }
      : sp.error
        ? {
          tone: "error" as const,
          text: "Something went wrong connecting to Strava. Try again.",
        }
        : null;

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-[#050810] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
      >
        <div className="absolute -left-1/4 top-0 h-[28rem] w-[28rem] rounded-full bg-[#00ffa3]/25 blur-[100px]" />
        <div className="absolute -right-1/4 bottom-0 h-[24rem] w-[24rem] rounded-full bg-[#ff4d6d]/20 blur-[90px]" />
        <div className="absolute left-1/2 top-1/2 h-[20rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00d4ff]/10 blur-[80px]" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col">
        <header className="flex items-center justify-between px-6 py-6 sm:px-10">
          <span className="text-lg font-black tracking-tight sm:text-xl">
            <span className="bg-linear-to-r from-[#00ffa3] via-[#00e5ff] to-[#ff4d6d] bg-clip-text text-transparent">
              GitFit
            </span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
            Move · Track · Improve
          </span>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20 pt-6 text-center sm:px-10">
          {banner && (
            <p
              role="status"
              className={
                banner.tone === "success"
                  ? "mb-8 max-w-md rounded-full border border-[#00ffa3]/40 bg-[#00ffa3]/10 px-5 py-2 text-sm text-[#b8ffe0]"
                  : "mb-8 max-w-md rounded-full border border-[#ff4d6d]/40 bg-[#ff4d6d]/10 px-5 py-2 text-sm text-[#ffc9d4]"
              }
            >
              {banner.text}
            </p>
          )}

          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-[#00e5ff]/90">
            Train with your data
          </p>
          <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl sm:leading-[1.1]">
            Turn your Strava activity into{" "}
            <span className="bg-linear-to-r from-[#00ffa3] to-[#00d4ff] bg-clip-text text-transparent">
              momentum
            </span>
            .
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/65 sm:text-lg">
            Connect once, stay in sync, and keep every run and ride in one
            energetic place.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
            <Link
              href="/api/auth/strava"
              className="inline-flex h-14 min-w-[200px] items-center justify-center rounded-full bg-linear-to-r from-[#00ffa3] via-[#00e8c8] to-[#00d4ff] px-10 text-base font-bold tracking-wide text-[#041018] shadow-[0_0_40px_-8px_rgba(0,255,163,0.55)] transition hover:brightness-110 hover:shadow-[0_0_48px_-6px_rgba(0,228,255,0.45)] active:scale-[0.98]"
            >
              Authenticate
            </Link>
            <p className="max-w-[220px] text-xs leading-snug text-white/45 sm:text-left">
              Secure Strava OAuth — you approve what we can read.
            </p>
          </div>
        </main>

        <footer className="relative z-10 border-t border-white/8 bg-black/20 px-6 py-6 backdrop-blur-sm sm:px-10">
          <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-white/35">
              © {new Date().getFullYear()} GitFit
            </p>
            <a
              href="https://www.strava.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 text-sm font-semibold text-[#fc4c02] transition hover:text-[#ff6a2e]"
            >
              <span className="text-white/50 group-hover:text-white/60">
                Powered by
              </span>
              <span className="tracking-wide">Strava</span>
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
