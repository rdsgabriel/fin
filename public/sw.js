/**
 * Service worker.
 *
 * A regra de ouro aqui: dado financeiro NUNCA sai do cache. Navegação e
 * dados vão sempre à rede primeiro; o cache existe só pra o app abrir
 * offline e pra os arquivos estáticos, que têm hash no nome.
 *
 * O nome do cache carrega o carimbo de build (?v= na URL de registro).
 * Build novo, cache novo, e o antigo é apagado na ativação. É isso que
 * impede o app de ficar preso numa versão velha.
 */
const VERSAO = new URL(self.location).searchParams.get("v") || "dev";
const CACHE = `fin-${VERSAO}`;
const CASCA = ["/", "/lancamentos", "/fixos", "/ajustes", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(CASCA))
      // Assume o controle sem esperar as abas antigas fecharem.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// Permite que a página peça a troca imediata quando aceitar atualizar.
self.addEventListener("message", (event) => {
  if (event.data === "assumir-agora") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Server Actions e payloads RSC precisam ser sempre frescos.
  if (url.searchParams.has("_rsc") || request.headers.get("RSC")) return;

  event.respondWith(
    fetch(request)
      .then((resposta) => {
        if (resposta.ok && request.mode === "navigate") {
          const copia = resposta.clone();
          caches.open(CACHE).then((c) => c.put(request, copia));
        }
        return resposta;
      })
      .catch(async () => {
        const guardado = await caches.match(request);
        if (guardado) return guardado;
        if (request.mode === "navigate") return caches.match("/");
        throw new Error("offline");
      }),
  );
});
