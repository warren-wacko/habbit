"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProgressNavIcon, TodayNavIcon, YouNavIcon } from "./icons";

const ITEMS = [
  { href: "/", label: "Today", Icon: TodayNavIcon },
  { href: "/progress", label: "Progress", Icon: ProgressNavIcon },
  { href: "/settings", label: "You", Icon: YouNavIcon },
] as const;

// A habit's detail page belongs to Today
function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/habits");
  return pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {ITEMS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href, pathname) ? "page" : undefined}
        >
          <span>
            <Icon />
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}
