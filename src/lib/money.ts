const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const BRL_COMPACT = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 123456 -> "R$ 1.234,56" */
export function formatMoney(cents: number): string {
  return BRL.format(cents / 100);
}

/** 123456 -> "R$ 1,2 mil". Para eixos de gráfico, onde espaço é curto. */
export function formatMoneyCompact(cents: number): string {
  return BRL_COMPACT.format(cents / 100);
}

/** 0.105 -> "10,5% a.a." Corta o decimal quando é redondo. */
export function formatRate(annual: number): string {
  const pct = annual * 100;
  const texto = Number.isInteger(pct)
    ? String(pct)
    : pct.toFixed(2).replace(/0$/, "").replace(".", ",");
  return `${texto}% a.a.`;
}

/** Sempre com sinal explícito: "+R$ 500,00" / "−R$ 500,00" */
export function formatSigned(cents: number): string {
  const sign = cents < 0 ? "−" : "+";
  return `${sign}${BRL.format(Math.abs(cents) / 100)}`;
}

/**
 * Aceita o que o usuário realmente digita: "1.234,56", "1234,56", "1234.56",
 * "R$ 89", "89". Devolve centavos como inteiro positivo, ou null se não der.
 */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return null;

  const lastDot = cleaned.lastIndexOf(".");
  let normalized: string;

  if (cleaned.includes(",")) {
    // Tem vírgula: ela é o decimal e todo ponto é separador de milhar.
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot !== -1 && cleaned.length - lastDot - 1 === 3) {
    // "1.234" — três dígitos depois do ponto, então é milhar.
    normalized = cleaned.replace(/\./g, "");
  } else {
    // "1234.56", "1.5" ou "89" — o ponto, se houver, é decimal.
    normalized = cleaned;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  return Math.round(Math.abs(value) * 100);
}
