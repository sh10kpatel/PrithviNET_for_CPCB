"use client";

import { useAuth } from "@/hooks/useAuth";
import { redirect } from "next/navigation";

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    redirect("/login");
  }

  if (user.role === "citizen") {
    redirect("/public");
  }

  return <>{children}</>;
}
