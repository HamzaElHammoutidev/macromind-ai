import { NextResponse } from "next/server";
import { loadAnalysis } from "@/lib/storage";
import { getMarketStatus } from "@/lib/market-hours";
import { STALE_THRESHOLD_MS } from "@/lib/constants";
import type { DashboardResponse } from "@/types";

export async function GET() {
  const analysis = await loadAnalysis();

  if (!analysis) {
    return NextResponse.json({
      assets: [],
      last_updated: null,
      is_stale: true,
      market_status: getMarketStatus(),
      cross_asset_signals: [],
      macro_snapshot: null,
      market_sentiment: {
        fearGreed: null,
        vix: null,
        twitter: null,
      },
    } satisfies DashboardResponse);
  }

  const lastUpdated = new Date(analysis.timestamp);
  const isStale = Date.now() - lastUpdated.getTime() > STALE_THRESHOLD_MS;

  return NextResponse.json({
    assets: analysis.assets,
    last_updated: analysis.timestamp,
    is_stale: isStale,
    market_status: getMarketStatus(),
    cross_asset_signals: analysis.cross_asset_signals ?? [],
    macro_snapshot: analysis.macro_snapshot ?? null,
    market_sentiment: {
      fearGreed: analysis.market_sentiment?.fearGreed ?? null,
      vix: analysis.market_sentiment?.vix ?? null,
      twitter: analysis.market_sentiment?.twitter ?? null,
    },
  } satisfies DashboardResponse);
}
