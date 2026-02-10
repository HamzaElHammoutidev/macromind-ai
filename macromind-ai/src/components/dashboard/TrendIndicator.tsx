import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  changePercent: number;
  change: number;
}

export function TrendIndicator({ changePercent, change }: TrendIndicatorProps) {
  const isPositive = changePercent > 0;
  const isNegative = changePercent < 0;

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const colorClass = isPositive
    ? "text-bullish"
    : isNegative
      ? "text-bearish"
      : "text-neutral";
  const sign = isPositive ? "+" : "";

  return (
    <div className={`flex items-center gap-1.5 ${colorClass}`}>
      <Icon className="h-4 w-4" />
      <span className="font-mono text-sm font-semibold">
        {sign}
        {changePercent.toFixed(2)}%
      </span>
      <span className="font-mono text-xs text-muted-foreground">
        ({sign}
        {change.toFixed(2)})
      </span>
    </div>
  );
}
