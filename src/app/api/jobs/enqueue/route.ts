import { NextRequest } from "next/server";
import { apiSuccess, handleApiError, apiError } from "@/lib/api";
import { enqueueJob } from "@/jobs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.type || typeof body.type !== "string") {
      return apiError(400, "VALIDATION_ERROR", "El campo 'type' es obligatorio");
    }

    const job = await enqueueJob(
      {
        type: body.type,
        payload: body.payload ?? {},
        empresa_id: body.empresa_id ?? null,
        created_by: body.created_by ?? null,
        priority: body.priority ?? 0,
        max_attempts: body.max_attempts ?? 3,
        scheduled_for: body.scheduled_for ?? null,
      },
      { useAdmin: true },
    );

    return apiSuccess({ id: job.id, type: job.type, status: job.status });
  } catch (error) {
    console.error("[jobs/enqueue] Error:", error);
    return handleApiError(error);
  }
}
