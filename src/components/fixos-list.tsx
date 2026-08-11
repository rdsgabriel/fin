"use client";

import { useState } from "react";
import { deleteRecurrence, toggleRecurrence } from "@/app/actions";
import type { Category, Recurrence } from "@/db/schema";
import { formatMoney } from "@/lib/money";
import {
  formatMonthShort,
  monthKeyOf,
  monthsBetween,
  todayISO,
} from "@/lib/month";
import { AddRecurrenceSheet } from "./add-recurrence-sheet";
import { Badge, Card, Chapter, Row } from "./ui";

export function FixosList({
  recurrences,
  categories,
}: {
  recurrences: Recurrence[];
  categories: Category[];
}) {
  const [editando, setEditando] = useState<Recurrence | null>(null);

  const thisMonth = monthKeyOf(todayISO());
  const nomeCategoria = new Map(categories.map((c) => [c.id, c.name]));

  const grupos = [
    { titulo: "Entradas", itens: recurrences.filter((r) => r.kind === "income") },
    { titulo: "Saídas", itens: recurrences.filter((r) => r.kind === "expense") },
  ];

  const totalMensal = (lista: Recurrence[]) =>
    lista
      .filter(
        (r) => r.active && (!r.endMonth || monthKeyOf(r.endMonth) >= thisMonth),
      )
      .reduce((soma, r) => soma + r.amountCents, 0);

  return (
    <>
      {grupos.map(({ titulo, itens }) =>
        itens.length === 0 ? null : (
          <section key={titulo}>
            <Chapter
              action={
                <span className="tnum text-[13px] font-semibold text-ink-2">
                  {formatMoney(totalMensal(itens))}/mês
                </span>
              }
            >
              {titulo}
            </Chapter>
            <Card>
              {itens.map((r) => {
                const fimKey = r.endMonth ? monthKeyOf(r.endMonth) : null;
                const restantes = fimKey
                  ? monthsBetween(thisMonth, fimKey) + 1
                  : null;
                const quitado = restantes !== null && restantes <= 0;

                return (
                  <Row
                    key={r.id}
                    className={`items-start ${r.active && !quitado ? "" : "opacity-45"}`}
                  >
                    {/* A linha inteira abre a edição: reajuste de aluguel e
                        aumento de salário são a rotina desta tela. */}
                    <button
                      type="button"
                      onClick={() => setEditando(r)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-[15px] font-medium">
                          {r.description}
                        </p>
                        <span
                          className={`tnum shrink-0 text-[15px] font-semibold ${
                            r.kind === "income" ? "text-pos" : "text-ink"
                          }`}
                        >
                          {r.kind === "income" ? "+" : "−"}
                          {formatMoney(r.amountCents)}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[12px] text-ink-3">
                          dia {r.dayOfMonth}
                          {r.categoryId
                            ? ` · ${nomeCategoria.get(r.categoryId)}`
                            : ""}
                        </span>
                        {quitado ? (
                          <Badge>quitado</Badge>
                        ) : restantes !== null ? (
                          <Badge tone="warn">
                            {restantes}x até {formatMonthShort(fimKey!)}
                          </Badge>
                        ) : null}
                        {!r.active ? <Badge>pausado</Badge> : null}
                      </div>
                    </button>

                    <div className="flex shrink-0 items-center gap-0.5">
                      <form action={toggleRecurrence}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          aria-label={
                            r.active
                              ? `Pausar ${r.description}`
                              : `Ativar ${r.description}`
                          }
                          className="pressable flex size-8 items-center justify-center rounded-full text-ink-3 active:bg-fill"
                        >
                          {r.active ? <IconPause /> : <IconPlay />}
                        </button>
                      </form>
                      <form action={deleteRecurrence}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          aria-label={`Excluir ${r.description}`}
                          className="pressable flex size-8 items-center justify-center rounded-full text-ink-3 active:bg-fill active:text-neg"
                        >
                          <IconTrash />
                        </button>
                      </form>
                    </div>
                  </Row>
                );
              })}
            </Card>
          </section>
        ),
      )}

      <AddRecurrenceSheet
        open={editando !== null}
        onClose={() => setEditando(null)}
        categories={categories}
        editando={editando}
      />
    </>
  );
}

const icon = {
  width: 15,
  height: 15,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function IconPause() {
  return (
    <svg {...icon} aria-hidden="true">
      <path d="M9 5v14M15 5v14" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg {...icon} aria-hidden="true">
      <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg {...icon} aria-hidden="true">
      <path d="M4 7h16M9.5 7V4.8h5V7M6.5 7l.9 12.2h9.2L17.5 7" />
    </svg>
  );
}
