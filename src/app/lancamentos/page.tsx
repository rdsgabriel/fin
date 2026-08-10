import { deleteTransaction } from "@/app/actions";
import { Card, Empty, Row, SectionTitle } from "@/components/ui";
import { getCategories, getTransactions } from "@/lib/queries";
import { formatMoney } from "@/lib/money";
import { formatDayShort, formatMonthLong, monthKeyOf } from "@/lib/month";

export const dynamic = "force-dynamic";

export default async function LancamentosPage() {
  const [transactions, categories] = await Promise.all([
    getTransactions(300),
    getCategories(),
  ]);

  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  const byMonth = new Map<string, typeof transactions>();
  for (const t of transactions) {
    const key = monthKeyOf(t.date);
    const list = byMonth.get(key) ?? [];
    list.push(t);
    byMonth.set(key, list);
  }

  return (
    <div className="flex flex-col gap-7">
      <h1 className="display px-1 pt-4 text-[38px] font-bold">Extrato</h1>

      {byMonth.size === 0 ? (
        <Card>
          <Empty
            title="Nada lançado ainda"
            body="Toque no + ali embaixo. Os lançamentos alimentam seu saldo e a estimativa de gasto variável da projeção."
          />
        </Card>
      ) : (
        [...byMonth.entries()].map(([month, items]) => {
          const total = items.reduce(
            (sum, t) => sum + (t.kind === "income" ? t.amountCents : -t.amountCents),
            0,
          );
          return (
            <section key={month}>
              <SectionTitle
                action={
                  <span
                    className={`tnum text-[13px] font-semibold ${
                      total >= 0 ? "text-green" : "text-label-2"
                    }`}
                  >
                    {formatMoney(total)}
                  </span>
                }
              >
                {formatMonthLong(month)}
              </SectionTitle>
              <Card>
                {items.map((t) => (
                  <Row key={t.id}>
                    <span className="tnum w-12 shrink-0 text-[13px] text-label-3">
                      {formatDayShort(t.date)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px]">{t.description}</p>
                      {t.categoryId ? (
                        <p className="text-[12px] text-label-3">
                          {categoryName.get(t.categoryId)}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`tnum text-[15px] font-medium ${
                        t.kind === "income" ? "text-green" : "text-label"
                      }`}
                    >
                      {t.kind === "income" ? "+" : "−"}
                      {formatMoney(t.amountCents)}
                    </span>
                    <form action={deleteTransaction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        aria-label={`Excluir ${t.description}`}
                        className="px-1 text-[18px] leading-none text-label-3 active:text-red"
                      >
                        ×
                      </button>
                    </form>
                  </Row>
                ))}
              </Card>
            </section>
          );
        })
      )}
    </div>
  );
}
