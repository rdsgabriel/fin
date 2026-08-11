import type { NextConfig } from "next";

/* Carimbo de build. Vai na URL do service worker, o que muda os bytes do
   script registrado e faz o navegador buscar a versão nova. Sem isso o SW
   antigo continua servindo a casca velha do app depois de um deploy. */
const BUILD = process.env.NEXT_PUBLIC_BUILD ?? String(Date.now());

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD: BUILD },

  // O selo de dev flutuante fica por cima do dock e polui os screenshots.
  devIndicators: false,

  experimental: {
    /* Cache de cliente. Por padrão `dynamic` é 0, ou seja, toda volta pra
       uma aba já visitada refazia a requisição inteira ao servidor. Com 60s
       o RSC já baixado é reaproveitado e a troca de aba é instantânea.
       Escritas não ficam presas nisso: as Server Actions chamam updateTag,
       que atualiza o cache do servidor e força o cliente a rebuscar. */
    staleTimes: { dynamic: 60, static: 300 },
  },
  async headers() {
    return [
      {
        // O service worker precisa ser servido do root com escopo total.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
