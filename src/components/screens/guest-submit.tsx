"use client";

import * as React from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { Logo } from "@/components/km/logo";
import { EmptyState } from "@/components/km/empty-state";
import { LoadingState } from "@/components/km/guards";
import { DoubtNote } from "@/components/km/notes";
import { StepForm } from "@/components/km/step-form";
import { FormField } from "@/components/km/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Preview = { project_name: string | null; valid: boolean; reason: string | null };

/** Een idee insturen met alleen een link (inzendlink), zonder account. Een redacteur keurt het eerst goed. */
export function GuestSubmitScreen({ token }: { token: string }) {
  const wellFormed = UUID_RE.test(token);
  const [fetched, setFetched] = React.useState<Preview | null | "error">(null);
  const preview: Preview | null | "error" = wellFormed ? fetched : { project_name: null, valid: false, reason: "Deze link bestaat niet" };
  const [done, setDone] = React.useState(false);
  const [round, setRound] = React.useState(0);

  React.useEffect(() => {
    if (!wellFormed) return;
    let active = true;
    getSupabase()
      .rpc("submission_preview", { p_token: token })
      .then(({ data, error }) => active && setFetched(error || !data?.[0] ? "error" : data[0]));
    return () => {
      active = false;
    };
  }, [token, wellFormed]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-km-line bg-white">
        <div className="mx-auto flex min-h-16 max-w-2xl items-center px-4">
          <Logo />
        </div>
      </header>
      <main id="inhoud" tabIndex={-1} className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 outline-none md:py-12">
        {preview === null ? (
          <LoadingState label="Link controleren…" />
        ) : preview === "error" || !preview.valid ? (
          <>
            <h1 className="sr-only">Link werkt niet</h1>
            <EmptyState
              icon={CircleAlert}
              title="Deze link werkt niet (meer)"
              description={`${preview !== "error" && preview.reason ? `${preview.reason}. ` : ""}Vraag de organisator om de actuele link.`}
            />
          </>
        ) : done ? (
          <div role="status">
            <h1 className="sr-only">Bedankt</h1>
            <EmptyState
              icon={CircleCheck}
              title="Bedankt voor je idee!"
              description="Een redacteur van Haags Verhaal bekijkt het. Daarna is het zichtbaar voor de deelnemers van het project."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setDone(false);
                    setRound((r) => r + 1);
                  }}
                >
                  Nog een idee insturen
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <p className="text-sm font-bold tracking-widest text-km-muted uppercase">{preview.project_name}</p>
            <h1 className="mt-1 text-3xl md:text-4xl">Deel jouw idee</h1>
            <p className="mt-3 text-lg">Je hebt geen account nodig. Je idee mag nog onaf zijn.</p>
            <DoubtNote as="h2" className="mt-6" />
            <div className="mt-8 rounded-2xl border border-km-line bg-white p-5 md:p-8">
              <SubmitForm key={round} token={token} onDone={() => setDone(true)} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function SubmitForm({ token, onDone }: { token: string; onDone: () => void }) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [name, setName] = React.useState("");
  const [problem, setProblem] = React.useState("");
  const [showErrors, setShowErrors] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [serverError, setServerError] = React.useState<string>();

  const titleError = !title.trim() ? "Geef je idee een naam." : title.length > 80 ? "De naam mag maximaal 80 tekens zijn." : undefined;
  const descError = !description.trim()
    ? "Beschrijf in een paar zinnen wat het idee inhoudt."
    : description.trim().length < 15
      ? "Vertel iets meer: minimaal 15 tekens."
      : description.length > 1000
        ? "De beschrijving mag maximaal 1000 tekens zijn."
        : undefined;
  const nameError = !name.trim() ? "Vul je naam in." : name.trim().length > 60 ? "Gebruik maximaal 60 tekens." : undefined;

  return (
    <StepForm
      heading="Deel jouw idee"
      submitLabel="Verstuur je idee"
      submitting={busy}
      onValidationChange={setShowErrors}
      onSubmit={async () => {
        setBusy(true);
        setServerError(undefined);
        const { error } = await getSupabase().rpc("guest_submit_idea", {
          p_token: token,
          p_name: name.trim(),
          p_title: title.trim(),
          p_description: description.trim(),
          p_problem: problem.trim() || null,
        });
        setBusy(false);
        if (error) return setServerError(error.message || "Je idee kon niet worden verstuurd. Probeer het opnieuw.");
        onDone();
      }}
      steps={[
        {
          title: "Wat is je idee?",
          validate: () => [titleError, descError].filter((e): e is string => !!e),
          content: (
            <div className="flex flex-col gap-6">
              <FormField label="Hoe noem je jouw idee?" error={showErrors ? titleError : undefined}>
                {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} />}
              </FormField>
              <FormField label="Wat houdt het idee in?" hint={`${description.length}/1000 tekens`} error={showErrors ? descError : undefined}>
                {(p) => <Textarea {...p} value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />}
              </FormField>
            </div>
          ),
        },
        {
          title: "Wie ben je?",
          validate: () => [nameError].filter((e): e is string => !!e),
          content: (
            <div className="flex flex-col gap-6">
              {serverError && (
                <p role="alert" className="rounded-xl border-2 border-km-danger bg-km-danger-soft p-4 font-semibold text-km-danger">
                  {serverError}
                </p>
              )}
              <FormField label="Je naam" hint="Zo weet de redactie van wie het idee komt." error={showErrors ? nameError : undefined}>
                {(p) => <Input {...p} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />}
              </FormField>
              <FormField label="Welke behoefte of welk probleem lost dit op?" optional>
                {(p) => <Textarea {...p} value={problem} onChange={(e) => setProblem(e.target.value)} rows={3} />}
              </FormField>
            </div>
          ),
        },
      ]}
    />
  );
}
