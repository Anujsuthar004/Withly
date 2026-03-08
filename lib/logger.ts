import { getSupabaseAdminClientOrNull } from "@/lib/supabase/admin";

type LogLevel = "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  category: string;
  message: string;
  context?: Record<string, unknown>;
}

export async function logAppEvent(payload: LogPayload) {
  const entry = {
    ...payload,
    at: new Date().toISOString(),
  };

  const writer = payload.level === "error" ? console.error : payload.level === "warn" ? console.warn : console.log;
  writer(JSON.stringify(entry));

  const admin = getSupabaseAdminClientOrNull();
  if (!admin) {
    return;
  }

  await admin.from("app_event_logs").insert({
    level: payload.level,
    category: payload.category,
    message: payload.message,
    context: payload.context ?? {},
  });
}
