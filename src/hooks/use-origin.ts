"use client";

import * as React from "react";

const noop = () => () => {};
export function useOrigin() {
  return React.useSyncExternalStore(noop, () => window.location.origin, () => "");
}
