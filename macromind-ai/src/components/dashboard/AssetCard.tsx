"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SentimentBadge } from "./SentimentBadge";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { TrendIndicator } from "./TrendIndicator";
import { FreshnessTimestamp } from "./FreshnessTimestamp";
import { ChevronRight } from "lucide-react";
import type { AssetAnalysis } from "@/types";
import { SENTIMENT_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface AssetCardProps {
  asset: AssetAnalysis;
  lastUpdated: string;
  onDeepDive: (ticker: string) => void;
  liveQuote?: { price: number; change_percent: number; change: number };
}

export function AssetCard({
  asset,
  lastUpdated,
  onDeepDive,
  liveQuote,
}: AssetCardProps) {
  const sentimentStyle = SENTIMENT_COLORS[asset.sentiment];
  const quote = liveQuote ?? asset.quote;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:scale-[1.01]",
        sentimentStyle.glow,
        "border-l-2",
        asset.sentiment === "Bullish"
          ? "border-l-bullish"
          : asset.sentiment === "Bearish"
            ? "border-l-bearish"
            : "border-l-neutral"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-mono text-xl font-bold">{asset.ticker}</h3>
            <p className="text-xs text-muted-foreground">{asset.name}</p>
          </div>
          <SentimentBadge sentiment={asset.sentiment} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <ConfidenceMeter
          confidence={asset.confidence}
          sentiment={asset.sentiment}
        />

        <TrendIndicator
          changePercent={quote.change_percent}
          change={quote.change}
        />

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            AI Analysis
          </p>
          <p className="text-sm leading-relaxed">{asset.summary}</p>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-3 border-t border-border">
        <FreshnessTimestamp timestamp={lastUpdated} />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDeepDive(asset.ticker)}
          className="text-xs hover:text-bullish"
        >
          Deep Dive <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}
