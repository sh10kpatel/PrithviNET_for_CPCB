// ─── User Roles ───
export const ROLES = [
  "super_admin",
  "regional_officer",
  "monitoring_team",
  "industry_user",
  "citizen",
] as const;
export type Role = (typeof ROLES)[number];

// ─── Database Row Types ───
export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: Role;
  regional_office_id: number | null;
  industry_id: number | null;
  created_at: string;
}

export interface RegionalOfficeRow {
  id: number;
  name: string;
  state: string;
  district: string;
  geo_lat: number;
  geo_lng: number;
  contact_email: string | null;
  created_at: string;
}

export interface IndustryRow {
  id: number;
  name: string;
  type: string;
  regional_office_id: number;
  geo_lat: number;
  geo_lng: number;
  registration_no: string | null;
  status: "active" | "suspended" | "closed";
  created_at: string;
}

export interface MonitoringLocationRow {
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
  created_at: string;
}

export interface EnvParameterRow {
  id: number;
  name: string;
  category: "air" | "water" | "noise";
  unit_id: number;
}

export interface MonitoringUnitRow {
  id: number;
  name: string;
  symbol: string;
}

export interface PrescribedLimitRow {
  id: number;
  parameter_id: number;
  industry_type: string | null;
  zone_type: string | null;
  min_value: number | null;
  max_value: number;
  effective_from: string;
  effective_to: string | null;
}

export interface ReadingRow {
  id: number;
  location_id: number;
  parameter_id: number;
  value: number;
  unit_id: number;
  timestamp: string;
  source: "iot" | "manual" | "api";
  submitted_by: number | null;
  created_at: string;
}

export interface AlertRuleRow {
  id: number;
  parameter_id: number;
  location_id: number | null;
  industry_id: number | null;
  operator: ">" | "<" | ">=" | "<=" | "==";
  threshold: number;
  severity: "info" | "warning" | "critical";
  enabled: number;
  created_at: string;
}

export interface AlertEventRow {
  id: number;
  alert_rule_id: number;
  reading_id: number;
  triggered_at: string;
  acknowledged: number;
  escalated_to: number | null;
  resolution_notes: string | null;
}

export interface ComplianceReportRow {
  id: number;
  industry_id: number;
  period_type: "monthly" | "yearly";
  period_start: string;
  period_end: string;
  status: "compliant" | "non_compliant" | "pending";
  generated_at: string;
}

export interface ForecastRow {
  id: number;
  location_id: number;
  parameter_id: number;
  forecast_timestamp: string;
  predicted_value: number;
  lower_bound: number;
  upper_bound: number;
  confidence_level: number;
  model_version: string;
  created_at: string;
}

export interface AnomalyFlagRow {
  id: number;
  reading_id: number;
  anomaly_score: number;
  method: string;
  flagged_at: string;
}

// ─── CPCB Types ───
export interface CPCBStationsResponse {
  states: Array<{ id: string; name: string; live: boolean }>;
  cities: Array<{
    stateID: string;
    citiesInState: Array<{ id: string; name: string; live: boolean }>;
  }>;
  stations: Array<{
    cityID: string;
    stationsInCity: Array<{
      id: string;
      name: string;
      latitude: string;
      longitude: string;
      live: boolean;
      stateID: string;
      cityID: string;
    }>;
  }>;
}

export interface CPCBReadingsResponse {
  title: string;
  date: string;
  down: string;
  aqi: {
    value: number;
    param: string;
    remark: string;
    color: string;
  } | null;
  metrics: Array<{
    name: string;
    param: string;
    avg: number | string;
    min: number | string;
    max: number | string;
  }>;
  chartData: Array<Array<[string, number, string]>>;
}

// ─── JWT Payload ───
export interface JWTPayload {
  id: number;
  email: string;
  role: Role;
  regionId?: number;
}
