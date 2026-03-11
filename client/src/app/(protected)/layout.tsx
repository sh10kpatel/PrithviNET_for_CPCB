import { Sidebar } from "@/components/Sidebar";
import { RoleGuard } from "@/components/RoleGuard";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </RoleGuard>
  );
}
