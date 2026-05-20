import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/current-user";
import { createClient } from "@/lib/supabase";
import { downloadAttachment } from "@/modules/email/services/email-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { attachmentId } = await params;
  const supabase = await createClient();

  try {
    const attachment = await downloadAttachment(supabase, currentUser, Number(attachmentId));
    return new NextResponse(attachment.buffer, {
      headers: {
        "Content-Type": attachment.mimeType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${attachment.filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "attachment_download_failed";
    const status = message === "reauth_required" ? 401 : message === "attachment_not_found" ? 404 : 400;
    return NextResponse.json({ error: message, message }, { status });
  }
}
