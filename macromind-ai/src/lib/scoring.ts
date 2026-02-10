import { SCORING_WEIGHTS } from "./constants";
import type { Sentiment } from "./constants";
import type {
  FinnhubQuote,
  MacroSnapshot,
  FearGreedData,
  VixData,
  RedditSentiment,
  TwitterSentiment,
  ScoringResult,
  ScoringFactor,
  ScoringSignal,
} from "@/types";

interface ScoringInput {
  sentiment: Sentiment;
  quote: FinnhubQuote;
  newsConsensusScore: number;       // 0-1, from LLM
  macroSnapshot: MacroSnapshot | null;
  fearGreed: FearGreedData | null;
  vix: VixData | null;
  reddit: RedditSentiment | null;
  twitter: TwitterSentiment | null;
  ticker: string;
}

function makeSignal(score: number, sentiment: Sentiment, higherIsBullish: boolean): ScoringSignal {
  // "Confirming" = signal aligns with sentiment direction
  // "Diverging"  = signal contradicts sentiment direction
  // "Neutral"    = signal is ambiguous (mid-range)

  if (sentiment === "Neutral") {
    // For Neutral sentiment: mid-range scores confirm indecision,
    // extreme scores diverge (suggest directional bias the LLM didn't call)
    if (score >= 40 && score <= 60) return "Confirming";
    return "Diverging";
  }

  const bullish = sentiment === "Bullish";
  const bearish = sentiment === "Bearish";

  // Narrower dead zone (45-55) so more factors get a definitive signal
  if (higherIsBullish) {
    if (bullish && score >= 55) return "Confirming";
    if (bearish && score <= 45) return "Confirming";
    if (bullish && score <= 40) return "Diverging";
    if (bearish && score >= 60) return "Diverging";
  } else {
    if (bearish && score >= 55) return "Confirming";
    if (bullish && score <= 45) return "Confirming";
    if (bearish && score <= 40) return "Diverging";
    if (bullish && score >= 60) return "Diverging";
  }
  return "Neutral";
}

// Factor 1: News Consensus (25%)
function scoreNewsConsensus(
  newsConsensusScore: number,
  sentiment: Sentiment
): ScoringFactor {
  const rawScore = Math.round(Math.max(0, Math.min(1, newsConsensusScore)) * 100);
  return {
    key: "newsConsensus",
    label: "News Consensus",
    score: rawScore,
    weight: SCORING_WEIGHTS.newsConsensus,
    signal: makeSignal(rawScore, sentiment, true),
    description: "Agreement across recent news headlines on directional bias",
  };
}

// Factor 2: Macro Alignment (20%)
function scoreMacroAlignment(
  macroSnapshot: MacroSnapshot | null,
  sentiment: Sentiment,
  ticker: string
): ScoringFactor {
  const weight = SCORING_WEIGHTS.macroAlignment;
  // Safe haven assets (precious metals) have inverse relationship with macro indicators
  const isSafeHaven = ticker === "MGC" || ticker === "SIL";

  if (!macroSnapshot) {
    return {
      key: "macroAlignment",
      label: "Macro Alignment",
      score: 50,
      weight,
      signal: "Neutral",
      description: "FRED macro data unavailable — scored neutral",
    };
  }

  let score = 50;
  let points = 0;
  let factors = 0;

  // Yield curve: inverted = recession signal
  if (macroSnapshot.yieldCurveSpread !== null) {
    factors++;
    if (isSafeHaven) {
      // Gold/Silver benefit from recession fear
      points += macroSnapshot.yieldCurveInverted ? 70 : 40;
    } else {
      // Equities hurt by inverted yield curve
      points += macroSnapshot.yieldCurveInverted ? 30 : 65;
    }
  }

  // Fed Funds Rate trend
  const fed = macroSnapshot.fedFundsRate;
  if (fed) {
    factors++;
    if (isSafeHaven) {
      // Gold/Silver benefit from falling rates
      points += fed.trend === "falling" ? 70 : fed.trend === "rising" ? 35 : 50;
    } else {
      // Equities benefit from falling rates
      points += fed.trend === "falling" ? 70 : fed.trend === "rising" ? 30 : 50;
    }
  }

  // Unemployment trend
  const unemp = macroSnapshot.unemployment;
  if (unemp) {
    factors++;
    if (isSafeHaven) {
      // Rising unemployment = safe-haven demand
      points += unemp.trend === "rising" ? 65 : unemp.trend === "falling" ? 40 : 50;
    } else {
      // Falling unemployment = economic strength
      points += unemp.trend === "falling" ? 70 : unemp.trend === "rising" ? 35 : 50;
    }
  }

  // GDP trend
  const gdp = macroSnapshot.gdp;
  if (gdp) {
    factors++;
    if (isSafeHaven) {
      // Slowing GDP = safe-haven demand
      points += gdp.trend === "falling" ? 65 : gdp.trend === "rising" ? 40 : 50;
    } else {
      // Rising GDP = equity positive
      points += gdp.trend === "rising" ? 70 : gdp.trend === "falling" ? 35 : 50;
    }
  }

  if (factors > 0) {
    score = Math.round(points / factors);
  }

  return {
    key: "macroAlignment",
    label: "Macro Alignment",
    score,
    weight,
    signal: makeSignal(score, sentiment, true),
    description: "FRED macro indicators (rates, CPI, GDP, yield curve) alignment",
  };
}

