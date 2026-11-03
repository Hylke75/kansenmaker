"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="inhoud" className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <span className="mb-6 flex size-14 items-center justify-center rounded-full bg-km-danger-soft text-km-danger">
        <TriangleAlert className="size-7" aria-hidden />
      </span>
      <h1 className="text-3xl">Er ging iets mis</h1>
      <p className="mt-3 text-lg">Dit onderdeel kon niet worden geladen. Probeer het opnieuw.</p>
      <Button className="mt-8" onClick={reset}>
        Opnieuw proberen
      </Button>
    </main>
  );
}
