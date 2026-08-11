import { deleteTransaction } from "@/app/actions";
import { Card, Empty, Row, Chapter } from "@/components/ui";
import { getCategories, getTransactions } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { formatDayShort, formatMonthLong, monthKeyOf } from "@/lib/month";

export const dynamic = "force-dynamic";

export default async function LancamentosPage() {
  const user = await requireUser();
  const [transactions, categories] = await Promise.all([
    getTransactions(user.id, 300),
    getCategories(user.id),
  ]);

  const byId = new Map(categories.map((c) => [c.id, c]));

  const byMonth = new Map<string, typeof transactions>();
  for (const t of transactions) {
    const key = monthKeyOf(t.date);
    const list = byMonth.get(key) ?? [];
    list.push(t);
    byMonth.set(key, list);
  }

  return (
    <div className="flex flex-col gap-7">
      <h1 className="display px-1 pt-4 text-[38px]">Extrato</h1>

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
              <Chapter
                action={
                  <span
                    className={`tnum text-[13px] font-semibold ${
                      total >= 0 ? "text-pos" : "text-ink-2"
                    }`}
                  >
                    {formatMoney(total)}
                  </span>
                }
              >
                {formatMonthLong(month)}
              </Chapter>
              <Card>
                {items.map((t) => {
                  const category = t.categoryId ? byId.get(t.categoryId) : null;
                  return (
                    <Row key={t.id} className="group">
                      {/* O ponto colorido é a mesma cor do chip que você
                          escolheu ao lançar — dá ritmo à lista e liga as
                          duas telas visualmente. */}
                      <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: category?.color ?? "var(--ink-3)" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium">
                          {t.description}
                        </p>
                        <p className="text-[12px] text-ink-3">
                          {formatDayShort(t.date)}
                          {category ? ` · ${category.name}` : ""}
                        </p>
                      </div>
                      <span
                        className={`tnum text-[15px] font-semibold ${
                          t.kind === "income" ? "text-pos" : "text-ink"
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
                          className="pressable flex size-8 items-center justify-center rounded-full text-ink-3 opacity-50 active:bg-fill active:text-neg"
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            aria-hidden="true"
                          >
                            <path d="M4 7h16M9.5 7V4.8h5V7M6.5 7l.9 12.2h9.2L17.5 7" />
                          </svg>
                        </button>
                      </form>
                    </Row>
                  );
                })}
              </Card>
            </section>
          );
        })
      )}
    </div>
  );
}
