import { formatMoney, formatRate } from "@/lib/money";
import type { Orcamento } from "@/lib/projection";
import { formatMonthLong, monthKeyOf, todayISO } from "@/lib/month";

/**
 * O primeiro número da tela responde "quanto posso gastar hoje?".
 *
 * O mês inteiro é abstrato demais pra decidir algo no caixa do mercado:
 * R$ 1.290 até o fim de agosto não impede ninguém de torrar R$ 400 numa
 * terça. Dividido pelos dias que faltam, vira um limite que dá pra checar
 * antes de pagar. Cada lançamento do extrato encolhe esse número na hora.
 */
export function BudgetHero({
  orcamento,
  saldo,
  temMetas,
  rendimentoAnual,
}: {
  orcamento: Orcamento;
  saldo: number;
  temMetas: boolean;
  /** Taxa anual em decimal. 0 quando o dinheiro fica parado. */
  rendimentoAnual: number;
}) {
  const mes = formatMonthLong(monthKeyOf(todayISO())).split(" de ")[0];
  const estourou = orcamento.livre < 0;
  const dias = orcamento.diasRestantes;

  return (
    <section className="rise">
      <p className="title text-[19px] text-ink-2">
        {estourou ? "Você passou do limite em" : "Hoje dá pra gastar"}
      </p>

      <p
        className={`display mt-1.5 text-[clamp(42px,13vw,56px)] ${
          estourou ? "text-neg" : ""
        }`}
      >
        {formatMoney(Math.abs(estourou ? orcamento.livre : orcamento.porDia))}
      </p>

      <p className="mt-3 max-w-sm text-[14.5px] leading-snug text-ink-2">
        {estourou ? (
          <>
            neste mês. Segurar o variável nos {dias}{" "}
            {dias === 1 ? "dia que falta" : "dias que faltam"} de {mes} corrige.
          </>
        ) : (
          <>
            Sobram{" "}
            <strong className="font-semibold text-ink">
              {formatMoney(orcamento.livre)}
            </strong>{" "}
            para os {dias} {dias === 1 ? "dia" : "dias"} que{" "}
            {dias === 1 ? "falta" : "faltam"} de {mes}
            {temMetas ? ", já fora o que você separa" : ""}.
          </>
        )}
      </p>

      <dl className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
        <Linha rotulo="Saldo" valor={formatMoney(saldo)} />
        <Linha rotulo="Já gastou" valor={formatMoney(orcamento.gasto)} />
        {orcamento.aporte > 0 ? (
          <Linha
            rotulo="Guardando"
            valor={`${formatMoney(orcamento.aporte)}/mês`}
            destaque
          />
        ) : null}
        {rendimentoAnual > 0 ? (
          <Linha rotulo="Rendendo" valor={formatRate(rendimentoAnual)} destaque />
        ) : null}
      </dl>

      {orcamento.aporteInviavel ? (
        <p className="mt-4 rounded-[16px] bg-warn/12 px-4 py-3 text-[13px] leading-snug text-warn">
          O que você quer guardar por mês é maior do que sobra depois dos
          fixos. A meta não é impossível: só vai precisar de mais tempo ou de
          um corte em algum fixo.
        </p>
      ) : null}
    </section>
  );
}

function Linha({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-ink-3">{rotulo}</dt>
      <dd
        className={`tnum font-semibold ${destaque ? "text-brand" : "text-ink"}`}
      >
        {valor}
      </dd>
    </div>
  );
}
