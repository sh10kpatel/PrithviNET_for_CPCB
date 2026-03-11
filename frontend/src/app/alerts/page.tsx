"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { fetchAlerts, fetchAlertStats, updateAlert } from "@/lib/api";
import type { Alert, AlertsResponse, AlertStats } from "@/types";
import { PARAMETER_LABELS } from "@/types";
import { format } from "date-fns";

const SEVERITY_COLORS: Record<string, string> = {
  Warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Critical: "bg-orange-100 text-orange-800 border-orange-300",
  Hazardous: "bg-red-100 text-red-800 border-red-300",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  Active: <XCircle className="h-4 w-4 text-red-500" />,
  Acknowledged: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  Resolved: <CheckCircle className="h-4 w-4 text-green-500" />,
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 200 };
      if (category) params.category = category;
      if (severity) params.severity = severity;
      if (status) params.status = status;

      const [alertsData, statsData] = await Promise.all([
        fetchAlerts(params),
        fetchAlertStats(),
      ]);
      setAlerts(alertsData);
      setStats(statsData);
    } catch {
      console.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [category, severity, status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateStatus = async (alertId: number, newStatus: string) => {
    try {
      await updateAlert(alertId, newStatus);
      loadData();
    } catch {
      console.error("Failed to update alert");
    }
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alerts Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage environmental alerts across all stations
          </p>
        </div>
        <Bell className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Alerts</p>
            <p className="text-3xl font-bold">{stats?.total ?? "..."}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-3xl font-bold text-red-600">
              {stats?.by_status?.Active ?? "..."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Acknowledged</p>
            <p className="text-3xl font-bold text-yellow-600">
              {stats?.by_status?.Acknowledged ?? "..."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Resolved</p>
            <p className="text-3xl font-bold text-green-600">
              {stats?.by_status?.Resolved ?? "..."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category / Severity breakdown */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">By Category</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3">
              {Object.entries(stats.by_category).map(([cat, count]) => (
                <Badge key={cat} variant="outline" className="text-sm">
                  {cat}: {count}
                </Badge>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">By Severity</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3">
              {Object.entries(stats.by_severity).map(([sev, count]) => (
                <Badge
                  key={sev}
                  className={SEVERITY_COLORS[sev] || ""}
                >
                  {sev}: {count}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={category || "all"} onValueChange={(v) => setCategory(!v || v === "all" ? "" : v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="AIR">Air</SelectItem>
            <SelectItem value="WATER">Water</SelectItem>
            <SelectItem value="NOISE">Noise</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severity || "all"} onValueChange={(v) => setSeverity(!v || v === "all" ? "" : v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="Warning">Warning</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
            <SelectItem value="Hazardous">Hazardous</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status || "all"} onValueChange={(v) => setStatus(!v || v === "all" ? "" : v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Acknowledged">Acknowledged</SelectItem>
            <SelectItem value="Resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Value / Threshold</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts?.alerts.map((alert) => (
                  <TableRow key={alert.alert_id}>
                    <TableCell>{STATUS_ICONS[alert.status]}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {alert.station_id}
                    </TableCell>
                    <TableCell>
                      {PARAMETER_LABELS[alert.parameter] || alert.parameter}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {alert.value.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        / {alert.threshold.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={SEVERITY_COLORS[alert.severity] || ""}
                      >
                        {alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{alert.category}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(alert.timestamp), "MMM dd, HH:mm")}
                    </TableCell>
                    <TableCell>
                      {alert.status === "Active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleUpdateStatus(alert.alert_id, "Acknowledged")
                          }
                        >
                          Ack
                        </Button>
                      )}
                      {alert.status === "Acknowledged" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleUpdateStatus(alert.alert_id, "Resolved")
                          }
                        >
                          Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {alerts?.alerts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No alerts found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {alerts && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {alerts.alerts.length} of {alerts.total} alerts
        </p>
      )}
    </div>
  );
}
