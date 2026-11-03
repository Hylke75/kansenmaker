"use client";

import { authorName } from "@/lib/authors";
import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Maximize2, Play, QrCode, ThumbsUp, X, CircleCheck } from "lucide-react";
import { useProjectData, useStore } from "@/lib/store";
import { AccessDenied, NotInProject, RequireProject } from "@/components/km/guards";
import { SessionRound, RoundProgress } from "@/components/km/session-round";
import { answerContext } from "@/components/km/answer-panel";
import { Timer, useTimer } from "@/components/km/timer";
import { SessionStateBadge } from "@/components/km/session-state-badge";
import { SessionInvite } from "@/components/km/session-invite";
import { AnswerToIdea } from "@/components/km/answer-to-idea";
import { ConfirmDialog } from "@/components/km/confirm-dialog";
import { EmptyState } from "@/components/km/empty-state";
import { notify } from "@/components/km/toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { SESSION_ROUNDS } from "@/lib/constants";
import type { SessionAnswer } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FacilitatorScreen({ id }: { id: string }) {
  return (
    <RequireProject>
      <Inner id={id} />
    </RequireProject>
  );
}

/** Welke bijdragen staan centraal in een ronde (in de stemronde: de ideeën uit ronde 3 en 4). */
export function answersForRound(all: SessionAnswer[], sessionId: string, round: number) {
  const def = SESSION_ROUNDS[round - 1];
  const rounds = def?.voting ? [3, 4] : [round];
  return all.filter((a) => a.sessionId === sessionId && rounds.includes(a.round));
}

