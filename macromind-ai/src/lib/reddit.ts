import { REDDIT_BASE_URL, REDDIT_SUBREDDITS } from "./constants";
import type { RedditSentiment, SubredditSentiment, RedditPost } from "@/types";

interface RedditTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface RedditListingChild {
  data: {
    title: string;
    score: number;
    num_comments: number;
    created_utc: number;
  };
}

interface RedditListingResponse {
  data: {
    children: RedditListingChild[];
  };
}

const BULLISH_KEYWORDS = [
  "bull", "bullish", "calls", "long", "buy", "pump", "moon", "rally",
  "breakout", "squeeze", "yolo", "all in", "green", "gains", "up",
  "rip", "upside", "growth", "strong", "positive",
];

const BEARISH_KEYWORDS = [
  "bear", "bearish", "puts", "short", "sell", "dump", "crash", "drop",
  "fall", "recession", "fear", "red", "losses", "down", "tanking",
  "downside", "weak", "negative", "collapse", "correction",
];

const TICKER_PATTERN =
  /\b(MNQ|MES|MYM|MGC|SPY|QQQ|DIA|GLD|SPX|NDX|ES|NQ|YM|GC|AAPL|TSLA|NVDA|META|MSFT|AMZN|GOOGL)\b/g;

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET not configured");
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "MacroMind-AI/1.0",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Reddit OAuth error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as RedditTokenResponse;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

function analyzePosts(posts: RedditPost[]): {
  bullishCount: number;
  bearishCount: number;
  sentimentRatio: number;
  topTickers: string[];
} {
  let bullishCount = 0;
  let bearishCount = 0;
  const tickerCounts: Record<string, number> = {};

  for (const post of posts) {
    const lower = post.title.toLowerCase();
    const hasBullish = BULLISH_KEYWORDS.some((k) => lower.includes(k));
    const hasBearish = BEARISH_KEYWORDS.some((k) => lower.includes(k));

    if (hasBullish && !hasBearish) bullishCount++;
    else if (hasBearish && !hasBullish) bearishCount++;

    const tickers = post.title.match(TICKER_PATTERN) || [];
    for (const ticker of tickers) {
      tickerCounts[ticker] = (tickerCounts[ticker] || 0) + 1;
    }
  }

  const total = bullishCount + bearishCount;
  const sentimentRatio = total > 0 ? bullishCount / total : 0.5;

  const topTickers = Object.entries(tickerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ticker]) => ticker);

  return { bullishCount, bearishCount, sentimentRatio, topTickers };
}

async function fetchSubredditPosts(
  subreddit: string,
  token: string
): Promise<SubredditSentiment> {
  const url = `${REDDIT_BASE_URL}/r/${subreddit}/hot.json?limit=25&t=day`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "MacroMind-AI/1.0",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Reddit API error for r/${subreddit}: ${res.status} ${res.statusText}`
    );
  }

  const data = (await res.json()) as RedditListingResponse;
  const posts: RedditPost[] = data.data.children.map((c) => ({
    title: c.data.title,
    score: c.data.score,
    numComments: c.data.num_comments,
    createdAt: c.data.created_utc,
  }));

  const { bullishCount, bearishCount, sentimentRatio, topTickers } =
    analyzePosts(posts);

  return {
    subreddit,
    posts,
    bullishCount,
    bearishCount,
    sentimentRatio,
    topTickers,
  };
}

export async function getRedditSentiment(): Promise<RedditSentiment> {
  const token = await getAccessToken();

  const results = await Promise.allSettled(
    REDDIT_SUBREDDITS.map((sub) => fetchSubredditPosts(sub, token))
  );

  const subreddits: SubredditSentiment[] = results
    .filter(
      (r): r is PromiseFulfilledResult<SubredditSentiment> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);

  if (subreddits.length === 0) {
    throw new Error("Failed to fetch any subreddit data");
  }

  const totalBullish = subreddits.reduce((s, r) => s + r.bullishCount, 0);
  const totalBearish = subreddits.reduce((s, r) => s + r.bearishCount, 0);
  const totalSentiment = totalBullish + totalBearish;
  const overallBullishRatio =
    totalSentiment > 0 ? totalBullish / totalSentiment : 0.5;

  let retailBias: RedditSentiment["retailBias"] = "Mixed";
  if (overallBullishRatio > 0.6) retailBias = "Bullish";
  else if (overallBullishRatio < 0.4) retailBias = "Bearish";

  return {
    subreddits,
    overallBullishRatio,
    retailBias,
    totalPostsAnalyzed: subreddits.reduce((s, r) => s + r.posts.length, 0),
    fetchedAt: new Date().toISOString(),
  };
}
