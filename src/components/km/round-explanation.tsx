import { ChevronDown } from "lucide-react";
import type { SessionRoundDef } from "@/lib/types";
import { HOW_IT_WORKS, STEP6_NOTE, STEPS, WELCOME } from "@/lib/steps";
import { cn } from "@/lib/utils";

/** Uitleg van Haags Verhaal bij een ronde: intro, ‘Denk eens na over deze vragen’ en ‘Waarom vragen we dit?’. */
export function RoundExplanation({ round, className }: { round: SessionRoundDef; className?: string }) {
  const steps = (round.steps ?? []).map((n) => STEPS[n - 1]).filter(Boolean);
  const intro = steps.flatMap((s) => s.intro);
  const criteria = steps.flatMap((s) => s.criteria ?? []);
  const questions = [...steps.flatMap((s) => s.questions ?? []), ...(round.explanation?.questions ?? [])];
  const why = [...steps.flatMap((s) => s.why), ...(round.explanation?.why ?? [])];
  const hasStep6 = steps.some((s) => s.number === 6);

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {intro.length > 0 && (
        <div className="flex flex-col gap-3 text-lg leading-relaxed">
          {intro.map((t) => (
            <p key={t}>{t}</p>
          ))}
          {criteria.length > 0 && (
            <ol className="ml-6 list-decimal space-y-1">
              {criteria.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
          )}
          {hasStep6 && <p>{STEP6_NOTE}</p>}
        </div>
      )}
      {questions.length > 0 && (
        <section aria-labelledby={`vragen-${round.number}`} className="rounded-2xl bg-km-softgreen p-5">
          <h3 id={`vragen-${round.number}`} className="text-lg">
            Denk eens na over deze vragen
          </h3>
          <ul className="mt-2 ml-5 list-disc space-y-1.5">
            {questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      )}
      {why.length > 0 && (
        <section aria-labelledby={`waarom-${round.number}`} className="rounded-2xl border border-km-line bg-white p-5">
          <h3 id={`waarom-${round.number}`} className="text-lg">
            Waarom vragen we dit?
          </h3>
          {why.map((t) => (
            <p key={t} className="mt-2">
              {t}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}

/** Inklapbare introductie ‘Over het Haags Verhaal’ bovenaan een werksessie. */
export function SessionIntro({ defaultOpen }: { defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border border-km-line bg-white">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-3 font-heading text-lg font-bold text-km-green [&::-webkit-details-marker]:hidden">
        {WELCOME.title}
        <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="flex flex-col gap-3 px-5 pb-5 leading-relaxed">
        {WELCOME.paragraphs.map((t) => (
          <p key={t}>{t}</p>
        ))}
        <p className="font-semibold text-km-green">{WELCOME.question}</p>
        {WELCOME.paragraphs2.map((t) => (
          <p key={t}>{t}</p>
        ))}
        <p className="font-semibold text-km-green">{WELCOME.highlight}</p>
        {WELCOME.paragraphs3.map((t) => (
          <p key={t}>{t}</p>
        ))}
        <p className="rounded-xl bg-km-softgreen p-4 font-semibold text-km-green">{HOW_IT_WORKS.highlight}</p>
      </div>
    </details>
  );
}
