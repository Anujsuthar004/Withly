"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Inbox,
  LayoutGrid,
  PlusCircle,
  Settings,
  ShieldAlert,
  UserRound,
} from "lucide-react";

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

export function AppShell({
  children,
  showAdmin,
  inboxCount = 0,
}: {
  children: React.ReactNode;
  showAdmin: boolean;
  inboxCount?: number;
}) {
  const pathname = usePathname() ?? "";

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

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Primary">
        <Link href="/feed" className="app-brand">
          Tag Along
        </Link>

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
            <Link href="/feed" className="app-topbar-brand">Tag Along</Link>
            <span className="kicker">{showAdmin ? "Admin enabled" : "Member account"}</span>
          </div>
          <div className="app-topbar-actions">
            <Link className="ghost-button compact" href="/account">
              <Settings size={16} />
              Settings
            </Link>
            <SignOutButton />
          </div>
        </header>

        <main className="app-content">{children}</main>
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


