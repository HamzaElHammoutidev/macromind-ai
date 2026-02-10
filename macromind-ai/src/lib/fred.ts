import { FRED_BASE_URL, FRED_SERIES } from "./constants";
import { createCache, CACHE_TTLS } from "./cache";
import type { MacroSnapshot, MacroIndicator, TrendDirection } from "@/types";

const fredCache = createCache<MacroSnapshot>(CACHE_TTLS.FRED);

interface FredObservation {
  date: string;
  value: string;
}

interface FredResponse {
  observations: FredObservation[];
}

const API_KEY = process.env.FRED_API_KEY;

async function fetchSeries(
  seriesId: string,
  limit: number = 5
): Promise<FredObservation[]> {
  if (!API_KEY) {
    throw new Error("FRED_API_KEY not configured");
  }

  const url = new URL(`${FRED_BASE_URL}/series/observations`);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `FRED API error: ${res.status} ${res.statusText} for ${seriesId}`
    );
  }

  const data = (await res.json()) as FredResponse;
  return data.observations.filter((o) => o.value !== ".");
}

function computeTrend(values: number[]): TrendDirection {
  if (values.length < 2) return "flat";
  const recent = values.slice(0, 3);
  const diffs = recent.slice(0, -1).map((v, i) => v - recent[i + 1]);
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  if (avgDiff > 0.01) return "rising";
  if (avgDiff < -0.01) return "falling";
  return "flat";
}

async function fetchIndicator(
  seriesId: string,
  label: string,
  unit: string
): Promise<MacroIndicator | null> {
  try {
    const observations = await fetchSeries(seriesId, 5);
    if (observations.length === 0) return null;

    const values = observations.map((o) => parseFloat(o.value));
    return {
      seriesId,
      label,
      value: values[0],
      unit,
      date: observations[0].date,
      trend: computeTrend(values),
      previousValues: values.slice(1),
    };
  } catch (err) {
    console.warn(`[FRED] Failed to fetch ${seriesId}:`, err);
    return null;
  }
}

export async function getMacroSnapshot(): Promise<MacroSnapshot> {
  const cached = fredCache.get("macro-snapshot");
  if (cached) {
    console.log("[FRED] Using cached macro snapshot");
    return cached;
  }

  const [fedFundsRate, cpi, unemployment, gdp, treasury10Y, treasury2Y] =
    await Promise.all([
      fetchIndicator(FRED_SERIES.FED_FUNDS, "Fed Funds Rate", "%"),
      fetchIndicator(FRED_SERIES.CPI, "CPI (All Urban)", "index"),
      fetchIndicator(FRED_SERIES.UNEMPLOYMENT, "Unemployment Rate", "%"),
      fetchIndicator(FRED_SERIES.GDP, "Real GDP", "billions"),
      fetchIndicator(FRED_SERIES.TREASURY_10Y, "10Y Treasury Yield", "%"),
      fetchIndicator(FRED_SERIES.TREASURY_2Y, "2Y Treasury Yield", "%"),
    ]);

  let yieldCurveSpread: number | null = null;
  let yieldCurveInverted = false;
  if (treasury10Y && treasury2Y) {
    yieldCurveSpread =
      Math.round((treasury10Y.value - treasury2Y.value) * 100) / 100;
    yieldCurveInverted = yieldCurveSpread < 0;
  }

  const snapshot: MacroSnapshot = {
    fedFundsRate,
    cpi,
    unemployment,
    gdp,
    treasury10Y,
    treasury2Y,
    yieldCurveSpread,
    yieldCurveInverted,
    fetchedAt: new Date().toISOString(),
  };

  fredCache.set("macro-snapshot", snapshot);
  return snapshot;
}
