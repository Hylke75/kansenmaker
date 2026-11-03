"use client";

import * as React from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck, Clock, ThumbsUp } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { SESSION_ROUNDS } from "@/lib/constants";
import { Logo } from "@/components/km/logo";
import { SessionRound, RoundArrows, RoundProgressBar, maxReachableRound, useViewRound } from "@/components/km/session-round";
import { EmptyState } from "@/components/km/empty-state";
import { LoadingState } from "@/components/km/guards";
import { ErrorSummary, FormField } from "@/components/km/form-field";
import { AnswerPanel } from "@/components/km/answer-panel";
import { RoundExplanation, SessionIntro } from "@/components/km/round-explanation";
import { notify } from "@/components/km/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MAX_VOTES = 3;
const POLL_MS = 3000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface GuestState {
  project_name: string;
  session: { title: string; state: "gepland" | "actief" | "afgesloten"; active_round: number; self_paced: boolean };
  allow_voting: boolean;
  guest: { id: string; name: string } | null;
  my_answers: { id: string; round: number; text: string; hidden: boolean; parent_id: string | null }[];
  votable: { id: string; text: string; mine: boolean }[];
}

const keyName = (token: string) => `kansenmaker:gast:${token}`;
const readKey = (token: string) => {
  try {
    return localStorage.getItem(keyName(token));
  } catch {
    return null;
  }
};
const message = (err: { message?: string } | null) => err?.message || "Er ging iets mis. Probeer het opnieuw.";

/**
 * Meedoen aan een werksessie met alleen een link, zonder account.
 * Een gast ziet de opdrachten, eigen antwoorden en de stemopties, en bladert zelf door de rondes
 * (springt mee als de begeleider een andere ronde kiest).
 */
export function GuestSessionScreen({ token }: { token: string }) {
  const [key, setKey] = React.useState<string | null>(null);
  const [state, setState] = React.useState<GuestState | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  // Actuele gastsleutel voor de ververs-timer (één timer, altijd de nieuwste sleutel)
  const keyRef = React.useRef<string | null>(null);
  const wellFormed = UUID_RE.test(token);

  const load = React.useCallback(async () => {
    const { data, error: err } = await getSupabase().rpc("guest_session_state", { p_token: token, p_key: keyRef.current });
    if (err) {
      setError(message(err));
      return;
    }
    setError(null);
    setState(data as unknown as GuestState);
  }, [token]);

  React.useEffect(() => {
    if (!wellFormed) return;
    keyRef.current = readKey(token);
    setKey(keyRef.current);
    void load();
    const t = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(t);
  }, [token, load, wellFormed]);

  const onJoined = (k: string) => {
    try {
      localStorage.setItem(keyName(token), k);
    } catch {
      /* privémodus: sleutel alleen in dit tabblad */
    }
    keyRef.current = k;
    setKey(k);
    void load();
  };

  const shownError = wellFormed ? error : "Deze link bestaat niet";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-km-line bg-white">
        <div className="mx-auto flex min-h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <Logo />
          {state?.guest && <span className="text-sm text-km-muted">Je doet mee als <strong className="text-km-green">{state.guest.name}</strong></span>}
        </div>
      </header>
      <main id="inhoud" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 outline-none md:py-12">
        {shownError && !state ? (
          <>
            <h1 className="sr-only">Sessie niet beschikbaar</h1>
            <EmptyState icon={CircleAlert} title="Deze link werkt niet (meer)" description={`${shownError}. Vraag de begeleider om de actuele link of QR-code.`} />
          </>
        ) : !state ? (
          <LoadingState label="Sessie laden…" />
        ) : !state.guest ? (
          <JoinForm token={token} state={state} onJoined={onJoined} />
        ) : (
          <GuestRoom token={token} guestKey={key!} state={state} refresh={load} />
        )}
      </main>
    </div>
  );
}

function SessionHeader({ state }: { state: GuestState }) {
  return (
    <div className="mb-8">
      <p className="text-sm font-bold tracking-widest text-km-muted uppercase">Werksessie · {state.project_name}</p>
      <h1 className="mt-1 text-2xl md:text-3xl">{state.session.title}</h1>
    </div>
  );
}

