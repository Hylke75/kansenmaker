"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";

/** Projectkiezer — alle inhoud is per project afgeschermd. */
export function ProjectPicker() {
  const { myProjects, project, setProject } = useStore();
  const router = useRouter();
  const id = React.useId();
  const visible = myProjects.filter((p) => !p.archived || p.id === project?.id);
  if (visible.length === 0) return null;
  return (
    <div className="flex w-full min-w-0 items-center gap-2 md:w-auto">
      <Label htmlFor={id} className="sr-only sm:not-sr-only sm:text-sm sm:text-km-muted">
        Project
      </Label>
      <Select
        value={project?.id}
        onValueChange={(v) => {
          setProject(v);
          router.push("/");
        }}
      >
        <SelectTrigger id={id} className="w-full min-w-0 font-semibold text-km-green md:max-w-xs">
          <SelectValue placeholder="Kies een project" />
        </SelectTrigger>
        <SelectContent>
          {visible.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
              {p.archived ? " (gearchiveerd)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
