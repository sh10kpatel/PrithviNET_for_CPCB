"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fetchRankings } from "@/lib/api";
import type { RankingEntry } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getAqiColor } from "@/types";

const TREND_ICONS: Record<string, React.ReactNode> = {
  improving: <TrendingDown className="h-4 w-4 text-green-500" />,
  worsening: <TrendingUp className="h-4 w-4 text-red-500" />,
  stable: <Minus className="h-4 w-4 text-gray-400" />,
};

export default function RankingsPage() {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<"city" | "state">("city");
  const [parameter, setParameter] = useState<"aqi" | "noise" | "water">("aqi");
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRankings({ group_by: groupBy, parameter, order, limit: 50 });
      setRankings(data);
    } catch {
      console.error("Failed to load rankings");
    } finally {
      setLoading(false);
    }
  }, [groupBy, parameter, order]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const chartData = rankings.slice(0, 20).map((r) => ({
    name: r.name.length > 15 ? r.name.substring(0, 15) + "..." : r.name,
    value:
      parameter === "aqi"
        ? r.avg_aqi
        : parameter === "noise"
        ? r.avg_noise
        : r.avg_water_ph,
  }));

  const valueLabel =
    parameter === "aqi"
      ? "Avg AQI"
      : parameter === "noise"
      ? "Avg Noise (dB)"
      : "Avg pH";

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rankings</h1>
          <p className="text-muted-foreground">
            City and state rankings by environmental parameters
          </p>
        </div>
        <BarChart3 className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={groupBy} onValueChange={(v) => v && setGroupBy(v as "city" | "state")}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="city">By City</SelectItem>
            <SelectItem value="state">By State</SelectItem>
          </SelectContent>
        </Select>

        <Select value={parameter} onValueChange={(v) => v && setParameter(v as "aqi" | "noise" | "water")}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aqi">Air Quality</SelectItem>
            <SelectItem value="noise">Noise</SelectItem>
            <SelectItem value="water">Water Quality</SelectItem>
          </SelectContent>
        </Select>

        <Select value={order} onValueChange={(v) => v && setOrder(v as "asc" | "desc")}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Best First</SelectItem>
            <SelectItem value="desc">Worst First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Top 20 {groupBy === "city" ? "Cities" : "States"} - {valueLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-80 w-full" />
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" name={valueLabel} radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          parameter === "aqi" && entry.value !== null
                            ? getAqiColor(entry.value as number)
                            : "#6366f1"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>{groupBy === "city" ? "City" : "State"}</TableHead>
                  <TableHead>Avg AQI</TableHead>
                  <TableHead>Avg Noise</TableHead>
                  <TableHead>Avg pH</TableHead>
                  <TableHead>Stations</TableHead>
                  <TableHead>Violations</TableHead>
                  <TableHead>Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankings.map((r) => (
                  <TableRow key={r.rank}>
                    <TableCell className="font-bold">{r.rank}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      {r.avg_aqi !== null ? (
                        <span style={{ color: getAqiColor(r.avg_aqi) }}>
                          {r.avg_aqi.toFixed(1)}
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell>
                      {r.avg_noise !== null ? r.avg_noise.toFixed(1) + " dB" : "N/A"}
                    </TableCell>
                    <TableCell>
                      {r.avg_water_ph !== null ? r.avg_water_ph.toFixed(1) : "N/A"}
                    </TableCell>
                    <TableCell>{r.station_count}</TableCell>
                    <TableCell>
                      {r.violation_count > 0 ? (
                        <Badge variant="destructive">{r.violation_count}</Badge>
                      ) : (
                        <Badge variant="outline">0</Badge>
                      )}
                    </TableCell>
                    <TableCell>{TREND_ICONS[r.trend]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
