import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="min-h-screen min-w-0 py-6 pl-20 pr-6 lg:pl-24 lg:pr-10">{children}</main>
    </div>
  );
}
