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
        <h1 className="display text-[38px]">Fixos</h1>
        <p className="mt-2 text-[14px] leading-snug text-ink-2">
          Tudo que se repete todo mês. Toque em qualquer um pra editar — é aqui
          que entra um aumento de salário ou um reajuste de aluguel.
        </p>
      </div>

      {recurrences.length === 0 ? (
        <Card>
          <Empty
            title="Nenhum fixo cadastrado"
            body="Toque no + ali embaixo. Comece pelo salário e pelo aluguel, depois some as parcelas que ainda faltam."
          />
        </Card>
      ) : (
        <FixosList recurrences={recurrences} categories={categories} />
      )}
    </div>
  );
}