// Factor 3: Market Sentiment (15%)
function scoreMarketSentiment(
  fearGreed: FearGreedData | null,
  reddit: RedditSentiment | null,
  twitter: TwitterSentiment | null,
  sentiment: Sentiment
): ScoringFactor {
  const weight = SCORING_WEIGHTS.marketSentiment;
  let score = 50;
  let components = 0;
  let total = 0;

  if (fearGreed) {
    // F&G score 0-100 maps directly. Bullish sentiment aligns with high F&G.
    total += fearGreed.score;
    components++;
  }

  if (reddit) {
    // bullishRatio 0-1 → 0-100
    total += Math.round(reddit.overallBullishRatio * 100);
    components++;
  }

  if (twitter) {
    // Twitter bullishRatio 0-1 → 0-100
    total += Math.round(twitter.overallBullishRatio * 100);
    components++;
  }

  if (components > 0) {
    score = Math.round(total / components);
  }

  return {
    key: "marketSentiment",
    label: "Market Sentiment",
    score,
    weight,
    signal: makeSignal(score, sentiment, true),
    description: "CNN Fear & Greed Index + Reddit + Twitter/X sentiment composite",
  };
}

// Factor 4: Technical Confirmation (15%)
function scoreTechnicalConfirmation(
  quote: FinnhubQuote,
  sentiment: Sentiment
): ScoringFactor {
  const weight = SCORING_WEIGHTS.technicalConfirmation;
  const priceChange = quote.dp;

  let rawScore: number;
  if (sentiment === "Neutral") {
    rawScore = Math.abs(priceChange) < 0.5 ? 75 : 50;
  } else if (sentiment === "Bullish") {
    rawScore = priceChange > 1 ? 90 : priceChange > 0 ? 65 : priceChange === 0 ? 50 : 20;
  } else {
    rawScore = priceChange < -1 ? 90 : priceChange < 0 ? 65 : priceChange === 0 ? 50 : 20;
  }

  // Candle body confirmation: close vs open
  const candleBody = quote.c - quote.o;
  let candleBonus = 0;
  if (sentiment === "Bullish" && candleBody > 0) candleBonus = 10;
  if (sentiment === "Bearish" && candleBody < 0) candleBonus = 10;

  const score = Math.min(100, rawScore + candleBonus);

  return {
    key: "technicalConfirmation",
    label: "Technical Confirmation",
    score,
    weight,
    signal: makeSignal(score, sentiment, true),
    description: "Price direction and candle body alignment with sentiment",
  };
}

// Factor 5: Volatility Regime (15%)
function scoreVolatilityRegime(
  quote: FinnhubQuote,
  vix: VixData | null,
  sentiment: Sentiment
): ScoringFactor {
  const weight = SCORING_WEIGHTS.volatilityRegime;

  // Intraday range as baseline volatility measure
  const range = quote.h - quote.l;
  const midPrice = (quote.h + quote.l) / 2;
  const rangePct = midPrice > 0 ? (range / midPrice) * 100 : 0;
  // <0.5% = calm (100), >3% = chaotic (0)
  const rangeScore = Math.max(0, Math.min(100, Math.round((1 - (rangePct - 0.5) / 2.5) * 100)));

  let score = rangeScore;

  if (vix) {
    // VIX score: lower VIX = higher confidence
    let vixScore: number;
    switch (vix.regime) {
      case "low": vixScore = 90; break;
      case "normal": vixScore = 70; break;
      case "elevated": vixScore = 40; break;
      case "high": vixScore = 15; break;
    }
    // Blend range score (40%) with VIX score (60%)
    score = Math.round(rangeScore * 0.4 + vixScore * 0.6);
  }

  return {
    key: "volatilityRegime",
    label: "Volatility Regime",
    score,
    weight,
    // Low volatility = confirming (signal is reliable), high = diverging (unreliable)
    signal: makeSignal(score, sentiment, true),
    description: "VIX level + intraday price range — lower volatility = more reliable signal",
  };
}

// Factor 6: Positioning (10%)
// COT data not yet integrated — graceful neutral placeholder
function scorePositioning(_sentiment: Sentiment): ScoringFactor {
  return {
    key: "positioning",
    label: "Positioning (COT)",
    score: 50,
    weight: SCORING_WEIGHTS.positioning,
    signal: "Neutral",
    description: "Institutional positioning (COT report) — pending integration",
  };
}

export function calculateScoring(input: ScoringInput): ScoringResult {
  const {
    sentiment,
    quote,
    newsConsensusScore,
    macroSnapshot,
    fearGreed,
    vix,
    reddit,
    twitter,
    ticker,
  } = input;

  const factors = {
    newsConsensus: scoreNewsConsensus(newsConsensusScore, sentiment),
    macroAlignment: scoreMacroAlignment(macroSnapshot, sentiment, ticker),
    marketSentiment: scoreMarketSentiment(fearGreed, reddit, twitter, sentiment),
    technicalConfirmation: scoreTechnicalConfirmation(quote, sentiment),
    volatilityRegime: scoreVolatilityRegime(quote, vix, sentiment),
    positioning: scorePositioning(sentiment),
  };

  const final = Math.round(
    Object.values(factors).reduce(
      (sum, f) => sum + f.weight * f.score,
      0
    )
  );

  return { final: Math.max(0, Math.min(100, final)), factors };
}
