import { runPipeline } from "./pipeline";
import { PIPELINE_INTERVAL_MS } from "./constants";

let intervalId: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

async function executePipeline() {
  if (isRunning) {
    console.log("[Scheduler] Pipeline already running, skipping...");
    return;
  }

  isRunning = true;
  try {
    await runPipeline();
  } catch (error) {
    console.error("[Scheduler] Pipeline error:", error);
  } finally {
    isRunning = false;
  }
}

export function startScheduler() {
  if (intervalId) {
    console.log("[Scheduler] Already started");
    return;
  }

  console.log(
    `[Scheduler] Starting pipeline scheduler (interval: ${PIPELINE_INTERVAL_MS / 60000}min)`
  );

  // Run immediately on start
  executePipeline();

  // Schedule recurring runs
  intervalId = setInterval(executePipeline, PIPELINE_INTERVAL_MS);
}

export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[Scheduler] Stopped");
  }
}
