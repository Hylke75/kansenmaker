import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** Kopniveau: standaard h2 */
  as?: "h2" | "h3" | "h4";
}

/** EmptyState — vriendelijke uitleg + één vervolgactie, nooit een leeg scherm. */
export function EmptyState({ icon: Icon, title, description, action, className, as: H = "h2" }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-[#bfc9bb] bg-white px-6 py-10 text-center",
        className,
      )}
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-km-softgreen text-km-green">
        <Icon className="size-6" aria-hidden />
      </span>
      <H className="text-xl">{title}</H>
      {description && <div className="mt-2 max-w-md text-km-muted">{description}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
