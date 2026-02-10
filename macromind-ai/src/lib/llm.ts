import OpenAI from "openai";
import {
  GEMINI_BASE_URL,
  GEMINI_MODEL,
  ZHIPU_BASE_URL,
  ZHIPU_MODEL,
  ASSETS,
} from "./constants";
import type {
  FinnhubQuote,
  FinnhubNewsItem,
  FinnhubEconomicEvent,
  LLMResponse,
  MacroSnapshot,
  FearGreedData,
  VixData,
  RedditSentiment,
  TwitterSentiment,
} from "@/types";

const provider = process.env.LLM_PROVIDER || "gemini";

function createClient(): { client: OpenAI; model: string } {
  if (provider === "zhipu") {
    return {
      client: new OpenAI({
        apiKey: process.env.ZHIPU_API_KEY,
        baseURL: ZHIPU_BASE_URL,
      }),
      model: ZHIPU_MODEL,
    };
  }

  // Default: Gemini
  return {
    client: new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: GEMINI_BASE_URL,
    }),
    model: GEMINI_MODEL,
  };
}

const { client, model } = createClient();

const SYSTEM_PROMPT = `You are MacroMind AI, an elite institutional macro analyst specializing in US equity index and commodity futures. Your role is to synthesize macroeconomic data, market news, and price action into clear, actionable sentiment assessments for retail futures traders.

You analyze 5 micro futures contracts:
- MNQ (Micro Nasdaq-100) — proxy: QQQ
- MES (Micro S&P 500) — proxy: SPY
- MYM (Micro Dow Jones) — proxy: DIA
- MGC (Micro Gold) — proxy: GLD
- SIL (Micro Silver) — proxy: SLV

Asset categories:
- Equities (MNQ, MES, MYM): Benefit from economic expansion, low rates
- Safe Havens (MGC, SIL): Benefit from recession fears, high inflation, uncertainty

Your analysis must:
1. Focus on MACROECONOMIC fundamentals (Fed policy, inflation, employment, GDP, geopolitics, sector rotation) — not just price action
2. Be accessible to retail traders — explain jargon when used
3. Be specific — reference actual data points, not vague generalities
4. Acknowledge uncertainty honestly

You MUST respond with valid JSON matching the exact schema provided. No markdown, no code fences, just raw JSON.`;

function formatMacroSnapshot(snapshot: MacroSnapshot | null): string {
  if (!snapshot) return "Macro data unavailable";

  const formatIndicator = (
    indicator: MacroSnapshot["fedFundsRate"],
    name: string,
    unit: string
  ): string => {
    if (!indicator) return `${name}: Unavailable`;
    const trendEmoji =
      indicator.trend === "rising" ? "📈" : indicator.trend === "falling" ? "📉" : "➡️";
    const trendText = indicator.trend.toUpperCase();
    return `${name}: ${indicator.value}${unit} (${trendText} ${trendEmoji})`;
  };

  const lines = [
    "## Macro Economic Snapshot",
    formatIndicator(snapshot.fedFundsRate, "Fed Funds Rate", "%"),
    formatIndicator(snapshot.cpi, "CPI (All Urban Consumers)", ""),
    formatIndicator(snapshot.unemployment, "Unemployment Rate", "%"),
    formatIndicator(snapshot.gdp, "Real GDP", " (billions)"),
    formatIndicator(snapshot.treasury10Y, "10Y Treasury Yield", "%"),
    formatIndicator(snapshot.treasury2Y, "2Y Treasury Yield", "%"),
  ];

  if (snapshot.yieldCurveSpread !== null) {
    const status = snapshot.yieldCurveInverted ? "INVERTED ⚠️" : "NORMAL ✅";
    lines.push(`Yield Curve Spread: ${snapshot.yieldCurveSpread}% (${status})`);
  }

  return lines.join("\n");
}

function formatMarketSentiment(
  fearGreed: FearGreedData | null,
  vix: VixData | null,
  reddit: RedditSentiment | null,
  twitter: TwitterSentiment | null
): string {
  const lines = ["## Market Sentiment Indicators"];

  if (fearGreed) {
    const trend = fearGreed.trend;
    const trendText =
      trend === "improving" ? "📈 up" : trend === "worsening" ? "📉 down" : "➡️ stable";
    lines.push(
      `- CNN Fear & Greed Index: ${fearGreed.score} (${fearGreed.classification}) — ${trendText} from ${fearGreed.weekAgo ?? "previous"} one week ago`
    );
  } else {
    lines.push("- CNN Fear & Greed Index: Unavailable");
  }

  if (vix) {
    const direction = vix.change >= 0 ? "📈 up" : "📉 down";
    lines.push(
      `- VIX: ${vix.current} (${vix.regimeLabel}) — ${direction} ${Math.abs(vix.changePercent)}% this week`
    );
  } else {
    lines.push("- VIX: Unavailable");
  }

  if (reddit) {
    const bias = reddit.retailBias;
    const emoji = bias === "Bullish" ? "🟢" : bias === "Bearish" ? "🔴" : "🟡";
    const ratio = Math.round(reddit.overallBullishRatio * 100);
    lines.push(
      `- Reddit Retail Sentiment: ${emoji} ${bias} — ${ratio}% bullish sentiment across r/wallstreetbets, r/stocks, r/investing, r/futures`
    );
  } else {
    lines.push("- Reddit Retail Sentiment: Unavailable");
  }

  if (twitter) {
    const sentiment = twitter.sentiment;
    const emoji = sentiment === "Bullish" ? "🟢" : sentiment === "Bearish" ? "🔴" : "🟡";
    const ratio = Math.round(twitter.overallBullishRatio * 100);
    lines.push(
      `- Twitter/X Financial Sentiment: ${emoji} ${sentiment} — ${ratio}% bullish from ${twitter.totalTweetsAnalyzed} tweets across ${twitter.accounts.length} financial accounts`
    );
    if (twitter.topTickers.length > 0) {
      lines.push(`  Top mentioned: ${twitter.topTickers.slice(0, 5).join(", ")}`);
    }
  } else {
    lines.push("- Twitter/X Financial Sentiment: Unavailable");
  }

  return lines.join("\n");
}

