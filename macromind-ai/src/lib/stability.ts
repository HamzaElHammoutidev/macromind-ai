import type { Sentiment } from "./constants";
import type { AnalysisHistoryEntry } from "@/types";

interface SentimentStabilityConfig {
  minConsecutiveRuns: number; // How many runs in a row to confirm a flip
  strongSentimentThreshold: number; // Confidence level considered "strong"
}

const DEFAULT_CONFIG: SentimentStabilityConfig = {
  minConsecutiveRuns: 2, // Need 2 consecutive runs to flip (20 min at 10-min intervals)
  strongSentimentThreshold: 70, // 70%+ confidence = strong signal, harder to flip
};

/**
 * Prevents sentiment whipsaws by requiring multiple consecutive runs
 * before allowing a sentiment flip
 */
export function stabilizeSentiment(
  currentSentiment: Sentiment,
  currentConfidence: number,
  ticker: string,
  history: AnalysisHistoryEntry[],
  config: SentimentStabilityConfig = DEFAULT_CONFIG
): { sentiment: Sentiment; wasSmoothed: boolean; reason?: string } {
  // Get recent history for this ticker (last N runs)
  const recentHistory = history
    .slice(0, 5) // Look at last 5 runs
    .map((entry) => entry.assets.find((a) => a.ticker === ticker))
    .filter((asset): asset is NonNullable<typeof asset> => asset !== undefined);

  if (recentHistory.length === 0) {
    return { sentiment: currentSentiment, wasSmoothed: false };
  }

  // Get previous sentiment
  const previousAsset = recentHistory[0];
  const previousSentiment = previousAsset.sentiment;
  const previousConfidence = previousAsset.confidence;

  // If sentiment hasn't changed, no smoothing needed
  if (currentSentiment === previousSentiment) {
    return { sentiment: currentSentiment, wasSmoothed: false };
  }

  // Count how many consecutive runs the new sentiment has appeared
  let consecutiveCount = 0;
  for (const asset of recentHistory) {
    if (asset.sentiment === currentSentiment) {
      consecutiveCount++;
    } else {
      break; // Stop at first different sentiment
    }
  }

  // Check if previous sentiment was "strong" (high confidence)
  const previousWasStrong = previousConfidence >= config.strongSentimentThreshold;

  // Require more consecutive runs to flip from a strong sentiment
  const requiredRuns = previousWasStrong 
    ? config.minConsecutiveRuns + 1 // 3 runs for strong sentiments
    : config.minConsecutiveRuns;    // 2 runs for normal sentiments

  if (consecutiveCount < requiredRuns) {
    // Not enough consecutive runs - keep previous sentiment
    return {
      sentiment: previousSentiment,
      wasSmoothed: true,
      reason: `Sentiment flip prevented: ${currentSentiment} only appeared ${consecutiveCount}/${requiredRuns} consecutive runs. Previous ${previousSentiment} had ${previousConfidence}% confidence.`,
    };
  }

  // Enough consecutive runs - allow the flip
  return {
    sentiment: currentSentiment,
    wasSmoothed: false,
    reason: `Sentiment flipped from ${previousSentiment} to ${currentSentiment} after ${consecutiveCount} consecutive runs`,
  };
}

/**
 * Detects if we're in a "choppy" market (rapid sentiment oscillations)
 * Returns a warning if the last N readings show high volatility
 */
export function detectChoppyMarket(
  ticker: string,
  history: AnalysisHistoryEntry[],
  lookbackRuns: number = 6
): { isChoppy: boolean; volatilityScore: number; message?: string } {
  const recentHistory = history
    .slice(0, lookbackRuns)
    .map((entry) => entry.assets.find((a) => a.ticker === ticker))
    .filter((asset): asset is NonNullable<typeof asset> => asset !== undefined);

  if (recentHistory.length < 3) {
    return { isChoppy: false, volatilityScore: 0 };
  }

  // Count sentiment changes
  let sentimentChanges = 0;
  let previousSentiment = recentHistory[0].sentiment;
  
  for (let i = 1; i < recentHistory.length; i++) {
    if (recentHistory[i].sentiment !== previousSentiment) {
      sentimentChanges++;
      previousSentiment = recentHistory[i].sentiment;
    }
  }

  // Calculate volatility score (0-100)
  // More changes = higher volatility
  const volatilityScore = (sentimentChanges / (recentHistory.length - 1)) * 100;
  
  // Consider choppy if >50% of readings were flips
  const isChoppy = volatilityScore > 50;

  return {
    isChoppy,
    volatilityScore,
    message: isChoppy 
      ? `Market appears choppy for ${ticker}: ${sentimentChanges} sentiment changes in last ${recentHistory.length} readings. Consider waiting for clearer direction.`
      : undefined,
  };
}

/**
 * Gets a stability rating for the current sentiment
 */
export function getSentimentStability(
  ticker: string,
  sentiment: Sentiment,
  history: AnalysisHistoryEntry[]
): { 
  stability: "stable" | "cautious" | "unstable"; 
  runsAtCurrentSentiment: number;
  avgConfidence: number;
} {
  const relevantHistory = history
    .map((entry) => entry.assets.find((a) => a.ticker === ticker))
    .filter((asset): asset is NonNullable<typeof asset> => asset !== undefined);

  if (relevantHistory.length === 0) {
    return { stability: "cautious", runsAtCurrentSentiment: 1, avgConfidence: 0 };
  }

  // Count consecutive runs at current sentiment
  let runsAtCurrentSentiment = 0;
  for (const asset of relevantHistory) {
    if (asset.sentiment === sentiment) {
      runsAtCurrentSentiment++;
    } else {
      break;
    }
  }

  // Calculate average confidence over those runs
  const confidenceSum = relevantHistory
    .slice(0, runsAtCurrentSentiment)
    .reduce((sum, asset) => sum + asset.confidence, 0);
  const avgConfidence = runsAtCurrentSentiment > 0 
    ? confidenceSum / runsAtCurrentSentiment 
    : 0;

  // Determine stability
  let stability: "stable" | "cautious" | "unstable";
  if (runsAtCurrentSentiment >= 3 && avgConfidence >= 60) {
    stability = "stable";
  } else if (runsAtCurrentSentiment >= 2 && avgConfidence >= 50) {
    stability = "cautious";
  } else {
    stability = "unstable";
  }

  return { stability, runsAtCurrentSentiment, avgConfidence };
}
