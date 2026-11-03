import type { Metadata, Viewport } from "next";
import { Maven_Pro, Open_Sans } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider } from "@/lib/store";
import { Toast } from "@/components/km/toast";
import "./globals.css";

/*
 * Lettertypes: Maven Pro (koppen) en Open Sans (tekst) worden op haagsverhaal.nl
 * gebruikt. Voorlopig — definitief zodra de officiële huisstijl is vastgesteld.
 */
const display = Maven_Pro({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700"] });
const body = Open_Sans({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "De Kansenmaker — Haags Verhaal", template: "%s — De Kansenmaker" },
  description: "Samen ontdekken we nieuwe mogelijkheden. De Kansenmaker van Haags Verhaal.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#faf8f3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className={`${display.variable} ${body.variable} antialiased`}>
      <body className="min-h-dvh">
        <StoreProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toast />
        </StoreProvider>
      </body>
    </html>
  );
}
