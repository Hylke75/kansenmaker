"use client";

import * as React from "react";
import Link from "next/link";
import { Lightbulb, Pencil, Plus, Trash2 } from "lucide-react";
import { useProjectData, useStore } from "@/lib/store";
import { PageHeader } from "@/components/km/page-header";
import { NotInProject, RequireProject } from "@/components/km/guards";
import { StatusBadge, Tag } from "@/components/km/status-badge";
import { ConfirmDialog } from "@/components/km/confirm-dialog";
import { EmptyState } from "@/components/km/empty-state";
import { FormField } from "@/components/km/form-field";
import { notify } from "@/components/km/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AudienceDialog } from "./audiences";

export function AudienceDetailScreen({ id }: { id: string }) {
  return (
    <RequireProject>
      <Inner id={id} />
    </RequireProject>
  );
}

function Inner({ id }: { id: string }) {
  const { allowed, addNeed, removeNeed } = useStore();
  const { audiences, needs, ideas, concepts } = useProjectData();
  const audience = audiences.find((a) => a.id === id);
  const [editOpen, setEditOpen] = React.useState(false);
  const [newNeed, setNewNeed] = React.useState("");
  const [error, setError] = React.useState<string>();
  if (!audience) return <NotInProject kind="doelgroep" backHref="/doelgroepen" backLabel="Naar alle doelgroepen" />;

  const canManage = allowed("concepten.beheren");
  const myNeeds = needs.filter((n) => n.audienceId === audience.id);
  const myIdeas = ideas.filter((i) => i.audienceIds.includes(audience.id) && !i.archived && !i.pending);
  const myConcepts = concepts.filter((c) => c.audienceIds.includes(audience.id));

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNeed.trim()) return setError("Beschrijf de behoefte.");
    if (myNeeds.some((n) => n.description.toLowerCase() === newNeed.trim().toLowerCase())) return setError("Deze behoefte staat er al.");
    setError(undefined);
    if (await notify.after(addNeed(audience.id, newNeed), "Behoefte toegevoegd")) setNewNeed("");
  };

  return (
    <>
      <PageHeader
        back={{ href: "/doelgroepen", label: "Terug naar doelgroepen" }}
        title={audience.name}
        description={audience.description}
        meta={
          <>
            <Tag>{audience.category}</Tag>
          </>
        }
        actions={
          canManage && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil aria-hidden />
              Bewerken
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="behoeften">
          <h2 id="behoeften" className="mb-2 text-2xl">Mogelijke behoeften</h2>
          <p className="mb-6 text-km-muted">Eén behoefte kan door meerdere concepten worden bediend.</p>
          {myNeeds.length === 0 ? (
            <EmptyState as="h3" icon={Lightbulb} title="Nog geen behoeften" description="Wat heeft deze doelgroep nodig? Voeg de eerste behoefte toe." />
          ) : (
            <ul className="flex flex-col gap-3">
              {myNeeds.map((n) => {
                const serving = concepts.filter((c) => c.needIds.includes(n.id));
                const fromIdeas = ideas.filter((i) => i.needIds.includes(n.id) && !i.archived);
                return (
                  <li key={n.id} className="rounded-2xl bg-km-softgreen p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg">{n.description}</h3>
                      {canManage && (
                        <ConfirmDialog
                          title="Behoefte verwijderen?"
                          description={`‘${n.description}’ wordt ook losgekoppeld van ideeën en concepten.`}
                          confirmLabel="Verwijderen"
                          destructive
                          onConfirm={() => {
                            void notify.after(removeNeed(n.id), "Behoefte verwijderd");
                          }}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label={`Verwijder behoefte ‘${n.description}’`}>
                              <Trash2 aria-hidden />
                            </Button>
                          }
                        />
                      )}
                    </div>
                    <p className="mt-2 text-sm text-km-text">
                      {serving.length > 0 ? (
                        <>
                          Bediend door:{" "}
                          {serving.map((c, i) => (
                            <React.Fragment key={c.id}>
                              {i > 0 && ", "}
                              <Link href={`/concepten/${c.id}`} className="font-semibold text-km-green underline underline-offset-4">
                                {c.name}
                              </Link>
                            </React.Fragment>
                          ))}
                        </>
                      ) : (
                        "Nog geen concept dat deze behoefte bedient."
                      )}
                      {fromIdeas.length > 0 && ` · ${fromIdeas.length} ${fromIdeas.length === 1 ? "idee" : "ideeën"}`}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          {canManage && (
            <form onSubmit={add} noValidate className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
              <FormField label="Nieuwe behoefte" error={error} className="flex-1">
                {(p) => <Input {...p} value={newNeed} onChange={(e) => setNewNeed(e.target.value)} placeholder="Bijvoorbeeld ‘Nieuwe mensen ontmoeten’" />}
              </FormField>
              <Button type="submit" variant="outline" className={error ? "sm:mb-7" : ""}>
                <Plus aria-hidden />
                Toevoegen
              </Button>
            </form>
          )}
        </section>

        <aside className="flex flex-col gap-8" aria-label="Gekoppeld">
          <section>
            <h2 className="mb-3 text-xl">Gekoppelde concepten</h2>
            {myConcepts.length === 0 ? (
              <p className="text-km-muted">Nog geen concepten.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {myConcepts.map((c) => (
                  <li key={c.id} className="flex flex-col gap-1 rounded-xl bg-white p-4 ring-1 ring-km-line">
                    <Link href={`/concepten/${c.id}`} className="font-semibold text-km-green underline underline-offset-4 hover:no-underline">
                      {c.name}
                    </Link>
                    <StatusBadge status={c.status} className="w-fit" />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="mb-3 text-xl">Ideeën voor deze doelgroep</h2>
            {myIdeas.length === 0 ? (
              <p className="text-km-muted">Nog geen ideeën.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {myIdeas.map((i) => (
                  <li key={i.id}>
                    <Link href={`/ideeen/${i.id}`} className="text-km-green underline underline-offset-4 hover:no-underline">
                      {i.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
      <AudienceDialog open={editOpen} onOpenChange={setEditOpen} audience={audience} />
    </>
  );
}
