import { NextResponse } from "next/server";
import { getAllQuotes } from "@/lib/finnhub";
import { ASSETS } from "@/lib/constants";
import type { LiveQuotes } from "@/types";

export async function GET() {
  try {
    const symbols = ASSETS.map((a) => a.etfProxy);
    const quotes = await getAllQuotes(symbols);

    const result: LiveQuotes = {
      quotes: {},
      timestamp: new Date().toISOString(),
    };

    for (const asset of ASSETS) {
      const q = quotes[asset.etfProxy];
      if (q) {
        result.quotes[asset.ticker] = {
          price: q.c,
          change_percent: q.dp,
          change: q.d,
        };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch quotes", details: String(error) },
      { status: 500 }
    );
  }
}
