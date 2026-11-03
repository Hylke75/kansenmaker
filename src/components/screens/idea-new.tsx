"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useProjectData, useStore } from "@/lib/store";
import { PageHeader } from "@/components/km/page-header";
import { StepForm } from "@/components/km/step-form";
import { FormField } from "@/components/km/form-field";
import { ConfirmDialog } from "@/components/km/confirm-dialog";
import { RequireProject } from "@/components/km/guards";
import { notify } from "@/components/km/toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const TITLE_MAX = 80;
const DESC_MAX = 1000;

export function IdeaNewScreen() {
  return (
    <RequireProject>
      <IdeaNewInner />
    </RequireProject>
  );
}

function IdeaNewInner() {
  const router = useRouter();
  const { project, addIdea } = useStore();
  const { audiences, needs } = useProjectData();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [audienceIds, setAudienceIds] = React.useState<string[]>([]);
  const [needIds, setNeedIds] = React.useState<string[]>([]);
  const [problem, setProblem] = React.useState("");
  const [showErrors, setShowErrors] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);

  const titleError = !title.trim()
    ? "Geef je idee een naam."
    : title.length > TITLE_MAX
      ? `De naam mag maximaal ${TITLE_MAX} tekens zijn.`
      : undefined;
  const descError = !description.trim()
    ? "Beschrijf in een paar zinnen wat het idee inhoudt."
    : description.trim().length < 15
      ? "Vertel iets meer: minimaal 15 tekens."
      : description.length > DESC_MAX
        ? `De beschrijving mag maximaal ${DESC_MAX} tekens zijn.`
        : undefined;

  const availableNeeds = needs.filter((n) => audienceIds.includes(n.audienceId));
  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const dirty = title || description || audienceIds.length || problem;
  const cancel = () => (dirty ? setConfirmCancel(true) : router.push("/ideeen"));

  const submit = () => {
    const id = addIdea({
      title,
      description,
      problem,
      audienceIds,
      needIds: needIds.filter((n) => availableNeeds.some((x) => x.id === n)),
    });
    notify.prototype(
      project?.settings.requireApproval
        ? "Je idee is toegevoegd en wacht op goedkeuring"
        : "Je idee is toegevoegd aan de voorbeeldgegevens",
    );
    router.push(`/ideeen/${id}`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Deel jouw idee" description="In drie korte stappen. Je idee mag nog onaf zijn." back={{ href: "/ideeen", label: "Terug naar ideeën" }} />
      <div className="rounded-2xl border border-km-line bg-white p-5 md:p-8">
        <StepForm
          heading="Deel jouw idee"
          submitLabel="Deel je idee"
          onSubmit={submit}
          onCancel={cancel}
          onValidationChange={setShowErrors}
          steps={[
            {
              title: "Wat is je idee?",
              validate: () => [titleError, descError].filter((e): e is string => !!e),
              content: (
                <div className="flex flex-col gap-6">
                  <FormField label="Hoe noem je jouw idee?" hint="Een korte, herkenbare naam." error={showErrors ? titleError : undefined}>
                    {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={TITLE_MAX + 20} autoComplete="off" />}
                  </FormField>
                  <FormField
                    label="Wat houdt het idee in?"
                    hint={`Wat gebeurt er, en wie doet er mee? ${description.length}/${DESC_MAX} tekens.`}
                    error={showErrors ? descError : undefined}
                  >
                    {(p) => <Textarea {...p} value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />}
                  </FormField>
                </div>
              ),
            },
            {
              title: "Voor wie en waarom?",
              content: (
                <div className="flex flex-col gap-6">
                  <fieldset className="flex flex-col gap-3">
                    <legend className="mb-1 text-base font-semibold text-km-green">
                      Voor welke doelgroep is het? <span className="font-normal text-km-muted">(optioneel, meerdere mogelijk)</span>
                    </legend>
                    {audiences.length === 0 ? (
                      <p className="text-km-muted">Er zijn nog geen doelgroepen in dit project.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {audiences.map((a) => (
                          <Label
                            key={a.id}
                            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-km-line px-3 font-normal has-[[data-state=checked]]:border-km-green has-[[data-state=checked]]:bg-km-softgreen"
                          >
                            <Checkbox checked={audienceIds.includes(a.id)} onCheckedChange={() => toggle(audienceIds, setAudienceIds, a.id)} />
                            {a.name}
                          </Label>
                        ))}
                      </div>
                    )}
                  </fieldset>
                  {availableNeeds.length > 0 && (
                    <fieldset className="flex flex-col gap-3">
                      <legend className="mb-1 text-base font-semibold text-km-green">
                        Welke behoefte past erbij? <span className="font-normal text-km-muted">(optioneel)</span>
                      </legend>
                      <div className="flex flex-col gap-2">
                        {availableNeeds.map((n) => (
                          <Label
                            key={n.id}
                            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-km-line px-3 font-normal has-[[data-state=checked]]:border-km-green has-[[data-state=checked]]:bg-km-softgreen"
                          >
                            <Checkbox checked={needIds.includes(n.id)} onCheckedChange={() => toggle(needIds, setNeedIds, n.id)} />
                            {n.description}
                          </Label>
                        ))}
                      </div>
                    </fieldset>
                  )}
                  <FormField label="Welke behoefte of welk probleem lost dit op?" optional hint="Mag je overslaan als je het nog niet weet.">
                    {(p) => <Textarea {...p} value={problem} onChange={(e) => setProblem(e.target.value)} rows={3} />}
                  </FormField>
                </div>
              ),
            },
            {
              title: "Controleer en deel",
              content: (
                <div className="flex flex-col gap-4">
                  <dl className="flex flex-col gap-4 rounded-xl bg-km-offwhite p-5">
                    <div>
                      <dt className="text-sm font-semibold text-km-muted">Naam</dt>
                      <dd className="font-heading text-xl font-bold text-km-green">{title}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-semibold text-km-muted">Beschrijving</dt>
                      <dd className="whitespace-pre-line">{description}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-semibold text-km-muted">Doelgroepen</dt>
                      <dd>{audiences.filter((a) => audienceIds.includes(a.id)).map((a) => a.name).join(", ") || "Nog niet gekozen"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-semibold text-km-muted">Behoefte of probleem</dt>
                      <dd>{problem.trim() || "Overgeslagen"}</dd>
                    </div>
                  </dl>
                  {project?.settings.requireApproval && (
                    <p className="rounded-xl bg-km-warning-soft p-4 text-km-warning-text">
                      In dit project bekijkt een redacteur nieuwe ideeën eerst. Daarna is het voor iedereen zichtbaar.
                    </p>
                  )}
                  <p className="text-sm text-km-muted">
                    Prototype: je idee wordt alleen in dit browservenster toegevoegd en niet opgeslagen.
                  </p>
                </div>
              ),
            },
          ]}
        />
      </div>
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Stoppen met dit idee?"
        description="Wat je hebt ingevuld, gaat verloren."
        cancelLabel="Verder invullen"
        confirmLabel="Stoppen"
        destructive
        onConfirm={() => router.push("/ideeen")}
      />
    </div>
  );
}
