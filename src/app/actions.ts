"use server";

import { revalidatePath } from "next/cache";
import { eq, not } from "drizzle-orm";
import { db, categories, recurrences, settings, transactions } from "@/db";
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

function readCategoryId(value: FormDataEntryValue | null): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function addTransaction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const amountCents = readAmountCents(formData);
  const description = String(formData.get("description") ?? "").trim();

  if (!amountCents || !description) {
    return { error: "Preencha a descrição e um valor válido." };
  }

  await db.insert(transactions).values({
    description,
    amountCents,
    kind: readKind(formData.get("kind")),
    categoryId: readCategoryId(formData.get("categoryId")),
    date: String(formData.get("date") ?? "") || todayISO(),
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteTransaction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    await db.delete(transactions).where(eq(transactions.id, id));
    revalidateAll();
  }
}

export async function addRecurrence(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const amountCents = readAmountCents(formData);
  const description = String(formData.get("description") ?? "").trim();

  if (!amountCents || !description) {
    return { error: "Preencha a descrição e um valor válido." };
  }

  const startMonth = String(formData.get("startMonth") ?? "") || monthKeyOf(todayISO());

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
    description,
    amountCents,
    kind: readKind(formData.get("kind")),
    categoryId: readCategoryId(formData.get("categoryId")),
    dayOfMonth: Number.isInteger(day) && day >= 1 && day <= 31 ? day : 1,
    startMonth: firstDayOf(startMonth),
    endMonth,
  });

  revalidateAll();
  return { ok: true };
}

export async function toggleRecurrence(formData: FormData) {
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    await db
      .update(recurrences)
      .set({ active: not(recurrences.active) })
      .where(eq(recurrences.id, id));
    revalidateAll();
  }
}

export async function deleteRecurrence(formData: FormData) {
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    await db.delete(recurrences).where(eq(recurrences.id, id));
    revalidateAll();
  }
}

export async function updateSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
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
    .where(eq(settings.id, 1));

  revalidateAll();
  return { ok: true };
}

export async function addCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Dê um nome à categoria." };

  await db.insert(categories).values({
    name,
    kind: readKind(formData.get("kind")),
    color: String(formData.get("color") ?? "#8E8E93"),
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteCategory(formData: FormData) {
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    await db.delete(categories).where(eq(categories.id, id));
    revalidateAll();
  }
}
