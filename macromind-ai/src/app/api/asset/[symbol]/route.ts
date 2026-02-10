import { NextResponse } from "next/server";
import { loadAnalysis } from "@/lib/storage";
import { STALE_THRESHOLD_MS } from "@/lib/constants";
import type { AssetDetailResponse } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const analysis = await loadAnalysis();

  if (!analysis) {
    return NextResponse.json(
      { error: "No analysis data available" },
      { status: 404 }
    );
  }

  const asset = analysis.assets.find(
    (a) => a.ticker === symbol.toUpperCase()
  );
  if (!asset) {
    return NextResponse.json(
      { error: `Asset ${symbol} not found` },
      { status: 404 }
    );
  }

  const lastUpdated = new Date(analysis.timestamp);
  const isStale = Date.now() - lastUpdated.getTime() > STALE_THRESHOLD_MS;

  return NextResponse.json({
    asset,
    last_updated: analysis.timestamp,
    is_stale: isStale,
  } satisfies AssetDetailResponse);
}
