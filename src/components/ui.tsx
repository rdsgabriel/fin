import type { ComponentProps, ReactNode } from "react";

/** Cartão agrupado, o bloco básico das telas de Ajustes do iOS. */
export function Card({
  className = "",
  children,
  ...rest
}: ComponentProps<"section">) {
  return (
    <section
      className={`material overflow-hidden rounded-[20px] ${className}`}
      {...rest}
    >
      {children}
    </section>
  );
}

/** Cabeçalho de seção: maiúsculas pequenas, discreto, fora do cartão. */
export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-end justify-between px-1">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-label-2">
        {children}
      </h2>
      {action}
    </div>
  );
}

/** Linha de lista com separador que respeita o recuo do conteúdo. */
export function Row({
  className = "",
  children,
  ...rest
}: ComponentProps<"div">) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-separator ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Button({
  variant = "filled",
  className = "",
  ...rest
}: ComponentProps<"button"> & { variant?: "filled" | "tinted" | "plain" | "danger" }) {
  const styles = {
    filled: "bg-blue text-white active:opacity-80",
    tinted: "bg-fill text-blue active:bg-fill-strong",
    plain: "text-blue active:opacity-60",
    danger: "text-red active:opacity-60",
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-[12px] px-4 py-2.5 text-[15px] font-semibold transition-all disabled:opacity-40 ${styles} ${className}`}
      {...rest}
    />
  );
}

/** Campo com rótulo à esquerda e valor à direita, como nos forms do iOS. */
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1 px-4 py-3 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-separator">
      <span className="text-[13px] font-medium text-label-2">{label}</span>
      {children}
      {hint ? <span className="text-[12px] text-label-3">{hint}</span> : null}
    </label>
  );
}

const inputBase =
  "w-full rounded-[10px] bg-fill px-3 py-2.5 text-[16px] text-label outline-none placeholder:text-label-3 focus:ring-2 focus:ring-blue/50";

export function Input({ className = "", ...rest }: ComponentProps<"input">) {
  return <input className={`${inputBase} ${className}`} {...rest} />;
}

export function Select({ className = "", ...rest }: ComponentProps<"select">) {
  return (
    <select
      className={`${inputBase} appearance-none bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat pr-9 ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5 6 7.5 9 4.5' fill='none' stroke='%238E8E93' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
      }}
      {...rest}
    />
  );
}

/** Estado vazio: um ícone leve, uma frase, e o caminho pra sair dele. */
export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="text-[16px] font-semibold text-label">{title}</p>
      <p className="max-w-xs text-[14px] leading-snug text-label-2">{body}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "good" | "bad" | "warn";
  children: ReactNode;
}) {
  const styles = {
    neutral: "bg-fill text-label-2",
    good: "bg-green/15 text-green",
    bad: "bg-red/15 text-red",
    warn: "bg-orange/15 text-orange",
  }[tone];

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles}`}
    >
      {children}
    </span>
  );
}
