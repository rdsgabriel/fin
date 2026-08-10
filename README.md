# Fin

Controle financeiro pessoal que **projeta os próximos meses** a partir do que
você ganha, gasta e ainda deve parcelado. PWA, instalável no celular.

## Rodando

```bash
npm install
cp .env.example .env      # cole a connection string do Neon em DATABASE_URL
npm run db:setup          # cria as tabelas + categorias padrão
npm run dev
```

| Script | O que faz |
|---|---|
| `npm run dev` | sobe em http://localhost:3000 |
| `npm run db:setup` | cria as tabelas (idempotente) |
| `npm run db:seed` | popula um cenário de exemplo pra ver o app cheio |
| `npm run db:seed -- --clear` | apaga lançamentos e fixos |
| `npm run build` | build de produção |

## Como a projeção funciona

Todo o cálculo vive em [`src/lib/projection.ts`](src/lib/projection.ts) e é uma
função pura — dá pra testar sem banco.

**Saldo de hoje** = saldo de partida + tudo lançado desde a data dele.

**Cada mês futuro** = saldo do mês anterior + entradas fixas − saídas fixas −
gasto variável estimado.

Três decisões que fazem a projeção não mentir:

1. **Parcela é só uma recorrência com data de fim.** Por isso o gráfico mostra
   o saldo acelerando no mês seguinte à última parcela — que é a informação que
   uma planilha comum não te dá.
2. **O mês corrente é parcial.** Só conta o que ainda vence depois de hoje, e
   rateia o gasto variável pelos dias que faltam. Sem isso a projeção conta em
   dobro o que você já pagou.
3. **O gasto variável é estimado descontando os fixos.** Média dos últimos N
   meses fechados *menos* as recorrências ativas naqueles meses — senão aluguel
   entraria uma vez como fixo e outra na média.

Dá pra sobrescrever a estimativa manualmente em **Ajustes**.

## Stack

Next.js 16 (App Router, Server Actions) · Postgres no Neon · Drizzle ·
Tailwind 4 · gráfico em SVG escrito à mão, sem lib.

## Estrutura

```
src/
  app/            páginas + server actions
  components/     UI (cards, forms, gráfico)
  db/             schema Drizzle
  lib/
    projection.ts o motor da projeção
    month.ts      datas como string, sem armadilha de fuso
    money.ts      centavos como inteiro, parser de "1.234,56"
```

Dinheiro é **sempre inteiro em centavos e sempre positivo** — o sinal vem do
campo `kind`. Nunca use float pra dinheiro.

## O que ainda não tem

- Autenticação (é single-user; qualquer um com a URL vê tudo)
- Sincronização bancária (Open Finance via Pluggy/Belvo)
- Metas e reserva de emergência
- Import de OFX/CSV
