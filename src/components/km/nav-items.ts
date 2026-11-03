import { Home, Layers, Lightbulb, Presentation, Settings, Users } from "lucide-react";

/** De zes hoofdonderdelen van de navigatie (§1 functioneel ontwerp). */
export const NAV_ITEMS = [
  { href: "/", label: "Overzicht", description: "Mijn projecten en recente activiteit", Icon: Home },
  { href: "/ideeen", label: "Ideeën", description: "Ideeën verzamelen en verbeteren", Icon: Lightbulb },
  { href: "/doelgroepen", label: "Doelgroepen", description: "Doelgroepen en hun behoeften", Icon: Users },
  { href: "/concepten", label: "Concepten", description: "Ideeën uitwerken en onderzoeken", Icon: Layers },
  { href: "/sessies", label: "Sessies", description: "Samen ideeën ontwikkelen", Icon: Presentation },
  { href: "/beheer", label: "Beheer", description: "Projecten, uitnodigingen en instellingen", Icon: Settings },
] as const;

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
