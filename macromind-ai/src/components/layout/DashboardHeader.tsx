"use client";

import { useState, useEffect } from "react";
import { Brain } from "lucide-react";
import { MarketStatusIndicator } from "./MarketStatusIndicator";

export function DashboardHeader() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-bullish" />
          <span className="font-bold text-lg">MacroMind AI</span>
          <span className="text-xs text-muted-foreground ml-2">Macro Desk</span>
        </div>
        <div className="flex items-center gap-6">
          <MarketStatusIndicator />
          <div className="text-right">
            <div className="text-sm font-mono">{formattedTime}</div>
            <div className="text-xs text-muted-foreground">{formattedDate}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
