"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useSocketEvent } from "@/hooks/useSocket";
import { useState, useCallback } from "react";
import { HeatMap } from "@/components/maps/HeatMap";
import type { DashboardSummary } from "@/types";

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [liveCount, setLiveCount] = useState(0);

  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.get<DashboardSummary>("/api/dashboard/summary"),
    refetchInterval: 30_000,
  });

  useSocketEvent<unknown>(
    "reading:new",
    useCallback(() => {
      setLiveCount((c) => c + 1);
    }, []),
  );

  // Build heatmap points from latest AQI data
  const heatPoints =
    summary?.latestAqi?.map((s) => ({
      lat: 0,
      lng: 0,
      intensity: Math.min(s.value / 500, 1),
    })) || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Welcome, {user?.name}. Real-time environmental monitoring overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Stations"
          value={summary?.totalStations ?? "..."}
          color="text-gray-900"
        />
        <StatCard
          label="Live Stations"
          value={summary?.liveStations ?? "..."}
          color="text-green-600"
        />
        <StatCard
          label="Active Alerts"
          value={summary?.activeAlerts ?? "..."}
          color="text-red-600"
        />
        <StatCard
          label="Readings Today"
          value={summary?.todayReadings ?? "..."}
          color="text-blue-600"
        />
      </div>

      {/* Live counter */}
      {liveCount > 0 && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {liveCount} new reading{liveCount !== 1 ? "s" : ""} received via
          live stream
        </div>
      )}

      {/* Heatmap */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">
          Pollution Heatmap — India
        </h2>
        <HeatMap points={heatPoints} />
      </div>

      {/* Latest AQI table */}
      {summary?.latestAqi && summary.latestAqi.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">Latest PM2.5 Readings</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="pb-2 font-medium">Station</th>
                  <th className="pb-2 font-medium">PM2.5 (ug/m3)</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.latestAqi.map((row) => (
                  <tr key={row.location_id} className="border-b border-gray-100">
                    <td className="py-2">{row.location_name}</td>
                    <td className="py-2 font-medium">{row.value}</td>
                    <td className="py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.value <= 60
                            ? "bg-green-100 text-green-700"
                            : row.value <= 120
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {row.value <= 60
                          ? "Good"
                          : row.value <= 120
                            ? "Moderate"
                            : "Poor"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
