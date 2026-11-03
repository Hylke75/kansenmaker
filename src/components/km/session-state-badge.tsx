import { CalendarClock, CircleCheck, Radio } from "lucide-react";
import type { SessionState } from "@/lib/types";
import { cn } from "@/lib/utils";

const META: Record<SessionState, { label: string; cls: string; Icon: typeof Radio }> = {
  gepland: { label: "Gepland", cls: "bg-white text-km-green border-km-line", Icon: CalendarClock },
  actief: { label: "Actief", cls: "bg-km-yellow text-km-green border-km-yellow", Icon: Radio },
  afgesloten: { label: "Afgesloten", cls: "bg-[#ecebe7] text-[#3b3b37] border-[#d6d4cd]", Icon: CircleCheck },
};

export function SessionStateBadge({ state, className }: { state: SessionState; className?: string }) {
  const { label, cls, Icon } = META[state];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold", cls, className)}>
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">Sessiestatus: </span>
      {label}
    </span>
  );
}
