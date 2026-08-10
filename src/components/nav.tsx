"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/db/schema";
import { AddRecurrenceSheet } from "./add-recurrence-sheet";
import { AddTransactionSheet } from "./add-transaction-sheet";

const TABS = [
  { href: "/", label: "Hoje", icon: IconChart },
  { href: "/lancamentos", label: "Extrato", icon: IconList },
  { href: "/fixos", label: "Fixos", icon: IconRepeat },
  { href: "/ajustes", label: "Ajustes", icon: IconGear },
] as const;

function useActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Nav({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const isActive = useActive();
  const [adding, setAdding] = useState(false);

  // O "+" é contextual: em Fixos ele cria um fixo, no resto um lançamento.
  const isFixos = pathname.startsWith("/fixos");

  return (
    <>
      {/* Desktop: barra superior de vidro. */}
      <header className="material-thin sticky top-0 z-40 hidden border-b border-separator sm:block">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-1 px-4 py-2.5">
          <Link href="/" className="title mr-auto text-[17px] font-semibold">
            Fin
          </Link>
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-lg px-3 py-1.5 text-[14px] font-medium transition-colors ${
                isActive(tab.href)
                  ? "bg-fill text-label"
                  : "text-label-2 hover:text-label"
              }`}
            >
              {tab.label}
            </Link>
          ))}
          <button
            onClick={() => setAdding(true)}
            className="pressable ml-2 rounded-lg bg-blue px-3 py-1.5 text-[14px] font-semibold text-white"
          >
            {isFixos ? "Novo fixo" : "Lançar"}
          </button>
        </div>
      </header>

      {/* Mobile: tab bar de vidro com o botão de ação no centro. */}
      <nav className="material-thin fixed inset-x-0 bottom-0 z-40 border-t border-separator sm:hidden">
        <div className="flex items-center pb-[env(safe-area-inset-bottom)]">
          {TABS.slice(0, 2).map((tab) => (
            <TabLink key={tab.href} tab={tab} active={isActive(tab.href)} />
          ))}

          <div className="flex w-16 shrink-0 justify-center">
            <button
              onClick={() => setAdding(true)}
              aria-label={isFixos ? "Novo fixo" : "Novo lançamento"}
              className="pressable -mt-5 flex size-14 items-center justify-center rounded-full bg-blue text-white shadow-[var(--shadow-2)]"
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          {TABS.slice(2).map((tab) => (
            <TabLink key={tab.href} tab={tab} active={isActive(tab.href)} />
          ))}
        </div>
      </nav>

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

function TabLink({
  tab,
  active,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
}) {
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 flex-col items-center gap-1 py-2 transition-colors ${
        active ? "text-blue" : "text-label-3"
      }`}
    >
      <tab.icon />
      <span className="text-[10px] font-medium">{tab.label}</span>
    </Link>
  );
}

const iconProps = {
  width: 23,
  height: 23,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function IconChart() {
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
      <circle cx="3.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="17.5" r="1.2" fill="currentColor" stroke="none" />
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

function IconGear() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" />
    </svg>
  );
}
