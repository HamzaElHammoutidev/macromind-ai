"use client";

import { AlertTriangle, CheckCircle, TrendingUp, Info, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CrossAssetSignal, SignalType, SignalSeverity } from "@/types";

interface CrossAssetSignalsProps {
  signals: CrossAssetSignal[];
  onDismiss?: () => void;
}

const TYPE_CONFIG: Record<
  SignalType,
  { icon: typeof AlertTriangle; label: string; badgeVariant: "bullish" | "bearish" | "neutral" | "warning" }
> = {
  divergence: {
    icon: AlertTriangle,
    label: "Divergence Alert",
    badgeVariant: "warning",
  },
  confirmation: {
    icon: CheckCircle,
    label: "Confirmation",
    badgeVariant: "bullish",
  },
  contrarian: {
    icon: TrendingUp,
    label: "Contrarian Signal",
    badgeVariant: "neutral",
  },
};

const SEVERITY_COLORS: Record<SignalSeverity, string> = {
  low: "border-l-4 border-l-blue-400",
  medium: "border-l-4 border-l-yellow-400",
  high: "border-l-4 border-l-red-500",
};

export function CrossAssetSignals({ signals, onDismiss }: CrossAssetSignalsProps) {
  if (!signals || signals.length === 0) {
    return null;
  }

  // Sort by severity: high > medium > low
  const sortedSignals = [...signals].sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Cross-Asset Signals</CardTitle>
            <Badge variant="default" className="ml-2">
              {signals.length}
            </Badge>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {sortedSignals.map((signal, index) => {
          const config = TYPE_CONFIG[signal.type];
          const Icon = config.icon;

          return (
            <div
              key={index}
              className={`rounded-md bg-muted/50 p-3 ${SEVERITY_COLORS[signal.severity]}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Icon
                    className={`h-4 w-4 ${
                      signal.type === "divergence"
                        ? "text-yellow-500"
                        : signal.type === "contrarian"
                        ? "text-blue-500"
                        : "text-green-500"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{config.label}</span>
                    <Badge variant={config.badgeVariant} className="text-xs">
                      {signal.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {signal.message}
                  </p>
                  <div className="flex items-center gap-1 pt-1">
                    <span className="text-xs text-muted-foreground">
                      Assets:
                    </span>
                    {signal.assets.map((asset) => (
                      <code
                        key={asset}
                        className="text-xs bg-background px-1.5 py-0.5 rounded font-mono"
                      >
                        {asset}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// Compact version for inline display
export function CrossAssetSignalsCompact({
  signals,
}: {
  signals: CrossAssetSignal[];
}) {
  if (!signals || signals.length === 0) return null;

  const highSeverityCount = signals.filter((s) => s.severity === "high").length;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
      <AlertTriangle
        className={`h-4 w-4 ${
          highSeverityCount > 0 ? "text-red-500" : "text-yellow-500"
        }`}
      />
      <span className="text-sm">
        {signals.length} cross-asset signal{signals.length > 1 ? "s" : ""} detected
        {highSeverityCount > 0 && ` (${highSeverityCount} high severity)`}
      </span>
    </div>
  );
}
