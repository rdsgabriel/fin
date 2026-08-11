/** Categorias criadas junto com cada conta nova. */
export const DEFAULT_CATEGORIES: {
  name: string;
  kind: "income" | "expense";
  color: string;
}[] = [
  { name: "Salário", kind: "income", color: "#34C759" },
  { name: "Freela / Extra", kind: "income", color: "#30D158" },
  { name: "Moradia", kind: "expense", color: "#FF9500" },
  { name: "Mercado", kind: "expense", color: "#FF375F" },
  { name: "Transporte", kind: "expense", color: "#5E5CE6" },
  { name: "Saúde", kind: "expense", color: "#FF2D55" },
  { name: "Lazer", kind: "expense", color: "#BF5AF2" },
  { name: "Assinaturas", kind: "expense", color: "#0A84FF" },
  { name: "Educação", kind: "expense", color: "#64D2FF" },
  { name: "Outros", kind: "expense", color: "#8E8E93" },
];
