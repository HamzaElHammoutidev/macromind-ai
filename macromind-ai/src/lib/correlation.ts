import type { AssetAnalysis, CrossAssetSignal, FearGreedData, VixData } from "@/types";

export function detectCrossAssetSignals(
  assets: AssetAnalysis[],
  fearGreed: FearGreedData | null,
  vix: VixData | null
): CrossAssetSignal[] {
  const signals: CrossAssetSignal[] = [];

  const byTicker: Record<string, AssetAnalysis> = {};
  for (const a of assets) byTicker[a.ticker] = a;

  const mnq = byTicker["MNQ"];
  const mes = byTicker["MES"];
  const mym = byTicker["MYM"];
  const mgc = byTicker["MGC"];
  const sil = byTicker["SIL"];

  // Helper to check safe haven alignment (gold and silver usually move together)
  const safeHavens = [mgc, sil].filter(Boolean) as AssetAnalysis[];
  const safeHavensBullish = safeHavens.length > 0 && safeHavens.every((a) => a.sentiment === "Bullish");
  const safeHavensBearish = safeHavens.length > 0 && safeHavens.every((a) => a.sentiment === "Bearish");

  // Rule 1: MNQ vs MES divergence (both equity — should move together)
  if (mnq && mes && mnq.sentiment !== mes.sentiment) {
    const severity =
      (mnq.sentiment === "Bullish" && mes.sentiment === "Bearish") ||
      (mnq.sentiment === "Bearish" && mes.sentiment === "Bullish")
        ? "high"
        : "medium";
    signals.push({
      type: "divergence",
      severity,
      message: `MNQ (tech stocks) is ${mnq.sentiment.toLowerCase()} but MES (broad market) is ${mes.sentiment.toLowerCase()}. These usually move together, so this split suggests a shift in investor preferences — possibly between technology companies and the wider economy.`,
      assets: ["MNQ", "MES"],
    });
  }

  // Rule 2: MNQ vs MYM divergence (both equity)
  if (mnq && mym && mnq.sentiment !== mym.sentiment) {
    const isStrong =
      (mnq.sentiment === "Bullish" && mym.sentiment === "Bearish") ||
      (mnq.sentiment === "Bearish" && mym.sentiment === "Bullish");
    signals.push({
      type: "divergence",
      severity: isStrong ? "high" : "low",
      message: `MNQ (tech-focused Nasdaq) is ${mnq.sentiment.toLowerCase()} while MYM (industrial-focused Dow) is ${mym.sentiment.toLowerCase()}. This shows different views on growth stocks vs established companies — investors may be rotating between "new economy" tech and "old economy" industrials.`,
      assets: ["MNQ", "MYM"],
    });
  }

  // Rule 3: MES vs MYM divergence
  if (mes && mym && mes.sentiment !== mym.sentiment) {
    signals.push({
      type: "divergence",
      severity: "low",
      message: `MES (S&P 500) is ${mes.sentiment.toLowerCase()} but MYM (Dow Jones) is ${mym.sentiment.toLowerCase()}. Both track US stocks but with different company mixes — this split shows disagreement in how different parts of the market are performing.`,
      assets: ["MES", "MYM"],
    });
  }

  // Rule 4: Safe Havens (Gold/Silver) vs Equities
  const equities = [mnq, mes, mym].filter(Boolean) as AssetAnalysis[];
  // Require at least 2 equities for multi-asset rules to be meaningful
  const hasEnoughEquities = equities.length >= 2;
  const equitiesBullish = hasEnoughEquities && equities.every((a) => a.sentiment === "Bullish");
  const equitiesBearish = hasEnoughEquities && equities.every((a) => a.sentiment === "Bearish");

  // All assets bullish = risk-on rally
  if (safeHavensBullish && equitiesBullish) {
    signals.push({
      type: "confirmation",
      severity: "medium",
      message: "Everything is bullish — stocks AND precious metals are rising together. This suggests investors are optimistic and willing to buy risky assets (stocks) and inflation hedges (gold/silver) at the same time, rather than hiding in safe havens.",
      assets: safeHavens.length === 2 ? ["MNQ", "MES", "MYM", "MGC", "SIL"] : ["MNQ", "MES", "MYM", safeHavens[0]?.ticker || "MGC"],
    });
  }

  // Everything bearish = panic selling
  if (safeHavensBearish && equitiesBearish) {
    signals.push({
      type: "divergence",
      severity: "high",
      message: "Everything is falling — both stocks AND precious metals are bearish. This is unusual because gold/silver usually go up when stocks go down (as safe havens). This 'sell everything' pattern often means investors are panicking or needing cash urgently.",
      assets: safeHavens.length === 2 ? ["MNQ", "MES", "MYM", "MGC", "SIL"] : ["MNQ", "MES", "MYM", safeHavens[0]?.ticker || "MGC"],
    });
  }

  // Risk-on: stocks up, safe havens down
  if (safeHavensBearish && equitiesBullish) {
    signals.push({
      type: "confirmation",
      severity: "low",
      message: "Stocks are bullish but precious metals are bearish — this is the normal risk-on pattern. Investors are confident and moving money OUT of safe-haven metals INTO stocks to chase higher returns. Shows strong risk appetite.",
      assets: safeHavens.length === 2 ? ["MNQ", "MES", "MYM", "MGC", "SIL"] : ["MNQ", "MES", "MYM", safeHavens[0]?.ticker || "MGC"],
    });
  }

  // Risk-off: stocks down, safe havens up
  if (safeHavensBullish && equitiesBearish) {
    signals.push({
      type: "confirmation",
      severity: "medium",
      message: "Stocks are falling but precious metals are rising — classic 'flight to safety.' Worried investors are selling risky stocks and buying gold/silver as protection. This suggests fear about the economy or markets.",
      assets: safeHavens.length === 2 ? ["MNQ", "MES", "MYM", "MGC", "SIL"] : ["MNQ", "MES", "MYM", safeHavens[0]?.ticker || "MGC"],
    });
  }

  // Silver vs Gold divergence (both should move together as precious metals)
  if (mgc && sil && mgc.sentiment !== sil.sentiment) {
    signals.push({
      type: "divergence",
      severity: "medium",
      message: `Gold is ${mgc.sentiment.toLowerCase()} but Silver is ${sil.sentiment.toLowerCase()}. These precious metals usually move together. A split suggests different views on inflation hedges — silver has more industrial use, so it may reflect economic growth expectations differently than gold.`,
      assets: ["MGC", "SIL"],
    });
  }

  // Rule 5: VIX vs Equity Sentiment — rising VIX while equities bullish = hidden risk
  if (vix && equitiesBullish && (vix.regime === "elevated" || vix.regime === "high")) {
    signals.push({
      type: "divergence",
      severity: vix.regime === "high" ? "high" : "medium",
      message: `The market looks calm (${vix.regimeLabel.toLowerCase()}) but our analysis says stocks are bullish. When 'fear index' (VIX) stays high despite positive signals, it means professional traders are buying protection — they may know something the headlines don't. Consider smaller positions.`,
      assets: ["MNQ", "MES", "MYM"],
    });
  }

  // Rule 6: Extreme Greed + Bearish equity = contrarian signal
  if (fearGreed && equitiesBearish && fearGreed.classification === "Extreme Greed") {
    signals.push({
      type: "contrarian",
      severity: "high",
      message: `Our analysis is bearish, but the Fear & Greed Index shows ${fearGreed.score}/100 (Extreme Greed). This means retail investors are very optimistic while fundamentals look weak — a classic warning sign that a pullback may be coming.`,
      assets: ["MNQ", "MES", "MYM"],
    });
  }

  // Rule 7: Extreme Fear + Bullish equity = contrarian buy signal
  if (fearGreed && equitiesBullish && fearGreed.classification === "Extreme Fear") {
    signals.push({
      type: "contrarian",
      severity: "medium",
      message: `Our analysis is bullish, but the Fear & Greed Index shows ${fearGreed.score}/100 (Extreme Fear). When everyone else is panicking but the data looks good, it can be a great buying opportunity — 'be greedy when others are fearful.'`,
      assets: ["MNQ", "MES", "MYM"],
    });
  }

  return signals;
}
