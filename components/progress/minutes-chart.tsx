import type { DayMinutes } from "@/lib/progress-queries";
import { FEATURE_LABELS } from "@/lib/progress-queries";

/** Colors per feature (light and dark both readable). */
const COLORS: Record<string, string> = {
  reading: "bg-chart-1",
  talk: "bg-chart-2",
  practice: "bg-chart-3",
  speak: "bg-chart-4",
  interview: "bg-chart-5",
};
const ORDER = ["reading", "talk", "practice", "speak", "interview"];

/** Minutes per day for the last 30 days (stacked bars). Plain HTML, no chart library. */
export function MinutesChart({ days }: { days: DayMinutes[] }) {
  const max = Math.max(10, ...days.map((d) => d.total));
  const used = ORDER.filter((f) => days.some((d) => d.byFeature[f]));

  return (
    <figure className="space-y-3">
      <div className="flex h-40 items-end gap-[3px]" role="img" aria-label="Minutes of practice per day, last 30 days">
        {days.map((d) => (
          <div
            key={d.date}
            className="flex h-full min-w-0 flex-1 flex-col-reverse overflow-hidden rounded-t-sm bg-muted/60"
            title={`${d.date}: ${d.total} min`}
          >
            {ORDER.map((f) =>
              d.byFeature[f] ? (
                <div key={f} className={COLORS[f] ?? "bg-slate-400"} style={{ height: `${(d.byFeature[f] / max) * 100}%` }} />
              ) : null,
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{days[0]?.date.slice(5)}</span>
        <span>Today</span>
      </div>
      {used.length > 0 ? (
        <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {used.map((f) => (
            <span key={f} className="flex items-center gap-1.5">
              <span className={`size-3 rounded-sm ${COLORS[f]}`} aria-hidden /> {FEATURE_LABELS[f] ?? f}
            </span>
          ))}
        </figcaption>
      ) : (
        <figcaption className="text-sm text-muted-foreground">No practice yet. Read, talk or practise to fill this chart!</figcaption>
      )}
    </figure>
  );
}
