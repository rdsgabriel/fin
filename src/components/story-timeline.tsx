import type { StoryEvent } from "@/lib/projection";
import { formatMoney } from "@/lib/money";

const TONE = {
  neutral: "var(--ink-3)",
  pos: "var(--pos)",
  neg: "var(--neg)",
} as const;

/**
 * A linha do tempo dos acontecimentos. Cada nó é uma virada — uma parcela
 * que acaba, o saldo furando o zero, a reserva fechando. É o capítulo em
 * que a projeção deixa de ser número e vira história.
 */
export function StoryTimeline({ events }: { events: StoryEvent[] }) {
  return (
    <ol className="relative flex flex-col">
      {events.map((event, i) => {
        const first = i === 0;
        const last = i === events.length - 1;
        const color = TONE[event.tone];

        return (
          <li
            key={event.id}
            className="rise relative flex gap-4 pl-1"
            style={{ animationDelay: `${120 + i * 70}ms` }}
          >
            {/* Trilho + nó */}
            <div className="relative flex w-3 shrink-0 flex-col items-center">
              {!first && <span className="h-5 w-px bg-hairline" />}
              {first && <span className="h-5" />}
              <span
                className="relative z-10 size-3 shrink-0 rounded-full"
                style={{
                  background: color,
                  boxShadow: `0 0 0 4px color-mix(in oklab, ${color} 18%, transparent)`,
                }}
              />
              {!last && <span className="w-px flex-1 bg-hairline" />}
            </div>

            <div className={`flex-1 pt-3 ${last ? "pb-1" : "pb-6"}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.08em]"
                  style={{ color }}
                >
                  {event.label}
                </span>
                <span
                  className={`tnum text-[15px] font-semibold ${
                    event.balance < 0 ? "text-neg" : "text-ink"
                  }`}
                >
                  {formatMoney(event.balance)}
                </span>
              </div>
              <p className="title mt-0.5 text-[17px] font-semibold">
                {event.title}
              </p>
              <p className="mt-0.5 text-[13.5px] leading-snug text-ink-2">
                {event.detail}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
