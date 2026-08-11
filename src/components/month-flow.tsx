import { formatMoney } from "@/lib/money";

/**
 * Pra onde vai cada real que entra. Uma barra proporcional diz numa olhada
 * o que quatro linhas de tabela não dizem: qual fatia do seu salário já
 * está comprometida antes de você acordar.
 */
export function MonthFlow({
  income,
  fixed,
  variable,
  aporte = 0,
}: {
  income: number;
  fixed: number;
  variable: number;
  /** O que você separa pras metas. Não é gasto — é uma fatia reservada. */
  aporte?: number;
}) {
  const outflow = fixed + variable + aporte;
  const net = income - outflow;
  // Quando falta dinheiro, a barra passa a representar a saída — é ela que
  // estourou, e o buraco precisa aparecer em escala.
  const total = Math.max(income, outflow) || 1;

  const parts = [
    { label: "Fixos", value: fixed, color: "var(--brand)" },
    {
      label: "Variável",
      value: variable,
      color: "color-mix(in oklab, var(--brand) 58%, var(--ink-3))",
    },
    { label: "Guardando", value: aporte, color: "var(--pos)" },
    net >= 0
      ? {
          label: "Livre",
          value: net,
          color: "color-mix(in oklab, var(--pos) 42%, var(--fill-2))",
        }
      : { label: "Falta", value: -net, color: "var(--neg)" },
  ].filter((p) => p.value > 0);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-ink-2">
          Entram {formatMoney(income)}
        </span>
        <span
          className={`tnum text-[15px] font-bold ${
            net >= 0 ? "text-pos" : "text-neg"
          }`}
        >
          {net >= 0 ? (aporte > 0 ? "livres " : "sobram ") : "faltam "}
          {formatMoney(Math.abs(net))}
        </span>
      </div>

      {/* 2px de respiro entre as fatias, senão elas se fundem numa massa só. */}
      <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-full">
        {parts.map((part) => (
          <span
            key={part.label}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(part.value / total) * 100}%`,
              background: part.color,
            }}
          />
        ))}
      </div>

      {/* Legenda obrigatória: são 3 fatias, a cor sozinha não pode carregar
          a identidade de cada uma. */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {parts.map((part) => (
          <div key={part.label} className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ background: part.color }}
            />
            <span className="text-[13px] text-ink-2">{part.label}</span>
            <span className="tnum text-[13px] font-semibold text-ink">
              {formatMoney(part.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
