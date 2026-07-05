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
  Search,
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
  liveDot?: boolean;
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
  "/profile": { kicker: "You", title: "Your profile" },
  "/account": { kicker: "Settings", title: "Account" },
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

const LIVE_PEOPLE = [
  { name: "Zoya", initials: "Z", color: "linear-gradient(135deg,#E0864B,#C65D3B)" },
  { name: "Aarav", initials: "A", color: "linear-gradient(135deg,#3FA796,#2C7A6B)" },
  { name: "Mira", initials: "M", color: "linear-gradient(135deg,#D6497E,#B32E63)" },
  { name: "Kabir", initials: "K", color: "linear-gradient(135deg,#B37FE0,#8C4FC4)" },
];

export function AppShell({
  children,
  showAdmin,
  inboxCount = 0,
  notice = "",
  profileName = "Member",
  profileAvatarUrl = "",
  trustScore = 68,
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
      { href: "/sessions", label: "Sessions", icon: <MessageCircle size={19} />, match: (p) => isActive(p, "/sessions"), liveDot: true },
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

  const verifiedLabel = verificationTier === "id_verified" ? "Verified" : verificationTier === "phone" ? "Verified" : "Verified";

  return (
    <div className="app-shell">
      {/* ============ LEFT NAV RAIL ============ */}
      <aside className="app-sidebar" aria-label="Primary">
        <div className="app-sidebar-top">
          <Link href="/feed" className="app-brand">
            <span className="app-brand-logo" aria-hidden>
              <Image src="/withly-logo.svg" alt="" width={26} height={26} />
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
                {item.liveDot && !item.badge ? (
                  <span className="app-nav-live-dot" />
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

        {/* Live now card */}
        <div className="wl-live-card">
          <div className="wl-live-card-head">
            <span className="wl-live-dot-wrap">
              <span className="wl-live-dot-pulse" />
              <span className="wl-live-dot" />
            </span>
            <span className="wl-live-label">Live now</span>
          </div>
          <div className="wl-live-avatars">
            {LIVE_PEOPLE.map((p) => (
              <div
                key={p.name}
                className="wl-live-avatar"
                title={p.name}
                style={{ background: p.color }}
              >
                {p.initials}
              </div>
            ))}
            <div className="wl-live-avatar wl-live-more">+9</div>
          </div>
        </div>

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
              <span className="app-brand-logo" aria-hidden>
                <Image src="/withly-logo.svg" alt="" width={22} height={22} />
              </span>
              Withly
            </Link>
            <span className="kicker">{screenMeta.kicker}</span>
            <strong>{screenMeta.title}</strong>
          </div>

          <label className="app-topbar-search">
            <Search size={16} />
            <input type="search" placeholder="Search people, plans, tags" />
          </label>

          <div className="app-topbar-actions">
            <Link href="/inbox" className="app-topbar-bell" title="Notifications">
              <Bell size={19} />
              {(unreadNotifs > 0 || inboxCount > 0) && (
                <span className="bell-dot" />
              )}
            </Link>
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
