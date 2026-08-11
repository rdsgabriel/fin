"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/db/schema";
import { AddRecurrenceSheet } from "./add-recurrence-sheet";
import { AddTransactionSheet } from "./add-transaction-sheet";
import { Wordmark } from "./logo";

const TABS = [
  { href: "/", label: "Hoje", icon: IconSpark },
  { href: "/lancamentos", label: "Extrato", icon: IconList },
  { href: "/fixos", label: "Fixos", icon: IconRepeat },
  { href: "/ajustes", label: "Ajustes", icon: IconGear },
] as const;

/** Rotas de primeiro acesso: tela cheia, sem nav nenhuma. */
const SEM_NAV = ["/comecar", "/instalar"];

export function Nav({
  categories,
  email,
}: {
  categories: Category[];
  email: string;
}) {
  const pathname = usePathname();
  const [adding, setAdding] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // O "+" é contextual: em Fixos cria um fixo, no resto um lançamento.
  const isFixos = pathname.startsWith("/fixos");

  if (SEM_NAV.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      <header className="material sticky top-0 z-40 hidden border-x-0 border-t-0 sm:block">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-1 px-4 py-2.5">
          <Link href="/" className="mr-auto">
            <Wordmark />
          </Link>
          <span className="mr-2 hidden text-[13px] text-ink-3 md:inline">
            {email}
          </span>
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold transition-colors ${
                isActive(tab.href)
                  ? "bg-brand-soft text-brand"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          ))}
          <button
            onClick={() => setAdding(true)}
            className="pressable ml-2 rounded-full bg-brand px-4 py-1.5 text-[14px] font-semibold text-white"
          >
            {isFixos ? "Novo fixo" : "Lançar"}
          </button>
        </div>
      </header>

      {/* Mobile: dock flutuante. Uma pílula que paira sobre o conteúdo em vez
          de uma barra colada na borda — o app respira embaixo. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2.5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:hidden">
        {/* Só ícones, todos do mesmo tamanho: o rótulo da aba ativa deixava
            a pílula torta. A aba onde você está ganha um disco preenchido. */}
        <nav className="dock pointer-events-auto flex items-center gap-1 rounded-full p-1.5">
          {TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                aria-label={tab.label}
                title={tab.label}
                className={`pressable flex size-12 items-center justify-center rounded-full transition-colors duration-300 ${
                  active ? "bg-brand text-white" : "text-ink-2"
                }`}
              >
                <tab.icon />
              </Link>
            );
          })}
        </nav>

        {/* O botão de ação vive fora da pílula: é uma ação, não um destino. */}
        <button
          onClick={() => setAdding(true)}
          aria-label={isFixos ? "Novo fixo" : "Novo lançamento"}
          className="grad-button pressable pointer-events-auto flex size-[3.75rem] shrink-0 items-center justify-center rounded-full"
        >
          <svg
            width="25"
            height="25"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {isFixos ? (
        <AddRecurrenceSheet
          open={adding}
          onClose={() => setAdding(false)}
          categories={categories}
        />
      ) : (
        <AddTransactionSheet
          open={adding}
          onClose={() => setAdding(false)}
          categories={categories}
        />
      )}
    </>
  );
}

const iconProps = {
  width: 21,
  height: 21,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function IconSpark() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M3 17.5 9 11l4 4 8-8.5" />
      <path d="M21 6.5h-4.5M21 6.5V11" />
    </svg>
  );
}

function IconList() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M8 6.5h13M8 12h13M8 17.5h13" />
      <circle cx="3.5" cy="6.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="17.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconRepeat() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M4 9a5 5 0 0 1 5-5h9" />
      <path d="m15 1.5 3 2.5-3 2.5" />
      <path d="M20 15a5 5 0 0 1-5 5H6" />
      <path d="m9 22.5-3-2.5 3-2.5" />
    </svg>
  );
}

/* Sliders em vez de engrenagem: a engrenagem clássica vira um borrão de
   sol nesse tamanho, com os dentes fundindo no círculo. */
function IconGear() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M4 7h10M18.5 7H20M4 17h3M11 17h9" />
      <circle cx="16" cy="7" r="2.4" />
      <circle cx="9" cy="17" r="2.4" />
    </svg>
  );
}
