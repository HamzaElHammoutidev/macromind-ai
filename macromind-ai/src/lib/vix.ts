import { YAHOO_VIX_URL } from "./constants";
import type { VixData, VixRegime } from "@/types";

interface YahooChartResponse {
  chart: {
    result: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: (number | null)[];
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
        }>;
      };
      meta: {
        regularMarketPrice: number;
        previousClose: number;
      };
    }>;
    error: null | { code: string; description: string };
  };
}

function classifyVixRegime(vix: number): {
  regime: VixRegime;
  label: string;
} {
  if (vix < 15) return { regime: "low", label: "Low Volatility (Complacency)" };
  if (vix < 20) return { regime: "normal", label: "Normal" };
  if (vix < 30) return { regime: "elevated", label: "Elevated (Caution)" };
  return { regime: "high", label: "High Fear (Extreme Caution)" };
}

export async function getVixData(): Promise<VixData> {
  const res = await fetch(YAHOO_VIX_URL, {
    cache: "no-store",
    headers: {
      "User-Agent": "MacroMind-AI/1.0",
    },
  });

  if (!res.ok) {
    throw new Error(
      `Yahoo Finance VIX error: ${res.status} ${res.statusText}`
    );
  }

  const data = (await res.json()) as YahooChartResponse;

  if (data.chart.error) {
    throw new Error(
      `Yahoo Finance VIX error: ${data.chart.error.description}`
    );
  }

  const result = data.chart.result[0];
  if (!result) {
    throw new Error("Yahoo Finance VIX returned no data");
  }

  const current = result.meta.regularMarketPrice;
  const previousClose = result.meta.previousClose;
  const change = Math.round((current - previousClose) * 100) / 100;
  const changePercent =
    previousClose > 0
      ? Math.round(((current - previousClose) / previousClose) * 10000) / 100
      : 0;

  const { regime, label: regimeLabel } = classifyVixRegime(current);

  const history5d: VixData["history5d"] = [];
  const timestamps = result.timestamp || [];
  const closes = result.indicators.quote[0]?.close || [];

  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close !== null && close !== undefined) {
      history5d.push({
        date: new Date(timestamps[i] * 1000).toISOString().split("T")[0],
        close: Math.round(close * 100) / 100,
      });
    }
  }

  return {
    current,
    previousClose,
    change,
    changePercent,
    regime,
    regimeLabel,
    history5d,
    fetchedAt: new Date().toISOString(),
  };
}
