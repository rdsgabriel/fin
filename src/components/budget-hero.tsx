import { formatMoney } from "@/lib/money";
import type { Orcamento } from "@/lib/projection";
import { formatMonthLong, monthKeyOf, todayISO } from "@/lib/month";

/**
 * O primeiro número da tela responde "quanto eu posso gastar?", não "quanto
 * eu tenho?". A diferença é o aporte das metas, já descontado — é o "guardar
 * antes" virando uma frase que dá pra agir hoje, no caixa do mercado.
 */
export function BudgetHero({
  orcamento,
  saldo,
  temMetas,
}: {
  orcamento: Orcamento;
  saldo: number;
  temMetas: boolean;
}) {
  const mes = formatMonthLong(monthKeyOf(todayISO())).split(" de ")[0];
  const estourou = orcamento.livre < 0;

  return (
    <section className="rise pt-3">
      <p className="chapter mb-2">Este mês</p>

      <p className="title text-[19px] text-ink-2">
        {estourou ? "Você passou do seu limite em" : "Você pode gastar"}
      </p>

      <p
        className={`display mt-1.5 text-[clamp(42px,13vw,56px)] ${
          estourou ? "text-neg" : ""
        }`}
      >
        {formatMoney(Math.abs(orcamento.livre))}
      </p>

      <p className="mt-3 max-w-sm text-[14.5px] leading-snug text-ink-2">
        {estourou ? (
          <>
            até o fim de {mes}
            {temMetas ? ", contando o que você separa pras metas" : ""}. Dá pra
            corrigir segurando o variável nos próximos dias.
          </>
        ) : (
          <>
            até o fim de {mes}
            {temMetas ? (
              <>
                {" "}
                <strong className="font-semibold text-ink">
                  sem atrasar suas metas
                </strong>
              </>
            ) : (
              " sem furar o mês"
            )}
            .
          </>
        )}
      </p>

      <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
        <Linha rotulo="Saldo hoje" valor={formatMoney(saldo)} />
        {orcamento.aporte > 0 ? (
          <Linha
            rotulo="Guardando"
            valor={`${formatMoney(orcamento.aporte)}/mês`}
            destaque
          />
        ) : null}
        <Linha rotulo="Já gastou" valor={formatMoney(orcamento.gasto)} />
      </dl>

      {orcamento.aporteInviavel ? (
        <p className="mt-4 rounded-[16px] bg-warn/12 px-4 py-3 text-[13px] leading-snug text-warn">
          O que você quer guardar por mês é maior do que sobra depois dos
          fixos. A meta não é impossível — só vai precisar de mais tempo ou de
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
