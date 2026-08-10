import type { Metadata, Viewport } from "next";
import { Nav } from "@/components/nav";
import { RegisterSW } from "@/components/register-sw";
import { getCategories } from "@/lib/queries";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fin — pra onde seu dinheiro vai",
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
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // A tab bar carrega os sheets de "adicionar", que precisam das categorias.
  const categories = await getCategories();

  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">
        <Nav categories={categories} />
        <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-2 sm:pb-16 sm:pt-8">
          {children}
        </main>
        <RegisterSW />
      </body>
    </html>
  );
}
