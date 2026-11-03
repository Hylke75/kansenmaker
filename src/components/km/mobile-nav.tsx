"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, isActive } from "./nav-items";
import { cn } from "@/lib/utils";

/** MobileNav — de zijbalk als menu op mobiel. */
export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu openen">
          <Menu aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] max-w-xs gap-0 p-0">
        <SheetHeader className="border-b border-km-line p-5">
          <SheetTitle className="font-heading text-xl font-bold text-km-green">De Kansenmaker</SheetTitle>
          <SheetDescription className="text-sm text-km-muted">Haags Verhaal</SheetDescription>
        </SheetHeader>
        <nav aria-label="Hoofdnavigatie" className="overflow-y-auto p-3">
          <React.Suspense fallback={<MobileLinks pathname="" onNavigate={() => setOpen(false)} />}>
            <MobileLinksWithPath onNavigate={() => setOpen(false)} />
          </React.Suspense>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function MobileLinksWithPath({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  return <MobileLinks pathname={pathname} onNavigate={onNavigate} />;
}

function MobileLinks({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  return (
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, label, description, Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 text-km-green",
                      active ? "bg-km-softgreen" : "hover:bg-km-offwhite",
                    )}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden />
                    <span className="flex flex-col leading-tight">
                      <span className="font-semibold">{label}</span>
                      <span className="text-sm text-km-muted">{description}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
  );
}
