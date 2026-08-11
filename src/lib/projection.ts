import type { Goal, Recurrence, Settings, Transaction } from "@/db/schema";
import {
  addMonths,
  daysInMonth,
  formatMonthLong,
  formatMonthShort,
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
  /** Quanto já foi gasto de variável no mês corrente (fora os fixos). */
  variableSpentThisMonth: number;
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

  // Gasto variável já realizado no mês: tudo que saiu menos os fixos que
  // já venceram. Mesma lógica de estimateVariable, pra não contar em dobro.
  const gastoDoMes = transactions
    .filter((t) => t.kind === "expense" && monthKeyOf(t.date) === currentMonth)
    .reduce((s, t) => s + t.amountCents, 0);
  const fixosVencidos = recurrences
    .filter(
      (r) =>
        r.kind === "expense" &&
        activeIn(r, currentMonth) &&
        r.dayOfMonth <= todayDay,
    )
    .reduce((s, r) => s + r.amountCents, 0);

  return {
    currentBalance,
    monthlyIncome,
    monthlyFixed,
    monthlyNet: monthlyIncome - monthlyFixed - variableMonthly,
    variableMonthly,
    variableSource,
    variableSpentThisMonth: Math.max(0, gastoDoMes - fixosVencidos),
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

/* ------------------------------------------------------------------
   Metas.
   Guardar não é gastar: o dinheiro separado continua no saldo, só muda
   de bolso. Então nada aqui entra no cálculo da projeção — a meta apenas
   lê a curva que já existe e responde "quando eu chego lá?".
   ------------------------------------------------------------------ */

export type GoalProgress = {
  goal: Goal;
  /** Já tem o valor hoje. */
  jaAlcancada: boolean;
  /** Mês em que a projeção cruza o alvo, ou null se não cruza no horizonte. */
  mesAlcance: MonthKey | null;
  mesesAte: number | null;
  /** Quanto o saldo de hoje representa do alvo (0 a 1). */
  progresso: number;
  /** Se há prazo e o ritmo atual não chega nele: quanto falta guardar por mês. */
  faltaPorMes: number | null;
  /** Prazo definido e a projeção não alcança a tempo. */
  atrasada: boolean;
};

export function evaluateGoals(
  projection: Projection,
  goals: Goal[],
): GoalProgress[] {
  return goals
    .map((goal): GoalProgress => {
      const jaAlcancada = projection.currentBalance >= goal.targetCents;
      const indice = projection.months.findIndex(
        (m) => m.endBalance >= goal.targetCents,
      );
      const mesAlcance = indice === -1 ? null : projection.months[indice].month;

      let faltaPorMes: number | null = null;
      let atrasada = false;

      if (goal.deadline && !jaAlcancada) {
        const prazo = monthKeyOf(goal.deadline);
        const mesesRestantes = monthsBetween(
          projection.months[0]?.month ?? prazo,
          prazo,
        );
        atrasada = mesAlcance === null || mesAlcance > prazo;

        if (atrasada && mesesRestantes > 0) {
          // Parte do saldo PROJETADO no mês do prazo, não do saldo de hoje
          // mais N vezes a sobra: o mês corrente é parcial e pode até cair,
          // e há parcelas que terminam no meio do caminho. Extrapolar do
          // saldo de hoje daria um número que não fecha com a própria curva.
          const noPrazo = projection.months.find((m) => m.month === prazo);
          const saldoNoPrazo = noPrazo
            ? noPrazo.endBalance
            : (projection.months.at(-1)?.endBalance ?? projection.currentBalance);

          const buraco = goal.targetCents - saldoNoPrazo;
          faltaPorMes =
            buraco > 0 ? Math.ceil(buraco / mesesRestantes) : null;
        }
      }

      return {
        goal,
        jaAlcancada,
        mesAlcance,
        mesesAte: indice === -1 ? null : indice,
        progresso: Math.min(
          1,
          Math.max(0, projection.currentBalance / goal.targetCents),
        ),
        faltaPorMes,
        atrasada,
      };
    })
    // A meta mais próxima de ser batida primeiro: é a que move o ponteiro.
    .sort((a, b) => a.goal.targetCents - b.goal.targetCents);
}

/** Total que a pessoa se comprometeu a separar por mês, somando as metas. */
export function totalAporte(goals: Goal[]): number {
  return goals.reduce((soma, g) => soma + g.monthlyCents, 0);
}

export type Orcamento = {
  /** Entradas − fixos − aporte: o teto de gasto livre do mês. */
  teto: number;
  gasto: number;
  /** O número que importa: quanto ainda dá pra gastar sem atrasar as metas. */
  livre: number;
  aporte: number;
  /** O aporte prometido não cabe no que sobra depois dos fixos. */
  aporteInviavel: boolean;
};

/**
 * "Guardar antes" na prática.
 *
 * O que funciona não é guardar o que sobra, é separar primeiro e viver com o
 * resto. Então o aporte das metas sai do teto ANTES de calcular quanto você
 * pode gastar — e o saldo projetado não muda nada com isso, porque o dinheiro
 * guardado continua sendo seu. Muda a pergunta que a tela responde: de
 * "quanto eu tenho?" para "quanto eu posso gastar sem me sabotar?".
 */
export function calcularOrcamento(
  projection: Projection,
  aporte: number,
): Orcamento {
  const teto = projection.monthlyIncome - projection.monthlyFixed - aporte;
  return {
    teto,
    gasto: projection.variableSpentThisMonth,
    livre: teto - projection.variableSpentThisMonth,
    aporte,
    aporteInviavel:
      projection.monthlyIncome - projection.monthlyFixed < aporte,
  };
}

/* ------------------------------------------------------------------
   A narrativa.
   Uma tabela de saldos é um relatório; ninguém lê relatório sobre a
   própria vida. O que prende é a sequência de acontecimentos: hoje você
   está aqui, em dezembro isso acaba, em março sobra mais, em julho você
   chega ali. Abaixo os pontos de virada da projeção viram capítulos.
   ------------------------------------------------------------------ */

export type StoryEvent = {
  id: string;
  month: MonthKey | null;
  label: string;
  title: string;
  detail: string;
  balance: number;
  tone: "neutral" | "pos" | "neg";
};

export function buildStory(
  projection: Projection,
  metas: GoalProgress[] = [],
): StoryEvent[] {
  const events: StoryEvent[] = [];

  // A meta batida é o melhor capítulo da história — entra na linha do tempo
  // junto com as parcelas que quitam.
  for (const m of metas) {
    if (m.jaAlcancada || !m.mesAlcance) continue;
    events.push({
      id: `meta-${m.goal.id}`,
      month: m.mesAlcance,
      label: formatMonthShort(m.mesAlcance),
      title: `${m.goal.name} ✓`,
      detail: `Você passa de ${money(m.goal.targetCents)} — a meta está batida.`,
      balance: m.goal.targetCents,
      tone: "pos",
    });
  }

  events.push({
    id: "hoje",
    month: null,
    label: "hoje",
    title: "Você está aqui",
    detail:
      projection.monthlyNet >= 0
        ? `Sobrando ${money(projection.monthlyNet)} por mês.`
        : `Faltando ${money(-projection.monthlyNet)} por mês.`,
    balance: projection.currentBalance,
    tone: "neutral",
  });

  // Primeira vez que o saldo fura o zero — o ponto de virada mais importante.
  const negative = projection.months.find((m) => m.endBalance < 0);
  if (negative) {
    events.push({
      id: `neg-${negative.month}`,
      month: negative.month,
      label: formatMonthShort(negative.month),
      title: "O saldo vira negativo",
      detail: "Daqui pra frente você entra no vermelho se nada mudar.",
      balance: negative.endBalance,
      tone: "neg",
    });
  }

  // Cada parcela que acaba libera dinheiro todo mês — é a boa notícia
  // que uma planilha comum nunca te conta na hora certa.
  for (const m of projection.months) {
    for (const r of m.ending) {
      if (r.kind !== "expense") continue;
      events.push({
        id: `fim-${r.id}`,
        month: m.month,
        label: formatMonthShort(m.month),
        title: `${r.description} quitado`,
        detail: `Libera ${money(r.amountCents)} todo mês a partir daqui.`,
        balance: m.endBalance,
        tone: "pos",
      });
    }
  }

  // Reserva de emergência: três meses de custo de vida.
  const monthlyCost = projection.monthlyFixed + projection.variableMonthly;
  if (monthlyCost > 0 && projection.currentBalance < monthlyCost * 3) {
    const hit = projection.months.find((m) => m.endBalance >= monthlyCost * 3);
    if (hit) {
      events.push({
        id: `reserva-${hit.month}`,
        month: hit.month,
        label: formatMonthShort(hit.month),
        title: "Reserva de 3 meses",
        detail: `Você passa de ${money(monthlyCost * 3)} — o bastante pra viver 3 meses sem renda.`,
        balance: hit.endBalance,
        tone: "pos",
      });
    }
  }

  const last = projection.months.at(-1);
  if (last) {
    events.push({
      id: `fim-${last.month}`,
      month: last.month,
      label: formatMonthShort(last.month),
      title: `Em ${formatMonthLong(last.month)}`,
      detail:
        last.endBalance >= projection.currentBalance
          ? `${money(last.endBalance - projection.currentBalance)} a mais do que hoje.`
          : `${money(projection.currentBalance - last.endBalance)} a menos do que hoje.`,
      balance: last.endBalance,
      tone: last.endBalance < 0 ? "neg" : "pos",
    });
  }

  // Ordena pela linha do tempo, sem repetir o mesmo mês duas vezes à toa.
  const order = (e: StoryEvent) => (e.month === null ? "0000-00" : e.month);
  return events.sort((a, b) => order(a).localeCompare(order(b)));
}

function money(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export { monthsBetween };
