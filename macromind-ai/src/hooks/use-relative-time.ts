"use client";

import { useState, useEffect } from "react";
import { formatRelativeTime } from "@/lib/utils";

export function useRelativeTime(
  timestamp: string | null,
  intervalMs = 30000
) {
  const [relative, setRelative] = useState(
    timestamp ? formatRelativeTime(timestamp) : "Never"
  );

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

  return relative;
}