function buildUserPrompt(
  quotes: Record<string, FinnhubQuote>,
  news: FinnhubNewsItem[],
  economicEvents: FinnhubEconomicEvent[],
  macroSnapshot: MacroSnapshot | null,
  fearGreed: FearGreedData | null,
  vix: VixData | null,
  reddit: RedditSentiment | null,
  twitter: TwitterSentiment | null
): string {
  const quoteSummary = ASSETS.map((a) => {
    const q = quotes[a.etfProxy];
    return q
      ? `${a.ticker} (${a.etfProxy}): Price $${q.c.toFixed(2)}, Change ${q.dp >= 0 ? "+" : ""}${q.dp.toFixed(2)}%, Open $${q.o.toFixed(2)}, Prev Close $${q.pc.toFixed(2)}, High $${q.h.toFixed(2)}, Low $${q.l.toFixed(2)}`
      : `${a.ticker} (${a.etfProxy}): Data unavailable`;
  }).join("\n");

  const topNews = news
    .slice(0, 20)
    .map((n, i) => `${i + 1}. [${n.source}] ${n.headline}`)
    .join("\n");

  const upcomingEvents = economicEvents
    .filter(
      (e) =>
        e.country === "US" && (e.impact === "high" || e.impact === "medium")
    )
    .slice(0, 10)
    .map(
      (e) =>
        `- ${e.event} (Impact: ${e.impact}, Actual: ${e.actual ?? "TBD"}, Estimate: ${e.estimate ?? "N/A"}, Previous: ${e.prev ?? "N/A"})`
    )
    .join("\n");

  const macroSection = formatMacroSnapshot(macroSnapshot);
  const sentimentSection = formatMarketSentiment(fearGreed, vix, reddit, twitter);

  return `Analyze the current macro environment for these 5 micro futures. Here is the latest data:

## Current Quotes
${quoteSummary}

## Recent Market News Headlines
${topNews || "No recent news available"}

${macroSection}

${sentimentSection}

## US Economic Calendar (Recent & Upcoming)
${upcomingEvents || "No significant events"}

## Required JSON Response Schema
{
  "assets": [
    {
      "ticker": "MNQ | MES | MYM | MGC | SIL",
      "sentiment": "Bullish" | "Bearish" | "Neutral",
      "confidence": <number 0-100>,
      "summary": "<3-4 sentence fundamental analysis>",
      "key_factors": ["<factor 1>", "<factor 2>", "<factor 3>"],
      "deep_dive": "<2-3 paragraph extended analysis>",
      "macro_context": "<1-2 sentences on macro regime relevance>",
      "confidence_breakdown": {
        "news_consensus": <number 0-100>,
        "technical_alignment": <number 0-100>,
        "inverse_volatility": <number 0-100>
      }
    }
  ],
  "market_overview": "<1-2 sentence macro summary>",
  "macro_regime": "<Expansionary | Contractionary | Transitional | Neutral>",
  "cross_asset_notes": "<1-2 sentences on cross-asset relationships>"
}

Respond with ONLY the JSON object. Provide analysis for all 5 assets: MNQ, MES, MYM, MGC, SIL.`;
}

export async function analyzeMarket(
  quotes: Record<string, FinnhubQuote>,
  news: FinnhubNewsItem[],
  economicEvents: FinnhubEconomicEvent[],
  macroSnapshot: MacroSnapshot | null,
  fearGreed: FearGreedData | null,
  vix: VixData | null,
  reddit: RedditSentiment | null,
  twitter: TwitterSentiment | null
): Promise<LLMResponse> {
  const userPrompt = buildUserPrompt(
    quotes,
    news,
    economicEvents,
    macroSnapshot,
    fearGreed,
    vix,
    reddit,
    twitter
  );

  console.log(`[LLM] Using provider: ${provider}, model: ${model}`);

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 4000,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("LLM returned empty response");
  }

  // Strip any markdown code fences if the LLM wraps JSON
  const cleaned = content
    .replace(/^```json?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as LLMResponse;

  // Validate structure
  if (
    !parsed.assets ||
    !Array.isArray(parsed.assets) ||
    parsed.assets.length === 0
  ) {
    throw new Error("LLM response missing assets array");
  }

  for (const asset of parsed.assets) {
    if (!["Bullish", "Bearish", "Neutral"].includes(asset.sentiment)) {
      throw new Error(
        `Invalid sentiment "${asset.sentiment}" for ${asset.ticker}`
      );
    }
    if (
      typeof asset.confidence !== "number" ||
      asset.confidence < 0 ||
      asset.confidence > 100
    ) {
      throw new Error(
        `Invalid confidence ${asset.confidence} for ${asset.ticker}`
      );
    }
  }

  return parsed;
}
