"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AlertEvent } from "@/types";
import { useSocketEvent } from "@/hooks/useSocket";
import { useCallback, useState } from "react";

export default function AlertsPage() {
  const [newAlerts, setNewAlerts] = useState(0);

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ["alert-events"],
    queryFn: () => api.get<AlertEvent[]>("/api/alert-events?limit=50"),
    refetchInterval: 15_000,
  });

  useSocketEvent(
    "alert:triggered",
    useCallback(() => {
      setNewAlerts((c) => c + 1);
      refetch();
    }, [refetch]),
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
        <p className="text-sm text-gray-500">
          Real-time alerts when environmental parameters breach thresholds.
        </p>
      </div>

      {newAlerts > 0 && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {newAlerts} new alert{newAlerts !== 1 ? "s" : ""} triggered!
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500">
                <th className="px-4 py-3 font-medium">Triggered</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Parameter</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Loading alerts...
                  </td>
                </tr>
              ) : events && events.length > 0 ? (
                events.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(e.triggered_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          e.severity === "critical"
                            ? "bg-red-100 text-red-700"
                            : e.severity === "warning"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {e.severity || "info"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {e.parameter_name || `Rule #${e.alert_rule_id}`}
                    </td>
                    <td className="px-4 py-2">
                      {e.location_name || "-"}
                    </td>
                    <td className="px-4 py-2">
                      {e.acknowledged ? (
                        <span className="text-green-600">Acknowledged</span>
                      ) : (
                        <span className="text-red-600">Pending</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No alerts triggered yet.
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
