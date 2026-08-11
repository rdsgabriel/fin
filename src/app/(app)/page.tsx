import Link from "next/link";
import { Badge, Card, Chapter, Row } from "@/components/ui";
import { Hero } from "@/components/hero";
import { MonthFlow } from "@/components/month-flow";
import { StoryTimeline } from "@/components/story-timeline";
import { BudgetHero } from "@/components/budget-hero";
import { GoalsList } from "@/components/goals-list";
import { Logo } from "@/components/logo";
import { getProjectionData } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import {
  buildProjection,
  buildStory,
  calcularOrcamento,
  evaluateGoals,
  totalAporte,
} from "@/lib/projection";
import { formatMoney, formatRate, formatSigned } from "@/lib/money";
import { formatMonthLong, formatMonthShort, todayISO } from "@/lib/month";

export const dynamic = "force-dynamic";

const HORIZONS = [6, 12, 24] as const;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ h?: string }>;
}) {
  const { h } = await searchParams;
  const user = await requireUser();
  const data = await getProjectionData(user.id);

  const requested = Number(h);
  const horizonMonths = HORIZONS.includes(requested as (typeof HORIZONS)[number])
    ? requested
    : data.settings.horizonMonths;

  const projection = buildProjection({ ...data, horizonMonths });
  const metas = evaluateGoals(projection, data.goals);
  const orcamento = calcularOrcamento(projection, totalAporte(data.goals));
  const story = buildStory(projection, metas);

  if (data.recurrences.length === 0 && data.transactions.length === 0) {
    return <Welcome />;
  }

  const negativo = projection.months.find((m) => m.endBalance < 0);
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${todayISO()}T12:00:00`));

  return (
    <div className="flex flex-col gap-10 pb-6">
      {/* 1. Quanto dá pra gastar hoje. É a única pergunta que a home
             precisa responder de olhada rápida. */}
      <div>
        <div className="mb-5 flex items-center justify-between gap-3 pt-1">
          <Logo size={22} />
          <p className="chapter first-letter:uppercase">{weekday}</p>
        </div>
        <BudgetHero
          orcamento={orcamento}
          saldo={projection.currentBalance}
          temMetas={orcamento.aporte > 0}
          rendimentoAnual={projection.yieldAnnual}
        />
      </div>

      {/* 2. Um alerta, e só quando é grave. */}
      {negativo ? (
        <Card className="rise flex gap-3.5 p-4" style={{ animationDelay: "60ms" }}>
          <span className="w-1 shrink-0 rounded-full bg-neg" />
          <div>
            <p className="title text-[16px] font-semibold text-neg">
              Seu saldo fica negativo em {formatMonthLong(negativo.month)}
            </p>
            <p className="mt-1 text-[13.5px] leading-snug text-ink-2">
              No ritmo de hoje as saídas passam das entradas antes disso.
              Cortar um fixo ou adiar uma parcela muda essa data.
            </p>
          </div>
        </Card>
      ) : null}

      {/* 3. A projeção, que é o diferencial do app. */}
      <div className="rise" style={{ animationDelay: "90ms" }}>
        <Hero
          months={projection.months}
          currentBalance={projection.currentBalance}
          variableMonthly={projection.variableMonthly}
          action={
            <div className="flex gap-1 rounded-full bg-fill p-0.5">
              {HORIZONS.map((n) => (
                <Link
                  key={n}
                  href={`/?h=${n}`}
                  scroll={false}
                  aria-label={`Projetar ${n} meses`}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-bold transition-colors ${
                    n === horizonMonths ? "bg-brand text-white" : "text-ink-2"
                  }`}
                >
                  {n}m
                </Link>
              ))}
            </div>
          }
        />
      </div>

      {/* 4. Metas, se existirem. */}
      {metas.length > 0 ? (
        <section className="rise" style={{ animationDelay: "120ms" }}>
          <Chapter>Suas metas</Chapter>
          <GoalsList metas={metas} compacto />
        </section>
      ) : null}

      {/* 5. Tudo que é conferência mora num lugar só, fechado.
             Antes eram três blocos dobráveis competindo entre si e a home
             virava uma pilha de cartões. */}
      <section>
        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-[15px] font-semibold text-brand [&::-webkit-details-marker]:hidden">
              <span className="flex-1">Ver os números por trás</span>
              <span className="text-ink-3 transition-transform duration-300 group-open:rotate-90">
                ›
              </span>
            </summary>

            <div className="flex flex-col gap-7 border-t border-hairline p-5">
              <div>
                <p className="chapter mb-3">Como seu mês se divide</p>
                <MonthFlow
                  income={projection.monthlyIncome}
                  fixed={projection.monthlyFixed}
                  variable={projection.variableMonthly}
                  aporte={orcamento.aporte}
                />
                <p className="mt-4 border-t border-hairline pt-3 text-[12.5px] leading-snug text-ink-3">
                  {projection.variableSource === "manual"
                    ? "O gasto variável é o valor que você fixou em Ajustes."
                    : projection.variableSource === "historico"
                      ? `O gasto variável é a média real dos seus últimos ${data.settings.lookbackMonths} meses, já descontando os fixos.`
                      : projection.variableSource === "estimado"
                        ? "O gasto variável ainda é o que você estimou no cadastro. Assim que fechar um mês de lançamentos, passa a sair do gasto real."
                        : "Ainda sem histórico, então o gasto variável está zerado. A projeção está otimista."}
                  {projection.yieldAnnual > 0
                    ? ` O saldo rende ${formatRate(projection.yieldAnnual)}, com juro composto mês a mês.`
                    : ""}
                </p>
              </div>

              <div>
                <p className="chapter mb-3">O caminho até lá</p>
                <StoryTimeline events={story} />
              </div>

              <div>
                <p className="chapter mb-1">Mês a mês</p>
                <div className="-mx-5">
                  {projection.months.map((m) => (
                    <Row key={m.month}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-medium">
                            {formatMonthShort(m.month)}
                          </span>
                          {m.partial ? <Badge>parcial</Badge> : null}
                          {m.ending.length > 0 ? (
                            <Badge tone="good">
                              {m.ending.length === 1
                                ? "quita 1 parcela"
                                : `quita ${m.ending.length}`}
                            </Badge>
                          ) : null}
                        </div>
                        <span className="tnum text-[12px] text-ink-3">
                          {formatSigned(m.net)} no mês
                          {m.yield > 0
                            ? `, com ${formatMoney(m.yield)} de rendimento`
                            : ""}
                        </span>
                      </div>
                      <span
                        className={`tnum text-[15px] font-semibold ${
                          m.endBalance < 0 ? "text-neg" : "text-ink"
                        }`}
                      >
                        {formatMoney(m.endBalance)}
                      </span>
                    </Row>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </Card>
      </section>
    </div>
  );
}

function Welcome() {
  return (
    <div className="flex min-h-[75dvh] flex-col justify-center gap-8 py-10">
      <div className="rise">
        <Logo size={26} />
        <h1 className="display mt-6 text-[clamp(38px,11vw,52px)]">
          Descubra como seus
          <br />
          <span className="brand-text">próximos meses</span>
          <br />
          vão terminar.
        </h1>
        <p className="mt-5 max-w-sm text-[16px] leading-relaxed text-ink-2">
          Responda algumas perguntas rápidas e o app monta a projeção do seu
          saldo mês a mês, incluindo o dia em que cada parcela sua acaba.
        </p>
      </div>

      <div className="rise flex flex-col gap-3" style={{ animationDelay: "140ms" }}>
        <Link
          href="/comecar"
          className="grad-button pressable flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[17px] font-bold"
        >
          Começar
          <span aria-hidden="true">→</span>
        </Link>
        <p className="text-center text-[13px] text-ink-3">
          Leva menos de dois minutos.
        </p>
      </div>
    </div>
  );
}
