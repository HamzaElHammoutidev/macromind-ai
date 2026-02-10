"use client";

import { useState, useEffect } from "react";
import { getMarketStatus } from "@/lib/market-hours";
import type { MarketStatus } from "@/types";

const STATUS_STYLES: Record<MarketStatus, { dot: string; label: string }> = {
  Open: { dot: "bg-green-500 animate-pulse", label: "Market Open" },
  "Pre-Market": { dot: "bg-yellow-500 animate-pulse", label: "Pre-Market" },
  "After-Hours": { dot: "bg-yellow-500", label: "After Hours" },
  Closed: { dot: "bg-red-500", label: "Market Closed" },
};

export function MarketStatusIndicator() {
  const [status, setStatus] = useState<MarketStatus>("Closed");

  useEffect(() => {
    const update = () => setStatus(getMarketStatus());
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  const style = STATUS_STYLES[status];

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${style.dot}`} />
      <span className="text-sm text-muted-foreground">{style.label}</span>
    </div>
  );
}
