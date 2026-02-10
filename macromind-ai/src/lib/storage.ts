import { promises as fs } from "fs";
import path from "path";
import { HISTORY_MAX_ENTRIES } from "./constants";
import type { PipelineResult, PipelineLogEntry, AnalysisHistoryEntry } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const ANALYSIS_FILE = path.join(DATA_DIR, "analysis.json");
const LOG_FILE = path.join(DATA_DIR, "pipeline-log.json");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

// --- Analysis storage ---

export async function saveAnalysis(result: PipelineResult): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(ANALYSIS_FILE, JSON.stringify(result, null, 2), "utf-8");
}

export async function loadAnalysis(): Promise<PipelineResult | null> {
  try {
    const data = await fs.readFile(ANALYSIS_FILE, "utf-8");
    return JSON.parse(data) as PipelineResult;
  } catch {
    return null;
  }
}

// --- History archive ---

export async function saveHistory(result: PipelineResult): Promise<void> {
  await ensureDataDir();
  
  // Create compact history entry from pipeline result
  const entry: AnalysisHistoryEntry = {
    timestamp: result.timestamp,
    assets: result.assets.map((asset) => ({
      ticker: asset.ticker,
      sentiment: asset.sentiment,
      confidence: asset.confidence,
    })),
    context: {
      fearGreedScore: result.market_sentiment?.fearGreed?.score ?? null,
      vixLevel: result.market_sentiment?.vix?.current ?? null,
      yieldCurveSpread: result.macro_snapshot?.yieldCurveSpread ?? null,
    },
  };

  let history: AnalysisHistoryEntry[] = [];
  try {
    const data = await fs.readFile(HISTORY_FILE, "utf-8");
    history = JSON.parse(data);
  } catch {
    // File doesn't exist yet
  }

  history.unshift(entry);

  // Keep only last N entries (~17 days at 30min intervals)
  history = history.slice(0, HISTORY_MAX_ENTRIES);

  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
}

export async function loadHistory(): Promise<AnalysisHistoryEntry[]> {
  try {
    const data = await fs.readFile(HISTORY_FILE, "utf-8");
    return JSON.parse(data) as AnalysisHistoryEntry[];
  } catch {
    return [];
  }
}

export async function getAssetHistory(
  symbol: string,
  limit: number = 100
): Promise<AnalysisHistoryEntry[]> {
  const history = await loadHistory();
  return history
    .filter((entry) => entry.assets.some((a) => a.ticker === symbol))
    .slice(0, limit)
    .map((entry) => ({
      ...entry,
      assets: entry.assets.filter((a) => a.ticker === symbol),
    }));
}

// --- Pipeline log ---

export async function appendPipelineLog(
  entry: PipelineLogEntry
): Promise<void> {
  await ensureDataDir();
  let logs: PipelineLogEntry[] = [];
  try {
    const data = await fs.readFile(LOG_FILE, "utf-8");
    logs = JSON.parse(data);
  } catch {
    // File doesn't exist yet
  }
  logs.unshift(entry);
  logs = logs.slice(0, 100);
  await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2), "utf-8");
}

export async function loadPipelineLogs(): Promise<PipelineLogEntry[]> {
  try {
    const data = await fs.readFile(LOG_FILE, "utf-8");
    return JSON.parse(data) as PipelineLogEntry[];
  } catch {
    return [];
  }
}
