"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { getSupabase } from "@/lib/supabase/client";
import { FormField } from "./form-field";
import { notify } from "./toast";

/** Nieuw wachtwoord instellen voor de ingelogde gebruiker (Supabase Auth). */
function PasswordForm({ email }: { email: string }) {
  const [password, setPassword] = React.useState("");
  const [repeat, setRepeat] = React.useState("");
  const [errors, setErrors] = React.useState<{ password?: string; repeat?: string }>({});
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = {
      password: password.length < 8 ? "Gebruik minimaal 8 tekens." : password.length > 72 ? "Gebruik maximaal 72 tekens." : undefined,
      repeat: password !== repeat ? "De wachtwoorden zijn niet hetzelfde." : undefined,
    };
    setErrors(errs);
    if (errs.password || errs.repeat) return;
    setBusy(true);
    const { error } = await getSupabase().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      const msg =
        error.code === "same_password"
          ? "Dit is al je huidige wachtwoord. Kies een ander wachtwoord."
          : error.code === "weak_password"
            ? "Dit wachtwoord is te zwak of komt voor in lijsten met gelekte wachtwoorden. Kies een sterker wachtwoord."
            : error.code === "reauthentication_needed"
              ? "Log voor de zekerheid opnieuw in en probeer het daarna nog eens."
              : "Je wachtwoord kon niet worden gewijzigd. Probeer het later opnieuw.";
      setErrors({ password: msg });
      return;
    }
    setPassword("");
    setRepeat("");
    notify.success("Je wachtwoord is gewijzigd");
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      {/* Verborgen gebruikersnaam helpt wachtwoordmanagers het juiste account te kiezen */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <FormField label="Nieuw wachtwoord" hint="Minimaal 8 tekens." error={errors.password}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
      </FormField>
      <FormField label="Herhaal nieuw wachtwoord" error={errors.repeat}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />}
      </FormField>
      <Button type="submit" variant="outline" className="self-start" disabled={busy}>
        {busy ? "Bezig…" : "Wachtwoord wijzigen"}
      </Button>
    </form>
  );
}

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
        {open && (
          <section aria-labelledby="wachtwoord-kop" className="mt-2 border-t border-km-line pt-5">
            <h3 id="wachtwoord-kop" className="text-lg">
              Wachtwoord wijzigen
            </h3>
            <p className="mt-1 mb-4 text-sm text-km-muted">
              Optioneel. Je kunt altijd ook inloggen met een inloglink per e-mail.
            </p>
            <PasswordForm email={currentUser.email} />
          </section>
        )}
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
