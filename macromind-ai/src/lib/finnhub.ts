import { FINNHUB_BASE_URL } from "./constants";
import type { FinnhubQuote, FinnhubNewsItem, FinnhubEconomicEvent } from "@/types";

const API_KEY = process.env.FINNHUB_API_KEY;

async function finnhubFetch<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${FINNHUB_BASE_URL}${endpoint}`);
  url.searchParams.set("token", API_KEY!);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (res.status === 429) {
    throw new Error("Finnhub API rate limit exceeded");
  }
  if (!res.ok) {
    throw new Error(
      `Finnhub API error: ${res.status} ${res.statusText} for ${endpoint}`
    );
  }
  return res.json() as Promise<T>;
}

export async function getQuote(symbol: string): Promise<FinnhubQuote> {
  return finnhubFetch<FinnhubQuote>("/quote", { symbol });
}

export async function getMarketNews(
  category: string = "general"
): Promise<FinnhubNewsItem[]> {
  return finnhubFetch<FinnhubNewsItem[]>("/news", { category });
}

export async function getEconomicCalendar(): Promise<{
  economicCalendar: FinnhubEconomicEvent[];
}> {
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const to = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  return finnhubFetch("/calendar/economic", { from, to });
}

export async function getAllQuotes(
  symbols: string[]
): Promise<Record<string, FinnhubQuote>> {
  const results: Record<string, FinnhubQuote> = {};
  for (const symbol of symbols) {
    results[symbol] = await getQuote(symbol);
    // Small delay to stay within 60 calls/min rate limit
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return results;
}
