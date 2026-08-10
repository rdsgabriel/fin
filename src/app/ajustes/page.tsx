import { deleteCategory } from "@/app/actions";
import { CategoryForm } from "@/components/category-form";
import { SettingsForm } from "@/components/settings-form";
import { Card, Row, SectionTitle } from "@/components/ui";
import { getCategories, getSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const [settings, categories] = await Promise.all([
    getSettings(),
    getCategories(),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <h1 className="display px-1 pt-4 text-[38px] font-bold">Ajustes</h1>

      <section>
        <SectionTitle>Base da projeção</SectionTitle>
        <SettingsForm settings={settings} />
      </section>

      <section>
        <SectionTitle>Categorias</SectionTitle>
        <Card>
          {categories.map((c) => (
            <Row key={c.id}>
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ background: c.color }}
              />
              <span className="flex-1 text-[15px]">{c.name}</span>
              <span className="text-[12px] text-label-3">
                {c.kind === "income" ? "entrada" : "saída"}
              </span>
              <form action={deleteCategory}>
                <input type="hidden" name="id" value={c.id} />
                <button
                  type="submit"
                  aria-label={`Excluir ${c.name}`}
                  className="px-1 text-[18px] leading-none text-label-3 active:text-red"
                >
                  ×
                </button>
              </form>
            </Row>
          ))}
          <div className="border-t border-separator">
            <CategoryForm />
          </div>
        </Card>
      </section>
    </div>
  );
}
