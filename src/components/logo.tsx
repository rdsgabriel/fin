"use client";

import { useId } from "react";

/**
 * A marca é a própria curva de projeção: uma linha que começa plana e
 * sobe, terminando num ponto — o mês que o app te mostra lá na frente.
 * Dois elementos, um traço e um ponto. Some bem a 16px e vira ícone de
 * app a 512px sem mudar nada.
 */
export function Logo({
  size = 24,
  gradient = true,
  className = "",
}: {
  size?: number;
  /** Traço iridescente. Em `false`, herda a cor do texto ao redor. */
  gradient?: boolean;
  className?: string;
}) {
  // `useId` dá um id estável entre servidor e cliente. Com Math.random a
  // hidratação quebraria, e com id fixo dois logos na mesma página
  // colidiriam — se o primeiro desmontasse, o segundo perderia a cor.
  const id = useId();
  const stroke = gradient ? `url(#${id})` : "currentColor";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role="img"
      aria-label="Fin"
    >
      {gradient ? (
        <defs>
          <linearGradient id={id} x1="4" y1="26" x2="28" y2="6" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6FE0E6" />
            <stop offset="38%" stopColor="#7FA8F7" />
            <stop offset="72%" stopColor="#9E6BF2" />
            <stop offset="100%" stopColor="#CE8BE4" />
          </linearGradient>
        </defs>
      ) : null}

      <path
        d="M4.5 24.5C11 24.5 16.5 21 20.5 11"
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <circle cx="24.5" cy="7.5" r="3.6" fill={stroke} />
    </svg>
  );
}

/** Logo + palavra, pro cabeçalho. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Logo size={22} />
      <span className="title text-[17px] font-semibold tracking-[-0.02em]">
        Fin
      </span>
    </span>
  );
}

/** Ícone do app: a marca dentro de um squircle de vidro escuro. */
export function AppMark({ size = 80 }: { size?: number }) {
  return (
    <span
      className="flex items-center justify-center shadow-[var(--shadow-2)]"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: "linear-gradient(160deg, #241640 0%, #12091F 100%)",
      }}
      aria-hidden="true"
    >
      <Logo size={size * 0.56} />
    </span>
  );
}
