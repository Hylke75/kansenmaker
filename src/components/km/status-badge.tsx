import { Archive, CircleCheck, CircleDashed, FlaskConical, Search, Sparkles, Clock } from "lucide-react";
import type { Status } from "@/lib/types";
import { cn } from "@/lib/utils";

export const STATUS_META: Record<Status, { label: string; className: string; Icon: typeof Sparkles }> = {
  nieuw: { label: "Nieuw", className: "bg-km-warning-soft text-km-warning-text border-[#ecd3a3]", Icon: Sparkles },
  "in-ontwikkeling": { label: "In ontwikkeling", className: "bg-km-softgreen text-km-green border-[#c8d4c1]", Icon: CircleDashed },
  "te-onderzoeken": { label: "Te onderzoeken", className: "bg-[#eeeaf6] text-[#45386b] border-[#d6cfe8]", Icon: Search },
  "klaar-voor-proef": { label: "Klaar voor proef", className: "bg-[#dcefe4] text-[#0c5536] border-[#b6dac5]", Icon: FlaskConical },
  afgerond: { label: "Afgerond", className: "bg-[#ecebe7] text-[#3b3b37] border-[#d6d4cd]", Icon: CircleCheck },
};

export const STATUSES = Object.keys(STATUS_META) as Status[];

type Extra = "gearchiveerd" | "wacht-op-goedkeuring";
const EXTRA_META: Record<Extra, { label: string; className: string; Icon: typeof Sparkles }> = {
  gearchiveerd: { label: "Gearchiveerd", className: "bg-white text-km-muted border-km-line", Icon: Archive },
  "wacht-op-goedkeuring": { label: "Wacht op goedkeuring", className: "bg-white text-km-warning-text border-[#ecd3a3]", Icon: Clock },
};

/** StatusBadge — altijd icoon + tekstlabel, nooit alleen kleur. */
export function StatusBadge({ status, className }: { status: Status | Extra; className?: string }) {
  const meta = status in STATUS_META ? STATUS_META[status as Status] : EXTRA_META[status as Extra];
  const { Icon } = meta;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap",
        meta.className,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      <span>
        <span className="sr-only">Status: </span>
        {meta.label}
      </span>
    </span>
  );
}

/** Neutrale label-chip, bijvoorbeeld voor een doelgroep. */
export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full bg-km-softgreen px-2.5 py-0.5 text-sm font-medium text-km-green", className)}>
      {children}
    </span>
  );
}
