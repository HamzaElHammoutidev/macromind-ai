import type { Sentiment } from "@/lib/constants";

// --- Finnhub API response types ---

export interface FinnhubQuote {
  c: number;   // Current price
  d: number;   // Change
  dp: number;  // Percent change
  h: number;   // High of the day
  l: number;   // Low of the day
  o: number;   // Open
  pc: number;  // Previous close
  t: number;   // Timestamp
}

export interface FinnhubNewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface FinnhubEconomicEvent {
  actual: number | null;
  country: string;
  estimate: number | null;
  event: string;
  impact: string;
  prev: number | null;
  time: string;
  unit: string;
}

// --- LLM response types ---

export interface LLMAssetAnalysis {
  ticker: string;
  sentiment: Sentiment;
  confidence: number;
  summary: string;
  key_factors: string[];
  deep_dive: string;
  macro_context?: string;
  confidence_breakdown: {
    news_consensus: number;
    technical_alignment: number;
    inverse_volatility: number;
  };
}

export interface LLMResponse {
  assets: LLMAssetAnalysis[];
  market_overview: string;
  macro_regime?: string;
  cross_asset_notes?: string;
}

// --- v2 Scoring types ---

export type ScoringSignal = "Confirming" | "Neutral" | "Diverging";

export interface ScoringFactor {
  key: string;
  label: string;
  score: number;
  weight: number;
  signal: ScoringSignal;
  description: string;
}

export interface ScoringResult {
  final: number;
  factors: {
    newsConsensus: ScoringFactor;
    macroAlignment: ScoringFactor;
    marketSentiment: ScoringFactor;
    technicalConfirmation: ScoringFactor;
    volatilityRegime: ScoringFactor;
    positioning: ScoringFactor;
  };
}

// --- Cross-asset correlation types ---

export type SignalType = "divergence" | "confirmation" | "contrarian";
export type SignalSeverity = "low" | "medium" | "high";

export interface CrossAssetSignal {
  type: SignalType;
  severity: SignalSeverity;
  message: string;
  assets: string[];
}

// --- External data source snapshot types ---

export type TrendDirection = "rising" | "falling" | "flat";

export interface MacroIndicator {
  seriesId: string;
  label: string;
  value: number;
  unit: string;
  date: string;
  trend: TrendDirection;
  previousValues: number[];
}

export interface MacroSnapshot {
  fedFundsRate: MacroIndicator | null;
  cpi: MacroIndicator | null;
  unemployment: MacroIndicator | null;
  gdp: MacroIndicator | null;
  treasury10Y: MacroIndicator | null;
  treasury2Y: MacroIndicator | null;
  yieldCurveSpread: number | null;
  yieldCurveInverted: boolean;
  fetchedAt: string;
}

export type FearGreedClassification =
  | "Extreme Fear"
  | "Fear"
  | "Neutral"
  | "Greed"
  | "Extreme Greed";

export interface FearGreedData {
  score: number;
  classification: FearGreedClassification;
  previousClose: number | null;
  weekAgo: number | null;
  trend: "improving" | "worsening" | "stable";
  fetchedAt: string;
}

export type VixRegime = "low" | "normal" | "elevated" | "high";

export interface VixData {
  current: number;
  previousClose: number;
  change: number;
  changePercent: number;
  regime: VixRegime;
  regimeLabel: string;
  history5d: { date: string; close: number }[];
  fetchedAt: string;
}

export interface RedditPost {
  title: string;
  score: number;
  numComments: number;
  createdAt: number;
}

export interface SubredditSentiment {
  subreddit: string;
  posts: RedditPost[];
  bullishCount: number;
  bearishCount: number;
  sentimentRatio: number;
  topTickers: string[];
}

export interface RedditSentiment {
  subreddits: SubredditSentiment[];
  overallBullishRatio: number;
  retailBias: "Bullish" | "Bearish" | "Mixed";
  totalPostsAnalyzed: number;
  fetchedAt: string;
}

// --- Twitter/X types ---