function Inner({ id }: { id: string }) {
  const { state, allowed, userName, updateSession, toggleAnswerHidden } = useStore();
  const { sessions } = useProjectData();
  const session = sessions.find((s) => s.id === id);
  const round = SESSION_ROUNDS[(session?.activeRound ?? 1) - 1];
  const timer = useTimer(round.minutes * 60);
  const [presenting, setPresenting] = React.useState(false);
  const [showInvite, setShowInvite] = React.useState(false);
  const [confirmEnd, setConfirmEnd] = React.useState(false);

  if (!session) return <NotInProject kind="sessie" backHref="/sessies" backLabel="Naar alle sessies" />;
  if (!allowed("sessies.begeleiden"))
    return <AccessDenied description="Alleen begeleiders en beheerders kunnen een sessie begeleiden. Je kunt wel meedoen via de sessieruimte." />;

  const total = SESSION_ROUNDS.length;
  const answers = answersForRound(state.sessionAnswers, session.id, session.activeRound);
  const sorted = round.voting ? [...answers].sort((a, b) => b.votes.length - a.votes.length) : answers;
  const visibleAnswers = sorted.filter((a) => !a.hidden);

  const goRound = (n: number) => {
    updateSession(session.id, { activeRound: n });
  };

  if (session.state === "afgesloten") {
    return (
      <EmptyState
        icon={CircleCheck}
        title="Deze sessie is afgesloten"
        description="Bekijk de resultaten op de sessiepagina."
        action={
          <Button asChild>
            <Link href={`/sessies/${session.id}`}>Naar de resultaten</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <Link href={`/sessies/${session.id}`} className="inline-flex min-h-11 w-fit items-center gap-2 font-semibold text-km-green hover:underline">
          <ArrowLeft className="size-5" aria-hidden />
          Terug naar de sessie
        </Link>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold tracking-widest text-km-muted uppercase">Live werksessie</p>
            <h1 className="mt-1 text-3xl md:text-4xl">{session.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SessionStateBadge state={session.state} />
            </div>
          </div>
          {session.state === "actief" && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setShowInvite((v) => !v)} aria-expanded={showInvite}>
                <QrCode aria-hidden />
                Uitnodigen
              </Button>
              <Button variant="outline" onClick={() => setPresenting(true)}>
                <Maximize2 aria-hidden />
                Presentatiemodus
              </Button>
            </div>
          )}
        </div>
        {showInvite && (
          <div className="rounded-2xl border border-km-line bg-white p-5">
            <SessionInvite sessionId={session.id} />
          </div>
        )}
      </header>

      {session.state === "gepland" ? (
        <section className="flex flex-col items-start gap-4 rounded-2xl bg-km-softgreen p-8">
          <h2 className="text-2xl">De sessie is nog niet gestart</h2>
          <p>Deel eerst de link of QR-code. Als je start, zien deelnemers direct de opdracht van ronde 1.</p>
          <SessionInvite sessionId={session.id} />
          <Button
            size="lg"
            onClick={() => {
              void notify.after(updateSession(session.id, { state: "actief", activeRound: 1 }), "Sessie gestart");
            }}
          >
            <Play aria-hidden />
            Start de sessie
          </Button>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="flex flex-col gap-8 rounded-2xl border border-km-line bg-white p-6 md:p-8" aria-label="Huidige ronde">
              <RoundProgress current={session.activeRound} total={total} />
              <SessionRound round={round} total={total} />
              <Timer timer={timer} />
              <div className="flex flex-col-reverse gap-3 border-t border-km-line pt-6 sm:flex-row sm:justify-between">
                <Button variant="outline" disabled={session.activeRound === 1} onClick={() => goRound(session.activeRound - 1)}>
                  <ArrowLeft aria-hidden />
                  Vorige
                </Button>
                {session.activeRound < total ? (
                  <Button onClick={() => goRound(session.activeRound + 1)}>
                    Volgende ronde
                    <ArrowRight aria-hidden />
                  </Button>
                ) : (
                  <Button onClick={() => setConfirmEnd(true)}>
                    Sessie afronden
                    <CircleCheck aria-hidden />
                  </Button>
                )}
              </div>
            </section>

            <nav aria-label="Rondes" className="flex flex-col gap-2">
              <h2 className="mb-2 text-xl">Rondes</h2>
              <ol className="flex flex-col gap-2">
                {SESSION_ROUNDS.map((r) => {
                  const current = r.number === session.activeRound;
                  return (
                    <li key={r.number}>
                      <button
                        type="button"
                        onClick={() => goRound(r.number)}
                        aria-current={current ? "step" : undefined}
                        className={cn(
                          "flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-4 py-2 text-left",
                          current ? "bg-km-yellow font-bold text-km-green" : "bg-white text-km-green ring-1 ring-km-line hover:ring-km-green",
                        )}
                      >
                        <span>
                          {r.number}. {r.title}
                        </span>
                        <span className="shrink-0 text-sm font-normal">{r.minutes} min</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>

          <section aria-labelledby="live">
            <div className="mb-4 flex flex-wrap items-baseline gap-3">
              <h2 id="live" className="text-2xl">
                {round.voting ? "Stemmen op ideeën" : "Binnenkomende antwoorden"}
              </h2>
              <p className="text-km-muted" aria-live="polite">
                {visibleAnswers.length} zichtbaar{answers.length !== visibleAnswers.length && `, ${answers.length - visibleAnswers.length} verborgen`}
              </p>
            </div>
            {answers.length === 0 ? (
              <EmptyState as="h3" icon={Eye} title="Nog geen antwoorden" description="Antwoorden van deelnemers verschijnen hier zodra ze binnenkomen." />
            ) : (
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {sorted.map((a) => (
                  <li key={a.id} className={cn("flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-km-line", a.hidden && "bg-km-offwhite ring-km-muted")}>
                    {answerContext(a, state.sessionAnswers) && (
                      <p className="text-sm font-semibold text-km-muted">{answerContext(a, state.sessionAnswers)}</p>
                    )}
                    <p className={cn("whitespace-pre-line", a.hidden && "line-through")}>{a.text}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-km-muted">
                      <span>
                        {authorName(a, userName)}
                        {round.voting && ` · ronde ${a.round}`}
                        {a.hidden && <strong className="ml-2 text-km-danger">Verborgen</strong>}
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        {round.voting && (
                          <span className="inline-flex items-center gap-1 font-semibold text-km-green">
                            <ThumbsUp className="size-4" aria-hidden />
                            {a.votes.length}
                            <span className="sr-only">stemmen</span>
                          </span>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => toggleAnswerHidden(a.id)} aria-label={`${a.hidden ? "Tonen" : "Verbergen"}: ${a.text}`}>
                          {a.hidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
                          {a.hidden ? "Tonen" : "Verbergen"}
                        </Button>
                        <AnswerToIdea answer={a} session={session} />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <Dialog open={presenting} onOpenChange={setPresenting}>
        <DialogContent
          showCloseButton={false}
          className="top-0 left-0 h-dvh max-h-dvh w-screen max-w-none translate-x-0 translate-y-0 content-start gap-10 overflow-y-auto rounded-none bg-km-offwhite p-6 sm:max-w-none md:p-14"
        >
          <DialogHeader className="flex-row items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-base font-bold tracking-widest text-km-muted uppercase">{session.title}</DialogTitle>
              <DialogDescription className="sr-only">Presentatiemodus. Druk op Escape om te sluiten.</DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="outline">
                <X aria-hidden />
                Sluiten
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_auto]">
            <SessionRound round={round} total={total} large headingLevel="h2" />
            <Timer timer={timer} large announce={false} className="xl:min-w-[28rem]" />
          </div>
          {visibleAnswers.length > 0 && (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleAnswers.map((a) => (
                <li key={a.id} className="rounded-2xl bg-white p-5 text-xl whitespace-pre-line ring-1 ring-km-line">
                  {answerContext(a, state.sessionAnswers) && (
                    <span className="mb-1 block text-base font-semibold text-km-muted">{answerContext(a, state.sessionAnswers)}</span>
                  )}
                  {a.text}
                  {round.voting && (
                    <span className="mt-2 flex items-center gap-1 text-base font-semibold text-km-green">
                      <ThumbsUp className="size-4" aria-hidden /> {a.votes.length}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-3">
            <Button variant="outline" disabled={session.activeRound === 1} onClick={() => goRound(session.activeRound - 1)}>
              <ArrowLeft aria-hidden /> Vorige
            </Button>
            <Button disabled={session.activeRound === total} onClick={() => goRound(session.activeRound + 1)}>
              Volgende ronde <ArrowRight aria-hidden />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmEnd}
        onOpenChange={setConfirmEnd}
        title="Sessie afronden?"
        description="Deelnemers kunnen daarna niets meer toevoegen. Je vindt de resultaten op de sessiepagina."
        confirmLabel="Sessie afronden"
        onConfirm={() => {
          void notify.after(updateSession(session.id, { state: "afgesloten" }), "Sessie afgerond");
        }}
      />
    </div>
  );
}
