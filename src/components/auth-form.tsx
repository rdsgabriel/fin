"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { entrar, registrar, type AuthState } from "@/app/auth-actions";
import { Wordmark } from "./logo";

export function AuthForm({ modo }: { modo: "entrar" | "criar" }) {
  const criando = modo === "criar";
  const [state, action, pending] = useActionState<AuthState, FormData>(
    criando ? registrar : entrar,
    null,
  );
  const [verSenha, setVerSenha] = useState(false);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <div className="rise">
        <Wordmark className="mb-6" />
        <h1 className="display text-[clamp(34px,10vw,44px)]">
          {criando ? (
            <>
              Descubra como seus
              <br />
              <span className="brand-text">próximos meses</span>
              <br />
              vão terminar.
            </>
          ) : (
            <>
              Que bom
              <br />
              <span className="brand-text">ver você</span> de volta.
            </>
          )}
        </h1>
      </div>

      <form
        action={action}
        className="rise flex flex-col gap-3"
        style={{ animationDelay: "90ms" }}
      >
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-2">E-mail</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="voce@email.com"
            className="glass-field"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-2">Senha</span>
          <div className="relative">
            <input
              name="senha"
              type={verSenha ? "text" : "password"}
              required
              minLength={criando ? 8 : undefined}
              autoComplete={criando ? "new-password" : "current-password"}
              placeholder={criando ? "pelo menos 8 caracteres" : "sua senha"}
              className="glass-field pr-20"
            />
            <button
              type="button"
              onClick={() => setVerSenha((v) => !v)}
              className="absolute inset-y-0 right-3 text-[13px] font-semibold text-ink-3"
            >
              {verSenha ? "ocultar" : "ver"}
            </button>
          </div>
        </label>

        {state?.error ? (
          <p className="rounded-[14px] bg-neg/10 px-4 py-3 text-[13.5px] leading-snug text-neg">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className={`pressable mt-2 rounded-full py-4 text-[17px] font-semibold disabled:opacity-50 ${
            criando ? "grad-button" : "bg-brand text-white shadow-[var(--shadow-2)]"
          }`}
        >
          {pending
            ? criando
              ? "Criando…"
              : "Entrando…"
            : criando
              ? "Criar minha conta"
              : "Entrar"}
        </button>
      </form>

      <p
        className="rise text-center text-[14px] text-ink-2"
        style={{ animationDelay: "160ms" }}
      >
        {criando ? "Já tem conta? " : "Ainda não tem conta? "}
        <Link
          href={criando ? "/entrar" : "/criar-conta"}
          className="font-semibold text-brand"
        >
          {criando ? "Entrar" : "Criar agora"}
        </Link>
      </p>
    </div>
  );
}
