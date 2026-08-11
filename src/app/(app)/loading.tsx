/**
 * Toda página do app é dinâmica e vai ao banco, então há um intervalo entre
 * o toque e a tela nova. Sem este arquivo o Next segura a tela anterior
 * congelada nesse intervalo, e a navegação parece travada. Com ele a troca
 * é instantânea: o esqueleto entra na hora e o conteúdo o substitui.
 */
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-8 pt-6" aria-hidden="true">
      <div className="flex flex-col gap-3">
        <Bloco className="h-3 w-40" />
        <Bloco className="h-4 w-32" />
        <Bloco className="h-12 w-64" />
        <Bloco className="h-3 w-56" />
      </div>

      <Bloco className="h-16 w-full rounded-[24px]" />

      <div className="flex flex-col gap-3">
        <Bloco className="h-3 w-28" />
        <Bloco className="h-40 w-full rounded-[24px]" />
      </div>

      <div className="flex flex-col gap-3">
        <Bloco className="h-3 w-32" />
        <Bloco className="h-56 w-full rounded-[24px]" />
      </div>
    </div>
  );
}

function Bloco({ className = "" }: { className?: string }) {
  return <div className={`rounded-full bg-fill ${className}`} />;
}
