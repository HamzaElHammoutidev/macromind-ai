"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { AnalysisHistoryEntry } from "@/types";
import type { Sentiment } from "@/lib/constants";

interface SentimentTrendProps {
  ticker: string;
  sentiment: Sentiment;
}

interface HistoryPoint {
  timestamp: string;
  confidence: number;
  sentiment: Sentiment;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SentimentTrend({ ticker, sentiment: _sentiment }: SentimentTrendProps) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/history/${ticker}`);
        if (!res.ok) throw new Error("Failed to fetch history");
        const data = await res.json();

        // Transform history entries into chart data
        const points: HistoryPoint[] = data.history
          .slice(0, 20) // Last 20 entries
          .reverse() // Oldest first for chart
          .map((entry: AnalysisHistoryEntry) => ({
            timestamp: entry.timestamp,
            confidence: entry.assets.find((a) => a.ticker === ticker)?.confidence ?? 0,
            sentiment: entry.assets.find((a) => a.ticker === ticker)?.sentiment ?? "Neutral",
          }))
          .filter((p: HistoryPoint) => p.confidence > 0);

        setHistory(points);
      } catch (error) {
        console.warn(`[SentimentTrend] Failed to fetch history for ${ticker}:`, error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
  }, [ticker]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Sentiment Trend
        </h4>
        <div className="h-16 bg-muted/50 rounded-md animate-pulse" />
      </div>
    );
  }

  if (history.length < 2) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Sentiment Trend
        </h4>
        <p className="text-xs text-muted-foreground">
          Insufficient historical data for trend analysis
        </p>
      </div>
    );
  }

  // Calculate trend direction
  const recent = history.slice(-5);
  const avgRecent = recent.reduce((sum, p) => sum + p.confidence, 0) / recent.length;
  
  const olderCount = Math.min(5, history.length - recent.length);
  const avgOlder = olderCount > 0
    ? history.slice(0, olderCount).reduce((sum, p) => sum + p.confidence, 0) / olderCount
    : avgRecent;
  
  const trendDirection = avgRecent > avgOlder + 5 ? "up" : avgRecent < avgOlder - 5 ? "down" : "flat";

  // Get color based on sentiment
  const getBarColor = (s: Sentiment) => {
    switch (s) {
      case "Bullish": return "bg-green-500";
      case "Bearish": return "bg-red-500";
      default: return "bg-gray-400";
    }
  };

  const maxConfidence = 100;
  const minBarHeight = 20;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Sentiment Trend (Last {history.length} Readings)
        </h4>
        <div className="flex items-center gap-1.5">
          {trendDirection === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
          {trendDirection === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
          {trendDirection === "flat" && <Minus className="h-4 w-4 text-gray-400" />}
          <span className="text-xs text-muted-foreground capitalize">{trendDirection}</span>
        </div>
      </div>

      {/* Sparkline Bar Chart */}
      <div className="flex items-end gap-1 h-20 px-2 py-2 bg-muted/30 rounded-md">
        {history.map((point, i) => {
          const height = Math.max(
            minBarHeight,
            (point.confidence / maxConfidence) * 100
          );
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end gap-1 group"
              title={`${new Date(point.timestamp).toLocaleTimeString()} - ${point.confidence}% ${point.sentiment}`}
            >
              <div
                className={`w-full rounded-t ${getBarColor(point.sentiment)} opacity-80 group-hover:opacity-100 transition-opacity`}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Bullish</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Bearish</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-400" />
          <span>Neutral</span>
        </div>
      </div>
    </div>
  );
}
