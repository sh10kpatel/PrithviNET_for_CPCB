import axios from "axios";
import type {
  StationWithLatest,
  StationDetail,
  TimeSeriesRecord,
  AlertsResponse,
  AlertStats,
  Alert,
  ForecastResponse,
  AnomalyResponse,
  HeatmapResponse,
  RankingEntry,
  ComplianceQuery,
  ComplianceResponse,
  ReportRequest,
  TokenResponse,
  UserResponse,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ===== Stations =====

export async function fetchStations(params?: {
  state?: string;
  city?: string;
  zone_type?: string;
  capability?: string;
}): Promise<StationWithLatest[]> {
  const { data } = await api.get("/stations/", { params });
  return data;
}

export async function fetchStationDetail(
  stationId: string
): Promise<StationDetail> {
  const { data } = await api.get(`/stations/${stationId}`);
  return data;
}

// ===== Time Series =====

export async function fetchTimeSeries(
  stationId: string,
  params?: {
    start_date?: string;
    end_date?: string;
    parameters?: string;
    granularity?: "hourly" | "6h" | "daily";
  }
): Promise<TimeSeriesRecord[]> {
  const { data } = await api.get(`/data/${stationId}/timeseries`, { params });
  return data;
}

// ===== Heatmap =====

export async function fetchHeatmap(
  parameter?: string
): Promise<HeatmapResponse> {
  const { data } = await api.get("/heatmap/", {
    params: parameter ? { parameter } : undefined,
  });
  return data;
}

// ===== Rankings =====

export async function fetchRankings(params?: {
  group_by?: "city" | "state";
  parameter?: "aqi" | "noise" | "water";
  order?: "asc" | "desc";
  limit?: number;
}): Promise<RankingEntry[]> {
  const { data } = await api.get("/rankings/", { params });
  return data;
}

// ===== Alerts =====

export async function fetchAlerts(params?: {
  station_id?: string;
  category?: string;
  severity?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<AlertsResponse> {
  const { data } = await api.get("/alerts/", { params });
  return data;
}

export async function fetchAlertStats(
  stationId?: string
): Promise<AlertStats> {
  const { data } = await api.get("/alerts/stats", {
    params: stationId ? { station_id: stationId } : undefined,
  });
  return data;
}

export async function updateAlert(
  alertId: number,
  status: string
): Promise<Alert> {
  const { data } = await api.patch(`/alerts/${alertId}`, { status });
  return data;
}

// ===== Forecasting =====

export async function fetchForecast(
  stationId: string,
  params?: {
    parameter?: string;
    hours?: number;
  }
): Promise<ForecastResponse> {
  const { data } = await api.get(`/forecast/${stationId}`, { params });
  return data;
}

// ===== Anomaly Detection =====

export async function fetchAnomalies(
  stationId: string,
  lookbackHours?: number
): Promise<AnomalyResponse> {
  const { data } = await api.get(`/anomaly/${stationId}`, {
    params: lookbackHours ? { lookback_hours: lookbackHours } : undefined,
  });
  return data;
}

// ===== Compliance Copilot =====

export async function queryCompliance(
  query: ComplianceQuery
): Promise<ComplianceResponse> {
  const { data } = await api.post("/compliance/simulate", query);
  return data;
}

// ===== Reports =====

export async function generateReport(request: ReportRequest): Promise<Blob> {
  const { data } = await api.post("/reports/generate", request, {
    responseType: "blob",
  });
  return data;
}

// ===== Auth =====

export async function login(
  email: string,
  password: string
): Promise<TokenResponse> {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

export async function register(params: {
  name: string;
  email: string;
  password: string;
  role?: string;
}): Promise<UserResponse> {
  const { data } = await api.post("/auth/register", params);
  return data;
}

export async function fetchCurrentUser(): Promise<UserResponse> {
  const { data } = await api.get("/auth/me");
  return data;
}

export async function checkHealth(): Promise<{
  status: string;
  service: string;
}> {
  const { data } = await api.get("/health");
  return data;
}
