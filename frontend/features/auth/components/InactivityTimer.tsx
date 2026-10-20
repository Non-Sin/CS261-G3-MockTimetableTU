"use client";

import type { ReactNode } from "react";
import {
  DEFAULT_INACTIVITY_TIMEOUT_MS,
  useInactivityTimer,
} from "../hooks/useInactivityTimer";

export default function InactivityTimer({
  timeoutMs = DEFAULT_INACTIVITY_TIMEOUT_MS,
  children,
}: {
  timeoutMs?: number;
  children?: ReactNode;
}) {
  useInactivityTimer(timeoutMs);
  return children ? <>{children}</> : null;
}
