import { Badge } from "@/components/ui/badge";
import type { Sentiment } from "@/lib/constants";

interface SentimentBadgeProps {
  sentiment: Sentiment;
}

const VARIANT_MAP: Record<Sentiment, "bullish" | "bearish" | "neutral"> = {
  Bullish: "bullish",
  Bearish: "bearish",
  Neutral: "neutral",
};

export function SentimentBadge({ sentiment }: SentimentBadgeProps) {
  return (
    <Badge variant={VARIANT_MAP[sentiment]} className="text-lg px-4 py-1.5">
      {sentiment}
    </Badge>
  );
}
