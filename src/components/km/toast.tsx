"use client";

import { toast as sonner } from "sonner";
import { Toaster } from "@/components/ui/sonner";

/**
 * Toast — korte statusmeldingen.
 * Meldingen over wijzigingen zeggen altijd eerlijk dat er (nog) niets in een
 * database wordt opgeslagen. Sonner gebruikt een aria-live-regio.
 */
export function Toast() {
  return <Toaster position="bottom-right" closeButton richColors={false} duration={6000} />;
}

const NOT_SAVED = "Alleen zichtbaar in dit browservenster. Er is nog geen database gekoppeld; niets wordt opgeslagen.";

export const notify = {
  /** Wijziging in de voorbeeldgegevens (niet opgeslagen) */
  prototype: (message: string) => sonner.info(message, { description: NOT_SAVED }),
  info: (message: string, description?: string) => sonner.info(message, { description }),
  success: (message: string, description?: string) => sonner.success(message, { description }),
  error: (message: string, description?: string) => sonner.error(message, { description, duration: 10000 }),
};
