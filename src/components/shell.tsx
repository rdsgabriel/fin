"use client";

import { usePathname } from "next/navigation";

/** Rotas de primeiro acesso: tela cheia, sem dock e sem coluna centrada. */
const TELA_CHEIA = ["/comecar", "/instalar"];

/**
 * O onboarding é tela cheia: sem largura máxima, sem folga pro dock (que
 * também não aparece lá). O resto do app usa a coluna centrada.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (TELA_CHEIA.some((p) => pathname.startsWith(p))) return <>{children}</>;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-36 pt-3 sm:px-4 sm:pb-16 sm:pt-8">
      {children}
    </main>
  );
}
