import Link from "next/link";
import { Badge, Card, Chapter, Row } from "@/components/ui";
import { Hero } from "@/components/hero";
import { MonthFlow } from "@/components/month-flow";
import { StoryTimeline } from "@/components/story-timeline";
import { getProjectionData } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import {
  buildProjection,
  buildStory,
  calcularOrcamento,
  evaluateGoals,
  totalAporte,
} from "@/lib/projection";
import { BudgetHero } from "@/components/budget-hero";
import { Logo } from "@/components/logo";
import { GoalsList } from "@/components/goals-list";
import { formatMoney, formatSigned } from "@/lib/money";
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
  const isEmpty = data.recurrences.length === 0 && data.transactions.length === 0;

  if (isEmpty) return <Welcome />;

  const negative = projection.months.find((m) => m.endBalance < 0);

  const today = new Date(`${todayISO()}T12:00:00`);
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(today);

  return (
    <div className="flex flex-col gap-12 pb-8">
      {/* ---- Capítulo 1: quanto dá pra gastar hoje ----
           Sem barra de navegação, mas com a marca presente: o logo divide a
           linha com a data, então a identidade aparece sem custar altura. */}
      <div>
        <div className="mb-4 flex items-center justify-between gap-3 pt-2 sm:hidden">
          <Logo size={22} />
          <p className="chapter first-letter:uppercase">{weekday}</p>
        </div>
        <p className="chapter mb-1 hidden first-letter:uppercase sm:block">
          {weekday}
        </p>
        <BudgetHero
          orcamento={orcamento}
          saldo={projection.currentBalance}
          temMetas={orcamento.aporte > 0}
        />

        <Card className="rise mt-6 p-5" style={{ animationDelay: "70ms" }}>
          <MonthFlow
            income={projection.monthlyIncome}
            fixed={projection.monthlyFixed}
            variable={projection.variableMonthly}
            aporte={orcamento.aporte}
          />
          <p className="mt-4 border-t border-hairline pt-3 text-[12.5px] leading-snug text-ink-3">
            {projection.variableSource === "manual"
              ? "O gasto variável é o valor que você definiu em Ajustes."
              : projection.variableSource === "historico"
                ? `O gasto variável é a média dos seus últimos ${data.settings.lookbackMonths} meses, já descontando os fixos.`
                : "Ainda sem histórico, então o gasto variável está zerado. A projeção está otimista."}
          </p>
        </Card>
      </div>

      {/* ---- Metas: o alvo que dá sentido à curva ---- */}
      {metas.length > 0 ? (
        <section className="rise" style={{ animationDelay: "100ms" }}>
          <Chapter>Suas metas</Chapter>
          <GoalsList metas={metas} compacto />
        </section>
      ) : null}

      {/* Um único alerta, e só quando é grave. Lista de avisos vira ruído. */}
      {negative ? (
        <Card
          className="rise -mt-6 flex gap-3.5 p-4"
          style={{ animationDelay: "80ms" }}
        >
          <span className="w-1 shrink-0 rounded-full bg-neg" />
          <div>
            <p className="title text-[16px] font-bold text-neg">
              Seu saldo fica negativo em {formatMonthLong(negative.month)}
            </p>
            <p className="mt-1 text-[13.5px] leading-snug text-ink-2">
              No ritmo de hoje as saídas passam das entradas antes disso. Cortar
              um fixo ou adiar uma parcela muda essa data.
            </p>
          </div>
        </Card>
      ) : null}

      {/* ---- Capítulo 2: pra onde isso vai ---- */}
      <div className="rise" style={{ animationDelay: "120ms" }}>
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
                    n === horizonMonths
                      ? "bg-brand text-white"
                      : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {n}m
                </Link>
              ))}
            </div>
          }
        />
      </div>

      {/* ---- Capítulo 3: o que acontece no caminho ---- */}
      <section>
        <Chapter>O caminho até lá</Chapter>
        <Card className="px-4 py-2">
          <StoryTimeline events={story} />
        </Card>
      </section>

      {/* ---- Capítulo 4: o detalhe, fechado por padrão ----
           A tabela de 12 meses é conferência, não narrativa. Aberta, ela
           esmaga a história com o triplo da altura da página. */}
      <section>
        <Chapter>Mês a mês</Chapter>
        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3.5 text-[15px] font-semibold text-brand [&::-webkit-details-marker]:hidden">
              <span className="flex-1">
                Ver os {projection.months.length} meses em detalhe
              </span>
              <span className="text-ink-3 transition-transform duration-300 group-open:rotate-90">
                ›
              </span>
            </summary>
            <div className="border-t border-hairline">
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
        <p className="chapter mb-3">Fin</p>
        <h1 className="display text-[clamp(38px,11vw,52px)]">
          Descubra como seus
          <br />
          <span className="brand-text">próximos meses</span>
          <br />
          vão terminar.
        </h1>
        <p className="mt-5 max-w-sm text-[16px] leading-relaxed text-ink-2">
          Responda três perguntas rápidas e o app monta a projeção do seu saldo
          mês a mês, incluindo o dia em que cada parcela sua acaba.
        </p>
      </div>

      <div className="rise flex flex-col gap-3" style={{ animationDelay: "140ms" }}>
        <Link
          href="/comecar"
          className="pressable flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[17px] font-bold text-white shadow-[var(--shadow-2)]"
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
