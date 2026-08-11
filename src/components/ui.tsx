import type { ComponentProps, ReactNode } from "react";

/** Cartão de vidro. O bloco de conteúdo padrão. */
export function Card({
  className = "",
  children,
  ...rest
}: ComponentProps<"section">) {
  return (
    <section
      className={`material overflow-hidden rounded-[24px] ${className}`}
      {...rest}
    >
      {children}
    </section>
  );
}

/** Rótulo de capítulo — o fio que costura a narrativa da home. */
export function Chapter({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-end justify-between gap-3 px-1">
      <h2 className="chapter">{children}</h2>
      {action}
    </div>
  );
}

export function Row({
  className = "",
  children,
  ...rest
}: ComponentProps<"div">) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-hairline ${className}`}
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
}: ComponentProps<"button"> & {
  variant?: "filled" | "tinted" | "plain" | "danger";
}) {
  const styles = {
    filled: "bg-brand text-white",
    tinted: "bg-brand-soft text-brand",
    plain: "text-brand",
    danger: "text-neg",
  }[variant];

  return (
    <button
      className={`pressable inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-3 text-[15px] font-semibold disabled:opacity-40 ${styles} ${className}`}
      {...rest}
    />
  );
}

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
    <label className="flex flex-col gap-1.5 px-4 py-3.5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-hairline">
      <span className="text-[13px] font-semibold text-ink-2">{label}</span>
      {children}
      {hint ? (
        <span className="text-[12px] leading-snug text-ink-3">{hint}</span>
      ) : null}
    </label>
  );
}

const inputBase =
  "w-full rounded-[14px] bg-fill px-3.5 py-3 text-[16px] text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-brand/40";

export function Input({ className = "", ...rest }: ComponentProps<"input">) {
  return <input className={`${inputBase} ${className}`} {...rest} />;
}

export function Select({ className = "", ...rest }: ComponentProps<"select">) {
  return (
    <select
      className={`${inputBase} appearance-none bg-[length:12px] bg-[right_0.9rem_center] bg-no-repeat pr-10 ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5 6 7.5 9 4.5' fill='none' stroke='%238b8794' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
      }}
      {...rest}
    />
  );
}

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
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="title text-[19px] font-semibold">{title}</p>
      <p className="max-w-xs text-[14px] leading-snug text-ink-2">{body}</p>
      {action ? <div className="mt-3">{action}</div> : null}
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
    neutral: "bg-fill text-ink-2",
    good: "bg-pos/14 text-pos",
    bad: "bg-neg/14 text-neg",
    warn: "bg-warn/16 text-warn",
  }[tone];

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${styles}`}
    >
      {children}
    </span>
  );
}
