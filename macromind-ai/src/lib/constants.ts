export type Sentiment = "Bullish" | "Bearish" | "Neutral";

export interface AssetConfig {
  ticker: string;
  name: string;
  etfProxy: string;
  description: string;
}

export const ASSETS: AssetConfig[] = [
  { ticker: "MNQ", name: "Micro Nasdaq-100", etfProxy: "QQQ", description: "Nasdaq-100 Index" },
  { ticker: "MES", name: "Micro S&P 500", etfProxy: "SPY", description: "S&P 500 Index" },
  { ticker: "MYM", name: "Micro Dow Jones", etfProxy: "DIA", description: "Dow Jones Industrial Average" },
  { ticker: "MGC", name: "Micro Gold", etfProxy: "GLD", description: "Gold" },
  { ticker: "SIL", name: "Micro Silver", etfProxy: "SLV", description: "Silver" },
];

export const SENTIMENT_COLORS: Record<Sentiment, { bg: string; text: string; glow: string }> = {
  Bullish: { bg: "bg-green-500/20", text: "text-bullish", glow: "shadow-[0_0_15px_hsl(var(--bullish)/0.3)]" },
  Bearish: { bg: "bg-red-500/20", text: "text-bearish", glow: "shadow-[0_0_15px_hsl(var(--bearish)/0.3)]" },
  Neutral: { bg: "bg-gray-500/20", text: "text-neutral", glow: "" },
};

export const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

// LLM providers
export const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
export const GEMINI_MODEL = "gemini-3-pro-preview";

export const ZHIPU_BASE_URL = "https://api.z.ai/api/paas/v4/";
export const ZHIPU_MODEL = "glm-4.7";

// FRED (Federal Reserve Economic Data)
export const FRED_BASE_URL = "https://api.stlouisfed.org/fred";
export const FRED_SERIES = {
  FED_FUNDS: "FEDFUNDS",
  CPI: "CPIAUCSL",
  UNEMPLOYMENT: "UNRATE",
  GDP: "GDPC1",
  TREASURY_10Y: "DGS10",
  TREASURY_2Y: "DGS2",
} as const;

// CNN Fear & Greed Index
export const CNN_FEAR_GREED_URL =
  "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";

// VIX via Yahoo Finance
export const YAHOO_VIX_URL =
  "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?range=5d&interval=1d";

// Reddit
export const REDDIT_BASE_URL = "https://oauth.reddit.com";
export const REDDIT_SUBREDDITS = [
  "wallstreetbets",
  "stocks",
  "investing",
  "futures",
];

// Twitter/X Accounts to monitor
export const TWITTER_ACCOUNTS = [
  { username: "DeItaone", category: "news", weight: 1.2 },
  { username: "FirstSquawk", category: "news", weight: 1.2 },
  { username: "unusual_whales", category: "markets", weight: 1.0 },
  { username: "zer0h0d", category: "macro", weight: 1.0 },
  { username: "Newsquawk", category: "news", weight: 1.2 },
  { username: "FinancialJuice", category: "news", weight: 1.2 },
  { username: "FintwitNews", category: "news", weight: 1.0 },
  { username: "MarketRebels", category: "markets", weight: 0.9 },
  { username: "FedPorn", category: "macro", weight: 1.1 },
  { username: "federalreserve", category: "macro", weight: 1.3 },
  { username: "fxmacro", category: "macro", weight: 1.0 },
  { username: "LiveSquawk", category: "news", weight: 1.2 },
] as const;

export const PIPELINE_INTERVAL_MS = 10 * 60 * 1000;
export const QUOTE_POLL_INTERVAL_MS = 60 * 1000;
export const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000;
export const HISTORY_MAX_ENTRIES = 500;

export const CONFIDENCE_WEIGHTS = {
  newsConsensus: 0.5,
  technicalAlignment: 0.3,
  inverseVolatility: 0.2,
};

// v2 6-factor scoring weights
export const SCORING_WEIGHTS = {
  newsConsensus: 0.25,
  macroAlignment: 0.2,
  marketSentiment: 0.15,
  technicalConfirmation: 0.15,
  volatilityRegime: 0.15,
  positioning: 0.1,
} as const;
