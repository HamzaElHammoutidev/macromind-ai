import { NextResponse } from "next/server";
import { loadAnalysis } from "@/lib/storage";
// Cross-asset signal type is inferred from the storage layer

export async function GET() {
  try {
    const analysis = await loadAnalysis();

    if (!analysis || !analysis.cross_asset_signals) {
      return NextResponse.json({
        signals: [],
        count: 0,
        last_updated: analysis?.timestamp ?? null,
      });
    }

    return NextResponse.json({
      signals: analysis.cross_asset_signals,
      count: analysis.cross_asset_signals.length,
      last_updated: analysis.timestamp,
    });
  } catch (error) {
    console.error(`[Signals API] Error fetching signals:`, error);
    return NextResponse.json(
      { error: "Failed to fetch signals" },
      { status: 500 }
    );
  }
}
