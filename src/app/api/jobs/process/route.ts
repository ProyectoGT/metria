import { NextRequest, NextResponse } from "next/server";
import { apiSuccess, handleApiError } from "@/lib/api";
import { processJobs, registerBuiltinJobs, runScheduler } from "@/jobs";

export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      limit?: number;
      runScheduler?: boolean;
    };

    const limit = Math.min(body.limit ?? 5, 25);
    let schedulerEnqueued = 0;
    registerBuiltinJobs();

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
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 5, 25);

    registerBuiltinJobs();
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
