import { Progress } from "@/components/ui/progress";
import {
  Newspaper,
  TrendingUp,
  Activity,
  Globe,
  BarChart3,
  Users,
} from "lucide-react";
import type { ScoringResult } from "@/types";

interface ConfidenceBreakdownProps {
  scoringFactors?: ScoringResult["factors"];
  legacyBreakdown?: {
    news_consensus: number;
    technical_alignment: number;
    inverse_volatility: number;
  };
}

const SIGNAL_COLORS = {
  Confirming: "bg-green-500/20 text-green-700 border-green-500/30",
  Neutral: "bg-gray-500/20 text-gray-700 border-gray-500/30",
  Diverging: "bg-red-500/20 text-red-700 border-red-500/30",
};

const FACTOR_CONFIG = [
  {
    key: "newsConsensus" as const,
    label: "News Consensus",
    weight: "25%",
    icon: Newspaper,
    description: "Agreement among news sources on directional bias",
  },
  {
    key: "macroAlignment" as const,
    label: "Macro Alignment",
    weight: "20%",
    icon: Globe,
    description: "FRED macro indicators (rates, CPI, GDP, yield curve) alignment",
  },
  {
    key: "marketSentiment" as const,
    label: "Market Sentiment",
    weight: "15%",
    icon: Users,
    description: "CNN Fear & Greed Index + Reddit retail sentiment composite",
  },
  {
    key: "technicalConfirmation" as const,
    label: "Technical Confirmation",
    weight: "15%",
    icon: TrendingUp,
    description: "Price direction and candle body alignment with sentiment",
  },
  {
    key: "volatilityRegime" as const,
    label: "Volatility Regime",
    weight: "15%",
    icon: Activity,
    description: "VIX level + intraday price range — lower volatility = more reliable signal",
  },
  {
    key: "positioning" as const,
    label: "Positioning (COT)",
    weight: "10%",
    icon: BarChart3,
    description: "Institutional positioning (COT report) — pending integration",
  },
];

export function ConfidenceBreakdown({
  scoringFactors,
  legacyBreakdown,
}: ConfidenceBreakdownProps) {
  // Fallback to legacy breakdown if new scoring not available
  if (!scoringFactors && legacyBreakdown) {
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Confidence Breakdown (Legacy)
        </h4>
        <LegacyBreakdown breakdown={legacyBreakdown} />
      </div>
    );
  }

  if (!scoringFactors) {
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Confidence Breakdown
        </h4>
        <p className="text-sm text-muted-foreground">No scoring data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Confidence Breakdown — 6 Factor Model
      </h4>
      {FACTOR_CONFIG.map((config) => {
        const factor = scoringFactors[config.key];
        const Icon = config.icon;
        const signalColor = SIGNAL_COLORS[factor.signal];

        return (
          <div key={config.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{config.label}</span>
                <span className="text-xs text-muted-foreground">
                  ({config.weight})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border ${signalColor}`}>
                  {factor.signal}
                </span>
                <span className="font-mono text-sm font-semibold w-10 text-right">
                  {factor.score}%
                </span>
              </div>
            </div>
            <Progress value={factor.score} className="h-2" indicatorClassName="bg-primary" />
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        );
      })}
    </div>
  );
}

function LegacyBreakdown({
  breakdown,
}: {
  breakdown: {
    news_consensus: number;
    technical_alignment: number;
    inverse_volatility: number;
  };
}) {
  const factors = [
    {
      key: "news_consensus" as const,
      label: "News Consensus",
      weight: "50%",
      icon: Newspaper,
      description: "Agreement among news sources on directional bias",
    },
    {
      key: "technical_alignment" as const,
      label: "Technical Alignment",
      weight: "30%",
      icon: TrendingUp,
      description: "Price action confirms the fundamental view",
    },
    {
      key: "inverse_volatility" as const,
      label: "Volatility Score",
      weight: "20%",
      icon: Activity,
      description: "Lower volatility increases signal confidence",
    },
  ];

  return (
    <>
      {factors.map((factor) => {
        const Icon = factor.icon;
        const value = breakdown[factor.key];
        return (
          <div key={factor.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{factor.label}</span>
                <span className="text-xs text-muted-foreground">
                  ({factor.weight})
                </span>
              </div>
              <span className="font-mono text-sm font-semibold">{value}%</span>
            </div>
            <Progress value={value} className="h-2" indicatorClassName="bg-primary" />
            <p className="text-xs text-muted-foreground">{factor.description}</p>
          </div>
        );
      })}
    </>
  );
}
