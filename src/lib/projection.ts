import type { Recurrence, Settings, Transaction } from "@/db/schema";
import {
  addMonths,
  daysInMonth,
  formatMonthLong,
  monthKeyOf,
  monthsBetween,
  todayISO,
  type MonthKey,
} from "./month";

export type ProjectedMonth = {
  month: MonthKey;
  /** O mês corrente é parcial: só conta o que ainda não venceu. */
  partial: boolean;
  income: number;
  fixedExpense: number;
  variableExpense: number;
  net: number;
  endBalance: number;
  /** Recorrências cuja última parcela cai neste mês. */
  ending: Recurrence[];
};

export type VariableSource = "manual" | "historico" | "sem-dados";

export type Alert =
  | { type: "negativo"; month: MonthKey; balance: number }
  | { type: "aperto"; month: MonthKey; balance: number }
  | { type: "folga"; month: MonthKey; amount: number; label: string }
  | { type: "tranquilo"; month: MonthKey; balance: number };

export type Projection = {
  currentBalance: number;
  /** Entradas − saídas de um mês cheio, no ritmo de hoje. */
  monthlyNet: number;
  monthlyIncome: number;
  monthlyFixed: number;
  variableMonthly: number;
  variableSource: VariableSource;
  months: ProjectedMonth[];
  alerts: Alert[];
};

function activeIn(r: Recurrence, month: MonthKey): boolean {
  if (!r.active) return false;
  if (monthKeyOf(r.startMonth) > month) return false;
  if (r.endMonth && monthKeyOf(r.endMonth) < month) return false;
  return true;
}

function endsIn(r: Recurrence, month: MonthKey): boolean {
  return r.active && !!r.endMonth && monthKeyOf(r.endMonth) === month;
}

/**
 * Estima o gasto variável mensal — o que não é fixo nem parcelado, tipo
 * mercado, iFood, farmácia. Sai da média dos últimos meses fechados,
 * descontando o que já está contabilizado como recorrência naqueles meses
 * (senão o fixo entraria duas vezes na projeção).
 */
function estimateVariable(
  transactions: Transaction[],
  recurrences: Recurrence[],
  currentMonth: MonthKey,
  lookback: number,
): { amount: number; source: VariableSource } {
  const months: MonthKey[] = [];
  for (let i = lookback; i >= 1; i--) months.push(addMonths(currentMonth, -i));

  const spentByMonth = new Map<MonthKey, number>(months.map((m) => [m, 0]));
  let sawAny = false;

  for (const t of transactions) {
    if (t.kind !== "expense") continue;
    const m = monthKeyOf(t.date);
    if (!spentByMonth.has(m)) continue;
    spentByMonth.set(m, spentByMonth.get(m)! + t.amountCents);
    sawAny = true;
  }

  if (!sawAny) return { amount: 0, source: "sem-dados" };

  let total = 0;
  for (const m of months) {
    const fixed = recurrences
      .filter((r) => r.kind === "expense" && activeIn(r, m))
      .reduce((sum, r) => sum + r.amountCents, 0);
    total += Math.max(0, spentByMonth.get(m)! - fixed);
  }

  return { amount: Math.round(total / months.length), source: "historico" };
}

