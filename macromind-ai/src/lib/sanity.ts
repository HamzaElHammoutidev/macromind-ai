import type { Sentiment } from "./constants";
import type { FinnhubQuote, VixData, FearGreedData, RedditSentiment } from "@/types";

export interface SanityCheck {
  type: "warning" | "error";
  severity: "low" | "medium" | "high";
  message: string;
  details: string;
}

export interface SanityCheckResult {
  passed: boolean;
  checks: SanityCheck[];
  adjustedConfidence: number;
  originalConfidence: number;
}

/**
 * Validates if the LLM sentiment makes sense given the actual market data
 * Detects potential hallucinations or contradictions
 */
export function runSanityChecks(
  ticker: string,
  sentiment: Sentiment,
  llmConfidence: number,
  quote: FinnhubQuote,
  vix: VixData | null,
  fearGreed: FearGreedData | null,
  reddit: RedditSentiment | null,
  keyFactors: string[]
): SanityCheckResult {
  const checks: SanityCheck[] = [];
  let confidencePenalty = 0;

  // Check 1: Price direction vs sentiment
  const priceChange = quote.dp;
  const priceDirection = priceChange > 1 ? "up" : priceChange < -1 ? "down" : "flat";
  
  if (sentiment === "Bullish" && priceDirection === "down") {
    checks.push({
      type: "warning",
      severity: priceChange < -2 ? "high" : "medium",
      message: "Bullish sentiment conflicts with falling price",
      details: `LLM is bullish but ${ticker} is down ${Math.abs(priceChange).toFixed(2)}%. This contradicts the technical picture.`,
    });
    confidencePenalty += priceChange < -2 ? 20 : 10;
  }
  
  if (sentiment === "Bearish" && priceDirection === "up") {
    checks.push({
      type: "warning",
      severity: priceChange > 2 ? "high" : "medium",
      message: "Bearish sentiment conflicts with rising price",
      details: `LLM is bearish but ${ticker} is up ${priceChange.toFixed(2)}%. Price action contradicts the analysis.`,
    });
    confidencePenalty += priceChange > 2 ? 20 : 10;
  }

  // Check 2: VIX (fear index) vs sentiment
  if (vix) {
    if (sentiment === "Bullish" && vix.regime === "high") {
      checks.push({
        type: "warning",
        severity: "high",
        message: "Bullish sentiment during high market fear",
        details: `VIX is at ${vix.current} (high fear), suggesting market stress. Bullish call may be premature.`,
      });
      confidencePenalty += 15;
    }
    
    if (sentiment === "Bearish" && vix.regime === "low") {
      checks.push({
        type: "warning",
        severity: "low",
        message: "Bearish sentiment during calm markets",
        details: `VIX is low at ${vix.current}, indicating market complacency. Bearish call lacks volatility support.`,
      });
      confidencePenalty += 5;
    }
  }

  // Check 3: Fear & Greed vs sentiment
  if (fearGreed) {
    const score = fearGreed.score;
    
    if (sentiment === "Bullish" && score < 25) {
      checks.push({
        type: "warning",
        severity: "high",
        message: "Bullish sentiment during extreme fear",
        details: `CNN Fear & Greed is ${score}/100 (Extreme Fear). Retail investors are panicking while LLM is bullish - contrarian opportunity or hallucination?`,
      });
      confidencePenalty += 10; // Contrarian can be valid, so lower penalty
    }
    
    if (sentiment === "Bearish" && score > 75) {
      checks.push({
        type: "warning",
        severity: "high",
        message: "Bearish sentiment during extreme greed",
        details: `CNN Fear & Greed is ${score}/100 (Extreme Greed). Retail euphoria contradicts bearish analysis.`,
      });
      confidencePenalty += 15;
    }
  }

  // Check 4: Reddit retail sentiment vs LLM sentiment
  if (reddit) {
    const retailBias = reddit.retailBias;
    
    if (sentiment === "Bullish" && retailBias === "Bearish") {
      checks.push({
        type: "warning",
        severity: "medium",
        message: "Bullish sentiment contradicts retail mood",
        details: `Retail traders on Reddit are bearish (60%+ negative posts) while LLM is bullish. Possible contrarian signal.`,
      });
      confidencePenalty += 8;
    }
    
    if (sentiment === "Bearish" && retailBias === "Bullish") {
      checks.push({
        type: "warning",
        severity: "medium",
        message: "Bearish sentiment contradicts retail mood",
        details: `Retail traders on Reddit are bullish while LLM is bearish. Watch for potential reversal.`,
      });
      confidencePenalty += 8;
    }
  }

  // Check 5: Key factors validation
  const factorText = keyFactors.join(" ").toLowerCase();
  
  // If key factors mention negative words but sentiment is Bullish
  const negativeWords = ["crash", "recession", "bear", "collapse", "fear", "panic"];
  const hasNegativeFactors = negativeWords.some(word => factorText.includes(word));
  
  if (sentiment === "Bullish" && hasNegativeFactors) {
    checks.push({
      type: "warning",
      severity: "medium",
      message: "Bullish sentiment with negative key factors",
      details: `Key factors mention negative events (recession, crash) but sentiment is bullish. Check for consistency.`,
    });
    confidencePenalty += 12;
  }

  // Cap the confidence penalty
  const maxPenalty = 50;
  confidencePenalty = Math.min(confidencePenalty, maxPenalty);
  
  const adjustedConfidence = Math.max(0, llmConfidence - confidencePenalty);

  return {
    passed: checks.length === 0,
    checks,
    adjustedConfidence,
    originalConfidence: llmConfidence,
  };
}

/**
 * Determines if we should flag for human review
 */
export function shouldFlagForReview(sanityResult: SanityCheckResult): boolean {
  const highSeverityCount = sanityResult.checks.filter(
    c => c.severity === "high"
  ).length;
  
  // Flag if 2+ high severity issues or confidence dropped by >30%
  return (
    highSeverityCount >= 2 ||
    (sanityResult.originalConfidence - sanityResult.adjustedConfidence) > 30
  );
}
