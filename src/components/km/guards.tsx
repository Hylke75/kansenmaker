"use client";

import Link from "next/link";
import { FolderOpen, Lock, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { EmptyState } from "./empty-state";

/** Toont een startscherm als de gebruiker (nog) geen project heeft. */
export function RequireProject({ children }: { children: React.ReactNode }) {
  const { project } = useStore();
  if (!project) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Je hebt nog geen project"
        description="Je kunt dit onderdeel gebruiken zodra je bent uitgenodigd voor een project."
        action={
          <Button asChild>
            <Link href="/">Naar het startscherm</Link>
          </Button>
        }
      />
    );
  }
  return <>{children}</>;
}

export function AccessDenied({ title = "Je hebt geen toegang tot dit onderdeel", description }: { title?: string; description: React.ReactNode }) {
  return (
    <div className="py-8">
      <EmptyState
        icon={Lock}
        as="h2"
        title={title}
        description={description}
        action={
          <Button asChild variant="outline">
            <Link href="/">Terug naar het overzicht</Link>
          </Button>
        }
      />
    </div>
  );
}

/** Niet gevonden óf hoort bij een ander project — we verklappen niets over andere projecten. */
export function NotInProject({ kind, backHref, backLabel }: { kind: string; backHref: string; backLabel: string }) {
  return (
    <div className="py-8">
      <h1 className="sr-only">{kind} niet gevonden</h1>
      <EmptyState
        icon={SearchX}
        title={`Dit ${kind} is niet gevonden`}
        description="Het bestaat niet (meer), of het hoort bij een project waar je nu niet in werkt. Kies eventueel een ander project bovenaan."
        action={
          <Button asChild variant="outline">
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        }
      />
    </div>
  );
}
