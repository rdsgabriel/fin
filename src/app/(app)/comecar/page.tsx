import type { Metadata } from "next";
import { Onboarding } from "@/components/onboarding";

export const metadata: Metadata = { title: "Começar — Fin" };

export default function ComecarPage() {
  return <Onboarding />;
}
