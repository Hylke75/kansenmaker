"use client";

import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/permissions";
import { initials } from "@/lib/format";
import { MobileNav } from "./mobile-nav";
import { Logo } from "./logo";
import { ProjectPicker } from "./project-picker";
import { PrototypeSwitcher } from "./prototype-switcher";
import { notify } from "./toast";

/** Header — menu (mobiel), projectkiezer, prototypemelding en gebruikersmenu. */
export function Header() {
  const { currentUser, role } = useStore();
  return (
    <header data-print-hide className="sticky top-0 z-30 border-b border-km-line bg-km-offwhite/95 backdrop-blur supports-[backdrop-filter]:bg-km-offwhite/80">
      <div className="mx-auto flex min-h-16 max-w-[1200px] items-center gap-2 px-4 md:px-8">
        <MobileNav />
        <Logo className="mr-2 md:hidden max-[380px]:hidden" />
        <div className="hidden min-w-0 flex-1 md:flex">
          <ProjectPicker />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <PrototypeSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <span className="flex size-9 items-center justify-center rounded-full bg-km-green text-sm font-bold text-white">
                  {initials(currentUser.name)}
                </span>
                <span className="sr-only">, gebruikersmenu van {currentUser.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
                <span className="text-base font-semibold text-km-green">{currentUser.name}</span>
                <span className="text-sm font-normal text-km-muted">{role ? ROLE_LABELS[role] : "Geen rol in dit project"}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="min-h-11 text-base"
                onSelect={() => notify.info("Profiel bewerken volgt in stap 2", "Accounts worden gekoppeld zodra de database en authenticatie zijn gebouwd.")}
              >
                <UserRound aria-hidden />
                Mijn profiel
              </DropdownMenuItem>
              <DropdownMenuItem
                className="min-h-11 text-base"
                onSelect={() => notify.error("Uitloggen is nog niet beschikbaar", "Er is nog geen inlogsysteem gekoppeld. Wissel van gebruiker via ‘Prototype’.")}
              >
                <LogOut aria-hidden />
                Uitloggen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="border-t border-km-line px-4 py-2 md:hidden">
        <ProjectPicker />
      </div>
    </header>
  );
}
