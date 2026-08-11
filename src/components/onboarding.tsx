"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveOnboarding, type OnboardingData } from "@/app/actions";
import { buildProjection, buildStory } from "@/lib/projection";
import { formatMoney } from "@/lib/money";
import { firstDayOf, formatMonthLong, monthKeyOf, todayISO } from "@/lib/month";
import type { Recurrence, Settings } from "@/db/schema";
import { Keypad } from "./keypad";

type FixedItem = { id: number; description: string; digits: string };
type Parcela = { id: number; description: string; digits: string; count: number };

const SUGESTOES = [
  "Aluguel",
  "Condomínio",
  "Luz",
  "Internet",
  "Celular",
  "Transporte",
  "Academia",
  "Streaming",
];

const TOTAL_STEPS = 6;

/**
 * Onboarding conversacional: uma pergunta por tela, do jeito que uma pessoa
 * perguntaria. O último passo não é um "salvar" — é a revelação da projeção
 * montada com o que você acabou de contar. É o momento em que o app prova
 * que serve pra alguma coisa.
 */
export function Onboarding() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);

  const [saldo, setSaldo] = useState("");
  const [rendaDigits, setRendaDigits] = useState("");
  const [rendaDia, setRendaDia] = useState(5);
  const [rendaVariavel, setRendaVariavel] = useState(false);
  const [fixos, setFixos] = useState<FixedItem[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [variavelDigits, setVariavelDigits] = useState("");

  const cents = (d: string) => Number(d || "0");

  const data: OnboardingData = useMemo(
    () => ({
      openingBalanceCents: cents(saldo),
      income: cents(rendaDigits)
        ? {
            description: rendaVariavel ? "Renda mensal (média)" : "Salário",
            amountCents: cents(rendaDigits),
            dayOfMonth: rendaVariavel ? 1 : rendaDia,
            variavel: rendaVariavel,
          }
        : null,
      fixed: fixos
        .filter((f) => f.description.trim() && cents(f.digits))
        .map((f) => ({
          description: f.description.trim(),
          amountCents: cents(f.digits),
          dayOfMonth: 10,
        })),
      installments: parcelas
        .filter((p) => p.description.trim() && cents(p.digits))
        .map((p) => ({
          description: p.description.trim(),
          amountCents: cents(p.digits),
          count: p.count,
        })),
      variableMonthlyCents: cents(variavelDigits),
    }),
    [saldo, rendaDigits, rendaDia, rendaVariavel, fixos, parcelas, variavelDigits],
  );

  function finish() {
    startTransition(async () => {
      await saveOnboarding(data);
      router.push("/");
      router.refresh();
    });
  }

  const steps = [
    <Step
      key="saldo"
      pergunta="Quanto você tem hoje?"
      ajuda="Some conta corrente, poupança e o dinheiro na carteira. É o ponto de partida da projeção."
      podeSeguir={cents(saldo) > 0}
      onNext={() => setStep(1)}
    >
      <Keypad digits={saldo} onChange={setSaldo} tone="income" />
    </Step>,

    <Step
      key="renda"
      pergunta="Quanto entra por mês?"
      ajuda={
        rendaVariavel
          ? "Some os últimos meses e divida — uma média já serve. Dá pra ajustar depois."
          : "O valor que cai na conta todo mês. Dá pra ajustar depois."
      }
      podeSeguir={cents(rendaDigits) > 0}
      onBack={() => setStep(0)}
      onNext={() => setStep(2)}
    >
      <Keypad digits={rendaDigits} onChange={setRendaDigits} tone="income" />

      <div className="flex flex-col items-center gap-3 pt-3">
        <div className="flex rounded-full bg-fill p-1">
          {[
            { v: false, label: "É fixa" },
            { v: true, label: "Varia todo mês" },
          ].map((op) => (
            <button
              key={op.label}
              type="button"
              onClick={() => setRendaVariavel(op.v)}
              aria-pressed={rendaVariavel === op.v}
              className={`pressable rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${
                rendaVariavel === op.v
                  ? "bg-brand text-white"
                  : "text-ink-2"
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>

        {rendaVariavel ? (
          <p className="max-w-xs text-center text-[13px] leading-snug text-ink-3">
            A projeção vai usar essa média como base. Conforme você for
            lançando o que entra de verdade, ela fica mais fiel.
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-[14px] text-ink-2">Cai todo dia</span>
            <input
              type="number"
              min={1}
              max={31}
              value={rendaDia}
              onChange={(e) => setRendaDia(Number(e.target.value) || 1)}
              className="tnum w-16 rounded-full bg-fill px-3 py-1.5 text-center text-[15px] font-semibold text-ink outline-none"
            />
          </div>
        )}
      </div>
    </Step>,

    <Step
      key="fixos"
      pergunta="O que sai todo mês?"
      ajuda="Aluguel, internet, academia — o que vence sempre. Toque numa sugestão pra começar."
      podeSeguir
      rotuloSeguir={data.fixed.length ? "Continuar" : "Não tenho fixos"}
      onBack={() => setStep(1)}
      onNext={() => setStep(3)}
    >
      <ListaFixos itens={fixos} onChange={setFixos} />
    </Step>,

    <Step
      key="parcelas"
      pergunta="Tem parcela rolando?"
      ajuda="É aqui que mora a mágica: o app sabe quando cada uma acaba e mostra o dinheiro voltando a sobrar."
      podeSeguir
      rotuloSeguir={data.installments.length ? "Continuar" : "Não tenho parcelas"}
      onBack={() => setStep(2)}
      onNext={() => setStep(4)}
    >
      <ListaParcelas itens={parcelas} onChange={setParcelas} />
    </Step>,

    <Step
      key="variavel"
      pergunta="E o resto do mês?"
      ajuda="Mercado, delivery, farmácia, um rolê — tudo que não é fixo. Um chute honesto vale mais que zero: sem esse número a projeção fica otimista demais."
      podeSeguir
      rotuloSeguir={cents(variavelDigits) ? "Continuar" : "Não sei estimar"}
      onBack={() => setStep(3)}
      onNext={() => setStep(5)}
    >
      <Keypad digits={variavelDigits} onChange={setVariavelDigits} />
      <p className="px-2 pt-3 text-center text-[13px] leading-snug text-ink-3">
        Depois de um mês lançando gastos, o app passa a calcular isso sozinho
        e ignora o chute.
      </p>
    </Step>,

    <Revelacao
      key="fim"
      data={data}
      pending={pending}
      onBack={() => setStep(4)}
      onFinish={finish}
    />,
  ];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-6 pt-4">
      <div className="flex gap-1.5 pb-8">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
              i <= step ? "bg-brand" : "bg-fill-2"
            }`}
          />
        ))}
      </div>
      {steps[step]}
    </div>
  );
}

