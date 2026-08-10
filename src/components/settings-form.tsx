"use client";

import { useActionState } from "react";
import { updateSettings } from "@/app/actions";
import type { Settings } from "@/db/schema";
import { Button, Card, Field, Input, Select } from "./ui";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState(updateSettings, null);

  return (
    <form action={action}>
      <Card>
        <Field
          label="Saldo de partida"
          hint="Quanto você tinha somando conta e dinheiro na data abaixo."
        >
          <Input
            name="openingBalance"
            inputMode="decimal"
            defaultValue={(settings.openingBalanceCents / 100).toFixed(2).replace(".", ",")}
          />
        </Field>

        <Field label="Data desse saldo">
          <Input type="date" name="openingDate" defaultValue={settings.openingDate} />
        </Field>

        <Field
          label="Gasto variável por mês"
          hint="Deixe vazio para o app estimar sozinho a partir do seu histórico."
        >
          <Input
            name="variableOverride"
            inputMode="decimal"
            placeholder="estimar automaticamente"
            defaultValue={
              settings.variableOverrideCents != null
                ? (settings.variableOverrideCents / 100).toFixed(2).replace(".", ",")
                : ""
            }
          />
        </Field>

        <Field
          label="Meses de histórico na estimativa"
          hint="Quantos meses fechados entram na média do gasto variável."
        >
          <Select name="lookbackMonths" defaultValue={String(settings.lookbackMonths)}>
            {[1, 2, 3, 6, 12].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "mês" : "meses"}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Horizonte padrão da projeção">
          <Select name="horizonMonths" defaultValue={String(settings.horizonMonths)}>
            {[6, 12, 24, 36].map((n) => (
              <option key={n} value={n}>
                {n} meses
              </option>
            ))}
          </Select>
        </Field>

        {state?.error ? (
          <p className="px-4 pt-3 text-[13px] text-red">{state.error}</p>
        ) : null}
        {state?.ok ? (
          <p className="px-4 pt-3 text-[13px] text-green">Salvo.</p>
        ) : null}

        <div className="p-4">
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
