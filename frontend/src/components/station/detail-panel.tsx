"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Wind, Droplets, Volume2, Thermometer, AlertTriangle, TrendingUp } from "lucide-react";
import type { StationDetail, TimeSeriesRecord } from "@/types";
import { getAqiColor, getAqiCategory, PARAMETER_LABELS, PARAMETER_UNITS } from "@/types";
import { fetchStationDetail, fetchTimeSeries, fetchForecast, fetchAnomalies } from "@/lib/api";
import type { ForecastResponse, AnomalyResponse } from "@/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
  ReferenceDot,
} from "recharts";
import { format } from "date-fns";

interface StationDetailPanelProps {
  stationId: string;
  onClose: () => void;
}

function MetricCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number | null;
  unit: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold" style={color ? { color } : undefined}>
        {value !== null ? value.toFixed(1) : "N/A"}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          {unit}
        </span>
      </p>
    </div>
  );
}

function MiniChart({
  data,
  dataKey,
  color,
  label,
}: {
  data: TimeSeriesRecord[];
  dataKey: string;
  color: string;
  label: string;
}) {
  const chartData = data
    .filter((d) => (d as unknown as Record<string, unknown>)[dataKey] !== null)
    .map((d) => ({
      time: format(new Date(d.timestamp), "MMM dd HH:mm"),
      value: (d as unknown as Record<string, number | null>)[dataKey],
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No data for {label}
      </div>
    );
  }

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 10 }} width={40} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            name={label}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ForecastChart({ forecast }: { forecast: ForecastResponse }) {
  const chartData = forecast.forecast.map((p) => ({
    time: format(new Date(p.timestamp), "MMM dd HH:mm"),
    predicted: p.predicted,
    lower: p.lower_bound,
    upper: p.upper_bound,
  }));

  return (
    <div className="h-48">
      <p className="mb-2 text-sm font-medium">
        {PARAMETER_LABELS[forecast.parameter] || forecast.parameter} Forecast ({forecast.hours}h)
      </p>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} width={45} />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="upper"
            stroke="none"
            fill="#fecaca"
            fillOpacity={0.3}
            name="Upper"
          />
          <Area
            type="monotone"
            dataKey="lower"
            stroke="none"
            fill="#fecaca"
            fillOpacity={0.3}
            name="Lower"
          />
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            name="Predicted"
          />
          <Legend />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function AnomalyChart({ anomalies }: { anomalies: AnomalyResponse }) {
  if (!anomalies.anomalies || anomalies.anomalies.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {anomalies.message || "No anomalies detected"}
      </p>
    );
  }

  // Group by parameter
  const byParam: Record<string, typeof anomalies.anomalies> = {};
  anomalies.anomalies.forEach((a) => {
    if (!byParam[a.parameter]) byParam[a.parameter] = [];
    byParam[a.parameter].push(a);
  });

  const firstParam = Object.keys(byParam)[0];
  const paramData = byParam[firstParam];
  const chartData = paramData.map((a) => ({
    time: format(new Date(a.timestamp), "MMM dd HH:mm"),
    value: a.value,
    zScore: a.z_score,
    isAnomaly: a.is_anomaly,
  }));

  const anomalyPoints = chartData.filter((d) => d.isAnomaly);

  return (
    <div className="h-48">
      <p className="mb-2 text-sm font-medium">
        Anomalies - {PARAMETER_LABELS[firstParam] || firstParam}
        <Badge variant="destructive" className="ml-2">
          {anomalyPoints.length} detected
        </Badge>
      </p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} width={45} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={1.5}
            dot={false}
            name="Value"
          />
          {anomalyPoints.map((pt, i) => (
            <ReferenceDot
              key={i}
              x={pt.time}
              y={pt.value}
              r={4}
              fill="#ef4444"
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function StationDetailPanel({
  stationId,
  onClose,
}: StationDetailPanelProps) {
  const [detail, setDetail] = useState<StationDetail | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesRecord[]>([]);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("aqi");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [det, ts] = await Promise.all([
        fetchStationDetail(stationId),
        fetchTimeSeries(stationId, { granularity: "6h" }),
      ]);
      setDetail(det);
      setTimeSeries(ts);

      // Load forecast and anomaly in background
      fetchForecast(stationId, { parameter: "aqi_pm25", hours: 72 })
        .then(setForecast)
        .catch(() => setForecast(null));
      fetchAnomalies(stationId, 168)
        .then(setAnomalies)
        .catch(() => setAnomalies(null));
    } catch {
      console.error("Failed to load station detail");
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Card className="h-full overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-6 w-40" />
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-60" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!detail) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Station Not Found</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
      </Card>
    );
  }

  const aqiColor = getAqiColor(detail.latest_aqi);
  const aqiCat = detail.latest_aqi !== null ? getAqiCategory(detail.latest_aqi) : null;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-base">
            {detail.station_name}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {detail.city}, {detail.state}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge variant="outline">{detail.zone_type}</Badge>
            {detail.monitoring_capabilities.map((cap) => (
              <Badge key={cap} variant="secondary" className="text-xs">
                {cap}
              </Badge>
            ))}
            {detail.active_alerts_count > 0 && (
              <Badge variant="destructive">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {detail.active_alerts_count} alerts
              </Badge>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto pb-4">
        {/* AQI Summary */}
        {detail.latest_aqi !== null && (
          <div
            className="mb-4 rounded-lg p-3 text-center"
            style={{ backgroundColor: aqiColor + "20", borderLeft: `4px solid ${aqiColor}` }}
          >
            <p className="text-3xl font-bold" style={{ color: aqiColor }}>
              {Math.round(detail.latest_aqi)}
            </p>
            <p className="text-sm font-medium" style={{ color: aqiColor }}>
              {aqiCat}
            </p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => v && setActiveTab(v)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="aqi" className="text-xs">
              <Wind className="mr-1 h-3 w-3" /> AQI
            </TabsTrigger>
            <TabsTrigger value="weather" className="text-xs">
              <Thermometer className="mr-1 h-3 w-3" /> Weather
            </TabsTrigger>
            <TabsTrigger value="noise" className="text-xs">
              <Volume2 className="mr-1 h-3 w-3" /> Noise
            </TabsTrigger>
            <TabsTrigger value="water" className="text-xs">
              <Droplets className="mr-1 h-3 w-3" /> Water
            </TabsTrigger>
          </TabsList>

          <TabsContent value="aqi" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-2">
              <MetricCard label="PM2.5" value={detail.latest_aqi_pm25} unit="µg/m³" />
              <MetricCard label="PM10" value={detail.latest_aqi_pm10} unit="µg/m³" />
            </div>
            <MiniChart data={timeSeries} dataKey="aqi_pm25" color="#ef4444" label="PM2.5" />
            <MiniChart data={timeSeries} dataKey="aqi_pm10" color="#f97316" label="PM10" />

            {/* Forecast */}
            {forecast && (
              <div className="mt-4 border-t pt-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <TrendingUp className="h-4 w-4 text-red-500" /> AI Forecast
                </div>
                <ForecastChart forecast={forecast} />
              </div>
            )}

            {/* Anomalies */}
            {anomalies && (
              <div className="mt-4 border-t pt-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Anomaly Detection
                </div>
                <AnomalyChart anomalies={anomalies} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="weather" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-2">
              <MetricCard label="Temperature" value={detail.latest_weather_temp} unit="°C" />
              <MetricCard label="Humidity" value={detail.latest_weather_humidity} unit="%" />
              <MetricCard label="Pressure" value={detail.latest_weather_pressure} unit="hPa" />
              <MetricCard label="Wind Speed" value={detail.latest_weather_wind_speed} unit="m/s" />
            </div>
            <MiniChart data={timeSeries} dataKey="weather_temp" color="#3b82f6" label="Temperature" />
            <MiniChart data={timeSeries} dataKey="weather_humidity" color="#06b6d4" label="Humidity" />
          </TabsContent>

          <TabsContent value="noise" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-2">
              <MetricCard label="Leq" value={detail.latest_noise_leq} unit="dB" />
              <MetricCard label="Lday" value={detail.latest_noise_lday} unit="dB" />
              <MetricCard label="Lnight" value={detail.latest_noise_lnight} unit="dB" />
            </div>
            <MiniChart data={timeSeries} dataKey="noise_leq" color="#8b5cf6" label="Noise Leq" />
          </TabsContent>

          <TabsContent value="water" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-2">
              <MetricCard label="pH" value={detail.latest_water_ph} unit="" />
              <MetricCard label="BOD" value={detail.latest_water_bod} unit="mg/L" />
            </div>
            <MiniChart data={timeSeries} dataKey="water_ph" color="#22c55e" label="pH" />
            <MiniChart data={timeSeries} dataKey="water_bod" color="#eab308" label="BOD" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
