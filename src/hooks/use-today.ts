"use client";

import * as React from "react";

const noop = () => () => {};
let cached: string | null = null;
const read = () => (cached ??= new Date().toISOString().slice(0, 10));

/**
 * Datum van vandaag (JJJJ-MM-DD), alleen op de client gelezen zodat de pagina
 * vooraf gerenderd kan worden. Tijdens prerender: null.
 */
export function useToday(): string | null {
  return React.useSyncExternalStore(noop, read, () => null);
}
