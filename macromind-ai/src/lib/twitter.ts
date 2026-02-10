import { TWITTER_ACCOUNTS } from "./constants";
import type { TwitterSentiment, TwitterAccountData, TwitterPost } from "@/types";

// Note: As of 2024+, Twitter/X API requires paid access for most features
// This implementation supports multiple strategies:
// 1. Twitter API v2 (paid) - Full access with bearer token
// 2. RSS feeds via Nitter instances (free alternative)
// 3. Webhook ingestion from GitHub Actions or external services

interface TwitterApiPost {
  id: string;
  text: string;
  created_at: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
  };
  author_id?: string;
}

interface TwitterApiResponse {
  data?: TwitterApiPost[];
  meta?: {
    result_count: number;
    newest_id?: string;
    oldest_id?: string;
  };
}

const BULLISH_KEYWORDS = [
  "bull", "bullish", "long", "buy", "pump", "moon", "rally",
  "breakout", "squeeze", "up", "green", "gains", "rip",
  "upside", "growth", "strong", "positive", " ATH", " all time high",
  "rocket", "surge", "soar", "rally", "rallying",
];

const BEARISH_KEYWORDS = [
  "bear", "bearish", "short", "sell", "dump", "crash", "drop",
  "fall", "recession", "fear", "red", "losses", "down",
  "tanking", "downside", "weak", "negative", "collapse",
  "correction", "pullback", "decline", "dumping", "crashing",
];

const TICKER_PATTERN =
  /\b(MNQ|MES|MYM|MGC|SIL|SPY|QQQ|DIA|GLD|SLV|SPX|NDX|ES|NQ|YM|GC|SI|AAPL|TSLA|NVDA|META|MSFT|AMZN|GOOGL|BTC|ETH|USD|EUR|FED|CPI|GDP)\b/g;

/**
 * Fetch tweets from a specific account using Twitter API v2
 */
async function fetchAccountTweets(
  username: string,
  maxResults: number = 10
): Promise<TwitterPost[]> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  
  if (!bearerToken) {
    throw new Error("TWITTER_BEARER_TOKEN not configured");
  }

  // First, get the user ID from username
  const userLookupUrl = `https://api.twitter.com/2/users/by/username/${username}`;
  const userRes = await fetch(userLookupUrl, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
    cache: "no-store",
  });

  if (!userRes.ok) {
    if (userRes.status === 429) {
      throw new Error("Twitter API rate limit exceeded");
    }
    throw new Error(
      `Twitter API error for @${username}: ${userRes.status} ${userRes.statusText}`
    );
  }

  const userData = await userRes.json();
  if (!userData.data?.id) {
    throw new Error(`User @${username} not found`);
  }

  const userId = userData.data.id;

  // Then fetch recent tweets
  const tweetsUrl = new URL(`https://api.twitter.com/2/users/${userId}/tweets`);
  tweetsUrl.searchParams.append("max_results", maxResults.toString());
  tweetsUrl.searchParams.append("tweet.fields", "created_at,public_metrics,context_annotations");
  tweetsUrl.searchParams.append("exclude", "retweets,replies");

  const tweetsRes = await fetch(tweetsUrl.toString(), {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
    cache: "no-store",
  });

  if (!tweetsRes.ok) {
    throw new Error(
      `Twitter API error fetching tweets: ${tweetsRes.status} ${tweetsRes.statusText}`
    );
  }

  const tweetsData: TwitterApiResponse = await tweetsRes.json();
  
  if (!tweetsData.data) {
    return [];
  }

  return tweetsData.data.map((tweet) => ({
    id: tweet.id,
    text: tweet.text,
    createdAt: tweet.created_at,
    likes: tweet.public_metrics?.like_count ?? 0,
    retweets: tweet.public_metrics?.retweet_count ?? 0,
    replies: tweet.public_metrics?.reply_count ?? 0,
    quotes: tweet.public_metrics?.quote_count ?? 0,
  }));
}

/**
 * Alternative: Fetch from Nitter RSS feed (free, but less reliable)
 * Use as fallback when Twitter API is unavailable
 */
async function fetchFromNitterRss(username: string): Promise<TwitterPost[]> {
  // Nitter instances often change; these are common ones
  const nitterInstances = [
    "https://nitter.net",
    "https://nitter.it",
    "https://nitter.cz",
  ];
  
  for (const instance of nitterInstances) {
    try {
      const rssUrl = `${instance}/${username}/rss`;
      const res = await fetch(rssUrl, {
        headers: {
          "User-Agent": "MacroMind-AI/1.0",
        },
        cache: "no-store",
      });

      if (!res.ok) continue;

      const rssText = await res.text();
      
      // Simple RSS parsing
      const posts: TwitterPost[] = [];
      const itemRegex = /<item>[\s\S]*?<\/item>/g;
      const items = rssText.match(itemRegex) || [];
      
      for (const item of items.slice(0, 10)) {
        const titleMatch = item.match(/<title>(.*?)<\/title>/);
        const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
        
        if (titleMatch) {
          posts.push({
            id: `${username}-${posts.length}`,
            text: titleMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
            createdAt: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
            likes: 0,
            retweets: 0,
            replies: 0,
            quotes: 0,
          });
        }
      }
      
      if (posts.length > 0) {
        return posts;
      }
    } catch {
      continue;
    }
  }
  
  throw new Error("All Nitter instances failed");
}

/**
 * Analyze tweets for sentiment and extract tickers
 */
