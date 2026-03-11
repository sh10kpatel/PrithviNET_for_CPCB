"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ComplianceReport {
  id: number;
  industry_id: number;
  period_type: string;
  period_start: string;
  period_end: string;
  status: string;
  generated_at: string;
  industry_name?: string;
}

export default function CompliancePage() {
  const { data: reports, isLoading } = useQuery({
    queryKey: ["compliance"],
    queryFn: () => api.get<ComplianceReport[]>("/api/compliance"),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Compliance Reports
        </h1>
        <p className="text-sm text-gray-500">
          Automated compliance tracking against CPCB/NAAQS standards.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500">
                <th className="px-4 py-3 font-medium">Industry</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Generated</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : reports && reports.length > 0 ? (
                reports.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="px-4 py-2">
                      {r.industry_name || `Industry #${r.industry_id}`}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {r.period_start} to {r.period_end}
                    </td>
                    <td className="px-4 py-2 capitalize">{r.period_type}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.status === "compliant"
                            ? "bg-green-100 text-green-700"
                            : r.status === "non_compliant"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {r.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(r.generated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No compliance reports generated yet.
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
