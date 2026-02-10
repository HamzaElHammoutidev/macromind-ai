import { getAllQuotes, getMarketNews, getEconomicCalendar } from "./finnhub";
import { getMacroSnapshot } from "./fred";
import { getFearGreedIndex } from "./fear-greed";
import { getVixData } from "./vix";
import { getRedditSentiment } from "./reddit";
import { getTwitterSentiment } from "./twitter";
import { analyzeMarket } from "./llm";
import { calculateScoring } from "./scoring";
import { detectCrossAssetSignals } from "./correlation";
import { runSanityChecks, shouldFlagForReview } from "./sanity";
import { stabilizeSentiment, detectChoppyMarket, getSentimentStability } from "./stability";
import { saveAnalysis, saveHistory, loadHistory, appendPipelineLog } from "./storage";
import { ASSETS } from "./constants";
import type {
  PipelineResult,
  AssetAnalysis,
  PipelineLogEntry,
  MacroSnapshot,
  FearGreedData,
  VixData,
  RedditSentiment,
  TwitterSentiment,
} from "@/types";

// Helper: fetch with timeout
async function fetchWithTimeout<T>(
  fetchFn: () => Promise<T>,
  timeoutMs: number,
  sourceName: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${sourceName} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([fetchFn(), timeoutPromise]);
}

