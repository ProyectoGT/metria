import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { logs, events } = body as {
      logs?: Array<{ level: string; context: string; message: string; timestamp: string; error?: unknown; data?: unknown }>;
      events?: Array<{ name: string; timestamp: string; properties?: unknown }>;
    };

    if (logs) {
      for (const log of logs) {
        const label = `[${log.level.toUpperCase()}] [${log.context}] ${log.message}`;
        switch (log.level) {
          case "error":
            console.error(label, log.error ?? "", log.data ?? "");
            break;
          case "warn":
            console.warn(label, log.data ?? "");
            break;
          default:
            console.log(label, log.data ?? "");
        }
      }
    }

    if (events) {
      for (const event of events) {
        console.log(`[EVENT] ${event.name}`, event.properties ?? "");
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[observability] Error processing log batch:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