export interface TwitterPost {
  id: string;
  text: string;
  createdAt: string;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
}

export interface TwitterAccountData {
  username: string;
  category: string;
  weight: number;
  posts: TwitterPost[];
  bullishCount: number;
  bearishCount: number;
  sentimentRatio: number;
  topTickers: string[];
  totalEngagement: number;
  source: string;
}

export interface TwitterSentiment {
  accounts: TwitterAccountData[];
  sentiment: "Bullish" | "Bearish" | "Neutral";
  overallBullishRatio: number;
  topTickers: string[];
  totalTweetsAnalyzed: number;
  totalEngagement: number;
  fetchedAt: string;
  sources: string[];
}

// --- Pipeline types ---

export interface MarketSentimentContext {
  fearGreed: FearGreedData | null;
  vix: VixData | null;
  reddit: RedditSentiment | null;
  twitter: TwitterSentiment | null;
}

export interface PipelineResult {
  timestamp: string;
  assets: AssetAnalysis[];
  raw_quotes: Record<string, FinnhubQuote>;
  pipeline_duration_ms: number;
  data_sources: string[];
  macro_snapshot?: MacroSnapshot | null;
  market_sentiment?: MarketSentimentContext;
  cross_asset_signals?: CrossAssetSignal[];
}

export interface SanityCheck {
  type: "warning" | "error";
  severity: "low" | "medium" | "high";
  message: string;
  details: string;
}

export interface SentimentStabilityInfo {
  stability: "stable" | "cautious" | "unstable";
  runsAtCurrentSentiment: number;
  avgConfidence: number;
  wasSmoothed: boolean;
  smoothingReason?: string;
  isChoppy?: boolean;
  choppyWarning?: string;
}

export interface AssetAnalysis {
  ticker: string;
  name: string;
  etf_proxy: string;
  sentiment: Sentiment;
  confidence: number;
  llm_confidence: number; // Original LLM confidence before sanity adjustments
  llm_sentiment: Sentiment; // Original LLM sentiment before stability smoothing
  summary: string;
  key_factors: string[];
  deep_dive: string;
  macro_context?: string;
  confidence_breakdown: {
    news_consensus: number;
    technical_alignment: number;
    inverse_volatility: number;
  };
  scoring_factors?: ScoringResult["factors"];
  sanity_checks?: SanityCheck[];
  needs_review?: boolean;
  stability?: SentimentStabilityInfo;
  quote: {
    price: number;
    change: number;
    change_percent: number;
    previous_close: number;
  };
}

export interface PipelineLogEntry {
  timestamp: string;
  status: "success" | "error";
  duration_ms: number;
  error_message?: string;
  data_sources: string[];
}

// --- History types ---

export interface AnalysisHistoryEntry {
  timestamp: string;
  assets: {
    ticker: string;
    sentiment: Sentiment;
    confidence: number;
  }[];
  context: {
    fearGreedScore: number | null;
    vixLevel: number | null;
    yieldCurveSpread: number | null;
  };
}

// --- Dashboard API response types ---

export interface DashboardResponse {
  assets: AssetAnalysis[];
  last_updated: string | null;
  is_stale: boolean;
  market_status: MarketStatus;
  cross_asset_signals?: CrossAssetSignal[];
  macro_snapshot?: MacroSnapshot | null;
  market_sentiment?: Pick<MarketSentimentContext, "fearGreed" | "vix" | "twitter">;
}

export interface AssetDetailResponse {
  asset: AssetAnalysis;
  last_updated: string;
  is_stale: boolean;
}

export interface PipelineStatusResponse {
  last_run: string | null;
  status: "success" | "error" | "never_run";
  next_scheduled: string | null;
  recent_logs: PipelineLogEntry[];
}

export type MarketStatus = "Pre-Market" | "Open" | "After-Hours" | "Closed";

// --- Live quotes for frontend polling ---

export interface LiveQuotes {
  quotes: Record<string, {
    price: number;
    change_percent: number;
    change: number;
  }>;
  timestamp: string;
}
