"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatMoney } from "@/lib/money";
import { formatMonthLong, formatMonthShort, type MonthKey } from "@/lib/month";

type Point = { label: string; long: string; value: number; month: MonthKey | null };

const W = 360;
const H = 132;
const PAD = 14;

/**
 * O herói da tela e a assinatura do app: uma linha do tempo que você arrasta.
 * Mover o dedo viaja pelos meses e tudo acompanha junto — o número gigante,
 * o brilho do fundo e o rótulo. A projeção deixa de ser um gráfico pra ler e
 * vira uma coisa pra manusear.
 */
export function Hero({
  months,
  currentBalance,
  variableMonthly,
}: {
  months: { month: MonthKey; endBalance: number }[];
  currentBalance: number;
  variableMonthly: number;
}) {
  const [index, setIndex] = useState(months.length);
  const [scrubbing, setScrubbing] = useState(false);
  const [offset, setOffset] = useState(0);
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

  // Se o horizonte mudar, o ponto ativo volta pro fim da linha.
  useEffect(() => setIndex(points.length - 1), [points.length]);

  // Parallax: o brilho de fundo sobe mais devagar que o conteúdo.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setOffset(window.scrollY));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const geom = useMemo(() => {
    const values = points.map((p) => p.value);
    const rawMin = Math.min(0, ...values);
    const rawMax = Math.max(0, ...values);
    const span = rawMax - rawMin || 1;
    const min = rawMin - span * 0.16;
    const max = rawMax + span * 0.16;

    const x = (i: number) =>
      points.length === 1 ? W / 2 : (i / (points.length - 1)) * W;
    const y = (v: number) => PAD + (1 - (v - min) / (max - min)) * (H - PAD * 2);

    const line = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(p.value)}`)
      .join(" ");
    const zeroY = y(0);

    return { x, y, line, area: `${line} L${W} ${H} L0 ${H} Z`, zeroY };
  }, [points]);

  const active = points[Math.min(index, points.length - 1)];
  const delta = active.value - currentBalance;

  // O brilho do fundo é o termômetro: vermelho no vermelho, laranja no
  // aperto, verde quando sobra.
  const tone =
    active.value < 0
      ? "var(--red)"
      : variableMonthly > 0 && active.value < variableMonthly
        ? "var(--orange)"
        : delta >= 0
          ? "var(--green)"
          : "var(--blue)";

  function scrubTo(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = (clientX - rect.left) / rect.width;
    const next = Math.round(ratio * (points.length - 1));
    setIndex(Math.min(points.length - 1, Math.max(0, next)));
  }

  const hasNegative = points.some((p) => p.value < 0);

  return (
    <section className="relative -mx-4 overflow-hidden px-4 pb-2 pt-6">
      {/* Brilho de fundo — a única cor forte da tela. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 transition-[background] duration-700"
        style={{
          background: `radial-gradient(70% 60% at 50% 12%, color-mix(in oklab, ${tone} 26%, transparent) 0%, transparent 70%)`,
          transform: `translateY(${offset * 0.35}px)`,
          opacity: Math.max(0, 1 - offset / 420),
        }}
      />

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-[13px] font-medium text-label-2">
          {active.month ? `Saldo previsto · ${active.long}` : "Saldo hoje"}
        </p>
        <p
          className={`display text-[clamp(44px,13vw,60px)] font-semibold transition-colors duration-300 ${
            active.value < 0 ? "text-red" : "text-label"
          }`}
        >
          {formatMoney(active.value)}
        </p>
        {active.month ? (
          <span
            className="tnum rounded-full px-2.5 py-1 text-[13px] font-semibold"
            style={{
              color: delta < 0 ? "var(--red)" : "var(--green)",
              background: `color-mix(in oklab, ${
                delta < 0 ? "var(--red)" : "var(--green)"
              } 14%, transparent)`,
            }}
          >
            {delta < 0 ? "−" : "+"}
            {formatMoney(Math.abs(delta))} desde hoje
          </span>
        ) : (
          <span className="text-[13px] text-label-3">
            arraste a linha pra viajar no tempo
          </span>
        )}
      </div>

      <div
        ref={trackRef}
        className="relative mt-4 touch-none"
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
          className="h-auto w-full"
          role="img"
          aria-label={`Saldo projetado: ${formatMoney(currentBalance)} hoje, ${formatMoney(
            points.at(-1)!.value,
          )} em ${points.at(-1)!.long}.`}
        >
          <defs>
            <linearGradient id="hero-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tone} stopOpacity="0.3" />
              <stop offset="100%" stopColor={tone} stopOpacity="0" />
            </linearGradient>
            <clipPath id="hero-clip-pos">
              <rect x="0" y="0" width={W} height={geom.zeroY} />
            </clipPath>
            <clipPath id="hero-clip-neg">
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
              stroke="var(--label-3)"
              strokeWidth="1"
              strokeDasharray="2 5"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}

          <path
            d={geom.line}
            fill="none"
            stroke="var(--blue)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath="url(#hero-clip-pos)"
            vectorEffect="non-scaling-stroke"
          />
          {hasNegative ? (
            <path
              d={geom.line}
              fill="none"
              stroke="var(--red)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              clipPath="url(#hero-clip-neg)"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}

          {/* Haste vertical marcando onde o dedo está. */}
          <line
            x1={geom.x(index)}
            y1={geom.y(active.value)}
            x2={geom.x(index)}
            y2={H}
            stroke="var(--label-3)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={geom.x(index)}
            cy={geom.y(active.value)}
            r={scrubbing ? 7 : 5}
            fill={active.value < 0 ? "var(--red)" : "var(--blue)"}
            stroke="var(--bg)"
            strokeWidth="3"
            style={{ transition: "r 0.2s var(--ease-spring)" }}
          />
        </svg>

        {/* Trilho de meses: os extremos ancoram, o ativo acompanha o dedo. */}
        <div className="mt-1 flex justify-between px-0.5 text-[11px] font-medium text-label-3">
          <span>hoje</span>
          <span className="text-label-2">{active.label}</span>
          <span>{points.at(-1)!.label}</span>
        </div>
      </div>
    </section>
  );
}
