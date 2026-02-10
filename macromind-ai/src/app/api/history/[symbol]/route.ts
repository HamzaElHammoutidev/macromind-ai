import { NextResponse } from "next/server";
import { getAssetHistory } from "@/lib/storage";
// History entry type is inferred from the storage layer

interface RouteParams {
  params: Promise<{ symbol: string }>;
}

export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { symbol } = await params;
    
    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol is required" },
        { status: 400 }
      );
    }

    const history = await getAssetHistory(symbol.toUpperCase());

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      history,
    });
  } catch (error) {
    console.error(`[History API] Error fetching history:`, error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
