"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BellOff, Compass, Inbox, PlusCircle, Settings, ShieldCheck, UserRound } from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";

type AppShellProps = {
  children: React.ReactNode;
  showAdmin: boolean;
  inboxCount?: number;
  notice?: string;
  profileName?: string;
  profileAvatarUrl?: string;
};

function getActiveNav(pathname: string) {
  if (pathname.startsWith("/profile")) return "profile";
  if (pathname.startsWith("/account") || pathname.startsWith("/admin")) return "settings";
  if (pathname.startsWith("/requests") || pathname.startsWith("/inbox") || pathname.startsWith("/sessions")) return "requests";
  return "home";
}

function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount ?? 0);
          router.refresh();
        }
      } catch {}
    }

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [router]);

  return unreadCount;
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) arr[index] = rawData.charCodeAt(index);
  return arr.buffer as ArrayBuffer;
}

function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  });

  async function subscribeAndSave(registration: ServiceWorkerRegistration) {
    try {
      const existing = await registration.pushManager.getSubscription();
      const sub =
        existing ??
        await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
    } catch {}
  }

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !VAPID_PUBLIC_KEY) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(async (registration) => {
        if (Notification.permission === "granted") {
          await subscribeAndSave(registration);
        }
      })
      .catch(() => {});
  }, []);

  const enable = useCallback(async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !VAPID_PUBLIC_KEY) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      const registration = await navigator.serviceWorker.ready;
      await subscribeAndSave(registration);
    }
  }, []);

  const disable = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await fetch("/api/push/subscribe", { method: "DELETE" });
      setPermission(Notification.permission);
    } catch {}
  }, []);

  return { permission, enable, disable };
}

export function AppShell(props: AppShellProps) {
  const { children, showAdmin, inboxCount = 0, notice = "" } = props;
  const pathname = usePathname() ?? "";
  const unreadCount = useNotifications();
  const { permission, enable, disable } = usePushNotifications();
  const activeNav = getActiveNav(pathname);

  const navItems = [
    { href: "/feed", label: "Home", key: "home" },
    { href: "/requests/new", label: "Requests", key: "requests" },
    { href: "/profile", label: "Profile", key: "profile" },
    { href: "/account", label: "Settings", key: "settings" },
  ] as const;

  return (
    <div className="withly-app-shell">
      <header className="withly-app-header">
        <div className="withly-topbar">
          <div className="withly-topbar-left">
            <Image src="/withly-app-icon.svg" alt="Withly Logo" width={28} height={28} className="withly-wordmark-logo" />
            <Link href="/feed" className="withly-wordmark">
              Withly
            </Link>
            <nav className="withly-primary-nav" aria-label="Primary">
              {navItems.map((item) => {
                const active = item.key === activeNav;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`withly-primary-link ${active ? "active" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="withly-topbar-right">
            {unreadCount > 0 ? (
              <Link className="withly-meta-pill" href="/inbox">
                <Bell size={16} />
                {unreadCount} fresh alerts
              </Link>
            ) : null}
            {showAdmin ? (
              <Link className="withly-meta-pill subtle" href="/admin">
                <ShieldCheck size={16} />
                Admin access
              </Link>
            ) : null}
            {permission === "default" && VAPID_PUBLIC_KEY ? (
              <button type="button" className="withly-meta-pill subtle" onClick={() => void enable()}>
                <Bell size={16} />
                Enable alerts
              </button>
            ) : null}
            {permission === "granted" ? (
              <button type="button" className="withly-meta-pill subtle" onClick={() => void disable()} aria-label="Disable alerts">
                <BellOff size={16} />
                Alerts on
              </button>
            ) : null}
            <Link href="/requests/new" className="withly-create-button">
              Create Request
            </Link>
            <SignOutButton className="withly-signout-button" />
          </div>
        </div>
      </header>

      <main className="withly-page-shell">
        {notice ? (
          <div className="withly-status-banner" role="status" aria-live="polite">
            {notice}
          </div>
        ) : null}
        {children}
      </main>

      <nav className="withly-mobile-nav" aria-label="Primary mobile">
        <Link href="/feed" className={`withly-mobile-link ${activeNav === "home" ? "active" : ""}`}>
          <Compass size={18} />
          <span>Home</span>
        </Link>
        <Link href="/requests/new" className={`withly-mobile-link ${activeNav === "requests" ? "active" : ""}`}>
          <PlusCircle size={18} />
          <span>Requests</span>
        </Link>
        <Link href="/inbox" className={`withly-mobile-link ${pathname.startsWith("/inbox") || pathname.startsWith("/sessions") ? "active" : ""}`}>
          <Inbox size={18} />
          <span>Inbox</span>
          {inboxCount > 0 ? <strong>{inboxCount}</strong> : null}
        </Link>
        <Link href="/profile" className={`withly-mobile-link ${activeNav === "profile" ? "active" : ""}`}>
          <UserRound size={18} />
          <span>Profile</span>
        </Link>
        <Link href="/account" className={`withly-mobile-link ${activeNav === "settings" ? "active" : ""}`}>
          <Settings size={18} />
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  );
}
