"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatMoney } from "@/lib/money";
import { formatMonthLong, formatMonthShort, type MonthKey } from "@/lib/month";

type Point = { label: string; long: string; value: number; month: MonthKey | null };

const W = 360;
const H = 180;
const PAD = 18;

/**
 * O capítulo "se nada mudar" — e a assinatura do app. Arrastar o dedo pela
 * linha viaja pelos meses: a frase, o número gigante e o brilho do fundo
 * recalculam juntos. A projeção deixa de ser um gráfico pra ler e vira uma
 * coisa pra manusear.
 */
export function Hero({
  months,
  currentBalance,
  variableMonthly,
  action,
}: {
  months: { month: MonthKey; endBalance: number }[];
  currentBalance: number;
  variableMonthly: number;
  /** Controle do horizonte, ao lado do rótulo do capítulo. */
  action?: React.ReactNode;
}) {
  const [index, setIndex] = useState(months.length);
  const [scrubbing, setScrubbing] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const points: Point[] = useMemo(
    () => [
      { label: "hoje", long: "hoje", value: currentBalance, month: null },
      ...months.map((m) => ({
        label: formatMonthShort(m.month),
        long: formatMonthLong(m.month),
        value: m.endBalance,
        month: m.month,
      })),
    ],
    [months, currentBalance],
  );

  useEffect(() => setIndex(points.length - 1), [points.length]);

  const geom = useMemo(() => {
    const values = points.map((p) => p.value);
    const rawMin = Math.min(0, ...values);
    const rawMax = Math.max(0, ...values);
    const span = rawMax - rawMin || 1;
    const min = rawMin - span * 0.18;
    const max = rawMax + span * 0.18;

    // Recuo lateral pra bolinha da ponta não encostar na borda do SVG.
    const INSET = 7;
    const x = (i: number) =>
      points.length === 1
        ? W / 2
        : INSET + (i / (points.length - 1)) * (W - INSET * 2);
    const y = (v: number) => PAD + (1 - (v - min) / (max - min)) * (H - PAD * 2);

    const line = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(p.value)}`)
      .join(" ");

    return { x, y, line, area: `${line} L${W} ${H} L0 ${H} Z`, zeroY: y(0) };
  }, [points]);

  const active = points[Math.min(index, points.length - 1)];
  const delta = active.value - currentBalance;
  const hasNegative = points.some((p) => p.value < 0);

  const tone =
    active.value < 0
      ? "var(--neg)"
      : variableMonthly > 0 && active.value < variableMonthly
        ? "var(--warn)"
        : "var(--brand)";

  function scrubTo(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = (clientX - rect.left) / rect.width;
    const next = Math.round(ratio * (points.length - 1));
    setIndex(Math.min(points.length - 1, Math.max(0, next)));
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="chapter">Se nada mudar</p>
        {action}
      </div>

      <p className="title text-[19px] font-medium text-ink-2">
        {active.month ? `Em ${active.long} você terá` : "Hoje você tem"}
      </p>

      <p
        className={`display mt-1.5 text-[clamp(46px,14vw,64px)] font-bold transition-colors duration-300 ${
          active.value < 0 ? "text-neg" : "text-ink"
        }`}
      >
        {formatMoney(active.value)}
      </p>

      {active.month ? (
        <span
          className="tnum mt-2.5 inline-block rounded-full px-3 py-1 text-[13px] font-bold"
          style={{
            color: delta < 0 ? "var(--neg)" : "var(--pos)",
            background: `color-mix(in oklab, ${
              delta < 0 ? "var(--neg)" : "var(--pos)"
            } 13%, transparent)`,
          }}
        >
          {delta < 0 ? "−" : "+"}
          {formatMoney(Math.abs(delta))} em relação a hoje
        </span>
      ) : (
        <span className="mt-2.5 inline-block text-[13px] text-ink-3">
          arraste a linha pra viajar no tempo
        </span>
      )}

      <div
        ref={trackRef}
        className="relative mt-5 cursor-ew-resize touch-none"
        onPointerDown={(e) => {
          setScrubbing(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          scrubTo(e.clientX);
        }}
        onPointerMove={(e) => scrubbing && scrubTo(e.clientX)}
        onPointerUp={() => setScrubbing(false)}
        onPointerCancel={() => setScrubbing(false)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={`Saldo projetado: ${formatMoney(currentBalance)} hoje, ${formatMoney(
            points.at(-1)!.value,
          )} em ${points.at(-1)!.long}.`}
        >
          <defs>
            <linearGradient id="hero-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tone} stopOpacity="0.42" />
              <stop offset="55%" stopColor={tone} stopOpacity="0.14" />
              <stop offset="100%" stopColor={tone} stopOpacity="0" />
            </linearGradient>
            {/* Um leve brilho na linha, pra ela não parecer um fio solto. */}
            <filter id="hero-glow" x="-20%" y="-40%" width="140%" height="180%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <clipPath id="hero-pos">
              <rect x="0" y="0" width={W} height={geom.zeroY} />
            </clipPath>
            <clipPath id="hero-neg">
              <rect x="0" y={geom.zeroY} width={W} height={H - geom.zeroY} />
            </clipPath>
          </defs>

          <path d={geom.area} fill="url(#hero-fill)" />

          {hasNegative ? (
            <line
              x1="0"
              y1={geom.zeroY}
              x2={W}
              y2={geom.zeroY}
              stroke="var(--ink-3)"
              strokeWidth="1"
              strokeDasharray="2 5"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}

          <path
            d={geom.line}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath="url(#hero-pos)"
            filter="url(#hero-glow)"
            vectorEffect="non-scaling-stroke"
          />
          {hasNegative ? (
            <path
              d={geom.line}
              fill="none"
              stroke="var(--neg)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              clipPath="url(#hero-neg)"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}

          {/* A haste só existe durante o arrasto. Parada, ela virava um risco
              solto na borda direita do gráfico. */}
          {scrubbing ? (
            <line
              x1={geom.x(index)}
              y1={geom.y(active.value)}
              x2={geom.x(index)}
              y2={H}
              stroke="var(--ink-3)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          <circle
            cx={geom.x(index)}
            cy={geom.y(active.value)}
            r={scrubbing ? 7.5 : 5.5}
            fill={active.value < 0 ? "var(--neg)" : "var(--brand)"}
            stroke="var(--bg)"
            strokeWidth="3"
            style={{ transition: "r 0.2s var(--ease-spring)" }}
          />
        </svg>

        {/* O rótulo do meio só aparece quando o ponto ativo não é uma das
            pontas — senão o mesmo mês apareceria duas vezes na régua. */}
        <div className="mt-2 flex justify-between text-[11px] font-semibold text-ink-3">
          <span>hoje</span>
          <span className="text-ink-2">
            {index > 0 && index < points.length - 1 ? active.label : ""}
          </span>
          <span>{points.at(-1)!.label}</span>
        </div>
      </div>
    </section>
  );
}
