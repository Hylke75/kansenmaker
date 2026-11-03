import { ASSESSMENT_QUESTIONS } from "@/lib/sample-data";
import type { AssessmentValue } from "@/lib/types";

export type Outcome = { tone: "obstakel" | "onbekend" | "aannemelijk" | "leeg"; title: string; text: string };

/** Uitkomst van de realiteitstoets. Bewust geen automatische goedkeuring. */
export function assessmentOutcome(a: Record<string, AssessmentValue | undefined>): Outcome & { counts: Record<string, number> } {
  const values = ASSESSMENT_QUESTIONS.map((q) => a[q.id]);
  const counts = {
    aannemelijk: values.filter((v) => v === "aannemelijk").length,
    onbekend: values.filter((v) => v === "onbekend").length,
    obstakel: values.filter((v) => v === "obstakel").length,
    open: values.filter((v) => !v).length,
  };
  if (counts.open === values.length)
    return { counts, tone: "leeg", title: "Nog niet beoordeeld", text: "Beoordeel per stelling wat we al weten." };
  if (counts.obstakel > 0)
    return {
      counts,
      tone: "obstakel",
      title: "Er is minstens één obstakel",
      text: "Bespreek eerst of het obstakel op te lossen is voordat het concept verdergaat.",
    };
  if (counts.onbekend > 0 || counts.open > 0)
    return {
      counts,
      tone: "onbekend",
      title: "Er ontbreken nog gegevens",
      text: "Formuleer eerst een aantal onderzoeksvragen.",
    };
  return {
    counts,
    tone: "aannemelijk",
    title: "Alle punten lijken aannemelijk",
    text: "De beheerder kan besluiten of het concept klaar is voor een proef.",
  };
}
