"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface FreshnessTimestampProps {
  timestamp: string;
}

export function FreshnessTimestamp({ timestamp }: FreshnessTimestampProps) {
  const [relativeTime, setRelativeTime] = useState(
    formatRelativeTime(timestamp)
  );

  useEffect(() => {
    setRelativeTime(formatRelativeTime(timestamp));
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(timestamp));
    }, 10000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>Last update: {relativeTime}</span>
    </div>
  );
}
