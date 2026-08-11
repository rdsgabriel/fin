import type { Metadata, Viewport } from "next";
import { RegisterSW } from "@/components/register-sw";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fin · pra onde seu dinheiro vai",
  description:
    "Controle financeiro simples que projeta os próximos meses a partir do que você ganha, gasta e ainda deve.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Fin",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0a090c" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">
        {/* O `beforeinstallprompt` dispara cedo, às vezes antes do React
            montar. Guardamos o evento aqui pra tela de instalação poder
            usá-lo depois — sem isso o botão "Instalar" não teria como
            abrir o diálogo nativo. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__finInstall=e;window.dispatchEvent(new Event('fin:installable'))});`,
          }}
        />
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
