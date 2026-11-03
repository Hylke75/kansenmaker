import Link from "next/link";
import { ArrowLeft, Lightbulb, Plus } from "lucide-react";
import { PrimaryButton } from "@/components/km/primary-button";
import { Button } from "@/components/ui/button";
import { THANKS } from "@/lib/steps";

/** /stappen/bedankt – afsluiting van de zes stappen. */
export function ThanksScreen() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm font-bold tracking-[0.18em] text-km-muted">KANSENKAMER</p>
      <h1 className="mt-2 text-4xl md:text-5xl">{THANKS.title}</h1>
      <p className="mt-4 text-xl text-km-green">{THANKS.lead}</p>
      <div className="mt-6 flex flex-col gap-4 text-lg leading-relaxed">
        {THANKS.paragraphs.map((t) => (
          <p key={t}>{t}</p>
        ))}
      </div>
      <p className="mt-8 rounded-2xl bg-km-softgreen p-6 font-heading text-xl font-bold text-km-green md:text-2xl">{THANKS.closing}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <PrimaryButton href="/ideeen" size="lg" icon={<Lightbulb aria-hidden />}>
          {THANKS.buttons.ideas}
        </PrimaryButton>
        <Button asChild size="lg" variant="outline">
          <Link href="/ideeen/nieuw">
            <Plus aria-hidden />
            {THANKS.buttons.newIdea}
          </Link>
        </Button>
        <Button asChild size="lg" variant="ghost">
          <Link href="/">
            <ArrowLeft aria-hidden />
            {THANKS.buttons.overview}
          </Link>
        </Button>
      </div>
    </div>
  );
}
