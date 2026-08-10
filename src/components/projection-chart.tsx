"use client";

import { useMemo, useRef, useState } from "react";
import { formatMoney } from "@/lib/money";
import { formatMonthShort, type MonthKey } from "@/lib/month";

type Point = { label: string; value: number; month: MonthKey | null };

const W = 340;
const H = 180;
const PAD_TOP = 26;
const PAD_BOTTOM = 24;

/**
 * Série única (saldo projetado), então sem legenda — o título nomeia a série.
 * A cor carrega polaridade, não identidade: azul acima de zero, vermelho
 * abaixo. O eixo zero é a única linha de grade, porque é a única que importa.
 */
export function ProjectionChart({
  months,
  currentBalance,
}: {
  months: { month: MonthKey; endBalance: number }[];
  currentBalance: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const points: Point[] = useMemo(
    () => [
      { label: "hoje", value: currentBalance, month: null },
      ...months.map((m) => ({
        label: formatMonthShort(m.month),
        value: m.endBalance,
        month: m.month,
      })),
    ],
    [months, currentBalance],
  );

  const geom = useMemo(() => {
    const values = points.map((p) => p.value);
    const rawMin = Math.min(0, ...values);
    const rawMax = Math.max(0, ...values);
    const span = rawMax - rawMin || 1;
    const min = rawMin - span * 0.12;
    const max = rawMax + span * 0.12;

    const x = (i: number) =>
      points.length === 1 ? W / 2 : (i / (points.length - 1)) * W;
    const y = (v: number) =>
      PAD_TOP + (1 - (v - min) / (max - min)) * (H - PAD_TOP - PAD_BOTTOM);

    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(p.value)}`).join(" ");
    const zeroY = y(0);
    const area = `${line} L${x(points.length - 1)} ${zeroY} L${x(0)} ${zeroY} Z`;

    return { x, y, line, area, zeroY };
  }, [points]);

  const hasNegative = points.some((p) => p.value < 0);
  const active = hover ?? points.length - 1;
  const activePoint = points[active];

  function handleMove(clientX: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = (clientX - rect.left) / rect.width;
    const idx = Math.round(ratio * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, idx)));
  }

  // Rótulos do eixo x rareados pra nunca colidir.
  const step = Math.ceil(points.length / 5);

  return (
    <div className="select-none">
      <div className="mb-3 flex items-baseline justify-between px-4 pt-4">
        <div>
          <p className="text-[13px] font-medium text-label-2">
            {activePoint.month
              ? `Saldo previsto · ${activePoint.label}`
              : "Saldo hoje"}
          </p>
          <p
            className={`display text-[30px] font-semibold ${
              activePoint.value < 0 ? "text-red" : "text-label"
            }`}
          >
            {formatMoney(activePoint.value)}
          </p>
          {activePoint.month ? (
            <p className="tnum text-[12px] text-label-3">
              hoje: {formatMoney(currentBalance)}
            </p>
          ) : null}
        </div>
        {activePoint.month ? (
          <p
            className={`tnum text-[13px] font-semibold ${
              activePoint.value - currentBalance < 0 ? "text-red" : "text-green"
            }`}
          >
            {activePoint.value - currentBalance < 0 ? "−" : "+"}
            {formatMoney(Math.abs(activePoint.value - currentBalance))}
          </p>
        ) : null}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none"
        role="img"
        aria-label={`Saldo projetado dos próximos ${months.length} meses, de ${formatMoney(
          currentBalance,
        )} hoje a ${formatMoney(points.at(-1)!.value)} em ${points.at(-1)!.label}.`}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => handleMove(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={() => setHover(null)}
      >
        <defs>
          <linearGradient id="fill-pos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fill-neg" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--red)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--red)" stopOpacity="0" />
          </linearGradient>
          {/* Recortes que separam o que está acima e abaixo de zero. */}
          <clipPath id="clip-pos">
            <rect x="0" y="0" width={W} height={geom.zeroY} />
          </clipPath>
          <clipPath id="clip-neg">
            <rect x="0" y={geom.zeroY} width={W} height={H - geom.zeroY} />
          </clipPath>
        </defs>

        <path d={geom.area} fill="url(#fill-pos)" clipPath="url(#clip-pos)" />
        {hasNegative ? (
          <path d={geom.area} fill="url(#fill-neg)" clipPath="url(#clip-neg)" />
        ) : null}

        {/* Única linha de grade: o zero. */}
        <line
          x1="0"
          y1={geom.zeroY}
          x2={W}
          y2={geom.zeroY}
          stroke="var(--label-3)"
          strokeWidth="1"
          strokeDasharray="3 4"
          vectorEffect="non-scaling-stroke"
        />

        <path
          d={geom.line}
          fill="none"
          stroke="var(--blue)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath="url(#clip-pos)"
          vectorEffect="non-scaling-stroke"
        />
        {hasNegative ? (
          <path
            d={geom.line}
            fill="none"
            stroke="var(--red)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath="url(#clip-neg)"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        {/* Crosshair só aparece no hover. */}
        {hover !== null ? (
          <line
            x1={geom.x(hover)}
            y1={PAD_TOP - 8}
            x2={geom.x(hover)}
            y2={H - PAD_BOTTOM}
            stroke="var(--label-3)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        <circle
          cx={geom.x(active)}
          cy={geom.y(activePoint.value)}
          r="4.5"
          fill={activePoint.value < 0 ? "var(--red)" : "var(--blue)"}
          stroke="var(--card)"
          strokeWidth="2.5"
        />

        {points.map((p, i) =>
          i % step === 0 || i === points.length - 1 ? (
            <text
              key={p.label + i}
              x={Math.min(W - 12, Math.max(12, geom.x(i)))}
              y={H - 6}
              textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
              className="fill-[var(--label-3)] text-[10px]"
              style={{ fontSize: 10 }}
            >
              {p.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
