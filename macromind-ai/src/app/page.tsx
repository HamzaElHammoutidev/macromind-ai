"use client";

import { useState } from "react";
import { AssetCardGrid } from "@/components/dashboard/AssetCardGrid";
import { DeepDiveModal } from "@/components/dashboard/DeepDiveModal";
import { useDashboard } from "@/hooks/use-dashboard";

export default function DashboardPage() {
  const [deepDiveTicker, setDeepDiveTicker] = useState<string | null>(null);
  const { data } = useDashboard();

  const deepDiveAsset = data?.assets.find((a) => a.ticker === deepDiveTicker);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Macro Desk</h1>
        <p className="text-muted-foreground">
          AI-powered fundamental analysis for micro futures
        </p>
      </div>

      <AssetCardGrid onDeepDive={setDeepDiveTicker} />

      {deepDiveAsset && (
        <DeepDiveModal
          asset={deepDiveAsset}
          isOpen={!!deepDiveTicker}
          onClose={() => setDeepDiveTicker(null)}
        />
      )}
    </div>
  );
}
