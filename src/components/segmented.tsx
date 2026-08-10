"use client";

/** Segmented control do iOS: pílula que desliza entre duas ou três opções. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  name,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  name?: string;
}) {
  return (
    <div className="flex rounded-[10px] bg-fill p-0.5">
      {name ? <input type="hidden" name={name} value={value} /> : null}
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={opt.value === value}
          className={`flex-1 rounded-[8px] px-3 py-1.5 text-[14px] font-medium transition-all ${
            opt.value === value
              ? "material-thick text-label shadow-[var(--shadow-1)]"
              : "text-label-2 active:opacity-60"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
