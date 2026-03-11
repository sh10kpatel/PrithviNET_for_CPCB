// ===== Station Types =====

export interface StationBase {
  station_id: string;
  station_name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  zone_type: "Industrial" | "Commercial" | "Residential" | "Silence";
  monitoring_capabilities: string[];
  status: string;
}

export interface StationWithLatest extends StationBase {
  latest_aqi: number | null;
  latest_aqi_pm25: number | null;
  latest_aqi_pm10: number | null;
  latest_timestamp: string | null;
  aqi_category:
    | "Good"
    | "Satisfactory"
    | "Moderate"
    | "Poor"
    | "Very Poor"
    | "Severe"
    | null;
}

export interface StationDetail extends StationWithLatest {
  latest_water_ph: number | null;
  latest_water_bod: number | null;
  latest_noise_leq: number | null;
  latest_noise_lday: number | null;
  latest_noise_lnight: number | null;
  latest_weather_temp: number | null;
  latest_weather_humidity: number | null;
  latest_weather_pressure: number | null;
  latest_weather_wind_speed: number | null;
  active_alerts_count: number;
}

// ===== Time Series Types =====

export interface TimeSeriesRecord {
  timestamp: string;
  station_id: string;
  aqi_pm25: number | null;
  aqi_pm10: number | null;
  aqi_so2: number | null;
  aqi_no2: number | null;
  aqi_co: number | null;
  aqi_o3: number | null;
  water_ph: number | null;
  water_bod: number | null;
  water_cod: number | null;
  water_tss: number | null;
  water_flow: number | null;
  noise_leq: number | null;
  noise_lday: number | null;
  noise_lnight: number | null;
  weather_temp: number | null;
  weather_humidity: number | null;
  weather_pressure: number | null;
  weather_wind_speed: number | null;
  weather_wind_direction: number | null;
}

// ===== Alert Types =====

export interface Alert {
  alert_id: number;
  station_id: string;
  timestamp: string;
  parameter: string;
  value: number;
  threshold: number;
  severity: "Warning" | "Critical" | "Hazardous";
  category: "AIR" | "WATER" | "NOISE";
  status: "Active" | "Acknowledged" | "Resolved";
}

export interface AlertsResponse {
  alerts: Alert[];
  total: number;
  active_count: number;
  acknowledged_count: number;
  resolved_count: number;
}

export interface AlertStats {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_severity: Record<string, number>;
}

// ===== Forecast Types =====

export interface ForecastPoint {
  timestamp: string;
  predicted: number;
  lower_bound: number;
  upper_bound: number;
}

export interface ForecastResponse {
  station_id: string;
  parameter: string;
  hours: number;
  forecast: ForecastPoint[];
}

// ===== Anomaly Types =====

export interface AnomalyRecord {
  timestamp: string;
  parameter: string;
  value: number;
  z_score: number;
  is_anomaly: boolean;
}

export interface AnomalyResponse {
  station_id: string;
  lookback_hours: number;
  anomalies: AnomalyRecord[];
  message?: string;
}

// ===== Heatmap Types =====

export interface HeatmapPoint {
  lat: number;
  lng: number;
  value: number;
  station_id: string;
}

export interface HeatmapResponse {
  parameter: string;
  points: HeatmapPoint[];
  min_value: number;
  max_value: number;
}

// ===== Rankings Types =====

export interface RankingEntry {
  rank: number;
  name: string;
  avg_aqi: number | null;
  avg_noise: number | null;
  avg_water_ph: number | null;
  station_count: number;
  violation_count: number;
  trend: "improving" | "worsening" | "stable";
}

// ===== Compliance Types =====

export interface ComplianceQuery {
  query: string;
  station_id?: string | null;
  parameter?: string | null;
  change_percent?: number | null;
}

export interface ComplianceResponse {
  analysis: string;
  predicted_impact: Record<string, unknown> | null;
  recommendations: string[] | null;
  affected_stations: string[] | null;
}

// ===== Report Types =====

export interface ReportRequest {
  station_ids: string[];
  start_date: string;
  end_date: string;
  format: "pdf" | "pptx";
  sections: string[];
}

// ===== Auth Types =====

export interface UserResponse {
  user_id: number;
  name: string;
  email: string;
  role: string;
  region: string | null;
  station_id: string | null;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

// ===== Utility Types =====

export type AqiCategory =
  | "Good"
  | "Satisfactory"
  | "Moderate"
  | "Poor"
  | "Very Poor"
  | "Severe";

export const AQI_COLORS: Record<AqiCategory, string> = {
  Good: "#00b050",
  Satisfactory: "#92d050",
  Moderate: "#ffff00",
  Poor: "#ff9900",
  "Very Poor": "#ff0000",
  Severe: "#c00000",
};

export const AQI_CATEGORY_RANGES: { category: AqiCategory; min: number; max: number }[] = [
  { category: "Good", min: 0, max: 50 },
  { category: "Satisfactory", min: 51, max: 100 },
  { category: "Moderate", min: 101, max: 200 },
  { category: "Poor", min: 201, max: 300 },
  { category: "Very Poor", min: 301, max: 400 },
  { category: "Severe", min: 401, max: 500 },
];

export function getAqiCategory(aqi: number): AqiCategory {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderate";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
}

export function getAqiColor(aqi: number | null): string {
  if (aqi === null) return "#999999";
  return AQI_COLORS[getAqiCategory(aqi)];
}

export const PARAMETER_LABELS: Record<string, string> = {
  aqi_pm25: "PM2.5",
  aqi_pm10: "PM10",
  aqi_so2: "SO₂",
  aqi_no2: "NO₂",
  aqi_co: "CO",
  aqi_o3: "O₃",
  water_ph: "pH",
  water_bod: "BOD",
  water_cod: "COD",
  water_tss: "TSS",
  water_flow: "Flow",
  noise_leq: "Leq",
  noise_lday: "Lday",
  noise_lnight: "Lnight",
  weather_temp: "Temperature",
  weather_humidity: "Humidity",
  weather_pressure: "Pressure",
  weather_wind_speed: "Wind Speed",
  weather_wind_direction: "Wind Dir",
};

export const PARAMETER_UNITS: Record<string, string> = {
  aqi_pm25: "µg/m³",
  aqi_pm10: "µg/m³",
  aqi_so2: "µg/m³",
  aqi_no2: "µg/m³",
  aqi_co: "mg/m³",
  aqi_o3: "µg/m³",
  water_ph: "",
  water_bod: "mg/L",
  water_cod: "mg/L",
  water_tss: "mg/L",
  water_flow: "m³/h",
  noise_leq: "dB",
  noise_lday: "dB",
  noise_lnight: "dB",
  weather_temp: "°C",
  weather_humidity: "%",
  weather_pressure: "hPa",
  weather_wind_speed: "m/s",
  weather_wind_direction: "°",
};
