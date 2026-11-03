"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useNextStep } from "./step-progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, isActive } from "./nav-items";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

type Mode = "auto" | "open" | "closed";

/**
 * Sidebar — vaste zijbalk vanaf tablet. 240px op desktop, op tablet standaard
 * ingeklapt tot iconen (72px) en uitklapbaar. Op mobiel: zie MobileNav.
 */
export function Sidebar() {
  const [mode, setMode] = React.useState<Mode>("auto");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const open = mode === "open" || (mode === "auto" && isDesktop);
  const toggle = () => setMode(open ? "closed" : "open");
  const next = useNextStep();

  const width = mode === "open" ? "w-60" : mode === "closed" ? "w-[72px]" : "w-[72px] lg:w-60";
  const showLabel = mode === "open" ? "" : mode === "closed" ? "sr-only" : "sr-only lg:not-sr-only";
  const showWide = mode === "open" ? "flex" : mode === "closed" ? "hidden" : "hidden lg:flex";
  const showNarrow = mode === "open" ? "hidden" : mode === "closed" ? "flex" : "flex lg:hidden";

  return (
    <aside
      data-print-hide
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-km-line bg-white transition-[width] md:flex",
        width,
      )}
      aria-label="Hoofdmenu"
    >
      <div className="flex items-center px-4 pt-5 pb-6">
        <Logo className={showWide} />
        <Logo compact className={showNarrow} />
      </div>

      <nav aria-label="Hoofdnavigatie" className="flex-1 overflow-y-auto px-3">
        <React.Suspense fallback={<SidebarLinks pathname="" open={open} showLabel={showLabel} />}>
          <SidebarLinksWithPath open={open} showLabel={showLabel} />
        </React.Suspense>
      </nav>

      <div className="flex flex-col gap-2 border-t border-km-line p-3">
        <Button asChild className="w-full px-0">
          <Link href={next.href}>
            <ArrowRight aria-hidden />
            <span className={showLabel}>{next.label}</span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          onClick={toggle}
          aria-expanded={open}
          className="w-full justify-center px-0 font-normal"
        >
          {open ? <PanelLeftClose aria-hidden /> : <PanelLeftOpen aria-hidden />}
          <span className={showLabel}>{open ? "Menu inklappen" : "Menu uitklappen"}</span>
        </Button>
      </div>
    </aside>
  );
}

function SidebarLinksWithPath(props: { open: boolean; showLabel: string }) {
  const pathname = usePathname();
  return <SidebarLinks pathname={pathname} {...props} />;
}

function SidebarLinks({ pathname, open, showLabel }: { pathname: string; open: boolean; showLabel: string }) {
  return (
    <ul className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, description, Icon }) => {
        const active = isActive(pathname, href);
        const link = (
          <Link
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-km-green transition-colors",
              active ? "bg-km-softgreen font-bold" : "hover:bg-km-offwhite",
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <span className={cn("flex flex-col leading-tight", showLabel)}>
              <span className="font-semibold">{label}</span>
              <span className="text-xs font-normal text-km-muted">{description}</span>
            </span>
          </Link>
        );
        return (
          <li key={href}>
            {open ? (
              link
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">
                  {label}
                </TooltipContent>
              </Tooltip>
            )}
          </li>
        );
      })}
    </ul>
  );
}
