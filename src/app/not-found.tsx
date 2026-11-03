import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="inhoud" className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
      <span className="mb-6 flex size-14 items-center justify-center rounded-full bg-km-softgreen text-km-green">
        <Compass className="size-7" aria-hidden />
      </span>
      <h1 className="text-3xl">Deze pagina bestaat niet</h1>
      <p className="mt-3 text-lg">Misschien is de link verouderd of is het onderdeel verplaatst.</p>
      <Button asChild className="mt-8">
        <Link href="/">Naar het overzicht</Link>
      </Button>
    </main>
  );
}
