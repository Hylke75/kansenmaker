import { Lightbulb } from "lucide-react";
import { MICROCOPY } from "@/lib/steps";
import { cn } from "@/lib/utils";

/** Voor wie twijfelt of een idee goed genoeg is. */
export function DoubtNote({ className, as: H = "h3" }: { className?: string; as?: "h2" | "h3" }) {
  return (
    <aside aria-labelledby="twijfel" className={cn("rounded-2xl bg-km-softgreen p-5", className)}>
      <H id="twijfel" className="flex items-center gap-2 text-lg">
        <Lightbulb className="size-5" aria-hidden />
        {MICROCOPY.doubt.title}
      </H>
      <p className="mt-1">{MICROCOPY.doubt.text}</p>
    </aside>
  );
}

/** Bij een idee met status 'Te onderzoeken'. */
export function SelectedNote({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border-2 border-km-yellow bg-km-offwhite p-5", className)}>
      <p className="font-heading text-lg font-bold text-km-green">{MICROCOPY.selected.title}</p>
      <p className="mt-1">{MICROCOPY.selected.text}</p>
    </div>
  );
}
