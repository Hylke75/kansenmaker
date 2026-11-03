import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";
import { Logo } from "@/components/km/logo";
import { PrimaryButton } from "@/components/km/primary-button";
import { HOW_IT_WORKS, STEPS, WELCOME } from "@/lib/steps";

/** Kop en voet voor de openbare pagina's (welkom, uitleg). */
function PublicFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-km-line bg-white">
        <div className="mx-auto flex min-h-16 max-w-3xl items-center justify-between gap-4 px-4">
          <Logo />
          <Link
            href="/inloggen"
            className="inline-flex min-h-11 items-center gap-2 rounded-md font-semibold text-km-green underline-offset-4 hover:underline"
          >
            <LogIn className="size-5" aria-hidden />
            Inloggen
          </Link>
        </div>
      </header>
      <main id="inhoud" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 outline-none md:py-16">
        {children}
      </main>
    </div>
  );
}

const P = ({ children }: { children: React.ReactNode }) => <p className="mt-4 text-lg leading-relaxed">{children}</p>;

/** /welkom – eerste kennismaking, ook zonder account. */
export function WelcomeScreen() {
  return (
    <PublicFrame>
      <p className="text-sm font-bold tracking-[0.18em] text-km-muted">KANSENKAMER</p>
      <h1 className="mt-2 text-4xl md:text-5xl">{WELCOME.title}</h1>
      {WELCOME.paragraphs.map((t) => (
        <P key={t}>{t}</P>
      ))}
      <h2 className="mt-10 text-2xl md:text-3xl">{WELCOME.question}</h2>
      {WELCOME.paragraphs2.map((t) => (
        <P key={t}>{t}</P>
      ))}
      <div className="mt-10 rounded-2xl bg-km-softgreen p-6 md:p-8">
        <p className="font-heading text-2xl font-bold text-km-green">{WELCOME.highlight}</p>
        {WELCOME.paragraphs3.map((t) => (
          <P key={t}>{t}</P>
        ))}
        <PrimaryButton href="/hoe-werkt-het" size="lg" className="mt-6" icon={<ArrowRight aria-hidden />}>
          {WELCOME.button}
        </PrimaryButton>
      </div>
    </PublicFrame>
  );
}

/** /hoe-werkt-het – uitleg van de zes stappen. */
export function HowItWorksScreen() {
  return (
    <PublicFrame>
      <Link
        href="/welkom"
        className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-md font-semibold text-km-green underline-offset-4 hover:underline"
      >
        ← Terug
      </Link>
      <h1 className="text-4xl md:text-5xl">{HOW_IT_WORKS.title}</h1>
      <p className="mt-4 text-xl">{HOW_IT_WORKS.lead}</p>
      {HOW_IT_WORKS.paragraphs.map((t) => (
        <P key={t}>{t}</P>
      ))}

      <h2 className="mt-12 text-2xl md:text-3xl">De 6 stappen van de KansenKamer</h2>
      <ol className="mt-6 flex flex-col gap-4" aria-label="De zes stappen">
        {STEPS.map((s) => (
          <li key={s.number} className="flex gap-4 rounded-2xl border border-km-line bg-white p-5 md:p-6">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-km-green font-heading text-lg font-bold text-white"
              aria-hidden
            >
              {s.number}
            </span>
            <div>
              <h3 className="text-xl">
                <span className="sr-only">Stap {s.number}. </span>
                {s.short} – {s.headline}
              </h3>
              <p className="mt-2">{s.summary}</p>
              <p className="mt-2">
                <span className="font-semibold text-km-green">Doel:</span> {s.goal}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-10 rounded-2xl bg-km-softgreen p-6 font-heading text-xl font-bold text-km-green md:text-2xl">
        {HOW_IT_WORKS.highlight}
      </p>
      {HOW_IT_WORKS.paragraphs2.map((t) => (
        <P key={t}>{t}</P>
      ))}
      <PrimaryButton href="/stappen/1" size="lg" className="mt-8" icon={<ArrowRight aria-hidden />}>
        {HOW_IT_WORKS.button}
      </PrimaryButton>
      <p className="mt-4 text-sm text-km-muted">Je logt eerst in met je e-mailadres; je hebt geen wachtwoord nodig.</p>
    </PublicFrame>
  );
}
