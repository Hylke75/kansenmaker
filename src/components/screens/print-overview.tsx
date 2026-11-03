"use client";

import { authorName } from "@/lib/authors";
import { useToday } from "@/hooks/use-today";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { useProjectData, useStore } from "@/lib/store";
import { STATUS_META } from "@/components/km/status-badge";
import { assessmentOutcome } from "@/components/km/assessment-outcome";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

/** Printvriendelijk projectoverzicht (A4). */
export function PrintOverview() {
  const { project, state, userName, allowed } = useStore();
  const today = useToday();
  const { ideas, concepts, audiences, needs } = useProjectData();
  if (!project || !allowed("project.instellingen")) {
    return (
      <main id="inhoud" className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl">Geen toegang</h1>
        <p className="mt-2">Alleen de beheerder kan het projectoverzicht afdrukken.</p>
        <Link href="/" className="mt-4 inline-block font-semibold text-km-green underline">Naar het overzicht</Link>
      </main>
    );
  }
  return (
    <main id="inhoud" className="mx-auto max-w-4xl bg-white p-6 text-[15px] md:p-12 print:max-w-none print:p-0">
      <div data-print-hide className="mb-8 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/beheer?tab=instellingen">
            <ArrowLeft aria-hidden /> Terug naar beheer
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer aria-hidden /> Afdrukken of opslaan als PDF
        </Button>
      </div>
      <p className="text-sm font-bold tracking-widest text-km-muted">HAAGS VERHAAL · KANSENKAMER</p>
      <h1 className="mt-1 text-3xl">{project.name}</h1>
      <p className="mt-1 text-km-muted">Overzicht{today && ` van ${formatDate(today)}`} · voorbeeldgegevens (prototype)</p>

      <h2 className="mt-10 mb-3 border-b border-km-line pb-2 text-2xl">Concepten</h2>
      {concepts.map((c) => (
        <section key={c.id} className="mb-6 break-inside-avoid">
          <h3 className="text-lg">{c.name}</h3>
          <p className="text-sm text-km-muted">
            {STATUS_META[c.status].label} · eigenaar {userName(c.ownerId)} · realiteitstoets: {assessmentOutcome(c.assessment).title.toLowerCase()}
          </p>
          <p className="mt-1">{c.description}</p>
          {state.actions.filter((a) => a.conceptId === c.id && a.status !== "klaar").length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {state.actions
                .filter((a) => a.conceptId === c.id && a.status !== "klaar")
                .map((a) => (
                  <li key={a.id}>
                    {a.description} — {userName(a.ownerId)}
                    {a.deadline && `, ${formatDate(a.deadline)}`}
                  </li>
                ))}
            </ul>
          )}
        </section>
      ))}

      <h2 className="mt-10 mb-3 border-b border-km-line pb-2 text-2xl">Doelgroepen en behoeften</h2>
      {audiences.map((a) => (
        <section key={a.id} className="mb-4 break-inside-avoid">
          <h3 className="text-lg">{a.name}</h3>
          <ul className="list-disc pl-5">
            {needs.filter((n) => n.audienceId === a.id).map((n) => (
              <li key={n.id}>{n.description}</li>
            ))}
          </ul>
        </section>
      ))}

      <h2 className="mt-10 mb-3 border-b border-km-line pb-2 text-2xl">Ideeën</h2>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-km-line">
            <th scope="col" className="py-2 pr-4">Idee</th>
            <th scope="col" className="py-2 pr-4">Status</th>
            <th scope="col" className="py-2">Gedeeld door</th>
          </tr>
        </thead>
        <tbody>
          {ideas.filter((i) => !i.archived).map((i) => (
            <tr key={i.id} className="border-b border-km-line align-top">
              <td className="py-2 pr-4 font-semibold">{i.title}</td>
              <td className="py-2 pr-4">{STATUS_META[i.status].label}</td>
              <td className="py-2">{authorName(i, userName)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
