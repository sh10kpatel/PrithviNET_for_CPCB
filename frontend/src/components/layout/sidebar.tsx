"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map,
  Bell,
  BarChart3,
  Bot,
  FileText,
  LogIn,
  Menu,
  X,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Map", icon: Map },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/rankings", label: "Rankings", icon: BarChart3 },
  { href: "/copilot", label: "AI Copilot", icon: Bot },
  { href: "/reports", label: "Reports", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r bg-card transition-transform duration-200 lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link href="/" className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-green-600" />
            <span className="text-lg font-bold">PrithviNET</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-3">
          <Link
            href="/login"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogIn className="h-4 w-4" />
            Login
          </Link>
        </div>
      </aside>
    </>
  );
}

export function TopBar() {
  const { setSidebarOpen } = useAppStore();

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-green-600" />
        <span className="font-bold">PrithviNET</span>
      </div>
    </header>
  );
}
