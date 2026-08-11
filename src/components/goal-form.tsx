"use client";

import { useActionState, useEffect, useRef } from "react";
import { addGoal } from "@/app/actions";
import { Button, Field, Input } from "./ui";

const SUGESTOES = [
  { nome: "Reserva de emergência", alvo: "" },
  { nome: "Viagem", alvo: "" },
  { nome: "Entrada do carro", alvo: "" },
  { nome: "Trocar de celular", alvo: "" },
];

export function GoalForm() {
  const [state, action, pending] = useActionState(addGoal, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action}>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 pt-4">
        {SUGESTOES.map((s) => (
          <button
            key={s.nome}
            type="button"
            onClick={() => {
              const campo = formRef.current?.elements.namedItem(
                "name",
              ) as HTMLInputElement | null;
              if (campo) campo.value = s.nome;
            }}
            className="pressable shrink-0 rounded-full bg-fill px-3.5 py-2 text-[13px] font-medium text-ink"
          >
            {s.nome}
          </button>
        ))}
      </div>

      <Field label="Nome da meta">
        <Input name="name" required maxLength={40} placeholder="Reserva de emergência" />
      </Field>

      <Field label="Quanto quer juntar">
        <Input name="target" required inputMode="decimal" placeholder="10.000,00" />
      </Field>

      <Field
        label="Quanto separar por mês"
        hint="Sai do seu limite de gasto do mês, mas não some do saldo. O dinheiro continua seu."
      >
        <Input name="monthly" inputMode="decimal" placeholder="opcional" />
      </Field>

      <Field label="Prazo" hint="Opcional. Se não bater, o app diz quanto falta por mês.">
        <Input type="month" name="deadline" />
      </Field>

      {state?.error ? (
        <p className="px-4 pt-3 text-[13px] text-neg">{state.error}</p>
      ) : null}

      <div className="p-4">
        <Button type="submit" variant="tinted" disabled={pending} className="w-full">
          {pending ? "Criando…" : "Criar meta"}
        </Button>
      </div>
    </form>
  );
}
