"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addCategory } from "@/app/actions";
import { Segmented } from "./segmented";
import { Button, Input } from "./ui";

const COLORS = [
  "#FF3B30", "#FF9500", "#FFCC00", "#34C759",
  "#0A84FF", "#5E5CE6", "#AF52DE", "#8E8E93",
];

export function CategoryForm() {
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [color, setColor] = useState(COLORS[4]);
  const [state, action, pending] = useActionState(addCategory, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3 p-4">
      <input type="hidden" name="color" value={color} />

      <Segmented
        name="kind"
        value={kind}
        onChange={setKind}
        options={[
          { value: "expense", label: "Saída" },
          { value: "income", label: "Entrada" },
        ]}
      />

      <div className="flex gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Cor ${c}`}
            aria-pressed={c === color}
            style={{ background: c }}
            className={`size-6 rounded-full transition-transform ${
              c === color ? "scale-115 ring-2 ring-label ring-offset-2 ring-offset-card" : ""
            }`}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <Input name="name" required maxLength={30} placeholder="Nome da categoria" />
        <Button type="submit" variant="tinted" disabled={pending} className="shrink-0">
          Criar
        </Button>
      </div>

      {state?.error ? <p className="text-[13px] text-red">{state.error}</p> : null}
    </form>
  );
}