export async function runPipeline(): Promise<PipelineResult> {
  const startTime = Date.now();
  const dataSources: string[] = [];

  // Data source results (with graceful fallback)
  let macroSnapshot: MacroSnapshot | null = null;
  let fearGreed: FearGreedData | null = null;
  let vix: VixData | null = null;
  let reddit: RedditSentiment | null = null;
  let twitter: TwitterSentiment | null = null;

  try {
    // Step 1: Fetch all market data from Finnhub
    console.log("[Pipeline] Fetching quotes...");
    const etfSymbols = ASSETS.map((a) => a.etfProxy);
    const quotes = await getAllQuotes(etfSymbols);
    dataSources.push("finnhub-quotes");

    console.log("[Pipeline] Fetching market news...");
    const news = await getMarketNews("general");
    dataSources.push("finnhub-news");

    console.log("[Pipeline] Fetching economic calendar...");
    let economicEvents: import("@/types").FinnhubEconomicEvent[] = [];
    try {
      const calendarData = await getEconomicCalendar();
      economicEvents = calendarData.economicCalendar || [];
      dataSources.push("finnhub-economic-calendar");
    } catch (err) {
      console.warn(
        "[Pipeline] Economic calendar unavailable (may require paid plan), continuing without it:",
        err instanceof Error ? err.message : err
      );
    }

    // Step 2: Fetch new data sources (with timeouts and graceful fallback)
    console.log("[Pipeline] Fetching auxiliary data sources with timeouts...");

    const [fredResult, fearGreedResult, vixResult, redditResult, twitterResult] = await Promise.allSettled([
      // FRED is slowest (government API) - 15s timeout
      fetchWithTimeout(getMacroSnapshot, 15000, "FRED"),
      // Fear & Greed - 8s timeout
      fetchWithTimeout(getFearGreedIndex, 8000, "Fear&Greed"),
      // VIX is usually fast - 5s timeout
      fetchWithTimeout(getVixData, 5000, "VIX"),
      // Reddit can be slow due to auth - 10s timeout
      fetchWithTimeout(getRedditSentiment, 10000, "Reddit"),
      // Twitter can be slow depending on API availability - 15s timeout
      fetchWithTimeout(getTwitterSentiment, 15000, "Twitter"),
    ]);

    if (fredResult.status === "fulfilled") {
      macroSnapshot = fredResult.value;
      dataSources.push("fred-macro");
    } else {
      console.warn("[Pipeline] FRED data unavailable:", fredResult.reason);
    }

    if (fearGreedResult.status === "fulfilled") {
      fearGreed = fearGreedResult.value;
      dataSources.push("cnn-fear-greed");
    } else {
      console.warn("[Pipeline] Fear & Greed data unavailable:", fearGreedResult.reason);
    }

    if (vixResult.status === "fulfilled") {
      vix = vixResult.value;
      dataSources.push("vix-yahoo");
    } else {
      console.warn("[Pipeline] VIX data unavailable:", vixResult.reason);
    }

    if (redditResult.status === "fulfilled") {
      reddit = redditResult.value;
      dataSources.push("reddit-sentiment");
    } else {
      console.warn("[Pipeline] Reddit data unavailable:", redditResult.reason);
    }

    if (twitterResult.status === "fulfilled") {
      twitter = twitterResult.value;
      dataSources.push("twitter-sentiment");
    } else {
      console.warn("[Pipeline] Twitter data unavailable:", twitterResult.reason);
    }

    // Step 3: Send aggregated data to LLM with enriched context
    console.log("[Pipeline] Running LLM analysis...");
    const llmResponse = await analyzeMarket(
      quotes,
      news,
      economicEvents,
      macroSnapshot,
      fearGreed,
      vix,
      reddit,
      twitter
    );
    dataSources.push("llm-analysis");

    // Step 4: Build final asset analysis with 6-factor scoring
    const assets: AssetAnalysis[] = ASSETS.map((assetConfig) => {
      const llmAsset = llmResponse.assets.find(
        (a) => a.ticker === assetConfig.ticker
      );
      const quote = quotes[assetConfig.etfProxy];

      if (!llmAsset || !quote) {
        return {
          ticker: assetConfig.ticker,
          name: assetConfig.name,
          etf_proxy: assetConfig.etfProxy,
          sentiment: "Neutral" as const,
          confidence: 0,
          llm_confidence: 0,
          llm_sentiment: "Neutral" as const,
          summary: "Analysis unavailable due to missing data.",
          key_factors: [],
          deep_dive: "Unable to generate analysis. Please try again later.",
          confidence_breakdown: {
            news_consensus: 0,
            technical_alignment: 0,
            inverse_volatility: 0,
          },
          scoring_factors: {
            newsConsensus: {
              key: "newsConsensus",
              label: "News Consensus",
              score: 0,
              weight: 0.25,
              signal: "Neutral",
              description: "No data available",
            },
            macroAlignment: {
              key: "macroAlignment",
              label: "Macro Alignment",
              score: 0,
              weight: 0.2,
              signal: "Neutral",
              description: "No data available",
            },
            marketSentiment: {
              key: "marketSentiment",
              label: "Market Sentiment",
              score: 0,
              weight: 0.15,
              signal: "Neutral",
              description: "No data available",
            },
            technicalConfirmation: {
              key: "technicalConfirmation",
              label: "Technical Confirmation",
              score: 0,
              weight: 0.15,
              signal: "Neutral",
              description: "No data available",
            },
            volatilityRegime: {
              key: "volatilityRegime",
              label: "Volatility Regime",
              score: 0,
              weight: 0.15,
              signal: "Neutral",
              description: "No data available",
            },
            positioning: {
              key: "positioning",
              label: "Positioning (COT)",
              score: 0,
              weight: 0.1,
              signal: "Neutral",
              description: "No data available",
            },
          },
          quote: {
            price: 0,
            change: 0,
            change_percent: 0,
            previous_close: 0,
          },
        };
      }

      // Calculate 6-factor scoring
      const newsConsensusScore =
        (llmAsset.confidence_breakdown?.news_consensus ??
          llmAsset.confidence) / 100;

      const scoringResult = calculateScoring({
        sentiment: llmAsset.sentiment,
        quote,
        newsConsensusScore,
        macroSnapshot,
        fearGreed,
        vix,
        reddit,
        twitter,
        ticker: assetConfig.ticker,
      });

      // Run sanity checks to detect LLM hallucinations
      const sanityResult = runSanityChecks(
        assetConfig.ticker,
        llmAsset.sentiment,
        llmAsset.confidence,
        quote,
        vix,
        fearGreed,
        reddit,
        llmAsset.key_factors
      );

      // Use sanity-adjusted confidence
      const finalConfidence = sanityResult.adjustedConfidence;

      // Log if sanity checks found issues
      if (sanityResult.checks.length > 0) {
        console.log(`[Sanity] ${assetConfig.ticker}: ${sanityResult.checks.length} issue(s) found, confidence adjusted from ${sanityResult.originalConfidence} to ${finalConfidence}`);
        sanityResult.checks.forEach(check => {
          console.log(`  - [${check.severity.toUpperCase()}] ${check.message}`);
        });
      }

      return {
        ticker: assetConfig.ticker,
        name: assetConfig.name,
        etf_proxy: assetConfig.etfProxy,
        sentiment: llmAsset.sentiment,
        confidence: finalConfidence,
        llm_confidence: llmAsset.confidence,
        llm_sentiment: llmAsset.sentiment,
        summary: llmAsset.summary,
        key_factors: llmAsset.key_factors,
        deep_dive: llmAsset.deep_dive,
        macro_context: llmAsset.macro_context,
        confidence_breakdown: {
          news_consensus: llmAsset.confidence_breakdown?.news_consensus ?? 0,
          technical_alignment: llmAsset.confidence_breakdown?.technical_alignment ?? 0,
          inverse_volatility: llmAsset.confidence_breakdown?.inverse_volatility ?? 0,
        },
        scoring_factors: scoringResult.factors,
        sanity_checks: sanityResult.checks,
        needs_review: shouldFlagForReview(sanityResult),
        quote: {
          price: quote.c,
          change: quote.d,
          change_percent: quote.dp,
          previous_close: quote.pc,
        },
      };
    });

    // Step 4b: Apply sentiment stability smoothing to prevent whipsaws
    console.log("[Pipeline] Applying sentiment stability smoothing...");
    const history = await loadHistory();
    const smoothedAssets = assets.map((asset) => {
      // Stabilize sentiment
      const stabilityResult = stabilizeSentiment(
        asset.sentiment,
        asset.confidence,
        asset.ticker,
        history
      );

      // Detect choppy market
      const choppyResult = detectChoppyMarket(asset.ticker, history);

      // Get stability rating
      const stabilityInfo = getSentimentStability(
        asset.ticker,
        stabilityResult.sentiment,
        history
      );

      // Log if smoothing occurred
      if (stabilityResult.wasSmoothed) {
        console.log(`[Stability] ${asset.ticker}: ${stabilityResult.reason}`);
      }

      if (choppyResult.isChoppy) {
        console.log(`[Stability] ${asset.ticker}: ${choppyResult.message}`);
      }

      return {
        ...asset,
        sentiment: stabilityResult.sentiment,
        stability: {
          stability: stabilityInfo.stability,
          runsAtCurrentSentiment: stabilityInfo.runsAtCurrentSentiment,
          avgConfidence: stabilityInfo.avgConfidence,
          wasSmoothed: stabilityResult.wasSmoothed,
          smoothingReason: stabilityResult.reason,
          isChoppy: choppyResult.isChoppy,
          choppyWarning: choppyResult.message,
        },
      };
    });

    // Step 5: Detect cross-asset correlation signals
    console.log("[Pipeline] Running cross-asset correlation analysis...");
    const crossAssetSignals = detectCrossAssetSignals(
      smoothedAssets,
      fearGreed,
      vix
    );

    const durationMs = Date.now() - startTime;

    // Step 6: Build result
    const result: PipelineResult = {
      timestamp: new Date().toISOString(),
      assets: smoothedAssets,
      raw_quotes: quotes,
      pipeline_duration_ms: durationMs,
      data_sources: dataSources,
      macro_snapshot: macroSnapshot,
      market_sentiment: {
        fearGreed,
        vix,
        reddit,
        twitter,
      },
      cross_asset_signals: crossAssetSignals,
    };

    // Step 7: Save results and history
    await saveAnalysis(result);
    await saveHistory(result);

    // Step 8: Log success
    const logEntry: PipelineLogEntry = {
      timestamp: new Date().toISOString(),
      status: "success",
      duration_ms: durationMs,
      data_sources: dataSources,
    };
    await appendPipelineLog(logEntry);

    console.log(`[Pipeline] Completed successfully in ${durationMs}ms`);
    console.log(`[Pipeline] Data sources: ${dataSources.join(", ")}`);
    console.log(`[Pipeline] Cross-asset signals detected: ${crossAssetSignals.length}`);

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const logEntry: PipelineLogEntry = {
      timestamp: new Date().toISOString(),
      status: "error",
      duration_ms: durationMs,
      error_message:
        error instanceof Error ? error.message : String(error),
      data_sources: dataSources,
    };
    await appendPipelineLog(logEntry);

    console.error(`[Pipeline] Failed after ${durationMs}ms:`, error);
    throw error;
  }
}
