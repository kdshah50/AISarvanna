import { NextResponse } from "next/server";

let lastBeatAt = 0;
let watchdog: ReturnType<typeof setInterval> | null = null;

function idleMs(): number {
  const raw = process.env.DEV_BROWSER_IDLE_MS?.trim();
  const n = raw ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= 3000 && n <= 600_000) return n;
  return 55_000;
}

function killIfIdleTooLong(): void {
  const idle = idleMs();
  /** Don’t quit before we’ve seen at least one ping (cold `npm run dev`). */
  if (lastBeatAt === 0) return;
  if (Date.now() - lastBeatAt > idle) {
    // eslint-disable-next-line no-console
    console.log(
      `\n[dev] No browser tab reached this server for ${Math.round(idle / 1000)}s — stopping Next.js (freeing port).\n`,
    );
    process.exit(0);
  }
}

function ensureWatchdog() {
  if (watchdog != null) return;
  watchdog = setInterval(killIfIdleTooLong, 4000);
}

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (process.env.DEV_DISABLE_BROWSER_AUTOKILL === "1") {
    return NextResponse.json({ ok: false, skipped: true });
  }

  lastBeatAt = Date.now();
  ensureWatchdog();
  return NextResponse.json({ ok: true });
}
