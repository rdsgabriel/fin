"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Rotas de primeiro acesso: tela cheia, sem dock e sem coluna centrada. */
const TELA_CHEIA = ["/comecar", "/instalar"];

/** Mesma ordem do dock, pra o gesto seguir o que se vê. */
const ORDEM = ["/", "/lancamentos", "/fixos", "/ajustes"];

/** Fração da largura que precisa ser arrastada pra trocar de aba. */
const LIMIAR = 0.28;

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [dx, setDx] = useState(0);
  const [soltando, setSoltando] = useState(false);
  const gesto = useRef<{
    x: number;
    y: number;
    eixo: "indefinido" | "horizontal" | "vertical";
  } | null>(null);

  /* O deslocamento vive numa ref, não só no estado.
     `touchend` roda no mesmo tique do último `touchmove`, e o estado do
     React só chega no próximo render: lendo o estado, o gesto terminava
     sempre valendo zero e nunca trocava de aba. */
  const desloc = useRef(0);

  const indice = ORDEM.indexOf(pathname);
  const cheia = TELA_CHEIA.some((p) => pathname.startsWith(p));

  // Abas vizinhas prontas antes do gesto, senão o arrasto só muda o lugar
  // onde a espera acontece.
  useEffect(() => {
    if (cheia || indice === -1) return;
    for (const vizinho of [ORDEM[indice - 1], ORDEM[indice + 1]]) {
      if (vizinho) router.prefetch(vizinho);
    }
  }, [indice, router, cheia]);

  /* Os ouvintes ficam na janela, não no elemento de conteúdo. Presos ao
     <main>, o gesto só respondia onde havia texto: em telas curtas como o
     Extrato vazio, metade da tela ficava morta. */
  useEffect(() => {
    if (cheia || indice === -1) return;

    const largura = () => window.innerWidth || 1;

    function inicio(e: TouchEvent) {
      const alvo = e.target as Element | null;
      // Faixas de chips, campos e o gráfico arrastável têm gesto próprio.
      if (
        alvo?.closest?.(
          "[data-sem-swipe], .no-scrollbar, .overflow-x-auto, input, textarea, select, svg, details",
        )
      ) {
        gesto.current = null;
        return;
      }
      const t = e.touches[0];
      gesto.current = { x: t.clientX, y: t.clientY, eixo: "indefinido" };
      setSoltando(false);
    }

    function mover(e: TouchEvent) {
      const g = gesto.current;
      if (!g) return;

      const t = e.touches[0];
      const ax = t.clientX - g.x;
      const ay = t.clientY - g.y;

      // Decide o eixo uma vez só, com folga pra não roubar a rolagem.
      if (g.eixo === "indefinido") {
        if (Math.abs(ax) < 12 && Math.abs(ay) < 12) return;
        g.eixo = Math.abs(ax) > Math.abs(ay) * 1.3 ? "horizontal" : "vertical";
      }
      if (g.eixo !== "horizontal") return;

      // Trava a rolagem vertical enquanto o dedo comanda a troca de aba.
      if (e.cancelable) e.preventDefault();

      // Nas pontas o conteúdo resiste, como nas listas do iOS.
      const semVizinho =
        (ax > 0 && indice === 0) || (ax < 0 && indice === ORDEM.length - 1);
      desloc.current = semVizinho ? ax / 4 : ax;
      setDx(desloc.current);
    }

    function fim() {
      const g = gesto.current;
      gesto.current = null;
      if (!g || g.eixo !== "horizontal") {
        desloc.current = 0;
        setDx(0);
        return;
      }

      setSoltando(true);
      const atual = desloc.current;
      const passou = Math.abs(atual) > largura() * LIMIAR;
      const destino = atual < 0 ? ORDEM[indice + 1] : ORDEM[indice - 1];

      if (passou && destino) {
        // Termina de sair pro lado e só então troca de rota, pra a tela
        // nova entrar do lado oposto sem salto.
        desloc.current = atual < 0 ? -largura() : largura();
        setDx(desloc.current);
        setTimeout(() => router.push(destino), 170);
      } else {
        desloc.current = 0;
        setDx(0);
      }
    }

    window.addEventListener("touchstart", inicio, { passive: true });
    window.addEventListener("touchmove", mover, { passive: false });
    window.addEventListener("touchend", fim, { passive: true });
    window.addEventListener("touchcancel", fim, { passive: true });
    return () => {
      window.removeEventListener("touchstart", inicio);
      window.removeEventListener("touchmove", mover);
      window.removeEventListener("touchend", fim);
      window.removeEventListener("touchcancel", fim);
    };
  }, [indice, router, cheia]);

  // Zera ao trocar de rota, senão a tela nova nasceria deslocada.
  useEffect(() => {
    desloc.current = 0;
    setDx(0);
    setSoltando(false);
  }, [pathname]);

  if (cheia) return <>{children}</>;

  const arrastando = dx !== 0;

  return (
    <main
      style={{
        transform: arrastando ? `translate3d(${dx}px,0,0)` : undefined,
        transition: soltando
          ? "transform 0.26s var(--ease-spring), opacity 0.26s ease"
          : undefined,
        opacity: arrastando ? Math.max(0.45, 1 - Math.abs(dx) / 900) : undefined,
      }}
      className="mx-auto w-full max-w-2xl px-5 pb-36 pt-3 sm:px-4 sm:pb-16 sm:pt-8"
    >
      {/* A chave por rota faz a tela nova entrar animada em vez de aparecer
          seca depois do arrasto. */}
      <div key={pathname} className="animate-page-in">
        {children}
      </div>
    </main>
  );
}
