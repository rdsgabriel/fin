"use client";

import { useEffect, useState, useTransition } from "react";
import { concluirInstalacao } from "@/app/auth-actions";
import { AppMark } from "./logo";

type Prompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __finInstall?: Prompt;
  }
}

/* "desktop" existe só no instante da detecção: essa tela é pulada lá. */
type Plataforma = "instalado" | "android" | "ios";

/**
 * Tela de instalação do PWA no primeiro acesso.
 *
 * Não dá pra *obrigar* ninguém a instalar: no iOS a Apple não expõe API
 * nenhuma de instalação — é o usuário quem faz pelo menu Compartilhar. Então
 * o que dá pra fazer de verdade é: detectar a plataforma, mostrar o caminho
 * certo pra ela, disparar o diálogo nativo onde ele existe (Chrome/Android),
 * e deixar o "pular" discreto em vez de inexistente. Bloquear de vez deixaria
 * gente presa fora do próprio app.
 */
export function InstallGate() {
  const [plataforma, setPlataforma] = useState<Plataforma | null>(null);
  const [instalavel, setInstalavel] = useState(false);
  const [recusou, setRecusou] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS usa uma propriedade própria, fora do padrão.
      (navigator as { standalone?: boolean }).standalone === true;

    if (standalone) {
      setPlataforma("instalado");
      return;
    }

    const ua = navigator.userAgent;
    const ios =
      /iPad|iPhone|iPod/.test(ua) ||
      // iPad moderno se apresenta como Mac; o toque é o que entrega.
      (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);

    const detectada = ios
      ? "ios"
      : /Android/.test(ua)
        ? "android"
        : "desktop";

    // No desktop o app já vive numa aba e numa janela grande — instalar não
    // muda quase nada. Então essa tela nem chega a aparecer: seguimos direto
    // pro onboarding.
    if (detectada === "desktop") {
      startTransition(async () => {
        await concluirInstalacao();
      });
      return;
    }

    setPlataforma(detectada as Plataforma);
    setInstalavel(Boolean(window.__finInstall));

    const onInstallable = () => setInstalavel(true);
    const onInstalled = () => setPlataforma("instalado");
    window.addEventListener("fin:installable", onInstallable);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("fin:installable", onInstallable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function seguir() {
    startTransition(async () => {
      await concluirInstalacao();
    });
  }

  async function instalar() {
    const evento = window.__finInstall;
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    window.__finInstall = undefined;
    if (outcome === "accepted") setPlataforma("instalado");
    else setRecusou(true);
  }

  if (!plataforma) {
    return <div className="min-h-dvh" aria-busy="true" />;
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-7 px-6 py-12">
      <div className="rise flex flex-col items-center text-center">
        <AppMark />
        <p className="chapter mt-6">
          {plataforma === "instalado" ? "Tudo certo" : "Quase lá"}
        </p>
        <h1 className="display mt-2 text-[clamp(28px,8vw,36px)]">
          {plataforma === "instalado" ? (
            <>
              O Fin já está
              <br />
              <span className="brand-text">na sua tela.</span>
            </>
          ) : (
            <>
              Deixe o Fin
              <br />
              <span className="brand-text">na sua tela de início.</span>
            </>
          )}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
          {plataforma === "instalado"
            ? "Você está com a versão instalada. Vamos montar sua projeção."
            : "Controle de gastos só funciona se for a dois toques de distância. Instalado, o Fin abre em tela cheia, sem barra de navegador, e funciona offline."}
        </p>
      </div>

      {plataforma === "ios" ? <PassosIOS /> : null}

      {plataforma === "android" ? (
        instalavel ? (
          <button
            onClick={instalar}
            className="rise grad-button pressable rounded-full py-4 text-[17px] font-semibold"
            style={{ animationDelay: "120ms" }}
          >
            Instalar o Fin
          </button>
        ) : (
          <PassosAndroid />
        )
      ) : null}

      {recusou ? (
        <p className="rounded-[16px] bg-fill px-4 py-3 text-center text-[13.5px] leading-snug text-ink-2">
          Sem problema. Dá pra instalar depois pelo menu do navegador, a
          qualquer momento.
        </p>
      ) : null}

      <div
        className="rise flex flex-col gap-3"
        style={{ animationDelay: "200ms" }}
      >
        <button
          onClick={seguir}
          disabled={pending}
          className={`pressable rounded-full py-4 text-[17px] font-semibold disabled:opacity-50 ${
            plataforma === "instalado"
              ? "bg-brand text-white shadow-[var(--shadow-2)]"
              : "glass-button"
          }`}
        >
          {pending
            ? "Abrindo…"
            : plataforma === "instalado"
              ? "Continuar"
              : "Já instalei, continuar"}
        </button>

        {plataforma !== "instalado" ? (
          <button
            onClick={seguir}
            disabled={pending}
            className="pressable text-[14px] font-medium text-ink-3"
          >
            Seguir no navegador por enquanto
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PassosIOS() {
  return (
    <ol
      className="rise glass-panel flex flex-col gap-4 p-5"
      style={{ animationDelay: "120ms" }}
    >
      <Passo n={1}>
        Toque em <IconeCompartilhar /> <strong>Compartilhar</strong>, na barra
        de baixo do Safari.
      </Passo>
      <Passo n={2}>
        Role a lista e escolha <strong>Adicionar à Tela de Início</strong>.
      </Passo>
      <Passo n={3}>
        Confirme em <strong>Adicionar</strong> e volte aqui.
      </Passo>
    </ol>
  );
}

function PassosAndroid() {
  return (
    <ol
      className="rise glass-panel flex flex-col gap-4 p-5"
      style={{ animationDelay: "120ms" }}
    >
      <Passo n={1}>
        Abra o menu do navegador (os três pontinhos, no canto).
      </Passo>
      <Passo n={2}>
        Escolha <strong>Instalar aplicativo</strong> ou{" "}
        <strong>Adicionar à tela de início</strong>.
      </Passo>
    </ol>
  );
}

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-bold text-brand">
        {n}
      </span>
      <span className="pt-1 text-[14.5px] leading-snug text-ink-2">
        {children}
      </span>
    </li>
  );
}

function IconeCompartilhar() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block -mt-0.5 align-middle text-brand"
      aria-label="ícone de compartilhar"
      role="img"
    >
      <path d="M12 15V3.5M12 3.5 8.5 7M12 3.5 15.5 7" />
      <path d="M6 11H4.5v9h15v-9H18" />
    </svg>
  );
}

