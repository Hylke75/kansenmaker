"use client";

import { toast as sonner } from "sonner";
import { Toaster } from "@/components/ui/sonner";

/**
 * Toast — korte statusmeldingen (sonner gebruikt een aria-live-regio).
 * Succes wordt pas gemeld nadat de database de wijziging heeft bevestigd (`notify.after`);
 * fouten meldt de gegevenslaag zelf.
 */
export function Toast() {
  return <Toaster position="bottom-right" closeButton richColors={false} duration={6000} />;
}

export const notify = {
  info: (message: string, description?: string) => sonner.info(message, { description }),
  success: (message: string, description?: string) => sonner.success(message, { description }),
  error: (message: string, description?: string) => sonner.error(message, { description, duration: 10000 }),
  /** Wacht op een opslagactie en meldt alleen succes als die gelukt is. Geeft het resultaat terug. */
  after: async <T,>(action: Promise<T | null>, message: string): Promise<T | null> => {
    const result = await action;
    if (result !== null && result !== undefined) sonner.success(message);
    return result;
  },
};
