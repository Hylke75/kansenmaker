"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { FormField } from "./form-field";
import { notify } from "./toast";

/** Naam en organisatie wijzigen. Het e-mailadres is je inlognaam en wijzig je hier niet. */
export function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { currentUser, updateProfile } = useStore();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mijn profiel</DialogTitle>
          <DialogDescription>
            Andere deelnemers in je projecten zien je naam en organisatie. Je logt in met {currentUser.email}.
          </DialogDescription>
        </DialogHeader>
        {open && <ProfileForm onDone={() => onOpenChange(false)} initialName={currentUser.nameMissing ? "" : currentUser.name} initialOrg={currentUser.organisation ?? ""} save={updateProfile} />}
      </DialogContent>
    </Dialog>
  );
}

export function ProfileForm({
  initialName,
  initialOrg,
  save,
  onDone,
  submitLabel = "Bewaren",
}: {
  initialName: string;
  initialOrg: string;
  save: (p: { name: string; organisation: string }) => Promise<boolean | null>;
  onDone?: () => void;
  submitLabel?: string;
}) {
  const [name, setName] = React.useState(initialName);
  const [org, setOrg] = React.useState(initialOrg);
  const [error, setError] = React.useState<string>();
  const [busy, setBusy] = React.useState(false);
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return setError("Vul je naam in.");
        if (name.trim().length > 80) return setError("Gebruik maximaal 80 tekens.");
        setError(undefined);
        setBusy(true);
        const ok = await notify.after(save({ name, organisation: org }), "Profiel bewaard");
        setBusy(false);
        if (ok) onDone?.();
      }}
    >
      <FormField label="Naam" error={error}>
        {(p) => <Input {...p} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />}
      </FormField>
      <FormField label="Organisatie" optional>
        {(p) => <Input {...p} autoComplete="organization" value={org} onChange={(e) => setOrg(e.target.value)} />}
      </FormField>
      <DialogFooterOrPlain>
        <Button type="submit" disabled={busy}>
          {busy ? "Bezig…" : submitLabel}
        </Button>
      </DialogFooterOrPlain>
    </form>
  );
}

function DialogFooterOrPlain({ children }: { children: React.ReactNode }) {
  return <DialogFooter className="sm:justify-start">{children}</DialogFooter>;
}
