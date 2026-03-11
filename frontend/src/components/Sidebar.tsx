"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", roles: ["super_admin", "regional_officer", "monitoring_team", "industry_user"] },
  { href: "/monitoring", label: "Monitoring", roles: ["super_admin", "regional_officer", "monitoring_team", "industry_user"] },
  { href: "/alerts", label: "Alerts", roles: ["super_admin", "regional_officer", "monitoring_team", "industry_user"] },
  { href: "/industries", label: "Industries", roles: ["super_admin", "regional_officer"] },
  { href: "/compliance", label: "Compliance", roles: ["super_admin", "regional_officer", "industry_user"] },
  { href: "/copilot", label: "AI Copilot", roles: ["super_admin", "regional_officer"] },
  { href: "/settings", label: "Settings", roles: ["super_admin"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role),
  );

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold text-sm">
          PN
        </div>
        <span className="text-lg font-semibold text-gray-900">PrithviNET</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-green-50 text-green-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info */}
      <div className="border-t border-gray-200 p-4">
        <div className="mb-2 text-sm font-medium text-gray-900">
          {user?.name}
        </div>
        <div className="mb-3 text-xs text-gray-500">
          {user?.role.replace("_", " ")}
        </div>
        <button
          onClick={logout}
          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
