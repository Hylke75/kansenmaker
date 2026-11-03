"use client";

import * as React from "react";
import Link from "next/link";
import { CircleCheck, Clock, Lock, LogOut, Send, ThumbsUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/km/logo";
import { SessionRound, RoundArrows, RoundProgressBar, useViewRound } from "@/components/km/session-round";
import { EmptyState } from "@/components/km/empty-state";
import { FormField } from "@/components/km/form-field";
import { LoadingState } from "@/components/km/guards";
import { notify } from "@/components/km/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SESSION_ROUNDS } from "@/lib/constants";
import { answersForRound } from "./facilitator";
import { cn } from "@/lib/utils";

const MAX_VOTES = 3;

/**
 * Sessieruimte voor deelnemers: opdracht per ronde, één invoerveld. Deelnemers bladeren zelf
 * door de rondes; kiest de begeleider een andere ronde, dan springt de pagina live mee (Realtime).
 */
export function ParticipantScreen({ id }: { id: string }) {
  const { state, openSessionProject, projectReady, joinSession, currentUser } = useStore();
  const [lookup, setLookup] = React.useState<"busy" | "ok" | "not-found">("busy");
  const ready = state.status === "ready";

  React.useEffect(() => {
    if (!ready) return;
    let active = true;
    void openSessionProject(id).then((r) => active && setLookup(r));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- alleen bij (her)laden van de sessie
  }, [id, ready]);

  const session = state.sessions.find((s) => s.id === id);
  const joined = session?.participantIds.includes(currentUser.id);
  React.useEffect(() => {
    if (session && !joined && session.state !== "afgesloten") void joinSession(session.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- eenmalig aanmelden als deelnemer
  }, [session?.id, joined]);

  const loading = state.status === "loading" || lookup === "busy" || (lookup === "ok" && (!projectReady || !session));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-km-line bg-white">
        <div className="mx-auto flex min-h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <Logo />
          <Button asChild variant="ghost">
            <Link href={session ? `/sessies/${session.id}` : "/sessies"}>
              <LogOut aria-hidden />
              <span className="hidden sm:inline">Verlaten</span>
              <span className="sr-only sm:hidden">Sessie verlaten</span>
            </Link>
          </Button>
        </div>
      </header>
      <main id="inhoud" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 outline-none md:py-12">
        {state.status === "signed-out" ? (
          <>
            <h1 className="sr-only">Inloggen nodig</h1>
            <EmptyState
              icon={Lock}
              title="Log in om mee te doen"
              action={
                <Button asChild>
                  <Link href={`/inloggen?next=${encodeURIComponent(`/sessie/${id}`)}`}>Inloggen</Link>
                </Button>
              }
            />
          </>
        ) : loading ? (
          <LoadingState label="Sessie laden…" />
        ) : !session ? (
          <>
            <h1 className="sr-only">Sessie niet beschikbaar</h1>
            <EmptyState
              icon={Lock}
              title="Deze sessie is niet beschikbaar"
              description="De link is onjuist of je bent (nog) niet uitgenodigd voor dit project. Vraag de begeleider om de deelnamelink of QR-code."
            />
          </>
        ) : (
          <Room sessionId={session.id} />
        )}
      </main>
    </div>
  );
}

function Room({ sessionId }: { sessionId: string }) {
  const { state, currentUser, project, addSessionAnswer, toggleVote } = useStore();
  const session = state.sessions.find((s) => s.id === sessionId)!;
  const allowVoting = state.projects.find((p) => p.id === session.projectId)?.settings.allowVoting ?? true;
  const [view, setView] = useViewRound(session.activeRound);
  const round = SESSION_ROUNDS[view - 1];
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [voteError, setVoteError] = React.useState<string>();
  const [sent, setSent] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const select = (n: number) => {
    setView(n);
    setText("");
    setError(undefined);
    setSent(null);
  };

  const header = (
    <div className="mb-8">
      <p className="text-sm font-bold tracking-widest text-km-muted uppercase">Werksessie</p>
      <h1 className="mt-1 text-2xl md:text-3xl">{session.title}</h1>
    </div>
  );

  if (session.state === "gepland") {
    return (
      <>
        {header}
        <div role="status">
          <EmptyState
            icon={Clock}
            title="De sessie is nog niet begonnen"
            description="Houd deze pagina open. Zodra de begeleider start, verschijnt hier de eerste opdracht."
          />
        </div>
      </>
    );
  }
  if (session.state === "afgesloten") {
    return (
      <>
        {header}
        <div role="status">
          <EmptyState
            icon={CircleCheck}
            title="Deze sessie is afgesloten"
            description="Bedankt voor je bijdrage!"
            action={
              project?.id === session.projectId && (
                <Button asChild variant="outline">
                  <Link href={`/sessies/${session.id}`}>Bekijk de resultaten</Link>
                </Button>
              )
            }
          />
        </div>
      </>
    );
  }

  const mine = state.sessionAnswers.filter((a) => a.sessionId === session.id && a.round === round.number && a.authorId === currentUser.id);
  const votable = answersForRound(state.sessionAnswers, session.id, round.number).filter((a) => !a.hidden);
  const myVotes = votable.filter((a) => a.votes.includes(currentUser.id)).length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!text.trim()) return setError("Schrijf eerst je antwoord.");
    if (text.length > 500) return setError("Houd het kort: maximaal 500 tekens.");
    setError(undefined);
    setBusy(true);
    const ok = await notify.after(addSessionAnswer(session.id, round.number, text), "Verstuurd naar de begeleider");
    setBusy(false);
    if (ok) {
      setText("");
      setSent(round.number);
    }
  };

  const vote = (id: string, has: boolean) => {
    if (!has && myVotes >= MAX_VOTES) {
      setVoteError(`Je hebt al je ${MAX_VOTES} stemmen gebruikt. Haal eerst een stem weg.`);
      return;
    }
    setVoteError(undefined);
    toggleVote(id);
  };

  return (
    <>
      {header}
      <div className="flex flex-col gap-8">
        <RoundProgressBar rounds={SESSION_ROUNDS} view={view} active={session.activeRound} onSelect={select} />
        <div aria-live="polite">
          <SessionRound round={round} total={SESSION_ROUNDS.length} />
          {view !== session.activeRound && (
            <p className="mt-3 text-sm text-km-muted">
              De begeleider is bij ronde {session.activeRound}.{" "}
              <button type="button" className="font-semibold text-km-green underline underline-offset-4" onClick={() => select(session.activeRound)}>
                Ga naar ronde {session.activeRound}
              </button>
            </p>
          )}
        </div>

        {round.voting ? (
          !allowVoting ? (
            <p className="rounded-xl bg-white p-4 ring-1 ring-km-line">Stemmen is in dit project uitgeschakeld. De begeleider bespreekt de keuze plenair.</p>
          ) : (
            <section aria-labelledby="stemmen" className="flex flex-col gap-4">
              <h2 id="stemmen" className="text-xl">
                Kies de ideeën die we verder uitwerken
              </h2>
              <p className="text-km-muted" aria-live="polite">
                Je hebt nog {MAX_VOTES - myVotes} van {MAX_VOTES} stemmen.
              </p>
              {voteError && (
                <p role="alert" className="rounded-xl bg-km-danger-soft p-3 font-semibold text-km-danger">
                  {voteError}
                </p>
              )}
              <ul className="flex flex-col gap-2">
                {votable.map((a) => {
                  const has = a.votes.includes(currentUser.id);
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        aria-pressed={has}
                        onClick={() => vote(a.id, has)}
                        className={cn(
                          "flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left ring-1",
                          has ? "bg-km-softgreen ring-2 ring-km-green" : "bg-white ring-km-line hover:ring-km-green",
                        )}
                      >
                        <span>{a.text}</span>
                        <ThumbsUp className={cn("size-5 shrink-0", has ? "fill-km-green text-km-green" : "text-km-muted")} aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-2xl bg-km-softgreen p-5">
            <FormField label={round.inputLabel} error={error}>
              {(p) => (
                <Textarea
                  {...p}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (error) setError(undefined);
                  }}
                  rows={4}
                  className="bg-white text-lg"
                />
              )}
            </FormField>
            {sent === round.number && (
              <p role="status" className="flex items-center gap-2 font-semibold text-km-green">
                <CircleCheck className="size-5" aria-hidden />
                Verstuurd! Voeg nog iets toe of ga naar de volgende ronde.
              </p>
            )}
            <Button type="submit" size="lg" className="self-stretch sm:self-start" disabled={busy}>
              <Send aria-hidden />
              {busy ? "Bezig…" : "Verstuur"}
            </Button>
          </form>
        )}

        {!round.voting && mine.length > 0 && (
          <section aria-labelledby="mijn">
            <h2 id="mijn" className="mb-3 text-lg">
              Jouw bijdragen in deze ronde ({mine.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {mine.map((a) => (
                <li key={a.id} className="rounded-xl bg-white p-3 ring-1 ring-km-line">
                  {a.text}
                  {a.hidden && <span className="ml-2 text-sm text-km-muted">(verborgen door begeleider)</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <RoundArrows rounds={SESSION_ROUNDS} view={view} onSelect={select} className="border-t border-km-line pt-6" />
      </div>
    </>
  );
}
