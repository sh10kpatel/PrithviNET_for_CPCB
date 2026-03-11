"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Reading } from "@/types";

export default function MonitoringPage() {
  const { data: readings, isLoading } = useQuery({
    queryKey: ["readings"],
    queryFn: () => api.get<Reading[]>("/api/readings?limit=50"),
    refetchInterval: 10_000,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Monitoring & Readings
        </h1>
        <p className="text-sm text-gray-500">
          Real-time environmental readings from all stations.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500">
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Parameter</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    Loading readings...
                  </td>
                </tr>
              ) : readings && readings.length > 0 ? (
                readings.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(r.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {r.parameter_name || `Param #${r.parameter_id}`}
                    </td>
                    <td className="px-4 py-2 font-medium">
                      {r.value} {r.unit_symbol || ""}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.source === "iot"
                            ? "bg-blue-100 text-blue-700"
                            : r.source === "api"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {r.source}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    No readings yet. Start the IoT simulator or submit data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
