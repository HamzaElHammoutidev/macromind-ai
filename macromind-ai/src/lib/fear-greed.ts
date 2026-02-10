import { CNN_FEAR_GREED_URL } from "./constants";
import { createCache, CACHE_TTLS } from "./cache";
import type { FearGreedData, FearGreedClassification } from "@/types";

const fearGreedCache = createCache<FearGreedData>(CACHE_TTLS.FEAR_GREED);

interface CNNFearGreedResponse {
  fear_and_greed: {
    score: number;
    rating: string;
    previous_close: number;
    one_week_ago: number;
  };
}

function classifyScore(score: number): FearGreedClassification {
  if (score <= 20) return "Extreme Fear";
  if (score <= 40) return "Fear";
  if (score <= 60) return "Neutral";
  if (score <= 80) return "Greed";
  return "Extreme Greed";
}

export async function getFearGreedIndex(): Promise<FearGreedData> {
  const cached = fearGreedCache.get("fear-greed");
  if (cached) {
    console.log("[FearGreed] Using cached data");
    return cached;
  }

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const url = `${CNN_FEAR_GREED_URL}/${dateStr}`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "MacroMind-AI/1.0" },
  });

  if (!res.ok) {
    throw new Error(
      `CNN Fear & Greed API error: ${res.status} ${res.statusText}`
    );
  }

  const data = (await res.json()) as CNNFearGreedResponse;
  const fg = data.fear_and_greed;

  const score = Math.round(fg.score);
  const previousClose = fg.previous_close ?? null;
  const weekAgo = fg.one_week_ago ?? null;

  let trend: FearGreedData["trend"] = "stable";
  if (weekAgo !== null) {
    const diff = score - weekAgo;
    if (diff > 5) trend = "improving";
    else if (diff < -5) trend = "worsening";
  }

  const result: FearGreedData = {
    score,
    classification: classifyScore(score),
    previousClose,
    weekAgo,
    trend,
    fetchedAt: new Date().toISOString(),
  };

  fearGreedCache.set("fear-greed", result);
  return result;
}
