import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StepScreen } from "@/components/screens/step";
import { STEPS } from "@/lib/steps";

export const metadata: Metadata = { title: "De zes stappen" };

export default async function Page({ params }: PageProps<"/stappen/[stap]">) {
  const { stap } = await params;
  const step = STEPS.find((s) => String(s.number) === stap);
  if (!step) notFound();
  return <StepScreen step={step.number} />;
}
