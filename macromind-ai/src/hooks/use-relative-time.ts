"use client";

import { useState, useEffect } from "react";
import { formatRelativeTime } from "@/lib/utils";

export function useRelativeTime(
  timestamp: string | null,
  intervalMs = 30000
) {
  // Initialize with empty string to avoid hydration mismatch
  const [relative, setRelative] = useState<string>("");

  useEffect(() => {
    if (!timestamp) {
      setRelative("Never");
      return;
    }

    setRelative(formatRelativeTime(timestamp));
    const interval = setInterval(() => {
      setRelative(formatRelativeTime(timestamp));
    }, intervalMs);

    return () => clearInterval(interval);
  }, [timestamp, intervalMs]);

  return relative || "Never";
}
