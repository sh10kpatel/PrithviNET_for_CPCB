"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface Industry {
  id: number;
  name: string;
  type: string;
  status: string;
  registration_no: string | null;
  geo_lat: number;
  geo_lng: number;
}

export default function IndustriesPage() {
  const { data: industries, isLoading } = useQuery({
    queryKey: ["industries"],
    queryFn: () => api.get<Industry[]>("/api/industries"),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Industries</h1>
          <p className="text-sm text-gray-500">
            Registered industries under environmental monitoring.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Registration</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : (
                industries?.map((ind) => (
                  <tr key={ind.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 font-medium">{ind.name}</td>
                    <td className="px-4 py-2 capitalize">{ind.type}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {ind.registration_no || "-"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          ind.status === "active"
                            ? "bg-green-100 text-green-700"
                            : ind.status === "suspended"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {ind.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
