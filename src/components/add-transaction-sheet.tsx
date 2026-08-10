"use client";

import { useActionState, useEffect, useState } from "react";
import { addTransaction } from "@/app/actions";
import type { Category } from "@/db/schema";
import { formatMoney } from "@/lib/money";
import { todayISO } from "@/lib/month";
import { CategoryChips } from "./category-chips";
import { Keypad } from "./keypad";
import { Segmented } from "./segmented";
import { Sheet } from "./sheet";

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Fluxo de dois passos: primeiro *quanto*, depois *o quê*. Separar assim
 * deixa cada tela com uma pergunta só — e o valor, que é o dado que mais
 * erra, ganha a tela inteira.
 */
export function AddTransactionSheet({
  open,
  onClose,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [digits, setDigits] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState(todayISO());
  const [state, action, pending] = useActionState(addTransaction, null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setDigits("");
      setCategoryId(null);
      setDate(todayISO());
    }
  }, [open]);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  const cents = Number(digits || "0");
  const options = categories.filter((c) => c.kind === kind);
  const today = todayISO();
  const yesterday = yesterdayISO();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={step === 1 ? "Novo lançamento" : "Detalhes"}
      leading={
        step === 2 ? (
          <button
            onClick={() => setStep(1)}
            className="pressable text-[15px] text-blue"
          >
            Voltar
          </button>
        ) : null
      }
    >
      {step === 1 ? (
        <div className="animate-step-in">
          <div className="px-4 pt-1">
            <Segmented
              value={kind}
              onChange={(k) => {
                setKind(k);
                setCategoryId(null);
              }}
              options={[
                { value: "expense", label: "Saída" },
                { value: "income", label: "Entrada" },
              ]}
            />
          </div>

          <Keypad digits={digits} onChange={setDigits} tone={kind} />

          <div className="p-4">
            <button
              onClick={() => setStep(2)}
              disabled={cents === 0}
              className="pressable w-full rounded-[14px] bg-blue py-3.5 text-[17px] font-semibold text-white disabled:opacity-30"
            >
              Continuar
            </button>
          </div>
        </div>
      ) : (
        <form action={action} className="animate-step-in">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="amountCents" value={cents} />
          <input type="hidden" name="date" value={date} />

          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex w-full flex-col items-center gap-0.5 py-5"
          >
            <span className="text-[13px] text-label-2">
              {kind === "income" ? "Entrada" : "Saída"}
            </span>
            <span
              className={`display text-[38px] font-semibold ${
                kind === "income" ? "text-green" : "text-label"
              }`}
            >
              {formatMoney(cents)}
            </span>
          </button>

          <div className="flex flex-col gap-5 px-4 pb-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="tx-desc"
                className="text-[13px] font-medium text-label-2"
              >
                No que foi?
              </label>
              <input
                id="tx-desc"
                name="description"
                required
                maxLength={80}
                autoFocus
                autoComplete="off"
                placeholder={kind === "expense" ? "Mercado da esquina" : "Salário"}
                className="w-full rounded-[12px] bg-fill px-3.5 py-3 text-[17px] text-label outline-none placeholder:text-label-3 focus:ring-2 focus:ring-blue/50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-label-2">
                Categoria
              </span>
              <CategoryChips
                categories={options}
                value={categoryId}
                onChange={setCategoryId}
                name="categoryId"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-label-2">Quando</span>
              <div className="flex gap-2">
                {[
                  { value: today, label: "Hoje" },
                  { value: yesterday, label: "Ontem" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDate(opt.value)}
                    className={`pressable rounded-full px-4 py-2 text-[14px] font-medium ${
                      date === opt.value
                        ? "bg-blue text-white"
                        : "bg-fill text-label"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value || today)}
                  aria-label="Outra data"
                  className="flex-1 rounded-full bg-fill px-4 py-2 text-[14px] text-label outline-none"
                />
              </div>
            </div>

            {state?.error ? (
              <p className="text-[13px] text-red">{state.error}</p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="pressable w-full rounded-[14px] bg-blue py-3.5 text-[17px] font-semibold text-white disabled:opacity-40"
            >
              {pending ? "Salvando…" : "Lançar"}
            </button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
