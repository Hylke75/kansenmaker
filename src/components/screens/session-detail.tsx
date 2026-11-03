"use client";

import { authorName } from "@/lib/authors";
import * as React from "react";
import Link from "next/link";
import { Download, MapPin, Pencil, Presentation, Users, ThumbsUp } from "lucide-react";
import { useProjectData, useStore } from "@/lib/store";
import { PageHeader } from "@/components/km/page-header";
import { NotInProject, RequireProject } from "@/components/km/guards";
import { SessionStateBadge } from "@/components/km/session-state-badge";
import { SessionInvite } from "@/components/km/session-invite";
import { AnswerToIdea } from "@/components/km/answer-to-idea";
import { ConfirmDialog } from "@/components/km/confirm-dialog";
import { notify } from "@/components/km/toast";
import { Button } from "@/components/ui/button";
import { SessionDialog } from "@/components/screens/sessions";
import { formatDateTime } from "@/lib/format";
import { SESSION_ROUNDS } from "@/lib/constants";
import { downloadCsv } from "@/lib/csv";

export function SessionDetailScreen({ id }: { id: string }) {
  return (
    <RequireProject>
      <Inner id={id} />
    </RequireProject>
  );
}

function Inner({ id }: { id: string }) {
  const { state, allowed, userName, updateSession, currentUser } = useStore();
  const { sessions } = useProjectData();
  const [editOpen, setEditOpen] = React.useState(false);
  const session = sessions.find((s) => s.id === id);
  if (!session) return <NotInProject kind="sessie" backHref="/sessies" backLabel="Naar alle sessies" />;
  const canFacilitate = allowed("sessies.begeleiden");
  const answers = state.sessionAnswers.filter((a) => a.sessionId === session.id && !a.hidden);
  const showResults = session.state === "afgesloten" || canFacilitate;

  const exportResults = () =>
    downloadCsv(
      `kansenkamer-sessie-${session.id}.csv`,
      ["Ronde", "Bijdrage", "Auteur", "Stemmen"],
      answers.map((a) => [String(a.round), a.text, authorName(a, userName), String(a.votes.length)]),
    );

  return (
    <>
      <PageHeader
        back={{ href: "/sessies", label: "Terug naar sessies" }}
        eyebrow="Werksessie"
        title={session.title}
        meta={
          <>
            <SessionStateBadge state={session.state} />
            <span className="text-sm text-km-muted">{formatDateTime(session.date)}</span>
            <span className="inline-flex items-center gap-1 text-sm text-km-muted">
              <MapPin className="size-4" aria-hidden />
              {session.location}
            </span>
          </>
        }
        actions={
          <>
            {canFacilitate && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil aria-hidden />
                Bewerken
              </Button>
            )}
            {session.state === "actief" && (
              <Button asChild variant={canFacilitate ? "outline" : "default"}>
                <Link href={`/sessie/${session.id}`}>Open sessieruimte</Link>
              </Button>
            )}
            {canFacilitate && session.state !== "afgesloten" && (
              <Button asChild>
                <Link href={`/sessies/${session.id}/begeleiden`}>
                  <Presentation aria-hidden />
                  Begeleid deze sessie
                </Link>
              </Button>
            )}
          </>
        }
      />

      <SessionDialog open={editOpen} onOpenChange={setEditOpen} session={session} />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-10">
          {canFacilitate && session.state !== "afgesloten" && (
            <section aria-labelledby="uitnodigen" className="rounded-2xl border border-km-line bg-white p-6">
              <h2 id="uitnodigen" className="mb-2 text-xl">Deelnemers uitnodigen</h2>
              <p className="mb-4 text-km-muted">Deel de link of laat de QR-code zien aan het begin van de sessie.</p>
              <SessionInvite sessionId={session.id} />
            </section>
          )}

          <section aria-labelledby="rondes">
            <h2 id="rondes" className="mb-4 text-2xl">De zes rondes</h2>
            <ol className="flex flex-col gap-2">
              {SESSION_ROUNDS.map((r) => {
                const isCurrent = session.state === "actief" && r.number === session.activeRound;
                return (
                  <li
                    key={r.number}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`flex items-center justify-between gap-4 rounded-xl px-4 py-3 ${isCurrent ? "bg-km-yellow/30 ring-2 ring-km-yellow" : "bg-white ring-1 ring-km-line"}`}
                  >
                    <span>
                      <span className="font-semibold text-km-green">
                        {r.number}. {r.title}
                      </span>
                      {isCurrent && <span className="ml-2 text-sm font-semibold">(nu)</span>}
                    </span>
                    <span className="shrink-0 text-sm text-km-muted">{r.minutes} min</span>
                  </li>
                );
              })}
            </ol>
          </section>

          {showResults && (
            <section aria-labelledby="resultaten">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 id="resultaten" className="text-2xl">Resultaten</h2>
                {answers.length > 0 && (
                  <Button variant="outline" onClick={exportResults}>
                    <Download aria-hidden />
                    Exporteer (CSV)
                  </Button>
                )}
              </div>
              {answers.length === 0 ? (
                <p className="text-km-muted">Nog geen bijdragen in deze sessie.</p>
              ) : (
                <div className="flex flex-col gap-6">
                  {SESSION_ROUNDS.map((r) => {
                    const list = answers.filter((a) => a.round === r.number).sort((a, b) => b.votes.length - a.votes.length);
                    if (list.length === 0) return null;
                    return (
                      <div key={r.number}>
                        <h3 className="mb-2 text-lg">
                          Ronde {r.number}: {r.title}
                        </h3>
                        <ul className="flex flex-col gap-2">
                          {list.map((a) => (
                            <li key={a.id} className="flex flex-col gap-2 rounded-xl bg-white p-3 ring-1 ring-km-line sm:flex-row sm:items-start sm:justify-between">
                              <span className="flex flex-col items-start">
                                <span>
                                  {a.text} <span className="text-sm text-km-muted">— {authorName(a, userName)}</span>
                                </span>
                                <AnswerToIdea answer={a} session={session} />
                              </span>
                              {a.votes.length > 0 && (
                                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-km-green">
                                  <ThumbsUp className="size-4" aria-hidden />
                                  {a.votes.length}
                                  <span className="sr-only">stemmen</span>
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-6" aria-label="Deelnemers en beheer">
          <section>
            <h2 className="mb-3 inline-flex items-center gap-2 text-xl">
              <Users className="size-5" aria-hidden />
              Deelnemers ({session.participantIds.length + (session.guestCount ?? 0)})
            </h2>
            <p className="mb-2 text-sm text-km-muted">
              Begeleider: {userName(session.facilitatorId)}
              {(session.guestCount ?? 0) > 0 && ` · ${session.guestCount} ${session.guestCount === 1 ? "gast" : "gasten"} via de deelnamelink`}
            </p>
            {session.participantIds.length === 0 ? (
              <p className="text-km-muted">Nog niemand uitgenodigd.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {session.participantIds.map((p) => (
                  <li key={p}>
                    {userName(p)}
                    {p === currentUser.id && " (jij)"}
                  </li>
                ))}
              </ul>
            )}
          </section>
          {canFacilitate && session.state !== "afgesloten" && (
            <ConfirmDialog
              title="Sessie afsluiten?"
              description="Deelnemers kunnen daarna niets meer toevoegen. De resultaten blijven bewaard."
              confirmLabel="Sessie afsluiten"
              destructive
              onConfirm={() => {
                void notify.after(updateSession(session.id, { state: "afgesloten" }), "Sessie afgesloten");
              }}
              trigger={
                <Button variant="ghost" className="self-start text-km-danger hover:bg-km-danger-soft">
                  Sessie afsluiten
                </Button>
              }
            />
          )}
        </aside>
      </div>
    </>
  );
}
