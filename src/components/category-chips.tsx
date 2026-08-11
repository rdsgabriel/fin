"use client";

import type { Category } from "@/db/schema";

/** Faixa horizontal de categorias. Escolher é um toque, não um dropdown. */
export function CategoryChips({
  categories,
  value,
  onChange,
  name,
}: {
  categories: Category[];
  value: number | null;
  onChange: (id: number | null) => void;
  name: string;
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
      <input type="hidden" name={name} value={value ?? ""} />
      {categories.map((c) => {
        const selected = c.id === value;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(selected ? null : c.id)}
            aria-pressed={selected}
            className={`pressable flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[14px] font-medium transition-colors ${
              selected
                ? "border-transparent text-white"
                : "border-hairline bg-fill text-ink"
            }`}
            style={selected ? { background: c.color } : undefined}
          >
            <span
              className="size-2 rounded-full"
              style={{ background: selected ? "rgba(255,255,255,0.9)" : c.color }}
            />
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
