"use client";

import { Dialog } from "@/components/ui/dialog";
import { SentimentBadge } from "./SentimentBadge";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { ConfidenceBreakdown } from "./ConfidenceBreakdown";
import { TrendIndicator } from "./TrendIndicator";
import { SentimentTrend } from "./SentimentTrend";
import { SanityCheckList } from "./SanityCheckList";
import type { AssetAnalysis } from "@/types";
import { Tag, Globe, ShieldAlert } from "lucide-react";

interface DeepDiveModalProps {
  asset: AssetAnalysis;
  isOpen: boolean;
  onClose: () => void;
}

export function DeepDiveModal({ asset, isOpen, onClose }: DeepDiveModalProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between pr-8">
          <div>
            <h2 className="font-mono text-2xl font-bold">{asset.ticker}</h2>
            <p className="text-sm text-muted-foreground">{asset.name}</p>
          </div>
          <SentimentBadge sentiment={asset.sentiment} />
        </div>

        {/* Confidence & Trend */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <ConfidenceMeter
              confidence={asset.confidence}
              sentiment={asset.sentiment}
            />
          </div>
          <div className="flex items-center">
            <TrendIndicator
              changePercent={asset.quote.change_percent}
              change={asset.quote.change}
            />
          </div>
        </div>

        {/* Extended Analysis */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Deep Analysis
          </h4>
          <div className="text-sm leading-relaxed whitespace-pre-line">
            {asset.deep_dive}
          </div>
        </div>

        {/* Key Factors */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Key Macro Factors
          </h4>
          <div className="flex flex-wrap gap-2">
            {asset.key_factors.map((factor, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs"
              >
                <Tag className="h-3 w-3 text-muted-foreground" />
                {factor}
              </div>
            ))}
          </div>
        </div>

        {/* Macro Context (if available) */}
        {asset.macro_context && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Macro Context
            </h4>
            <div className="text-sm leading-relaxed bg-muted/50 rounded-md p-3">
              {asset.macro_context}
            </div>
          </div>
        )}

        {/* LLM Confidence Note */}
        {asset.llm_confidence > 0 && asset.llm_confidence !== asset.confidence && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Confidence Adjustment
            </h4>
            <div className="text-sm bg-amber-50 p-3 rounded-md border border-amber-200">
              <p className="text-amber-900">
                LLM originally suggested <strong>{asset.llm_confidence}%</strong> confidence, 
                but adjusted to <strong>{asset.confidence}%</strong> due to data inconsistencies detected.
              </p>
            </div>
          </div>
        )}

        {/* Sanity Checks */}
        {asset.sanity_checks && asset.sanity_checks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Data Consistency Check
            </h4>
            <SanityCheckList 
              checks={asset.sanity_checks} 
              needsReview={asset.needs_review} 
            />
          </div>
        )}

        {/* Confidence Breakdown */}
        <ConfidenceBreakdown
          scoringFactors={asset.scoring_factors}
          legacyBreakdown={asset.confidence_breakdown}
        />

        {/* Sentiment Trend Sparkline */}
        <SentimentTrend ticker={asset.ticker} sentiment={asset.sentiment} />

        {/* Data Source Note */}
        <p className="text-xs text-muted-foreground border-t border-border pt-4">
          Analysis based on {asset.etf_proxy} ETF proxy data. Micro futures (
          {asset.ticker}) pricing may differ slightly due to basis and contract
          specifications.
        </p>
      </div>
    </Dialog>
  );
}
