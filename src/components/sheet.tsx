"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Bottom sheet no estilo iOS: sobe com mola, escurece e desfoca o que está
 * atrás, e desce se você arrastar pra baixo. O arrasto acompanha o dedo em
 * tempo real — sem isso a folha parece um modal, não um objeto físico.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  leading,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Botão opcional no canto esquerdo do cabeçalho (ex.: "Voltar"). */
  leading?: ReactNode;
}) {
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Trava o scroll do fundo enquanto a folha está aberta.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) setDrag(0);
  }, [open]);

  if (!open) return null;

  function onPointerDown(e: React.PointerEvent) {
    // Só inicia o arrasto pelo topo da folha, senão atrapalha o scroll interno.
    const panel = panelRef.current;
    if (!panel) return;
    if (panel.scrollTop > 0) return;
    startY.current = e.clientY;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (startY.current === null) return;
    const delta = e.clientY - startY.current;
    // Resistência ao arrastar pra cima: a folha não sobe além do topo.
    setDrag(delta > 0 ? delta : delta / 6);
  }

  function onPointerUp() {
    if (startY.current === null) return;
    startY.current = null;
    // Passou de ~1/4 da altura da folha? Deixa fechar.
    const height = panelRef.current?.offsetHeight ?? 400;
    if (drag > height * 0.25) onClose();
    else setDrag(0);
  }

  const dragging = startY.current !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Fechar"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-[var(--scrim)] backdrop-blur-md"
        style={{ opacity: Math.max(0, 1 - drag / 400) }}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-sheet-in material-thick relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] shadow-[var(--shadow-sheet)] sm:mb-8 sm:max-w-md sm:rounded-[28px]"
        style={{
          transform: drag ? `translateY(${drag}px)` : undefined,
          transition: dragging ? "none" : "transform 0.44s var(--ease-spring)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="sticky top-0 z-10 cursor-grab touch-none active:cursor-grabbing"
        >
          <div className="material-thick flex flex-col items-center rounded-t-[28px] pt-2.5">
            <span className="h-1 w-9 rounded-full bg-label-3" />
            <div className="flex w-full items-center px-4 pb-3 pt-2.5">
              <div className="flex min-w-16 justify-start">{leading}</div>
              <h2 className="title flex-1 text-center text-[17px] font-semibold">
                {title}
              </h2>
              <div className="flex min-w-16 justify-end">
                <button
                  onClick={onClose}
                  className="pressable text-[15px] text-label-2"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
