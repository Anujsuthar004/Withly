"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Compass,
  Inbox,
  LayoutGrid,
  MessageCircle,
  Plus,
  Settings,
  UserRound,
} from "lucide-react";

import { ProfileAvatar } from "@/components/app/profile-avatar";
import { SignOutButton } from "@/components/sign-out-button";
import feedStyles from "@/app/feed-design.module.css";

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

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount ?? 0);
        }
      } catch {}
    }
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return unreadCount;
}

const SCREEN_META: Record<string, { kicker: string; title: string }> = {
  "/feed": { kicker: "Discovery", title: "Feed" },
  "/requests/new": { kicker: "Compose", title: "New request" },
  "/inbox": { kicker: "Activity", title: "Inbox" },
  "/sessions": { kicker: "Your plans", title: "Sessions" },
  "/requests": { kicker: "Your plans", title: "My requests" },
  "/profile": { kicker: "You", title: "Your profile" },
  "/account": { kicker: "Settings", title: "Account" },
  "/alerts": { kicker: "Activity", title: "Notifications" },
  "/admin": { kicker: "Admin", title: "Administration" },
};

function getScreenMeta(pathname: string) {
  if (pathname.startsWith("/sessions/") || pathname.startsWith("/requests/")) {
    if (pathname.startsWith("/sessions/")) return { kicker: "Active session", title: "Session" };
    if (pathname === "/requests/new") return SCREEN_META["/requests/new"];
    return { kicker: "Request", title: "Request details" };
  }
  return SCREEN_META[pathname] ?? { kicker: "Withly", title: "Withly" };
}

export function AppShell({
  children,
  showAdmin,
  inboxCount = 0,
  notice = "",
  profileName = "Member",
  profileAvatarUrl = "",
  trustScore = 50,
  verificationTier = "email",
}: {
  children: React.ReactNode;
  showAdmin: boolean;
  inboxCount?: number;
  notice?: string;
  profileName?: string;
  profileAvatarUrl?: string;
  trustScore?: number;
  verificationTier?: string;
}) {
  const pathname = usePathname() ?? "";
  const unreadNotifs = useNotifications();
  const screenMeta = getScreenMeta(pathname);

  const navItems = useMemo<NavItem[]>(
    () => [
      { href: "/feed", label: "Feed", icon: <Compass size={19} />, match: (p) => isActive(p, "/feed") },
      { href: "/inbox", label: "Inbox", icon: <Inbox size={19} />, match: (p) => isActive(p, "/inbox"), badge: inboxCount },
      { href: "/sessions", label: "Sessions", icon: <MessageCircle size={19} />, match: (p) => isActive(p, "/sessions") },
      { href: "/profile", label: "Profile", icon: <UserRound size={19} />, match: (p) => isActive(p, "/profile") },
      { href: "/requests/new", label: "Compose", icon: <LayoutGrid size={19} />, match: (p) => isActive(p, "/requests/new") },
    ],
    [inboxCount]
  );

  const bottomItems = useMemo<NavItem[]>(
    () => [
      { href: "/feed", label: "Feed", icon: <Compass size={18} />, match: (p) => isActive(p, "/feed") },
      { href: "/requests/new", label: "Post", icon: <Plus size={18} />, match: (p) => isActive(p, "/requests/new") },
      { href: "/inbox", label: "Inbox", icon: <Inbox size={18} />, match: (p) => isActive(p, "/inbox"), badge: inboxCount },
      { href: "/profile", label: "Profile", icon: <UserRound size={18} />, match: (p) => isActive(p, "/profile") },
    ],
    [inboxCount]
  );

  const verifiedLabel = verificationTier === "id_verified"
    ? "ID verified"
    : verificationTier === "phone"
      ? "Phone verified"
      : "Email confirmed";

  return (
    <div className={`app-shell ${["/feed", "/requests", "/inbox", "/sessions", "/profile", "/account", "/alerts"].includes(pathname) || pathname.startsWith("/sessions/") || pathname.startsWith("/requests/") ? feedStyles.shell : ""}`}>
      {/* ============ LEFT NAV RAIL ============ */}
      <aside className="app-sidebar" aria-label="Primary">
        <div className="app-sidebar-top">
          <Link href="/feed" className="app-brand">
            <span className="app-brand-logo">
              <Image src="/withly-logo.svg" alt="Withly Logo" width={26} height={26} />
            </span>
            <span className="app-brand-copy">
              <strong>Withly</strong>
              <small>Go together</small>
            </span>
          </Link>

          <Link className="wl-nav-cta" href="/requests/new">
            <Plus size={17} strokeWidth={2.4} />
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
              <LayoutGrid size={19} />
              <span>Admin</span>
            </Link>
          ) : null}
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Bottom user chip */}
        <div className="app-nav-footer">
          <Link href="/profile" className="wl-user-chip">
            <ProfileAvatar name={profileName} url={profileAvatarUrl} size="sm" />
            <div className="wl-user-chip-copy">
              <strong>{profileName}</strong>
              <small>Trust {trustScore} · {verifiedLabel}</small>
            </div>
          </Link>
          <SignOutButton />
        </div>
      </aside>

      {/* ============ MAIN COLUMN ============ */}
      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-title">
            <Link href="/feed" className="app-topbar-brand">
              <span className="app-brand-logo">
                <Image src="/withly-logo.svg" alt="Withly Logo" width={22} height={22} />
              </span>
              Withly
            </Link>
            <span className="kicker">{screenMeta.kicker}</span>
            <strong>{screenMeta.title}</strong>
          </div>

          <div className="app-topbar-actions">
            <Link href="/account" className="app-topbar-bell" title="Account settings" aria-label="Account settings">
              <Settings size={19} />
            </Link>
            <span className="app-mobile-signout"><SignOutButton /></span>
            <Link href="/alerts" className="app-topbar-bell" title="Notifications">
              <Bell size={19} />
              {(unreadNotifs > 0 || inboxCount > 0) && (
                <span className="bell-dot" />
              )}
            </Link>
          </div>
        </header>

        <main className="app-content" id="main-content" tabIndex={-1}>
          {notice ? (
            <div className="summary-callout" role="status" aria-live="polite">
              <strong>System Notice: </strong>
              <span>{notice}</span>
            </div>
          ) : null}
          {children}
        </main>
      </div>

      {/* ============ MOBILE BOTTOM NAV ============ */}
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
