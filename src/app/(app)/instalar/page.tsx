import type { Metadata } from "next";
import { InstallGate } from "@/components/install-gate";

export const metadata: Metadata = { title: "Instalar o Fin" };

export default function InstalarPage() {
  return <InstallGate />;
}