export function buildProjection(input: {
  settings: Settings;
  transactions: Transaction[];
  recurrences: Recurrence[];
  horizonMonths?: number;
  today?: string;
}): Projection {
  const { settings, transactions, recurrences } = input;
  const today = input.today ?? todayISO();
  const currentMonth = monthKeyOf(today);
  const todayDay = Number(today.slice(8, 10));
  const horizon = input.horizonMonths ?? settings.horizonMonths;

  // Saldo de hoje: ponto de partida + tudo que já foi lançado desde então.
  let currentBalance = settings.openingBalanceCents;
  for (const t of transactions) {
    if (t.date < settings.openingDate || t.date > today) continue;
    currentBalance += t.kind === "income" ? t.amountCents : -t.amountCents;
  }

  const estimate = estimateVariable(
    transactions,
    recurrences,
    currentMonth,
    settings.lookbackMonths,
  );
  const variableMonthly = settings.variableOverrideCents ?? estimate.amount;
  const variableSource: VariableSource =
    settings.variableOverrideCents != null ? "manual" : estimate.source;

  const months: ProjectedMonth[] = [];
  let balance = currentBalance;

  for (let i = 0; i < horizon; i++) {
    const month = addMonths(currentMonth, i);
    const partial = i === 0;
    const active = recurrences.filter((r) => activeIn(r, month));

    // No mês corrente só olhamos pra frente: o que já venceu presume-se
    // que virou lançamento e portanto já está no saldo.
    const pending = partial
      ? active.filter((r) => r.dayOfMonth > todayDay)
      : active;

    const income = pending
      .filter((r) => r.kind === "income")
      .reduce((s, r) => s + r.amountCents, 0);
    const fixedExpense = pending
      .filter((r) => r.kind === "expense")
      .reduce((s, r) => s + r.amountCents, 0);

    const total = daysInMonth(month);
    const remaining = partial ? Math.max(0, total - todayDay) : total;
    const variableExpense = Math.round((variableMonthly * remaining) / total);

    const net = income - fixedExpense - variableExpense;
    balance += net;

    months.push({
      month,
      partial,
      income,
      fixedExpense,
      variableExpense,
      net,
      endBalance: balance,
      ending: active.filter((r) => endsIn(r, month)),
    });
  }

  // Números de "mês cheio", que é o que a pessoa quer ver como ritmo atual.
  const nextMonth = addMonths(currentMonth, 1);
  const activeNext = recurrences.filter((r) => activeIn(r, nextMonth));
  const monthlyIncome = activeNext
    .filter((r) => r.kind === "income")
    .reduce((s, r) => s + r.amountCents, 0);
  const monthlyFixed = activeNext
    .filter((r) => r.kind === "expense")
    .reduce((s, r) => s + r.amountCents, 0);

  return {
    currentBalance,
    monthlyIncome,
    monthlyFixed,
    monthlyNet: monthlyIncome - monthlyFixed - variableMonthly,
    variableMonthly,
    variableSource,
    months,
    alerts: buildAlerts(months, variableMonthly),
  };
}

function buildAlerts(months: ProjectedMonth[], variableMonthly: number): Alert[] {
  const alerts: Alert[] = [];

  const negative = months.find((m) => m.endBalance < 0);
  if (negative) {
    alerts.push({ type: "negativo", month: negative.month, balance: negative.endBalance });
  } else {
    // "Aperto" = cai abaixo de um mês de gasto variável de folga.
    const tight = months.find((m) => m.endBalance < variableMonthly && variableMonthly > 0);
    if (tight) {
      alerts.push({ type: "aperto", month: tight.month, balance: tight.endBalance });
    }
  }

  // Parcela acabando é a melhor notícia que um app de finanças pode dar.
  for (const m of months) {
    for (const r of m.ending) {
      if (r.kind !== "expense") continue;
      alerts.push({
        type: "folga",
        month: m.month,
        amount: r.amountCents,
        label: r.description,
      });
    }
  }

  const last = months.at(-1);
  if (last && !negative && last.endBalance > 0) {
    alerts.push({ type: "tranquilo", month: last.month, balance: last.endBalance });
  }

  return alerts.slice(0, 5);
}

export function describeAlert(alert: Alert): { title: string; body: string; tone: "danger" | "warning" | "good" } {
  switch (alert.type) {
    case "negativo":
      return {
        tone: "danger",
        title: `Seu saldo fica negativo em ${formatMonthLong(alert.month)}`,
        body: "No ritmo atual, as saídas passam das entradas antes disso. Dá pra corrigir cortando um fixo ou aumentando a entrada.",
      };
    case "aperto":
      return {
        tone: "warning",
        title: `Aperto à vista em ${formatMonthLong(alert.month)}`,
        body: "O saldo cai abaixo de um mês de gastos variáveis. Ainda no azul, mas sem colchão pra imprevisto.",
      };
    case "folga":
      return {
        tone: "good",
        title: `"${alert.label}" termina em ${formatMonthLong(alert.month)}`,
        body: "A partir do mês seguinte esse valor sobra todo mês. Bom momento pra já direcionar pra reserva.",
      };
    case "tranquilo":
      return {
        tone: "good",
        title: "Sua projeção fecha no azul",
        body: `Mantendo o ritmo de hoje, você chega em ${formatMonthLong(alert.month)} positivo.`,
      };
  }
}

/** Em quantos meses o saldo projetado alcança um alvo. null se não alcança. */
export function monthsUntil(projection: Projection, targetCents: number): number | null {
  const hit = projection.months.findIndex((m) => m.endBalance >= targetCents);
  return hit === -1 ? null : hit;
}

export { monthsBetween };