function JoinForm({ token, state, onJoined }: { token: string; state: GuestState; onJoined: (key: string) => void }) {
  const [name, setName] = React.useState("");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  if (state.session.state === "afgesloten") {
    return (
      <>
        <SessionHeader state={state} />
        <EmptyState icon={CircleCheck} title="Deze sessie is afgesloten" description="Meedoen kan niet meer. Bedankt voor je interesse!" />
      </>
    );
  }
  return (
    <>
      <SessionHeader state={state} />
      <form
        noValidate
        className="flex flex-col gap-5 rounded-2xl border border-km-line bg-white p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const errs = !name.trim() ? ["Vul je naam in."] : name.trim().length > 60 ? ["Gebruik maximaal 60 tekens."] : [];
          setErrors(errs);
          if (errs.length) return requestAnimationFrame(() => ref.current?.focus());
          setBusy(true);
          const { data, error } = await getSupabase().rpc("guest_join_session", { p_token: token, p_name: name.trim() });
          setBusy(false);
          if (error || !data?.[0]) {
            setErrors([message(error)]);
            return requestAnimationFrame(() => ref.current?.focus());
          }
          onJoined(data[0].guest_key);
        }}
      >
        <h2 className="text-2xl">Doe mee</h2>
        <p>Je hebt geen account nodig. Vul alleen je naam in; Haags Verhaal ziet die bij je antwoorden.</p>
        <ErrorSummary ref={ref} errors={errors} />
        <FormField label="Wat is je naam?" error={errors[0]}>
          {(p) => <Input {...p} autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />}
        </FormField>
        <Button type="submit" size="lg" className="self-stretch sm:self-start" disabled={busy}>
          {busy ? "Bezig…" : "Doe mee"}
        </Button>
        <p className="text-sm text-km-muted">
          Heb je een account bij de KansenKamer?{" "}
          <Link href={`/uitnodiging/${token}`} className="font-semibold text-km-green underline underline-offset-4">
            Log dan in
          </Link>
          .
        </p>
      </form>
    </>
  );
}

