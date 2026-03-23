"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  Compass,
  Inbox,
  LayoutGrid,
  PlusCircle,
  Settings,
  ShieldAlert,
  UserRound,
} from "lucide-react";

import { ProfileAvatar } from "@/components/app/profile-avatar";
import { SignOutButton } from "@/components/sign-out-button";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (pathname: string) => boolean;
  badge?: number;
};

function isActive(pathname: string, href: string) {
  if (href === "/feed") return pathname === "/feed";
  return pathname === href || pathname.startsWith(`${href}/`);
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
          // Refresh server components so inboxCount (join requests + active session)
          // stays current without a full page reload.
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
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
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
      const sub = existing ?? await registration.pushManager.subscribe({
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
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (!VAPID_PUBLIC_KEY) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(async (registration) => {
      if (Notification.permission === "granted") {
        await subscribeAndSave(registration);
      }
    }).catch(() => {});
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
    } catch {}
  }, []);

  return { permission, enable, disable };
}

export function AppShell({
  children,
  showAdmin,
  inboxCount = 0,
  notice = "",
  profileName = "Member",
  profileAvatarUrl = "",
}: {
  children: React.ReactNode;
  showAdmin: boolean;
  inboxCount?: number;
  notice?: string;
  profileName?: string;
  profileAvatarUrl?: string;
}) {
  const pathname = usePathname() ?? "";
  const unreadNotifs = useNotifications();
  const { permission, enable, disable } = usePushNotifications();

  const navItems = useMemo<NavItem[]>(
    () => [
      { href: "/feed", label: "Feed", icon: <Compass size={18} />, match: (p) => isActive(p, "/feed") },
      { href: "/requests/new", label: "Post", icon: <PlusCircle size={18} />, match: (p) => isActive(p, "/requests/new") },
      { href: "/requests", label: "My requests", icon: <LayoutGrid size={18} />, match: (p) => isActive(p, "/requests") },
      { href: "/inbox", label: "Inbox", icon: <Inbox size={18} />, match: (p) => isActive(p, "/inbox"), badge: inboxCount },
      { href: "/profile", label: "Profile", icon: <UserRound size={18} />, match: (p) => isActive(p, "/profile") },
      { href: "/account", label: "Account", icon: <Settings size={18} />, match: (p) => isActive(p, "/account") },
    ],
    [inboxCount]
  );

  const bottomItems = useMemo<NavItem[]>(
    () => [
      { href: "/feed", label: "Feed", icon: <Compass size={18} />, match: (p) => isActive(p, "/feed") },
      { href: "/requests/new", label: "Post", icon: <PlusCircle size={18} />, match: (p) => isActive(p, "/requests/new") },
      { href: "/inbox", label: "Inbox", icon: <Inbox size={18} />, match: (p) => isActive(p, "/inbox"), badge: inboxCount },
      { href: "/profile", label: "Profile", icon: <UserRound size={18} />, match: (p) => isActive(p, "/profile") },
    ],
    [inboxCount]
  );

  const activeItem = [...navItems, ...(showAdmin ? [{ href: "/admin", label: "Admin", icon: null, match: (p: string) => isActive(p, "/admin") }] : [])].find(
    (item) => item.match(pathname)
  );

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Primary">
        <div className="app-sidebar-top">
          <Link href="/feed" className="app-brand">
            <Image src="/withly-app-icon.svg" alt="Withly Logo" width={20} height={20} />
            <span className="app-brand-copy">
              <strong>Withly</strong>
              <small>Private companionship workspace</small>
            </span>
          </Link>

          <Link className="secondary-button compact app-sidebar-cta" href="/requests/new">
            <PlusCircle size={16} />
            New request
          </Link>
        </div>

        <nav className="app-nav">
          {navItems.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-nav-link ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="nav-badge" aria-label={`${item.badge} pending`}>
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}

          {showAdmin ? (
            <Link
              href="/admin"
              className={`app-nav-link ${isActive(pathname, "/admin") ? "active" : ""}`}
              aria-current={isActive(pathname, "/admin") ? "page" : undefined}
            >
              <ShieldAlert size={18} />
              <span>Admin</span>
            </Link>
          ) : null}
        </nav>

        <div className="app-nav-footer">
          <SignOutButton />
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-title">
            <Link href="/feed" className="app-topbar-brand">
              <Image src="/withly-app-icon.svg" alt="Withly Logo" width={20} height={20} />
              Withly
            </Link>
            <span className="kicker">{activeItem?.label ?? (showAdmin ? "Admin enabled" : "Member account")}</span>
            <strong>{showAdmin ? "Admin enabled" : "Member account"}</strong>
          </div>
          <div className="app-topbar-actions">
            <div className="app-user-chip">
              <ProfileAvatar name={profileName} url={profileAvatarUrl} size="sm" />
              <div className="app-user-chip-copy">
                <strong>{profileName}</strong>
                <small>{showAdmin ? "Admin account" : "Member account"}</small>
              </div>
            </div>
            {inboxCount > 0 ? (
              <Link className="ghost-button compact" href="/inbox">
                {inboxCount} waiting
              </Link>
            ) : null}
            {unreadNotifs > 0 ? (
              <Link className="ghost-button compact" href="/inbox" title={`${unreadNotifs} unread notifications`}>
                <Bell size={16} />
                {unreadNotifs}
              </Link>
            ) : null}
            {permission === "default" && VAPID_PUBLIC_KEY ? (
              <button type="button" className="ghost-button compact" onClick={() => void enable()} title="Enable push notifications">
                <Bell size={16} />
                Enable alerts
              </button>
            ) : null}
            {permission === "granted" ? (
              <button type="button" className="ghost-button compact" onClick={() => void disable()} title="Disable push notifications">
                <BellOff size={16} />
              </button>
            ) : null}
            <Link className="ghost-button compact" href="/account">
              <Settings size={16} />
              Settings
            </Link>
            <SignOutButton />
          </div>
        </header>

        <main className="app-content">
          {notice ? (
            <div className="summary-callout" role="status" aria-live="polite">
              <strong>System Notice: </strong>
              <span>{notice}</span>
            </div>
          ) : null}
          {children}
        </main>
      </div>

      <nav className="app-bottom-nav" aria-label="Primary (mobile)">
        {bottomItems.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`app-bottom-link ${active ? "active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="app-bottom-icon-wrap">
                {item.icon}
                {item.badge && item.badge > 0 ? (
                  <span className="nav-badge-small" aria-label={`${item.badge} pending`}>
                    {item.badge}
                  </span>
                ) : null}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