function Step({
  pergunta,
  ajuda,
  children,
  podeSeguir,
  rotuloSeguir = "Continuar",
  onNext,
  onBack,
}: {
  pergunta: string;
  ajuda: string;
  children: React.ReactNode;
  podeSeguir: boolean;
  rotuloSeguir?: string;
  onNext: () => void;
  onBack?: () => void;
}) {
  return (
    <div key={pergunta} className="animate-step-in flex flex-1 flex-col">
      <h1 className="display text-[clamp(30px,8.5vw,38px)]">
        {pergunta}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{ajuda}</p>

      <div className="flex-1 py-6">{children}</div>

      <div className="flex gap-3">
        {onBack ? (
          <button
            onClick={onBack}
            className="pressable rounded-full bg-fill px-5 py-4 text-[16px] font-semibold text-ink-2"
          >
            Voltar
          </button>
        ) : null}
        <button
          onClick={onNext}
          disabled={!podeSeguir}
          className="pressable flex-1 rounded-full bg-brand py-4 text-[17px] font-bold text-white disabled:opacity-25"
        >
          {rotuloSeguir}
        </button>
      </div>
    </div>
  );
}

function ListaFixos({
  itens,
  onChange,
}: {
  itens: FixedItem[];
  onChange: (v: FixedItem[]) => void;
}) {
  const usados = new Set(itens.map((i) => i.description));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {SUGESTOES.filter((s) => !usados.has(s)).map((s) => (
          <button
            key={s}
            onClick={() =>
              onChange([...itens, { id: Date.now(), description: s, digits: "" }])
            }
            className="pressable rounded-full bg-fill px-3.5 py-2 text-[14px] font-medium text-ink"
          >
            + {s}
          </button>
        ))}
      </div>

      {itens.map((item, i) => (
        <div key={item.id} className="flex items-center gap-2">
          <input
            value={item.description}
            onChange={(e) => {
              const next = [...itens];
              next[i] = { ...item, description: e.target.value };
              onChange(next);
            }}
            placeholder="Nome"
            className="min-w-0 flex-1 rounded-full bg-fill px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-3"
          />
          <input
            inputMode="numeric"
            value={item.digits ? formatMoney(Number(item.digits)) : ""}
            onChange={(e) => {
              const next = [...itens];
              next[i] = { ...item, digits: e.target.value.replace(/\D/g, "") };
              onChange(next);
            }}
            placeholder="R$ 0,00"
            className="tnum w-32 rounded-full bg-fill px-4 py-3 text-right text-[15px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-3"
          />
          <button
            onClick={() => onChange(itens.filter((x) => x.id !== item.id))}
            aria-label={`Remover ${item.description}`}
            className="pressable shrink-0 text-[20px] leading-none text-ink-3"
          >
            ×
          </button>
        </div>
      ))}

      <button
        onClick={() =>
          onChange([...itens, { id: Date.now(), description: "", digits: "" }])
        }
        className="pressable self-start text-[15px] font-semibold text-brand"
      >
        + Outro
      </button>
    </div>
  );
}

