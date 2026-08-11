"use client";

import { formatMoney } from "@/lib/money";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "⌫"];

/**
 * Teclado de valor. Os dígitos entram sempre pela direita, em centavos —
 * digitar 1, 5, 0 vira R$ 1,50 sem você tocar em vírgula nenhuma. É como
 * Wallet e Cash App fazem, e elimina o erro de digitar o separador errado.
 */
export function Keypad({
  digits,
  onChange,
  tone = "expense",
}: {
  digits: string;
  onChange: (digits: string) => void;
  tone?: "expense" | "income";
}) {
  const cents = Number(digits || "0");

  function press(key: string) {
    if (key === "⌫") {
      onChange(digits.slice(0, -1));
      return;
    }
    const next = (digits + key).replace(/^0+/, "");
    // Teto de R$ 99.999.999,99 — segura dedo pesado sem estourar o integer.
    if (next.length > 10) return;
    onChange(next);

    if ("vibrate" in navigator) navigator.vibrate?.(8);
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col items-center gap-1 px-6 py-7">
        <span className="text-[13px] font-medium text-ink-2">
          {tone === "income" ? "Entrada" : "Saída"}
        </span>
        <span
          className={`display text-[52px] font-semibold transition-colors ${
            cents === 0
              ? "text-ink-3"
              : tone === "income"
                ? "text-pos"
                : "text-ink"
          }`}
        >
          {formatMoney(cents)}
        </span>
      </div>

      {/* Teclas sem moldura: só o toque acende um círculo. Grade com linhas
          faria o teclado parecer uma planilha. */}
      <div className="grid grid-cols-3 gap-1 px-3">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            aria-label={key === "⌫" ? "Apagar" : key}
            className="pressable rounded-[18px] py-3.5 text-[27px] font-normal text-ink transition-colors active:bg-fill-2"
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}
