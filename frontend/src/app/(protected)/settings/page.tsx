"use client";

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">
          System administration — users, regions, limits, and configuration.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-2 text-lg font-semibold">User Management</h2>
          <p className="text-sm text-gray-500">
            Manage users, roles, and regional assignments.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-2 text-lg font-semibold">Regional Offices</h2>
          <p className="text-sm text-gray-500">
            Configure state pollution control board offices.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-2 text-lg font-semibold">Prescribed Limits</h2>
          <p className="text-sm text-gray-500">
            NAAQS and CPCB standard limits for all parameters.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-2 text-lg font-semibold">CPCB Sync</h2>
          <p className="text-sm text-gray-500">
            Force sync all 588 CPCB stations from the live API.
          </p>
        </div>
      </div>
    </div>
  );
}
