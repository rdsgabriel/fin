import { FixosList } from "@/components/fixos-list";
import { Card, Empty } from "@/components/ui";
import { getCategories, getRecurrences } from "@/lib/queries";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function FixosPage() {
  const user = await requireUser();
  const [recurrences, categories] = await Promise.all([
    getRecurrences(user.id),
    getCategories(user.id),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <div className="px-1 pt-4">
        <h1 className="display text-[38px]">Fixos e parcelas</h1>
        <p className="mt-2 text-[14px] leading-snug text-ink-2">
          Tudo que se repete todo mês, e também as compras parceladas. Use o{" "}
          <strong className="font-semibold text-ink">+</strong> ali embaixo e
          escolha entre <strong className="font-semibold text-ink">Todo mês</strong>{" "}
          ou <strong className="font-semibold text-ink">Parcelado</strong>. Toque
          em qualquer item pra editar, que é onde entra um aumento de salário.
        </p>
      </div>

      {recurrences.length === 0 ? (
        <Card>
          <Empty
            title="Nada cadastrado ainda"
            body="Toque no + ali embaixo. Comece pelo salário e pelo aluguel. Para uma compra parcelada, escolha Parcelado na primeira tela."
          />
        </Card>
      ) : (
        <FixosList recurrences={recurrences} categories={categories} />
      )}
    </div>
  );
}
