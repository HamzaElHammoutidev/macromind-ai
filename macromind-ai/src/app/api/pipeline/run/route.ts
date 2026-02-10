import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";

export async function POST() {
  try {
    console.log("[API] Manual pipeline trigger received");
    const result = await runPipeline();
    return NextResponse.json({
      status: "success",
      timestamp: result.timestamp,
      duration_ms: result.pipeline_duration_ms,
      assets_analyzed: result.assets.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Pipeline execution failed",
      },
      { status: 500 }
    );
  }
}
