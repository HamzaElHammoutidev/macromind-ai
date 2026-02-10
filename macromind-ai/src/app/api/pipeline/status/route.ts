import { NextResponse } from "next/server";
import { loadAnalysis, loadPipelineLogs } from "@/lib/storage";
import { PIPELINE_INTERVAL_MS } from "@/lib/constants";
import type { PipelineStatusResponse } from "@/types";

export async function GET() {
  const analysis = await loadAnalysis();
  const logs = await loadPipelineLogs();

  const lastRun = analysis?.timestamp ?? null;
  const status =
    logs.length === 0 ? "never_run" : logs[0].status;
  const nextScheduled = lastRun
    ? new Date(
        new Date(lastRun).getTime() + PIPELINE_INTERVAL_MS
      ).toISOString()
    : null;

  return NextResponse.json({
    last_run: lastRun,
    status,
    next_scheduled: nextScheduled,
    recent_logs: logs.slice(0, 10),
  } satisfies PipelineStatusResponse);
}