function ListaParcelas({
  itens,
  onChange,
}: {
  itens: Parcela[];
  onChange: (v: Parcela[]) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {itens.map((item, i) => {
        const patch = (p: Partial<Parcela>) => {
          const next = [...itens];
          next[i] = { ...item, ...p };
          onChange(next);
        };
        return (
          <div key={item.id} className="flex flex-col gap-2 rounded-[20px] bg-fill p-3">
            <div className="flex items-center gap-2">
              <input
                value={item.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="O que foi? (sofá, celular…)"
                className="min-w-0 flex-1 rounded-full bg-bg px-4 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-3"
              />
              <button
                onClick={() => onChange(itens.filter((x) => x.id !== item.id))}
                aria-label="Remover parcela"
                className="pressable shrink-0 text-[20px] leading-none text-ink-3"
              >
                ×
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                value={item.digits ? formatMoney(Number(item.digits)) : ""}
                onChange={(e) => patch({ digits: e.target.value.replace(/\D/g, "") })}
                placeholder="Valor da parcela"
                className="tnum min-w-0 flex-1 rounded-full bg-bg px-4 py-2.5 text-[15px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-3"
              />
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-bg px-2 py-1">
                <button
                  onClick={() => patch({ count: Math.max(1, item.count - 1) })}
                  aria-label="Menos parcelas"
                  className="pressable size-7 rounded-full text-[18px] leading-none text-ink-2"
                >
                  −
                </button>
                <span className="tnum w-9 text-center text-[15px] font-bold">
                  {item.count}x
                </span>
                <button
                  onClick={() => patch({ count: Math.min(120, item.count + 1) })}
                  aria-label="Mais parcelas"
                  className="pressable size-7 rounded-full text-[18px] leading-none text-ink-2"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <button
        onClick={() =>
          onChange([
            ...itens,
            { id: Date.now(), description: "", digits: "", count: 12 },
          ])
        }
        className="pressable self-start rounded-full bg-fill px-4 py-2.5 text-[15px] font-semibold text-brand"
      >
        + Adicionar parcela
      </button>
    </div>
  );
}

/** O pagamento pela paciência: a projeção montada na hora, antes de salvar. */
function Revelacao({
  data,
  pending,
  onBack,
  onFinish,
}: {
  data: OnboardingData;
  pending: boolean;
  onBack: () => void;
  onFinish: () => void;
}) {
  const projection = useMemo(() => {
    const hoje = todayISO();
    const startMonth = firstDayOf(monthKeyOf(hoje));
    let id = 0;

    // Mesmo formato que o banco devolveria, pra reaproveitar buildProjection
    // sem nenhuma variante "de preview" que pudesse divergir do real.
    const base = {
      // Preview local, nada disso vai pro banco — o dono real é atribuído
      // no servidor, em saveOnboarding.
      userId: 0,
      categoryId: null,
      startMonth,
      active: true,
      createdAt: new Date(),
    };

    const recs: Recurrence[] = [
      ...(data.income
        ? [
            {
              ...base,
              id: ++id,
              description: data.income.description,
              amountCents: data.income.amountCents,
              kind: "income" as const,
              dayOfMonth: data.income.dayOfMonth,
              endMonth: null,
            },
          ]
        : []),
      ...data.fixed.map((f) => ({
        ...base,
        id: ++id,
        description: f.description,
        amountCents: f.amountCents,
        kind: "expense" as const,
        dayOfMonth: f.dayOfMonth,
        endMonth: null,
      })),
      ...data.installments.map((p) => ({
        ...base,
        id: ++id,
        description: p.description,
        amountCents: p.amountCents,
        kind: "expense" as const,
        dayOfMonth: 10,
        // Última parcela: começa neste mês, então acaba em count-1 meses.
        endMonth: monthPlus(startMonth, p.count - 1),
      })),
    ];

    const settings: Settings = {
      userId: 0,
      openingBalanceCents: data.openingBalanceCents,
      openingDate: hoje,
      lookbackMonths: 3,
      variableOverrideCents: data.variableMonthlyCents || null,
      horizonMonths: 12,
      installPrompted: true,
    };

    return buildProjection({
      settings,
      transactions: [],
      recurrences: recs,
      horizonMonths: 12,
    });
  }, [data]);

  const last = projection.months.at(-1)!;
  const cresce = last.endBalance >= projection.currentBalance;
  // Só os marcos bons, e no máximo três — é uma comemoração, não um relatório.
  const marcos = buildStory(projection)
    .filter((e) => e.tone === "pos" && e.id !== `fim-${last.month}`)
    .slice(0, 3);

  return (
    <div className="animate-step-in flex flex-1 flex-col">
      <p className="chapter mb-3">Pronto</p>
      <h1 className="display text-[clamp(28px,7.5vw,34px)]">
        Em {formatMonthLong(last.month)}
        <br />
        você vai ter
      </h1>

      <p
        className={`display animate-pop-in mt-5 text-[clamp(40px,12vw,54px)] font-bold ${
          last.endBalance < 0 ? "text-neg" : "text-ink"
        }`}
        style={{ animationDelay: "220ms" }}
      >
        {formatMoney(last.endBalance)}
      </p>

      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        {projection.monthlyNet >= 0
          ? `No ritmo de hoje sobram ${formatMoney(projection.monthlyNet)} por mês.`
          : `No ritmo de hoje faltam ${formatMoney(-projection.monthlyNet)} por mês — e o app vai te mostrar exatamente onde.`}
        {data.installments.length
          ? " E isso já conta o mês em que cada parcela sua acaba."
          : ""}
      </p>

      {!cresce ? (
        <p className="mt-4 rounded-[18px] bg-neg/10 px-4 py-3 text-[13.5px] leading-snug text-neg">
          Suas saídas passam das entradas. Não é o fim do mundo — é justamente
          isso que o app existe pra te ajudar a virar.
        </p>
      ) : null}

      <RevealChart months={projection.months} start={projection.currentBalance} />

      {marcos.length ? (
        <ul className="mt-5 flex flex-col gap-2">
          {marcos.map((m, i) => (
            <li
              key={m.id}
              className="rise flex items-center gap-2.5 text-[13.5px]"
              style={{ animationDelay: `${900 + i * 140}ms` }}
            >
              <span className="size-2 shrink-0 rounded-full bg-pos" />
              <span className="text-ink-2">{m.title}</span>
              <span className="ml-auto font-semibold text-ink-3">{m.label}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex-1" />

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="pressable rounded-full bg-fill px-5 py-4 text-[16px] font-semibold text-ink-2"
        >
          Voltar
        </button>
        <button
          onClick={onFinish}
          disabled={pending}
          className="pressable flex-1 rounded-full py-4 text-[17px] font-bold text-white shadow-[var(--shadow-2)] disabled:opacity-50"
        >
          {pending ? "Montando…" : "Abrir meu app"}
        </button>
      </div>
    </div>
  );
}

/**
 * A curva se desenhando da esquerda pra direita. `pathLength="1"` normaliza
 * o comprimento do traço, então dá pra animar o dashoffset de 1 a 0 sem
 * medir o path de verdade em JS.
 */
function RevealChart({
  months,
  start,
}: {
  months: { endBalance: number }[];
  start: number;
}) {
  const W = 320;
  const H = 96;

  const values = [start, ...months.map((m) => m.endBalance)];
  const min = Math.min(0, ...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const x = (i: number) => (i / (values.length - 1)) * W;
  const y = (v: number) => 6 + (1 - (v - min) / span) * (H - 12);
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(v)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-7 h-auto w-full overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="reveal-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path
        d={`${line} L${W} ${H} L0 ${H} Z`}
        fill="url(#reveal-fill)"
        className="animate-fade-in"
        style={{ animationDelay: "1s", animationFillMode: "backwards" }}
      />
      <path
        d={line}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        vectorEffect="non-scaling-stroke"
        style={{
          strokeDasharray: 1,
          animation: "draw 1.1s var(--ease-out-soft) 0.35s backwards",
          ["--len" as string]: 1,
        }}
      />
      <circle
        cx={x(values.length - 1)}
        cy={y(values.at(-1)!)}
        r="5"
        fill="var(--brand)"
        className="animate-pop-in"
        style={{ animationDelay: "1.3s" }}
      />
    </svg>
  );
}

function monthPlus(startMonth: string, n: number): string {
  const key = monthKeyOf(startMonth);
  const total =
    Number(key.slice(0, 4)) * 12 + (Number(key.slice(5, 7)) - 1) + n;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}-01`;
}
