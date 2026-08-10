/**
 * Meses são strings "YYYY-MM" e datas são strings "YYYY-MM-DD".
 * Nada de `new Date()` no meio do cálculo — fuso horário já estragou
 * projeção financeira demais neste mundo.
 */
export type MonthKey = string;

export function monthKeyOf(isoDate: string): MonthKey {
  return isoDate.slice(0, 7);
}

export function todayISO(): string {
  // Data local do usuário, não UTC.
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function addMonths(key: MonthKey, n: number): MonthKey {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const total = year * 12 + (month - 1) + n;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function firstDayOf(key: MonthKey): string {
  return `${key}-01`;
}

export function daysInMonth(key: MonthKey): number {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_LONG = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "2026-08" -> "ago/26" */
export function formatMonthShort(key: MonthKey): string {
  return `${MONTHS_SHORT[Number(key.slice(5, 7)) - 1]}/${key.slice(2, 4)}`;
}

/** "2026-08" -> "agosto de 2026" */
export function formatMonthLong(key: MonthKey): string {
  return `${MONTHS_LONG[Number(key.slice(5, 7)) - 1]} de ${key.slice(0, 4)}`;
}

/** "2026-08-15" -> "15 ago" */
export function formatDayShort(isoDate: string): string {
  return `${isoDate.slice(8, 10)} ${MONTHS_SHORT[Number(isoDate.slice(5, 7)) - 1]}`;
}

/** Quantos meses de `from` até `to`. Negativo se `to` for antes. */
export function monthsBetween(from: MonthKey, to: MonthKey): number {
  const y = (k: MonthKey) => Number(k.slice(0, 4)) * 12 + Number(k.slice(5, 7));
  return y(to) - y(from);
}
