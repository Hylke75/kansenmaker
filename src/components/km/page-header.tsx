import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  meta?: React.ReactNode;
  className?: string;
}

/** PageHeader — één h1 per pagina, optioneel terug-link, beschrijving en acties. */
export function PageHeader({ title, description, eyebrow, actions, back, meta, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-8 flex flex-col gap-4", className)}>
      {back && (
        <Link
          href={back.href}
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md font-semibold text-km-green underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-5" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          {eyebrow && <p className="mb-2 text-sm font-semibold tracking-wide text-km-muted uppercase">{eyebrow}</p>}
          <h1 className="text-3xl md:text-4xl lg:text-[2.75rem]">{title}</h1>
          {description && <p className="mt-3 text-lg text-km-text">{description}</p>}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-3 md:shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
