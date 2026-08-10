"use client";

import { useActionState, useEffect, useState } from "react";
import { addRecurrence } from "@/app/actions";
import type { Category } from "@/db/schema";
import { formatMoney } from "@/lib/money";
import { addMonths, formatMonthLong, monthKeyOf, todayISO } from "@/lib/month";
import { CategoryChips } from "./category-chips";
import { Keypad } from "./keypad";
import { Segmented } from "./segmented";
import { Sheet } from "./sheet";

export function AddRecurrenceSheet({
  open,
  onClose,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
}) {
  const thisMonth = monthKeyOf(todayISO());

  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [mode, setMode] = useState<"sempre" | "parcelado">("sempre");
  const [digits, setDigits] = useState("");
  const [installments, setInstallments] = useState(12);
  const [dayOfMonth, setDayOfMonth] = useState(5);
  const [startMonth, setStartMonth] = useState(thisMonth);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [state, action, pending] = useActionState(addRecurrence, null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setDigits("");
      setMode("sempre");
      setInstallments(12);
      setCategoryId(null);
      setStartMonth(thisMonth);
    }
  }, [open, thisMonth]);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  const cents = Number(digits || "0");
  const options = categories.filter((c) => c.kind === kind);
  const lastMonth =
    mode === "parcelado" ? addMonths(startMonth, installments - 1) : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={step === 1 ? "Novo fixo" : "Como se repete"}
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
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="installments" value={installments} />
          <input type="hidden" name="startMonth" value={startMonth} />
          <input type="hidden" name="dayOfMonth" value={dayOfMonth} />

          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex w-full flex-col items-center gap-0.5 py-5"
          >
            <span className="text-[13px] text-label-2">
              {mode === "parcelado" ? "Por parcela" : "Por mês"}
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
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: "sempre", label: "Todo mês" },
                { value: "parcelado", label: "Parcelado" },
              ]}
            />

            <div className="flex flex-col gap-2">
              <label
                htmlFor="rec-desc"
                className="text-[13px] font-medium text-label-2"
              >
                O que é?
              </label>
              <input
                id="rec-desc"
                name="description"
                required
                maxLength={80}
                autoFocus
                autoComplete="off"
                placeholder={
                  mode === "parcelado"
                    ? "Sofá da sala"
                    : kind === "expense"
                      ? "Aluguel"
                      : "Salário"
                }
                className="w-full rounded-[12px] bg-fill px-3.5 py-3 text-[17px] text-label outline-none placeholder:text-label-3 focus:ring-2 focus:ring-blue/50"
              />
            </div>

            {mode === "parcelado" ? (
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-label-2">
                  Parcelas restantes
                </span>
                <div className="no-scrollbar flex gap-2 overflow-x-auto py-1">
                  {[2, 3, 4, 6, 10, 12, 18, 24, 36, 48].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setInstallments(n)}
                      className={`pressable size-11 shrink-0 rounded-full text-[15px] font-semibold ${
                        installments === n
                          ? "bg-blue text-white"
                          : "bg-fill text-label"
                      }`}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
                {lastMonth ? (
                  <p className="rounded-[12px] bg-green/12 px-3.5 py-3 text-[13px] leading-snug text-green">
                    Total de {formatMoney(cents * installments)}. A última cai em{" "}
                    <strong className="font-semibold">
                      {formatMonthLong(lastMonth)}
                    </strong>{" "}
                    — do mês seguinte em diante esses {formatMoney(cents)} voltam
                    a sobrar.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-label-2">
                  {mode === "parcelado" ? "Primeira em" : "Começa em"}
                </span>
                <input
                  type="month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value || thisMonth)}
                  className="rounded-[12px] bg-fill px-3.5 py-3 text-[15px] text-label outline-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-label-2">
                  Dia do mês
                </span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Number(e.target.value) || 1)}
                  className="rounded-[12px] bg-fill px-3.5 py-3 text-[15px] text-label outline-none"
                />
              </div>
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

            {state?.error ? (
              <p className="text-[13px] text-red">{state.error}</p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="pressable w-full rounded-[14px] bg-blue py-3.5 text-[17px] font-semibold text-white disabled:opacity-40"
            >
              {pending ? "Salvando…" : "Adicionar"}
            </button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
