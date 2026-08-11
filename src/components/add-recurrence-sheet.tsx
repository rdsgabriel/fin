"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addRecurrence, updateRecurrence } from "@/app/actions";
import type { Category, Recurrence } from "@/db/schema";
import { formatMoney } from "@/lib/money";
import {
  addMonths,
  formatMonthLong,
  monthKeyOf,
  monthsBetween,
  todayISO,
} from "@/lib/month";
import { CategoryChips } from "./category-chips";
import { DayField } from "./day-field";
import { Keypad } from "./keypad";
import { Segmented } from "./segmented";
import { Sheet } from "./sheet";

export function AddRecurrenceSheet({
  open,
  onClose,
  categories,
  editando,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  /** Quando presente, a folha edita esse fixo em vez de criar um novo. */
  editando?: Recurrence | null;
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
  const [clt, setClt] = useState(false);
  const [ferias, setFerias] = useState<number | null>(null);
  const [state, action, pending] = useActionState(
    editando ? updateRecurrence : addRecurrence,
    null,
  );

  useEffect(() => {
    if (!open) return;

    if (editando) {
      // Editando: já abre no passo dos detalhes, com tudo preenchido. O
      // teclado fica a um toque no valor, se for só reajustar.
      const fim = editando.endMonth ? monthKeyOf(editando.endMonth) : null;
      const inicio = monthKeyOf(editando.startMonth);
      setStep(2);
      setKind(editando.kind);
      setDigits(String(editando.amountCents));
      setMode(fim ? "parcelado" : "sempre");
      setInstallments(fim ? monthsBetween(inicio, fim) + 1 : 12);
      setDayOfMonth(editando.dayOfMonth);
      setStartMonth(inicio);
      setCategoryId(editando.categoryId);
      setClt(editando.thirteenth);
      setFerias(editando.vacationMonth);
      return;
    }

    setStep(1);
    setKind("expense");
    setDigits("");
    setMode("sempre");
    setInstallments(12);
    setDayOfMonth(5);
    setCategoryId(null);
    setClt(false);
    setFerias(null);
    setStartMonth(thisMonth);
  }, [open, thisMonth, editando]);

  /* Fecha só quando o estado MUDA pra ok.
     `onClose` é uma arrow inline lá no nav, então muda de identidade a cada
     render e faz este efeito rodar de novo. Como `state.ok` continua true
     depois de um envio, a folha se fechava sozinha ao ser reaberta: dava pra
     lançar uma vez e depois nada mais abria sem recarregar a página.
     Comparar a identidade do estado resolve, porque useActionState devolve
     um objeto novo a cada submissão. */
  const estadoVisto = useRef(state);
  useEffect(() => {
    if (state === estadoVisto.current) return;
    estadoVisto.current = state;
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
      title={
        editando
          ? "Editar"
          : step === 1
            ? "Novo fixo ou parcela"
            : mode === "parcelado"
              ? "Detalhes da parcela"
              : "Detalhes do fixo"
      }
      leading={
        step === 2 && !editando ? (
          <button
            onClick={() => setStep(1)}
            className="pressable text-[15px] text-brand"
          >
            Voltar
          </button>
        ) : null
      }
    >
      {step === 1 ? (
        <div className="animate-step-in">
          {/* As duas escolhas ficam logo na abertura. Antes "Parcelado"
              morava no segundo passo, e quem queria lançar um parcelamento
              simplesmente não achava. */}
          <div className="flex flex-col gap-2 px-4 pt-1">
            <Segmented
              value={kind}
              onChange={(k) => {
                setKind(k);
                setCategoryId(null);
                if (k === "income") setMode("sempre");
              }}
              options={[
                { value: "expense", label: "Saída" },
                { value: "income", label: "Entrada" },
              ]}
            />
            {kind === "expense" ? (
              <Segmented
                value={mode}
                onChange={setMode}
                options={[
                  { value: "sempre", label: "Todo mês" },
                  { value: "parcelado", label: "Parcelado" },
                ]}
              />
            ) : null}
          </div>

          <Keypad digits={digits} onChange={setDigits} tone={kind} />

          <div className="p-4">
            <button
              onClick={() => setStep(2)}
              disabled={cents === 0}
              className="pressable w-full rounded-[14px] bg-brand py-3.5 text-[17px] font-semibold text-white disabled:opacity-30"
            >
              Continuar
            </button>
          </div>
        </div>
      ) : (
        <form action={action} className="animate-step-in">
          {editando ? (
            <input type="hidden" name="id" value={editando.id} />
          ) : null}
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="amountCents" value={cents} />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="installments" value={installments} />
          <input type="hidden" name="startMonth" value={startMonth} />
          <input type="hidden" name="dayOfMonth" value={dayOfMonth} />
          <input type="hidden" name="thirteenth" value={clt ? "1" : ""} />
          <input type="hidden" name="vacationMonth" value={ferias ?? ""} />

          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex w-full flex-col items-center gap-0.5 py-5"
          >
            <span className="text-[13px] text-ink-2">
              {mode === "parcelado" ? "Por parcela" : "Por mês"}
            </span>
            <span
              className={`display text-[38px] font-semibold ${
                kind === "income" ? "text-pos" : "text-ink"
              }`}
            >
              {formatMoney(cents)}
            </span>
          </button>

          <div className="flex flex-col gap-5 px-4 pb-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="rec-desc"
                className="text-[13px] font-medium text-ink-2"
              >
                O que é?
              </label>
              <input
                id="rec-desc"
                name="description"
                required
                maxLength={80}
                defaultValue={editando?.description ?? ""}
                autoFocus={!editando}
                autoComplete="off"
                placeholder={
                  mode === "parcelado"
                    ? "Sofá da sala"
                    : kind === "expense"
                      ? "Aluguel"
                      : "Salário"
                }
                className="w-full rounded-[12px] bg-fill px-3.5 py-3 text-[17px] text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-brand/40"
              />
            </div>

            {mode === "parcelado" ? (
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-ink-2">
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
                          ? "bg-brand text-white"
                          : "bg-fill text-ink"
                      }`}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
                {lastMonth ? (
                  <p className="rounded-[12px] bg-pos/12 px-3.5 py-3 text-[13px] leading-snug text-pos">
                    Total de {formatMoney(cents * installments)}. A última cai em{" "}
                    <strong className="font-semibold">
                      {formatMonthLong(lastMonth)}
                    </strong>{" "}
                    . Do mês seguinte em diante esses {formatMoney(cents)} voltam
                    a sobrar.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-ink-2">
                {mode === "parcelado" ? "Primeira parcela em" : "Começa em"}
              </span>
              <input
                type="month"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value || thisMonth)}
                className="rounded-[12px] bg-fill px-3.5 py-3 text-[15px] text-ink outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-ink-2">
                {kind === "income" ? "Cai todo dia" : "Vence todo dia"}{" "}
                <strong className="font-semibold text-ink">{dayOfMonth}</strong>
              </span>
              <DayField value={dayOfMonth} onChange={setDayOfMonth} />
            </div>

            {kind === "income" && mode === "sempre" ? (
              <CltFields
                clt={clt}
                setClt={setClt}
                ferias={ferias}
                setFerias={setFerias}
              />
            ) : null}

            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-ink-2">
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
              <p className="text-[13px] text-neg">{state.error}</p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="pressable w-full rounded-[14px] bg-brand py-3.5 text-[17px] font-semibold text-white disabled:opacity-40"
            >
              {pending ? "Salvando…" : editando ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </form>
      )}
    </Sheet>
  );
}

const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

/** 13º e adicional de 1/3 das férias — só faz sentido em entrada recorrente. */
function CltFields({
  clt,
  setClt,
  ferias,
  setFerias,
}: {
  clt: boolean;
  setClt: (v: boolean) => void;
  ferias: number | null;
  setFerias: (v: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={clt}
          onChange={(e) => setClt(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
        />
        <span>
          <span className="text-[15px] font-medium">É CLT</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">
            Conta 13º (metade em nov, metade em dez) e o adicional de 1/3 das
            férias.
          </span>
        </span>
      </label>

      {clt ? (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-2">
            Mês das férias
          </span>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto py-0.5">
            {MESES.map((m, i) => (
              <button
                key={m}
                type="button"
                onClick={() => setFerias(ferias === i + 1 ? null : i + 1)}
                aria-pressed={ferias === i + 1}
                className={`pressable shrink-0 rounded-full px-3 py-2 text-[13px] font-semibold transition-colors ${
                  ferias === i + 1 ? "bg-brand text-white" : "bg-fill text-ink-2"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