function GuestRoom({ token, guestKey, state, refresh }: { token: string; guestKey: string; state: GuestState; refresh: () => Promise<void> }) {
  const [voteError, setVoteError] = React.useState<string>();
  const db = getSupabase();
  const selfPaced = state.session.self_paced;
  const [view, setRound] = useViewRound(selfPaced ? 1 : state.session.active_round, !selfPaced);
  const round = SESSION_ROUNDS[view - 1];
  const countFor = (n: number) => state.my_answers.filter((a) => a.round === n).length;
  const maxRound = maxReachableRound(SESSION_ROUNDS, countFor);
  const gate = SESSION_ROUNDS[maxRound - 1];
  const blocked =
    view >= maxRound && gate?.minAnswers && countFor(gate.number) < gate.minAnswers
      ? `Vul eerst minimaal ${gate.minAnswers} doelgroepen in (ronde ${gate.number}) om verder te gaan.`
      : undefined;
  const setView = (n: number) => setRound(Math.min(n, maxRound));

  if (state.session.state === "gepland") {
    return (
      <>
        <SessionHeader state={state} />
        <div role="status">
          <EmptyState
            icon={Clock}
            title="De sessie is nog niet begonnen"
            description={
              selfPaced
                ? "De sessie is nog niet geopend. Probeer het later nog eens via dezelfde link."
                : "Houd deze pagina open. Zodra de begeleider start, verschijnt hier de eerste opdracht."
            }
          />
        </div>
        <SessionIntro defaultOpen />
      </>
    );
  }
  if (state.session.state === "afgesloten") {
    return (
      <>
        <SessionHeader state={state} />
        <div role="status">
          <EmptyState icon={CircleCheck} title="Deze sessie is afgesloten" description="Bedankt voor je bijdrage!" />
        </div>
      </>
    );
  }

  const toOwn = (a: GuestState["my_answers"][number]) => ({ id: a.id, text: a.text, hidden: a.hidden, parentId: a.parent_id ?? undefined });
  const mine = state.my_answers.filter((a) => a.round === round.number).map(toOwn);
  const parents = round.linkToRound ? state.my_answers.filter((a) => a.round === round.linkToRound).map(toOwn) : undefined;
  const grandparents = round.linkToRound === 3 ? state.my_answers.filter((a) => a.round === 2).map(toOwn) : undefined;
  const myVotes = state.votable.filter((v) => v.mine).length;
  const next = SESSION_ROUNDS[view];

  return (
    <>
      <SessionHeader state={state} />
      <div className="flex flex-col gap-8">
        <SessionIntro defaultOpen={view === 1 && state.my_answers.length === 0} />
        <RoundProgressBar rounds={SESSION_ROUNDS} view={view} active={selfPaced ? undefined : state.session.active_round} maxRound={maxRound} onSelect={setView} />
        <div aria-live="polite">
          <SessionRound round={round} total={SESSION_ROUNDS.length} />
          {!selfPaced && view !== state.session.active_round && (
            <p className="mt-3 text-sm text-km-muted">
              De begeleider is bij ronde {state.session.active_round}.{" "}
              <button type="button" className="font-semibold text-km-green underline underline-offset-4" onClick={() => setView(state.session.active_round)}>
                Ga naar ronde {state.session.active_round}
              </button>
            </p>
          )}
        </div>
        <RoundExplanation round={round} />

        {round.voting ? (
          !state.allow_voting ? (
            <p className="rounded-xl bg-white p-4 ring-1 ring-km-line">Stemmen is in dit project uitgeschakeld.</p>
          ) : (
            <section aria-labelledby="stemmen" className="flex flex-col gap-4">
              <h2 id="stemmen" className="text-xl">Kies de ideeën met de meeste potentie</h2>
              <p className="text-km-muted" aria-live="polite">Je hebt nog {MAX_VOTES - myVotes} van {MAX_VOTES} stemmen.</p>
              {voteError && (
                <p role="alert" className="rounded-xl bg-km-danger-soft p-3 font-semibold text-km-danger">{voteError}</p>
              )}
              {state.votable.length === 0 ? (
                <p className="rounded-xl bg-white p-4 ring-1 ring-km-line">Er zijn nog geen ideeën om op te stemmen. Ideeën uit ronde 3 en 4 verschijnen hier.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {state.votable.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        aria-pressed={a.mine}
                        onClick={async () => {
                          if (!a.mine && myVotes >= MAX_VOTES) return setVoteError(`Je hebt al je ${MAX_VOTES} stemmen gebruikt. Haal eerst een stem weg.`);
                          setVoteError(undefined);
                          const { error: err } = await db.rpc("guest_toggle_vote", { p_token: token, p_key: guestKey, p_answer: a.id });
                          if (err) setVoteError(message(err));
                          await refresh();
                        }}
                        className={cn(
                          "flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left ring-1",
                          a.mine ? "bg-km-softgreen ring-2 ring-km-green" : "bg-white ring-km-line hover:ring-km-green",
                        )}
                      >
                        <span className="whitespace-pre-line">{a.text}</span>
                        <ThumbsUp className={cn("size-5 shrink-0", a.mine ? "fill-km-green text-km-green" : "text-km-muted")} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        ) : (
          <AnswerPanel
            key={round.number}
            round={round}
            answers={mine}
            parents={parents}
            grandparents={grandparents}
            onGoto={setView}
            onNext={next ? () => setView(next.number) : undefined}
            onSubmit={async (text, parentId) => {
              const { error: err } = await db.rpc("guest_add_answer", {
                p_token: token,
                p_key: guestKey,
                p_text: text,
                p_round: round.number,
                p_parent: parentId ?? null,
              });
              if (err) {
                notify.error(message(err));
                return false;
              }
              notify.success(selfPaced ? "Je antwoord is opgeslagen" : "Verstuurd naar de begeleider");
              await refresh();
              return true;
            }}
            onSave={async (id, text) => {
              const { error: err } = await db.rpc("guest_update_answer", { p_token: token, p_key: guestKey, p_answer: id, p_text: text });
              if (err) {
                notify.error(message(err));
                return false;
              }
              notify.success("Je antwoord is bijgewerkt");
              await refresh();
              return true;
            }}
          />
        )}

        <RoundArrows rounds={SESSION_ROUNDS} view={view} onSelect={setView} blocked={blocked} className="border-t border-km-line pt-6" />
      </div>
    </>
  );
}
