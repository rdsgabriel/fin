import Link from "next/link";
import { Badge, Card, Empty, Row, SectionTitle } from "@/components/ui";
import { Hero } from "@/components/hero";
import { getProjectionData } from "@/lib/queries";
import { buildProjection, describeAlert } from "@/lib/projection";
import { formatMoney, formatSigned } from "@/lib/money";
import { formatMonthShort } from "@/lib/month";

export const dynamic = "force-dynamic";

const HORIZONS = [6, 12, 24] as const;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ h?: string }>;
}) {
  const { h } = await searchParams;
  const data = await getProjectionData();

  const requested = Number(h);
  const horizonMonths = HORIZONS.includes(requested as (typeof HORIZONS)[number])
    ? requested
    : data.settings.horizonMonths;

  const projection = buildProjection({ ...data, horizonMonths });
  const isEmpty = data.recurrences.length === 0 && data.transactions.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col gap-5 pt-6">
        <div className="px-1">
          <h1 className="display text-[38px] font-bold">Vamos ver seu futuro</h1>
          <p className="mt-2 text-[15px] leading-snug text-label-2">
            Três passos e o app já diz como cada um dos próximos meses termina.
          </p>
        </div>
        <Card>
          <StepRow
            n={1}
            href="/ajustes"
            title="Quanto você tem hoje"
            body="O ponto de partida do saldo."
          />
          <StepRow
            n={2}
            href="/fixos"
            title="O que se repete todo mês"
            body="Salário, aluguel e as parcelas que ainda faltam."
          />
          <StepRow
            n={3}
            href="/lancamentos"
            title="O dia a dia"
            body="Com um mês de histórico o app estima seu gasto variável sozinho."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Hero
        months={projection.months}
        currentBalance={projection.currentBalance}
        variableMonthly={projection.variableMonthly}
      />

      <div className="rise flex justify-center" style={{ animationDelay: "60ms" }}>
        <div className="material flex rounded-full p-1">
          {HORIZONS.map((n) => (
            <Link
              key={n}
              href={`/?h=${n}`}
              scroll={false}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all ${
                n === horizonMonths
                  ? "bg-blue text-white"
                  : "text-label-2 hover:text-label"
              }`}
            >
              {n} meses
            </Link>
          ))}
        </div>
      </div>

      {projection.alerts.length > 0 ? (
        <section
          className="rise flex flex-col gap-2.5"
          style={{ animationDelay: "120ms" }}
        >
          {projection.alerts.map((alert, i) => {
            const { title, body, tone } = describeAlert(alert);
            const color =
              tone === "danger"
                ? "var(--red)"
                : tone === "warning"
                  ? "var(--orange)"
                  : "var(--green)";
            return (
              <Card key={i} className="flex gap-3 px-4 py-3.5">
                <span
                  className="mt-0.5 h-auto w-1 shrink-0 rounded-full"
                  style={{ background: color }}
                />
                <div>
                  <p className="text-[15px] font-semibold" style={{ color }}>
                    {title}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-snug text-label-2">
                    {body}
                  </p>
                </div>
              </Card>
            );
          })}
        </section>
      ) : null}

      <section className="rise" style={{ animationDelay: "180ms" }}>
        <SectionTitle>Ritmo de um mês cheio</SectionTitle>
        <Card>
          <Row>
            <span className="flex-1 text-[15px]">Entradas fixas</span>
            <span className="tnum text-[15px] font-medium text-green">
              {formatSigned(projection.monthlyIncome)}
            </span>
          </Row>
          <Row>
            <span className="flex-1 text-[15px]">Saídas fixas</span>
            <span className="tnum text-[15px] font-medium">
              {formatSigned(-projection.monthlyFixed)}
            </span>
          </Row>
          <Row>
            <span className="flex-1 text-[15px]">
              Gasto variável
              <span className="ml-2 text-[12px] text-label-3">
                {projection.variableSource === "manual"
                  ? "definido por você"
                  : projection.variableSource === "historico"
                    ? `média de ${data.settings.lookbackMonths} meses`
                    : "sem histórico ainda"}
              </span>
            </span>
            <span className="tnum text-[15px] font-medium">
              {formatSigned(-projection.variableMonthly)}
            </span>
          </Row>
          <Row className="bg-fill">
            <span className="flex-1 text-[15px] font-semibold">
              {projection.monthlyNet >= 0 ? "Sobra por mês" : "Falta por mês"}
            </span>
            <span
              className={`tnum text-[19px] font-semibold ${
                projection.monthlyNet >= 0 ? "text-green" : "text-red"
              }`}
            >
              {formatSigned(projection.monthlyNet)}
            </span>
          </Row>
        </Card>
        {projection.variableSource === "sem-dados" ? (
          <p className="mt-2 px-1 text-[12px] leading-snug text-label-3">
            Sem lançamentos ainda, a projeção assume gasto variável zero — ou
            seja, está otimista. Lance alguns gastos ou defina um valor em{" "}
            <Link href="/ajustes" className="text-blue">
              Ajustes
            </Link>
            .
          </p>
        ) : null}
      </section>

      <section className="rise" style={{ animationDelay: "240ms" }}>
        <SectionTitle>Mês a mês</SectionTitle>
        <Card>
          {projection.months.map((m) => (
            <Row key={m.month}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[15px]">{formatMonthShort(m.month)}</span>
                  {m.partial ? <Badge>parcial</Badge> : null}
                  {m.ending.length > 0 ? (
                    <Badge tone="good">
                      {m.ending.length === 1
                        ? "acaba 1 parcela"
                        : `acabam ${m.ending.length}`}
                    </Badge>
                  ) : null}
                </div>
                <span className="tnum text-[12px] text-label-3">
                  {formatSigned(m.net)} no mês
                </span>
              </div>
              <span
                className={`tnum text-[15px] font-medium ${
                  m.endBalance < 0 ? "text-red" : "text-label"
                }`}
              >
                {formatMoney(m.endBalance)}
              </span>
            </Row>
          ))}
        </Card>
      </section>
    </div>
  );
}

function StepRow({
  n,
  href,
  title,
  body,
}: {
  n: number;
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link href={href} className="block transition-colors active:bg-fill">
      <Row>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue text-[13px] font-semibold text-white">
          {n}
        </span>
        <div className="flex-1">
          <p className="text-[15px] font-medium">{title}</p>
          <p className="text-[13px] text-label-2">{body}</p>
        </div>
        <span className="text-label-3">›</span>
      </Row>
    </Link>
  );
}
