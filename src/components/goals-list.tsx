import { deleteGoal } from "@/app/actions";
import { formatMoney } from "@/lib/money";
import { formatMonthLong, formatMonthShort, monthKeyOf } from "@/lib/month";
import type { GoalProgress } from "@/lib/projection";
import { Badge, Card, Row } from "./ui";

export function GoalsList({
  metas,
  compacto = false,
}: {
  metas: GoalProgress[];
  /** Na home não mostramos o botão de excluir. */
  compacto?: boolean;
}) {
  return (
    <Card>
      {metas.map((m) => {
        const pct = Math.round(m.progresso * 100);

        return (
          <Row key={m.goal.id} className="flex-col items-stretch gap-2.5">
            {/* Nome e valor sozinhos na primeira linha; a badge desce pra
                linha de detalhes, senão nomes longos viram "Viagem no fim d…". */}
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 flex-1 truncate text-[15px] font-medium">
                {m.goal.name}
              </p>
              <span className="tnum shrink-0 text-[15px] font-semibold">
                {formatMoney(m.goal.targetCents)}
              </span>
            </div>

            {/* Barra de progresso: a leitura mais rápida de "quanto falta". */}
            <div className="h-2 overflow-hidden rounded-full bg-fill">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  background: m.jaAlcancada ? "var(--pos)" : "var(--grad)",
                }}
              />
            </div>

            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[12.5px] leading-snug text-ink-2">
                {m.jaAlcancada ? (
                  "Você já tem esse valor."
                ) : m.mesAlcance ? (
                  <>
                    No ritmo atual você chega em{" "}
                    <strong className="font-semibold text-ink">
                      {formatMonthLong(m.mesAlcance)}
                    </strong>
                    .
                  </>
                ) : (
                  "Não chega dentro do horizonte da projeção."
                )}
                {m.faltaPorMes ? (
                  <>
                    {" "}
                    Pra bater o prazo, faltam{" "}
                    <strong className="font-semibold text-warn">
                      {formatMoney(m.faltaPorMes)}/mês
                    </strong>
                    .
                  </>
                ) : null}
              </p>

              <span className="tnum shrink-0 text-[12.5px] font-semibold text-ink-3">
                {pct}%
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {m.jaAlcancada ? (
                <Badge tone="good">alcançada</Badge>
              ) : m.atrasada ? (
                <Badge tone="warn">fora do prazo</Badge>
              ) : null}
              {m.goal.monthlyCents > 0 ? (
                <span className="text-[12px] text-ink-3">
                  separando {formatMoney(m.goal.monthlyCents)}/mês
                </span>
              ) : null}
              {m.goal.deadline ? (
                <span className="text-[12px] text-ink-3">
                  prazo {formatMonthShort(monthKeyOf(m.goal.deadline))}
                </span>
              ) : null}

              {!compacto ? (
                <form action={deleteGoal} className="ml-auto">
                  <input type="hidden" name="id" value={m.goal.id} />
                  <button
                    type="submit"
                    className="pressable text-[12px] font-semibold text-ink-3 active:text-neg"
                  >
                    excluir
                  </button>
                </form>
              ) : null}
            </div>
          </Row>
        );
      })}
    </Card>
  );
}
