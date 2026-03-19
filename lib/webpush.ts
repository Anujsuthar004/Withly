import webpush from "web-push";

import { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, hasVapidEnv } from "@/lib/env";

if (hasVapidEnv) {
  webpush.setVapidDetails(
    "mailto:support@withly.app",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function sendPushNotification(
  subscription: PushSubscriptionJSON,
  payload: { title: string; body: string; url: string; tag?: string }
): Promise<{ ok: boolean; gone?: boolean }> {
  if (!hasVapidEnv) return { ok: false };

  try {
    await webpush.sendNotification(subscription as webpush.PushSubscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err) {
    const error = err as { statusCode?: number };
    if (error.statusCode === 410 || error.statusCode === 404) {
      return { ok: false, gone: true };
    }
    return { ok: false };
  }
}
