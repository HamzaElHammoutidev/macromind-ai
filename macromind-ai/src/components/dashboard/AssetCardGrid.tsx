"use client";

import { useState } from "react";
import { AssetCard } from "./AssetCard";
import { CrossAssetSignals } from "./CrossAssetSignals";
import { LoadingCard } from "@/components/loading/LoadingCard";
import { ErrorCard } from "@/components/loading/ErrorCard";
import { StaleDataBanner } from "@/components/layout/StaleDataBanner";
import { useDashboard } from "@/hooks/use-dashboard";
import { useLiveQuotes } from "@/hooks/use-live-quotes";
import { ASSETS } from "@/lib/constants";

interface AssetCardGridProps {
  onDeepDive: (ticker: string) => void;
}

export function AssetCardGrid({ onDeepDive }: AssetCardGridProps) {
  const { data, isLoading, error, refetch } = useDashboard();
  const liveQuotes = useLiveQuotes();
  const [signalsDismissed, setSignalsDismissed] = useState(false);

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {ASSETS.map((a) => (
          <LoadingCard key={a.ticker} />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {ASSETS.map((a) => (
          <ErrorCard key={a.ticker} ticker={a.ticker} onRetry={refetch} />
        ))}
      </div>
    );
  }

  return (
    <>
      {data.is_stale && <StaleDataBanner />}

      {/* Cross-Asset Signals */}
      {data.cross_asset_signals &&
        data.cross_asset_signals.length > 0 &&
        !signalsDismissed && (
          <CrossAssetSignals
            signals={data.cross_asset_signals}
            onDismiss={() => setSignalsDismissed(true)}
          />
        )}

      <div className="grid gap-6 md:grid-cols-2">
        {data.assets.length > 0
          ? data.assets.map((asset) => (
              <AssetCard
                key={asset.ticker}
                asset={asset}
                lastUpdated={data.last_updated!}
                onDeepDive={onDeepDive}
                liveQuote={liveQuotes?.quotes[asset.ticker]}
              />
            ))
          : ASSETS.map((a) => (
              <ErrorCard
                key={a.ticker}
                ticker={a.ticker}
                onRetry={refetch}
              />
            ))}
      </div>
    </>
  );
}
