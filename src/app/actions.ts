"use server";

import { revalidatePath } from "next/cache";
import { and, eq, not } from "drizzle-orm";
import { db, categories, goals, recurrences, settings, transactions } from "@/db";
import { requireUser } from "@/lib/auth";
import { parseMoneyToCents } from "@/lib/money";
import { addMonths, firstDayOf, monthKeyOf, todayISO } from "@/lib/month";

/** Formato que o `useActionState` dos formulários espera de volta. */
export type FormState = { error?: string; ok?: boolean } | null;

function revalidateAll() {
  for (const path of ["/", "/lancamentos", "/fixos", "/ajustes"]) {
    revalidatePath(path);
  }
}

/** O teclado manda centavos direto; o formulário simples manda texto ("12,34"). */
function readAmountCents(formData: FormData): number | null {
  const raw = formData.get("amountCents");
  if (raw != null && String(raw) !== "") {
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
  }
  return parseMoneyToCents(String(formData.get("amount") ?? ""));
}

function readKind(value: FormDataEntryValue | null): "income" | "expense" {
  return value === "income" ? "income" : "expense";
}

/** Só aceita categoria que pertença a quem está pedindo. */
async function readCategoryId(
  value: FormDataEntryValue | null,
  userId: number,
): Promise<number | null> {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;

  const [found] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, n), eq(categories.userId, userId)))
    .limit(1);
  return found?.id ?? null;
}

export async function addTransaction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const amountCents = readAmountCents(formData);
  const description = String(formData.get("description") ?? "").trim();

  if (!amountCents || !description) {
    return { error: "Preencha a descrição e um valor válido." };
  }

  await db.insert(transactions).values({
    userId: user.id,
    description,
    amountCents,
    kind: readKind(formData.get("kind")),
    categoryId: await readCategoryId(formData.get("categoryId"), user.id),
    date: String(formData.get("date") ?? "") || todayISO(),
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteTransaction(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  // O filtro por userId é o que impede apagar lançamento de outra conta
  // trocando o id no HTML.
  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));
  revalidateAll();
}

export async function addRecurrence(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const amountCents = readAmountCents(formData);
  const description = String(formData.get("description") ?? "").trim();

  if (!amountCents || !description) {
    return { error: "Preencha a descrição e um valor válido." };
  }

  const startMonth =
    String(formData.get("startMonth") ?? "") || monthKeyOf(todayISO());

  // Parcelado é só uma recorrência com data de fim — é isso que faz a
  // projeção mostrar o alívio quando a última parcela cai.
  let endMonth: string | null = null;
  if (formData.get("mode") === "parcelado") {
    const count = Number(formData.get("installments"));
    if (!Number.isInteger(count) || count < 1 || count > 480) {
      return { error: "Número de parcelas inválido." };
    }
    endMonth = firstDayOf(addMonths(startMonth, count - 1));
  }

  const day = Number(formData.get("dayOfMonth"));

  await db.insert(recurrences).values({
    userId: user.id,
    description,
    amountCents,
    kind: readKind(formData.get("kind")),
    categoryId: await readCategoryId(formData.get("categoryId"), user.id),
    dayOfMonth: Number.isInteger(day) && day >= 1 && day <= 31 ? day : 1,
    startMonth: firstDayOf(startMonth),
    endMonth,
  });

  revalidateAll();
  return { ok: true };
}

/**
 * Editar em vez de apagar-e-recriar. Aumento de salário, reajuste de
 * aluguel e renegociação de parcela são a regra, não a exceção — e recriar
 * perderia a data de início, que é o que ancora a projeção.
 */
export async function updateRecurrence(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Registro inválido." };

  const amountCents = readAmountCents(formData);
  const description = String(formData.get("description") ?? "").trim();
  if (!amountCents || !description) {
    return { error: "Preencha a descrição e um valor válido." };
  }

  const startMonth =
    String(formData.get("startMonth") ?? "") || monthKeyOf(todayISO());

  let endMonth: string | null = null;
  if (formData.get("mode") === "parcelado") {
    const count = Number(formData.get("installments"));
    if (!Number.isInteger(count) || count < 1 || count > 480) {
      return { error: "Número de parcelas inválido." };
    }
    endMonth = firstDayOf(addMonths(startMonth, count - 1));
  }

  const day = Number(formData.get("dayOfMonth"));

  await db
    .update(recurrences)
    .set({
      description,
      amountCents,
      kind: readKind(formData.get("kind")),
      categoryId: await readCategoryId(formData.get("categoryId"), user.id),
      dayOfMonth: Number.isInteger(day) && day >= 1 && day <= 31 ? day : 1,
      startMonth: firstDayOf(startMonth),
      endMonth,
    })
    .where(and(eq(recurrences.id, id), eq(recurrences.userId, user.id)));

  revalidateAll();
  return { ok: true };
}