function analyzeTweets(posts: TwitterPost[]): {
  bullishCount: number;
  bearishCount: number;
  sentimentRatio: number;
  topTickers: string[];
  totalEngagement: number;
} {
  let bullishCount = 0;
  let bearishCount = 0;
  let totalEngagement = 0;
  const tickerCounts: Record<string, number> = {};

  for (const post of posts) {
    const lower = post.text.toLowerCase();
    const hasBullish = BULLISH_KEYWORDS.some((k) => lower.includes(k));
    const hasBearish = BEARISH_KEYWORDS.some((k) => lower.includes(k));

    // Weight by engagement
    const engagement = post.likes + post.retweets * 2 + post.replies + post.quotes;
    totalEngagement += engagement;

    if (hasBullish && !hasBearish) {
      bullishCount += 1 + Math.log1p(engagement) / 10;
    } else if (hasBearish && !hasBullish) {
      bearishCount += 1 + Math.log1p(engagement) / 10;
    }

    const tickers = post.text.match(TICKER_PATTERN) || [];
    for (const ticker of tickers) {
      tickerCounts[ticker] = (tickerCounts[ticker] || 0) + 1 + Math.log1p(engagement) / 5;
    }
  }

  const total = bullishCount + bearishCount;
  const sentimentRatio = total > 0 ? bullishCount / total : 0.5;

  const topTickers = Object.entries(tickerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ticker]) => ticker);

  return { bullishCount, bearishCount, sentimentRatio, topTickers, totalEngagement };
}

/**
 * Fetch and analyze tweets from a specific account
 */
async function fetchAccountData(
  account: { username: string; category: string; weight: number }
): Promise<TwitterAccountData> {
  let posts: TwitterPost[] = [];
  let source = "twitter-api";

  try {
    // Try Twitter API first
    posts = await fetchAccountTweets(account.username, 10);
  } catch (err) {
    console.warn(`[Twitter] API failed for @${account.username}, trying Nitter RSS...`);
    try {
      posts = await fetchFromNitterRss(account.username);
      source = "nitter-rss";
    } catch (rssErr) {
      throw new Error(`Failed to fetch tweets for @${account.username}: ${err}`);
    }
  }

  const { bullishCount, bearishCount, sentimentRatio, topTickers, totalEngagement } =
    analyzeTweets(posts);

  return {
    username: account.username,
    category: account.category,
    weight: account.weight,
    posts,
    bullishCount,
    bearishCount,
    sentimentRatio,
    topTickers,
    totalEngagement,
    source,
  };
}

/**
 * Main function: Get Twitter sentiment from all configured accounts
 */
export async function getTwitterSentiment(): Promise<TwitterSentiment> {
  const results = await Promise.allSettled(
    TWITTER_ACCOUNTS.map((account) => fetchAccountData(account))
  );

  const accounts: TwitterAccountData[] = results
    .filter(
      (r): r is PromiseFulfilledResult<TwitterAccountData> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);

  if (accounts.length === 0) {
    throw new Error("Failed to fetch any Twitter account data");
  }

  // Calculate weighted sentiment
  let weightedBullish = 0;
  let weightedBearish = 0;
  let totalWeight = 0;

  for (const account of accounts) {
    const total = account.bullishCount + account.bearishCount;
    if (total > 0) {
      weightedBullish += account.bullishCount * account.weight;
      weightedBearish += account.bearishCount * account.weight;
      totalWeight += account.weight;
    }
  }

  const overallBullishRatio = totalWeight > 0 
    ? weightedBullish / (weightedBullish + weightedBearish)
    : 0.5;

  let sentiment: TwitterSentiment["sentiment"] = "Neutral";
  if (overallBullishRatio > 0.6) sentiment = "Bullish";
  else if (overallBullishRatio < 0.4) sentiment = "Bearish";

  const totalEngagement = accounts.reduce((s, a) => s + a.totalEngagement, 0);

  // Collect all top tickers and aggregate
  const allTickers: Record<string, number> = {};
  for (const account of accounts) {
    for (const ticker of account.topTickers) {
      allTickers[ticker] = (allTickers[ticker] || 0) + account.weight;
    }
  }

  const topTickers = Object.entries(allTickers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ticker]) => ticker);

  return {
    accounts,
    sentiment,
    overallBullishRatio,
    topTickers,
    totalTweetsAnalyzed: accounts.reduce((s, a) => s + a.posts.length, 0),
    totalEngagement,
    fetchedAt: new Date().toISOString(),
    sources: [...new Set(accounts.map((a) => a.source))],
  };
}

/**
 * Webhook handler for ingesting tweets from external sources (e.g., GitHub Actions)
 */
export function ingestTweetsFromWebhook(payload: {
  account: string;
  tweets: Array<{
    id: string;
    text: string;
    created_at: string;
    likes?: number;
    retweets?: number;
  }>;
}): TwitterAccountData {
  const posts: TwitterPost[] = payload.tweets.map((t) => ({
    id: t.id,
    text: t.text,
    createdAt: t.created_at,
    likes: t.likes ?? 0,
    retweets: t.retweets ?? 0,
    replies: 0,
    quotes: 0,
  }));

  const { bullishCount, bearishCount, sentimentRatio, topTickers, totalEngagement } =
    analyzeTweets(posts);

  return {
    username: payload.account,
    category: "ingested",
    weight: 1,
    posts,
    bullishCount,
    bearishCount,
    sentimentRatio,
    topTickers,
    totalEngagement,
    source: "webhook",
  };
}
