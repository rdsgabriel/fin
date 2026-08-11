"use client";

import { useEffect, useState } from "react";

const COMUNS = [1, 5, 10, 15, 20, 25, 30];

/**
 * Dia do mês em que a conta cai.
 *
 * O jeito ingênuo (`Number(e.target.value) || 1` direto no estado) tem dois
 * defeitos: apagar o campo o faz saltar pra 1 na hora, então não dá pra
 * limpar e digitar outro dia; e nada limita o intervalo, então "125" era
 * aceito aqui e o servidor trocava por 1 sem avisar.
 *
 * Aqui o texto vive em estado próprio enquanto se digita, e só vira número
 * quando é válido. No blur, o que ficou inválido volta ao último valor bom.
 */
export function DayField({
  value,
  onChange,
  id,
}: {
  value: number;
  onChange: (dia: number) => void;
  id?: string;
}) {
  const [texto, setTexto] = useState(String(value));

  // Mantém o campo em dia quando o valor muda de fora (ex.: abrir a folha
  // de edição já preenchida).
  useEffect(() => setTexto(String(value)), [value]);

  function digitar(bruto: string) {
    const digitos = bruto.replace(/\D/g, "").slice(0, 2);
    setTexto(digitos);
    const n = Number(digitos);
    if (digitos && n >= 1 && n <= 31) onChange(n);
  }

  function sair() {
    const n = Number(texto);
    if (!texto || n < 1 || n > 31) setTexto(String(value));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto py-0.5">
        {COMUNS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            aria-pressed={value === d}
            // "Dia 5" e não "5": na mesma tela existe o teclado numérico,
            // e dois botões chamados "5" deixam leitor de tela (e teste)
            // sem saber qual é qual.
            aria-label={`Dia ${d}`}
            className={`pressable size-10 shrink-0 rounded-full text-[15px] font-semibold transition-colors ${
              value === d ? "bg-brand text-white" : "bg-fill text-ink"
            }`}
          >
            {d}
          </button>
        ))}

        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={COMUNS.includes(value) ? "" : texto}
          onChange={(e) => digitar(e.target.value)}
          onBlur={sair}
          placeholder="outro"
          aria-label="Outro dia do mês"
          className="tnum h-10 w-20 shrink-0 rounded-full bg-fill px-3 text-center text-[15px] font-semibold text-ink outline-none placeholder:text-[13px] placeholder:font-normal placeholder:text-ink-3 focus:ring-2 focus:ring-brand/40"
        />
      </div>
    </div>
  );
}
