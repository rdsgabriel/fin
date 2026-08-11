"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** Rotas de primeiro acesso: tela cheia, sem dock e sem coluna centrada. */
const TELA_CHEIA = ["/comecar", "/instalar"];

/** Mesma ordem do dock, pra o gesto lateral seguir o que se vê. */
const ORDEM = ["/", "/lancamentos", "/fixos", "/ajustes"];

/**
 * O onboarding é tela cheia. O resto usa a coluna centrada e aceita
 * navegação por arrasto lateral entre as abas.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const inicio = useRef<{ x: number; y: number; t: number } | null>(null);

  const indice = ORDEM.indexOf(pathname);

  // Deixa as abas vizinhas prontas antes do gesto acontecer, senão o
  // arrasto só troca o congelamento de tela de lugar.
  useEffect(() => {
    if (indice === -1) return;
    for (const vizinho of [ORDEM[indice - 1], ORDEM[indice + 1]]) {
      if (vizinho) router.prefetch(vizinho);
    }
  }, [indice, router]);

  if (TELA_CHEIA.some((p) => pathname.startsWith(p))) return <>{children}</>;

  function onTouchStart(e: React.TouchEvent) {
    const alvo = e.target as Element | null;
    // Faixas de chips, campos e o gráfico arrastável têm gesto próprio.
    if (
      alvo?.closest?.(
        "[data-sem-swipe], .no-scrollbar, .overflow-x-auto, input, textarea, select, svg",
      )
    ) {
      inicio.current = null;
      return;
    }
    const t = e.touches[0];
    inicio.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const partida = inicio.current;
    inicio.current = null;
    if (!partida || indice === -1) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - partida.x;
    const dy = t.clientY - partida.y;

    if (Date.now() - partida.t > 600) return; // arrasto lento não é gesto
    if (Math.abs(dx) < 65) return; // curto demais, provavelmente um toque
    if (Math.abs(dy) > Math.abs(dx) * 0.6) return; // é rolagem vertical

    const destino = dx < 0 ? ORDEM[indice + 1] : ORDEM[indice - 1];
    if (destino) router.push(destino);
  }

  return (
    <main
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="mx-auto w-full max-w-2xl px-5 pb-36 pt-3 sm:px-4 sm:pb-16 sm:pt-8"
    >
      {children}
    </main>
  );
}
