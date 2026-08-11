import { unstable_cache } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { db, categories, goals, recurrences, settings, transactions } from "@/db";
import { todayISO } from "./month";

/* Toda query aqui recebe `userId` explicitamente. Nada de pegar o usuário
   de um contexto implícito: se um dia alguém esquecer de passar, o
   TypeScript reclama em vez de vazar dado de outra conta. */

/** Tag de cache de uma conta. Toda escrita invalida esta única string. */
export function tagDoUsuario(userId: number) {
  return `dados-${userId}`;
}

async function lerSettings(userId: number) {
  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId));
  return rows[0] ?? null;
}

export async function getSettings(userId: number) {
  const existente = await lerSettings(userId);
  if (existente) return existente;

  // Criar linha é escrita, então fica fora do cache.
  const criada = await db
    .insert(settings)
    .values({ userId, openingDate: todayISO() })
    .returning();
  return criada[0];
}

export function getCategories(userId: number) {
  return db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(categories.kind, categories.name);
}

export function getTransactions(userId: number, limit?: number) {
  const q = db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date), desc(transactions.id));
  return limit ? q.limit(limit) : q;
}

export function getRecurrences(userId: number) {
  return db
    .select()
    .from(recurrences)
    .where(eq(recurrences.userId, userId))
    .orderBy(desc(recurrences.kind), recurrences.dayOfMonth);
}

export function getGoals(userId: number) {
  return db
    .select()
    .from(goals)
    .where(eq(goals.userId, userId))
    .orderBy(goals.targetCents);
}

/**
 * Tudo que as telas precisam, numa consulta só e em cache.
 *
 * Antes cada navegação disparava cinco consultas ao Neon, e como o banco
 * está na rede a troca de aba esperava a ida e a volta. Agora o resultado
 * fica em cache no servidor sob a tag da conta; qualquer escrita chama
 * `updateTag` e a próxima leitura já vem atualizada.
 */
export async function getDadosDoUsuario(userId: number) {
  const carregar = unstable_cache(
    async () => {
      const [s, txs, recs, cats, metas] = await Promise.all([
        lerSettings(userId),
        getTransactions(userId),
        getRecurrences(userId),
        getCategories(userId),
        getGoals(userId),
      ]);
      return {
        settings: s,
        transactions: txs,
        recurrences: recs,
        categories: cats,
        goals: metas,
      };
    },
    ["dados-do-usuario", String(userId)],
    /* A tag cobre toda escrita feita pelo app, que invalida na hora. Este
       prazo é só rede de segurança pra mudança feita por fora (o script de
       seed, por exemplo), que o app não tem como saber que aconteceu. */
    { tags: [tagDoUsuario(userId)], revalidate: 60 },
  );

  const dados = await carregar();

  // Conta recém-criada ainda não tem linha de preferências; cria e devolve
  // sem cache, porque a próxima leitura já vai encontrar tudo.
  if (!dados.settings) {
    return { ...dados, settings: await getSettings(userId) };
  }
  return { ...dados, settings: dados.settings };
}

/** Mantém o nome antigo, que várias telas já usam. */
export const getProjectionData = getDadosDoUsuario;
