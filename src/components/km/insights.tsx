"use client";

import * as React from "react";
import { HelpCircle, Plus, ThumbsUp, Trash2, TriangleAlert } from "lucide-react";
import { useStore } from "@/lib/store";
import { INSIGHT_LABELS } from "@/lib/steps";
import type { IdeaInsight, InsightKind } from "@/lib/types";
import { FormField } from "@/components/km/form-field";
import { ConfirmDialog } from "@/components/km/confirm-dialog";
import { notify } from "@/components/km/toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const KINDS: InsightKind[] = ["kans", "bedreiging", "vraag"];
const KIND_HINT: Record<InsightKind, string> = {
  kans: "wat maakt het kansrijk?",
  bedreiging: "wat kan het lastig maken?",
  vraag: "wat moeten we eerst uitzoeken?",
};
const KIND_ICON = { kans: ThumbsUp, bedreiging: TriangleAlert, vraag: HelpCircle } as const;
const KIND_CLASS: Record<InsightKind, string> = {
  kans: "bg-km-green text-white",
  bedreiging: "bg-km-warning-soft text-km-warning-text",
  vraag: "bg-km-softgreen text-km-green",
};

export function InsightBadge({ kind }: { kind: InsightKind }) {
  const Icon = KIND_ICON[kind];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold", KIND_CLASS[kind])}>
      <Icon className="size-3.5" aria-hidden />
      {INSIGHT_LABELS[kind]}
    </span>
  );
}

/** Lijst met kansen, bedreigingen en vragen bij één idee. */
export function InsightList({ insights, headingLevel: H = "h3" }: { insights: IdeaInsight[]; headingLevel?: "h2" | "h3" | "h4" }) {
  const { currentUser, userName, allowed, removeInsight } = useStore();
  const canManage = allowed("concepten.beheren");
  if (insights.length === 0) return <p className="text-km-muted">Nog geen kansen, bedreigingen of vragen.</p>;
  return (
    <div className="flex flex-col gap-4">
      {KINDS.map((kind) => {
        const items = insights.filter((x) => x.kind === kind);
        if (!items.length) return null;
        return (
          <div key={kind}>
            <H className="mb-2 text-base font-semibold text-km-green">
              {kind === "kans" ? "Kansen" : kind === "bedreiging" ? "Bedreigingen" : "Vragen"} ({items.length})
            </H>
            <ul className="flex flex-col gap-2">
              {items.map((x) => (
                <li key={x.id} className="flex items-start justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-km-line">
                  <div className="flex flex-col gap-1">
                    <InsightBadge kind={x.kind} />
                    <p className="whitespace-pre-line">{x.text}</p>
                    {x.createdBy && <p className="text-sm text-km-muted">{userName(x.createdBy)}</p>}
                  </div>
                  {(canManage || x.createdBy === currentUser.id) && (
                    <ConfirmDialog
                      title="Verwijderen?"
                      description={`‘${x.text}’ wordt verwijderd.`}
                      confirmLabel="Verwijderen"
                      destructive
                      onConfirm={() => {
                        void notify.after(removeInsight(x.id), "Verwijderd");
                      }}
                      trigger={
                        <Button variant="ghost" size="icon" aria-label={`Verwijder ${INSIGHT_LABELS[x.kind].toLowerCase()} ‘${x.text}’`}>
                          <Trash2 aria-hidden />
                        </Button>
                      }
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** Formulier: kans, bedreiging of vraag toevoegen. Zonder ideaId kiest de gebruiker eerst een idee. */
export function InsightForm({
  ideaId,
  ideaPicker,
  submitLabel = "Voeg een kans of bedreiging toe",
  onAdded,
}: {
  ideaId?: string;
  ideaPicker?: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => React.ReactNode;
  submitLabel?: string;
  onAdded?: () => void;
}) {
  const { addInsight } = useStore();
  const [kind, setKind] = React.useState<InsightKind>("kans");
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [busy, setBusy] = React.useState(false);
  const name = React.useId();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaId) return setError("Kies eerst een idee.");
    if (!text.trim()) return setError("Beschrijf de kans, bedreiging of vraag.");
    if (text.length > 500) return setError("Gebruik maximaal 500 tekens.");
    setError(undefined);
    setBusy(true);
    const sent = text;
    const ok = await notify.after(addInsight(ideaId, kind, sent), `${INSIGHT_LABELS[kind]} toegevoegd`);
    setBusy(false);
    if (ok) {
      setText((cur) => (cur === sent ? "" : cur));
      onAdded?.();
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {ideaPicker && (
        <FormField label="Over welk idee?" error={!ideaId && error ? error : undefined}>
          {ideaPicker}
        </FormField>
      )}
      <fieldset>
        <legend className="mb-2 text-base font-semibold text-km-green">Wat wil je toevoegen?</legend>
        <RadioGroup value={kind} onValueChange={(v) => setKind(v as InsightKind)} className="flex flex-wrap gap-3">
          {KINDS.map((k) => (
            <Label
              key={k}
              htmlFor={`${name}-${k}`}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 font-normal ring-1 ring-km-line has-[[data-state=checked]]:ring-2 has-[[data-state=checked]]:ring-km-green"
            >
              <RadioGroupItem id={`${name}-${k}`} value={k} />
              <span>
                <span className="font-semibold">{INSIGHT_LABELS[k]}</span>
                <span className="text-sm text-km-muted"> — {KIND_HINT[k]}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      </fieldset>
      <FormField label="Toelichting" error={ideaId || !ideaPicker ? error : undefined} hint={`${text.length}/500 tekens`}>
        {(p) => <Textarea {...p} value={text} onChange={(e) => setText(e.target.value)} rows={3} className="bg-white" />}
      </FormField>
      <Button type="submit" className="self-start" disabled={busy}>
        <Plus aria-hidden />
        {busy ? "Bezig…" : submitLabel}
      </Button>
    </form>
  );
}
