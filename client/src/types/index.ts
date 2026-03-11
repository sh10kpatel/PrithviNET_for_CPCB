export interface User {
  id: number;
  email: string;
  name: string;
  role: "super_admin" | "regional_officer" | "monitoring_team" | "industry_user" | "citizen";
  regional_office_id?: number;
  industry_id?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface MonitoringLocation {
  id: number;
  name: string;
  type: "air" | "water" | "noise";
  geo_lat: number;
  geo_lng: number;
  regional_office_id: number;
  industry_id: number | null;
  cpcb_station_id: string | null;
  operating_agency: string | null;
  is_live: number;
  city: string | null;
  state: string | null;
}

export interface Reading {
  id: number;
  location_id: number;
  parameter_id: number;
  value: number;
  unit_id: number;
  timestamp: string;
  source: "iot" | "manual" | "api";
  parameter_name?: string;
  location_name?: string;
  unit_symbol?: string;
}

export interface AlertEvent {
  id: number;
  alert_rule_id: number;
  reading_id: number;
  triggered_at: string;
  acknowledged: number;
  severity?: string;
  value?: number;
  threshold?: number;
  location_name?: string;
  parameter_name?: string;
}

export interface DashboardSummary {
  totalStations: number;
  liveStations: number;
  activeAlerts: number;
  todayReadings: number;
  latestAqi: Array<{
    location_id: number;
    value: number;
    location_name: string;
  }>;
}

export interface ForecastPoint {
  timestamp: string;
  value: number;
  lower: number;
  upper: number;
  actual?: number;
}

export interface CopilotResponse {
  answer: string;
  sources?: string[];
}
