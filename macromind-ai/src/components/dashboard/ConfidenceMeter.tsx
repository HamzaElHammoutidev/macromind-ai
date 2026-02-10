import { Progress } from "@/components/ui/progress";
import type { Sentiment } from "@/lib/constants";

interface ConfidenceMeterProps {
  confidence: number;
  sentiment: Sentiment;
}

const COLOR_MAP: Record<Sentiment, string> = {
  Bullish: "bg-bullish",
  Bearish: "bg-bearish",
  Neutral: "bg-neutral",
};

export function ConfidenceMeter({ confidence, sentiment }: ConfidenceMeterProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Confidence</span>
        <span className="text-sm font-mono font-bold">{confidence}%</span>
      </div>
      <Progress value={confidence} indicatorClassName={COLOR_MAP[sentiment]} />
    </div>
  );
}
