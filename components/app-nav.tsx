"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  dailyActivityEnabled: boolean;
};

type NavHref = "/" | "/update" | "/activity" | "/activity/update";

type NavItem = {
  href: NavHref;
  label: string;
  match: string;
  exact?: boolean;
};

export function AppNav({ dailyActivityEnabled }: Props) {
  const pathname = usePathname();
  const items: NavItem[] = [
    { href: "/", label: "Performance Dashboard", match: "/", exact: true },
    { href: "/update", label: "Update Performance", match: "/update", exact: true }
  ];

  if (dailyActivityEnabled) {
    items.push({ href: "/activity", label: "Activity Dashboard", match: "/activity", exact: true });
    items.push({ href: "/activity/update", label: "Update Activity", match: "/activity/update", exact: true });
  }

  return (
    <nav className="nav">
      {items.map((item) => {
        const isActive = item.exact ? pathname === item.match : pathname.startsWith(item.match);
        return (
          <Link key={item.href} href={item.href} className={isActive ? "active" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
