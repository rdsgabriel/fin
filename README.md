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
| `npm run shots [dark]` | screenshots das telas em `./shots` (precisa do dev rodando) |
| `npm run e2e` | passa pelo onboarding inteiro e confere os números na home |

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

## Conta e primeiro acesso

`criar conta` → `/instalar` (PWA) → `/comecar` (onboarding) → app.

Criar conta já loga. Autenticação é própria e sem dependências: senha com
`scrypt` do Node (`salt:hash`), sessão como token aleatório de 32 bytes num
cookie `httpOnly`. Rotas protegidas vivem em `src/app/(app)/`, cujo layout
chama `requireUser()` — não existe página do app acessível sem sessão.

**Os dados são por usuário.** Toda query em `queries.ts` recebe `userId`
explicitamente, e todo delete/update filtra por `userId` junto com o `id` —
trocar um id no HTML não alcança a conta de outra pessoa. O `npm run e2e`
testa exatamente isso.

A tela de instalar o PWA é pulada no desktop e detecta a plataforma: no
Android dispara o diálogo nativo via `beforeinstallprompt`; no iOS a Apple
não expõe API de instalação, então mostra o caminho pelo Compartilhar.

## Metas: guardar não é gastar

O erro clássico seria cadastrar "vou guardar R$ 500" como despesa. O dinheiro
guardado **continua seu** — a curva do gráfico já é a poupança acumulada. Se a
meta virasse recorrência de saída, a projeção ficaria pessimista na exata
medida da sua disciplina.

Então metas não entram no cálculo do saldo. Elas fazem duas coisas:

1. **Linha de chegada** — em que mês a projeção cruza o alvo, e quanto falta
   por mês se houver prazo. Esse "falta" sai do saldo *projetado* na data do
   prazo, não de uma extrapolação do saldo de hoje.
2. **Guardar antes** — o aporte mensal sai do teto de gasto do mês. É por isso
   que o primeiro número da home é *"você pode gastar R$ X sem atrasar suas
   metas"* em vez de *"você tem R$ Y"*. Separar primeiro e viver com o resto é
   o que funciona; guardar o que sobra é o que não funciona.

## Editar depois

Aumento de salário, reajuste de aluguel, meta que mudou: tudo que o onboarding
coleta é editável. Fixos e parcelas abrem pra edição ao toque em **Fixos** (a
data de início é preservada, que é o que ancora a projeção); saldo de partida e
gasto variável ficam em **Ajustes**, junto com as metas.

## A narrativa

A home não é um dashboard, é uma história em quatro capítulos — cada um
respondendo a próxima pergunta que a pessoa faria:

1. **Você tem X** — saldo de hoje + pra onde vai cada real que entra
2. **Se nada mudar** — a projeção, com a linha do tempo arrastável
3. **O caminho até lá** — os pontos de virada como eventos: cada parcela que
   quita, o mês em que o saldo fura o zero, o mês em que a reserva fecha
4. **Mês a mês** — a tabela, fechada por padrão, pra quem quiser conferir

O capítulo 3 sai de `buildStory()` em [`src/lib/projection.ts`](src/lib/projection.ts).
Uma tabela de saldos é um relatório; o que prende é a sequência de
acontecimentos.

O onboarding em `/comecar` segue a mesma lógica: uma pergunta por tela, e o
último passo não é um "salvar" — é a projeção montada na hora com o que você
acabou de contar.

## Design

Apple dá a precisão (tipografia apertada, materiais translúcidos, molas no
movimento); Lovable dá o calor (fundo creme, orbes de gradiente, cantos
generosos). Tokens em [`src/app/globals.css`](src/app/globals.css).

A paleta foi validada contra daltonismo: **teal↔vermelho tem ΔE 11.6 em
deuteranopia**, contra 2.7 do verde↔vermelho — que é indistinguível pra cerca
de 8% dos homens. Por isso "sobra" é teal, não verde.

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
