"use client";

import { useEffect, useState } from "react";

const BUILD = process.env.NEXT_PUBLIC_BUILD ?? "dev";

/**
 * Registra o service worker e avisa quando existe versão nova.
 *
 * Sem isto o app instalado fica preso na versão que estava no ar quando a
 * pessoa adicionou à tela de início: o SW antigo continua servindo a casca
 * antiga e nada indica que há algo novo. O aviso aqui é a saída honesta,
 * porque forçar recarga sozinho no meio de um lançamento perderia o que a
 * pessoa estava digitando.
 */
export function RegisterSW() {
  const [novaVersao, setNovaVersao] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelado = false;

    navigator.serviceWorker
      .register(`/sw.js?v=${BUILD}`)
      .then((registro) => {
        if (cancelado) return;

        // Já havia uma versão esperando de uma visita anterior.
        if (registro.waiting) setNovaVersao(registro.waiting);

        registro.addEventListener("updatefound", () => {
          const novo = registro.installing;
          if (!novo) return;
          novo.addEventListener("statechange", () => {
            // "installed" com controller existente = atualização, não 1ª visita.
            if (novo.state === "installed" && navigator.serviceWorker.controller) {
              setNovaVersao(novo);
            }
          });
        });

        // Procura atualização ao voltar pro app, que é quando a pessoa
        // costuma reabrir depois de um deploy.
        const conferir = () => {
          if (document.visibilityState === "visible") registro.update();
        };
        document.addEventListener("visibilitychange", conferir);
        return () => document.removeEventListener("visibilitychange", conferir);
      })
      .catch(() => {
        // Sem service worker o app continua funcionando, só perde o offline.
      });

    return () => {
      cancelado = true;
    };
  }, []);

  if (!novaVersao) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+6rem))] sm:pb-6">
      <div className="dock animate-sheet-in flex items-center gap-3 rounded-full py-2 pl-5 pr-2">
        <span className="text-[14px] font-medium">Nova versão disponível</span>
        <button
          onClick={() => {
            novaVersao.postMessage("assumir-agora");
            // Só recarrega depois que o SW novo assume, senão a página
            // voltaria com o mesmo conteúdo antigo.
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              () => location.reload(),
              { once: true },
            );
          }}
          className="pressable rounded-full bg-brand px-4 py-2 text-[14px] font-semibold text-white"
        >
          Atualizar
        </button>
      </div>
    </div>
  );
}

/**
 * Botão de pânico: apaga service workers e caches e recarrega do servidor.
 * Existe porque cache preso é o tipo de bug que a pessoa não consegue
 * contornar sozinha, e "limpe os dados do site" não é resposta.
 */
export function BotaoAtualizar() {
  const [limpando, setLimpando] = useState(false);

  async function forcar() {
    setLimpando(true);
    try {
      if ("serviceWorker" in navigator) {
        const registros = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registros.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const chaves = await caches.keys();
        await Promise.all(chaves.map((k) => caches.delete(k)));
      }
    } finally {
      // Query única quebra também o cache HTTP do navegador.
      location.replace(`/?atualizado=${Date.now()}`);
    }
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3.5">
      <button
        onClick={forcar}
        disabled={limpando}
        className="pressable self-start rounded-full bg-fill px-4 py-2.5 text-[14px] font-semibold text-ink disabled:opacity-50"
      >
        {limpando ? "Atualizando…" : "Forçar atualização"}
      </button>
      <span className="text-[12px] leading-snug text-ink-3">
        Apaga o cache local e baixa a versão mais recente. Use se a tela
        parecer desatualizada. Versão atual: {BUILD.slice(-6)}
      </span>
    </div>
  );
}
