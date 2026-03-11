import { api } from "@/lib/api";
import type { DashboardSummary, MonitoringLocation } from "@/types";

// Public citizen portal — Server-side rendered
async function getPublicData() {
  const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${BASE}/api/dashboard/public`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function PublicPortalPage() {
  const data = await getPublicData();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-sm font-bold text-white">
              PN
            </div>
            <span className="text-lg font-semibold">PrithviNET</span>
          </div>
          <a
            href="/login"
            className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700"
          >
            Sign In
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Air Quality — Citizen Portal
          </h1>
          <p className="mt-2 text-gray-600">
            Real-time air quality data from CPCB monitoring stations across
            India. Updated every 15 minutes.
          </p>
        </div>

        {data?.stations ? (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-sm text-gray-500">Stations</div>
                <div className="text-2xl font-bold">{data.stations.length}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-sm text-gray-500">Parameters</div>
                <div className="text-2xl font-bold">8</div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold">
                Live Air Stations
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="pb-2 font-medium">Station</th>
                      <th className="pb-2 font-medium">City</th>
                      <th className="pb-2 font-medium">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stations.slice(0, 20).map((s: MonitoringLocation) => (
                      <tr key={s.id} className="border-b border-gray-100">
                        <td className="py-2">{s.name}</td>
                        <td className="py-2 text-gray-600">{s.city}</td>
                        <td className="py-2 text-gray-600">{s.state}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
            Unable to fetch data. Please ensure the API server is running.
          </div>
        )}
      </main>
    </div>
  );
}
