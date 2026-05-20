import { NextRequest } from "next/server";
import { apiSuccess, handleApiError } from "@/lib/api";
import { processJobs, runScheduler } from "@/jobs";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      limit?: number;
      runScheduler?: boolean;
    };

    const limit = Math.min(body.limit ?? 5, 25);
    let schedulerEnqueued = 0;

    if (body.runScheduler !== false) {
      schedulerEnqueued = await runScheduler();
    }

    const result = await processJobs({ limit });

    return apiSuccess({
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined,
      scheduler_enqueued: schedulerEnqueued > 0 ? schedulerEnqueued : undefined,
    });
  } catch (error) {
    console.error("[jobs/process] Error:", error);
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 5, 25);

    const schedulerEnqueued = await runScheduler();
    const result = await processJobs({ limit });

    return apiSuccess({
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined,
      scheduler_enqueued: schedulerEnqueued > 0 ? schedulerEnqueued : undefined,
    });
  } catch (error) {
    console.error("[jobs/process] Error:", error);
    return handleApiError(error);
  }
}