export async function updateGoal(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Meta inválida." };

  const name = String(formData.get("name") ?? "").trim();
  const target = parseMoneyToCents(String(formData.get("target") ?? ""));
  const monthly = parseMoneyToCents(String(formData.get("monthly") ?? "")) ?? 0;
  const prazo = String(formData.get("deadline") ?? "").trim();

  if (!name) return { error: "Dê um nome à meta." };
  if (!target) return { error: "Informe quanto você quer juntar." };

  await db
    .update(goals)
    .set({
      name,
      targetCents: target,
      monthlyCents: monthly,
      deadline: prazo ? firstDayOf(prazo) : null,
    })
    .where(and(eq(goals.id, id), eq(goals.userId, user.id)));

  revalidateAll();
  return { ok: true };
}

export async function toggleRecurrence(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await db
    .update(recurrences)
    .set({ active: not(recurrences.active) })
    .where(and(eq(recurrences.id, id), eq(recurrences.userId, user.id)));
  revalidateAll();
}

export async function deleteRecurrence(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await db
    .delete(recurrences)
    .where(and(eq(recurrences.id, id), eq(recurrences.userId, user.id)));
  revalidateAll();
}

export async function updateSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const opening = parseMoneyToCents(String(formData.get("openingBalance") ?? ""));
  const overrideRaw = String(formData.get("variableOverride") ?? "").trim();
  const horizon = Number(formData.get("horizonMonths"));
  const lookback = Number(formData.get("lookbackMonths"));

  await db
    .update(settings)
    .set({
      openingBalanceCents: opening ?? 0,
      openingDate: String(formData.get("openingDate") ?? "") || todayISO(),
      variableOverrideCents: overrideRaw ? parseMoneyToCents(overrideRaw) : null,
      horizonMonths: [6, 12, 24, 36].includes(horizon) ? horizon : 12,
      lookbackMonths: lookback >= 1 && lookback <= 12 ? lookback : 3,
    })
    .where(eq(settings.userId, user.id));

  revalidateAll();
  return { ok: true };
}

export async function addCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Dê um nome à categoria." };

  await db.insert(categories).values({
    userId: user.id,
    name,
    kind: readKind(formData.get("kind")),
    color: String(formData.get("color") ?? "#8E8E93"),
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteCategory(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)));
  revalidateAll();
}

export async function addGoal(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const target = parseMoneyToCents(String(formData.get("target") ?? ""));
  const monthly = parseMoneyToCents(String(formData.get("monthly") ?? "")) ?? 0;
  const prazo = String(formData.get("deadline") ?? "").trim();

  if (!name) return { error: "Dê um nome à meta." };
  if (!target) return { error: "Informe quanto você quer juntar." };

  await db.insert(goals).values({
    userId: user.id,
    name,
    targetCents: target,
    monthlyCents: monthly,
    // O input é type="month"; guardamos sempre o dia 1.
    deadline: prazo ? firstDayOf(prazo) : null,
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteGoal(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await db
    .delete(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, user.id)));
  revalidateAll();
}

export type OnboardingData = {
  openingBalanceCents: number;
  income: {
    description: string;
    amountCents: number;
    dayOfMonth: number;
    /** Renda que varia: o valor informado é uma média, não um salário fixo. */
    variavel: boolean;
  } | null;
  fixed: { description: string; amountCents: number; dayOfMonth: number }[];
  installments: { description: string; amountCents: number; count: number }[];
  /** Gasto de todo mês que não é fixo: mercado, delivery, farmácia. */
  variableMonthlyCents: number;
};

/** Grava tudo que o onboarding coletou numa tacada só. */
export async function saveOnboarding(data: OnboardingData) {
  const user = await requireUser();
  const startMonth = firstDayOf(monthKeyOf(todayISO()));

  await db
    .update(settings)
    .set({
      openingBalanceCents: Math.max(0, Math.round(data.openingBalanceCents)),
      openingDate: todayISO(),
      // Sem histórico de lançamentos ainda, a estimativa automática daria
      // zero. O que a pessoa informou aqui vale como ponto de partida até
      // existir histórico suficiente pra calcular sozinho.
      variableOverrideCents:
        data.variableMonthlyCents > 0
          ? Math.round(data.variableMonthlyCents)
          : null,
    })
    .where(eq(settings.userId, user.id));

  const rows = [
    ...(data.income
      ? [
          {
            description: data.income.description || "Salário",
            amountCents: data.income.amountCents,
            kind: "income" as const,
            dayOfMonth: data.income.dayOfMonth,
            startMonth,
            endMonth: null,
          },
        ]
      : []),
    ...data.fixed.map((f) => ({
      description: f.description,
      amountCents: f.amountCents,
      kind: "expense" as const,
      dayOfMonth: f.dayOfMonth,
      startMonth,
      endMonth: null,
    })),
    ...data.installments.map((p) => ({
      description: p.description,
      amountCents: p.amountCents,
      kind: "expense" as const,
      dayOfMonth: 10,
      startMonth,
      endMonth: firstDayOf(addMonths(monthKeyOf(todayISO()), p.count - 1)),
    })),
  ]
    .filter((r) => r.amountCents > 0 && r.description.trim())
    .map((r) => ({ ...r, userId: user.id }));

  if (rows.length) await db.insert(recurrences).values(rows);

  revalidateAll();
  return { ok: true };
}
