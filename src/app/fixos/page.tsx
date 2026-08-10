import { deleteRecurrence, toggleRecurrence } from "@/app/actions";
import { Badge, Card, Empty, Row, SectionTitle } from "@/components/ui";
import { getCategories, getRecurrences } from "@/lib/queries";
import { formatMoney } from "@/lib/money";
import {
  formatMonthShort,
  monthKeyOf,
  monthsBetween,
  todayISO,
} from "@/lib/month";

export const dynamic = "force-dynamic";

export default async function FixosPage() {
  const [recurrences, categories] = await Promise.all([
    getRecurrences(),
    getCategories(),
  ]);

  const thisMonth = monthKeyOf(todayISO());
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  const income = recurrences.filter((r) => r.kind === "income");
  const expense = recurrences.filter((r) => r.kind === "expense");

  const monthlyTotal = (list: typeof recurrences) =>
    list
      .filter((r) => r.active && (!r.endMonth || monthKeyOf(r.endMonth) >= thisMonth))
      .reduce((sum, r) => sum + r.amountCents, 0);

  return (
    <div className="flex flex-col gap-7">
      <div className="px-1 pt-4">
        <h1 className="display text-[38px] font-bold">Fixos</h1>
        <p className="mt-2 text-[14px] leading-snug text-label-2">
          Tudo que se repete todo mês. Parcelas entram aqui com data de fim — é
          assim que a projeção sabe quando o dinheiro volta a sobrar.
        </p>
      </div>

      {recurrences.length === 0 ? (
        <Card>
          <Empty
            title="Nenhum fixo cadastrado"
            body="Toque no + ali embaixo. Comece pelo salário e pelo aluguel, depois some as parcelas que ainda faltam."
          />
        </Card>
      ) : null}

      {[
        { title: "Entradas", list: income },
        { title: "Saídas", list: expense },
      ].map(({ title, list }) =>
        list.length === 0 ? null : (
          <section key={title}>
            <SectionTitle
              action={
                <span className="tnum text-[13px] font-semibold text-label-2">
                  {formatMoney(monthlyTotal(list))}/mês
                </span>
              }
            >
              {title}
            </SectionTitle>
            <Card>
              {list.map((r) => {
                const endKey = r.endMonth ? monthKeyOf(r.endMonth) : null;
                const remaining = endKey
                  ? monthsBetween(thisMonth, endKey) + 1
                  : null;
                const finished = remaining !== null && remaining <= 0;

                return (
                  <Row key={r.id} className={r.active && !finished ? "" : "opacity-45"}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[15px]">{r.description}</p>
                        {finished ? (
                          <Badge>quitado</Badge>
                        ) : remaining !== null ? (
                          <Badge tone="warn">
                            {remaining}x até {formatMonthShort(endKey!)}
                          </Badge>
                        ) : null}
                        {!r.active ? <Badge>pausado</Badge> : null}
                      </div>
                      <p className="text-[12px] text-label-3">
                        dia {r.dayOfMonth}
                        {r.categoryId ? ` · ${categoryName.get(r.categoryId)}` : ""}
                      </p>
                    </div>

                    <span
                      className={`tnum text-[15px] font-medium ${
                        r.kind === "income" ? "text-green" : "text-label"
                      }`}
                    >
                      {r.kind === "income" ? "+" : "−"}
                      {formatMoney(r.amountCents)}
                    </span>

                    <form action={toggleRecurrence}>
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        type="submit"
                        className="px-1 text-[12px] font-medium text-blue active:opacity-60"
                      >
                        {r.active ? "pausar" : "ativar"}
                      </button>
                    </form>
                    <form action={deleteRecurrence}>
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        type="submit"
                        aria-label={`Excluir ${r.description}`}
                        className="px-1 text-[18px] leading-none text-label-3 active:text-red"
                      >
                        ×
                      </button>
                    </form>
                  </Row>
                );
              })}
            </Card>
          </section>
        ),
      )}
    </div>
  );
}
