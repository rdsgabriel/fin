import { deleteCategory } from "@/app/actions";
import { sair } from "@/app/auth-actions";
import { BotaoAtualizar } from "@/components/register-sw";
import { CategoryForm } from "@/components/category-form";
import { SettingsForm } from "@/components/settings-form";
import { Card, Row, Chapter } from "@/components/ui";
import { getCategories, getProjectionData, getSettings } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { buildProjection, evaluateGoals } from "@/lib/projection";
import { GoalForm } from "@/components/goal-form";
import { GoalsList } from "@/components/goals-list";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const user = await requireUser();
  const [settings, categories, data] = await Promise.all([
    getSettings(user.id),
    getCategories(user.id),
    getProjectionData(user.id),
  ]);

  // As metas precisam da projeção pra saber quando cada uma é alcançada.
  const metas = evaluateGoals(buildProjection(data), data.goals);

  return (
    <div className="flex flex-col gap-7">
      <h1 className="display px-1 pt-4 text-[38px]">Ajustes</h1>

      <section>
        <Chapter>Conta</Chapter>
        <Card>
          <Row>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium">{user.email}</p>
              <p className="text-[12px] text-ink-3">Sessão ativa neste aparelho</p>
            </div>
            <form action={sair}>
              <button
                type="submit"
                className="pressable rounded-full px-3 py-1.5 text-[14px] font-semibold text-neg"
              >
                Sair
              </button>
            </form>
          </Row>
        </Card>
      </section>

      <section>
        <Chapter>Aplicativo</Chapter>
        <Card>
          <BotaoAtualizar />
        </Card>
      </section>

      <section>
        <Chapter>Metas</Chapter>
        {metas.length ? <GoalsList metas={metas} /> : null}
        <Card className={metas.length ? "mt-3" : ""}>
          <GoalForm />
        </Card>
        <p className="mt-2 px-1 text-[12px] leading-snug text-ink-3">
          Guardar não é gastar: o valor que você separa continua no seu saldo e
          na projeção. Ele só sai do seu limite de gasto do mês, que é o que
          faz "guardar antes" funcionar.
        </p>
      </section>

      <section>
        <Chapter>Base da projeção</Chapter>
        <SettingsForm settings={settings} />
      </section>

      <section>
        <Chapter>Categorias</Chapter>
        <Card>
          {categories.map((c) => (
            <Row key={c.id}>
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ background: c.color }}
              />
              <span className="flex-1 text-[15px]">{c.name}</span>
              <span className="text-[12px] text-ink-3">
                {c.kind === "income" ? "entrada" : "saída"}
              </span>
              <form action={deleteCategory}>
                <input type="hidden" name="id" value={c.id} />
                <button
                  type="submit"
                  aria-label={`Excluir ${c.name}`}
                  className="px-1 text-[18px] leading-none text-ink-3 active:text-neg"
                >
                  ×
                </button>
              </form>
            </Row>
          ))}
          <div className="border-t border-hairline">
            <CategoryForm />
          </div>
        </Card>
      </section>
    </div>
  );
}
