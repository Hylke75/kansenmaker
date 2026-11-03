"use client";

import * as React from "react";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/permissions";

/**
 * Prototype-instellingen: wissel van (fictieve) gebruiker om de rollen te
 * testen. Verdwijnt zodra echte authenticatie is aangesloten.
 */
export function PrototypeSwitcher() {
  const { state, setCurrentUser } = useStore();
  const [open, setOpen] = React.useState(false);

  const describe = (userId: string) => {
    const ms = state.memberships.filter((m) => m.userId === userId);
    if (ms.length === 0) return "Geen projecten — toont het startscherm";
    const pm = ms.find((m) => m.projectId === "p1") ?? ms[0];
    return `${ROLE_LABELS[pm.role]} in ‘${state.projects.find((p) => p.id === pm.projectId)?.name}’`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-dashed border-[#c9a45a] bg-km-warning-soft text-km-warning-text hover:bg-[#f9e6c2]"
        >
          <FlaskConical className="size-4" aria-hidden />
          <span className="hidden sm:inline">Prototype</span>
          <span className="sr-only sm:hidden">Prototype-instellingen</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prototype-instellingen</DialogTitle>
          <DialogDescription>
            Dit is een klikbaar prototype met fictieve voorbeeldgegevens. Er is nog geen database of inlogsysteem
            gekoppeld: wijzigingen blijven alleen in dit browservenster en verdwijnen bij herladen.
          </DialogDescription>
        </DialogHeader>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 font-semibold text-km-green">Bekijk het systeem als</legend>
          <RadioGroup
            value={state.currentUserId}
            onValueChange={(v) => {
              setCurrentUser(v);
              setOpen(false);
            }}
            className="gap-2"
          >
            {state.users
              .filter((u) => ["u1", "u2", "u3", "u4", "u8"].includes(u.id))
              .map((u) => (
                <Label
                  key={u.id}
                  htmlFor={`proto-${u.id}`}
                  className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-km-line p-3 font-normal has-[[data-state=checked]]:border-km-green has-[[data-state=checked]]:bg-km-softgreen"
                >
                  <RadioGroupItem id={`proto-${u.id}`} value={u.id} />
                  <span className="flex flex-col">
                    <span className="font-semibold text-km-green">{u.name}</span>
                    <span className="text-sm text-km-muted">{describe(u.id)}</span>
                  </span>
                </Label>
              ))}
          </RadioGroup>
        </fieldset>
      </DialogContent>
    </Dialog>
  );
}
