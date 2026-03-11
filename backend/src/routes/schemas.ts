import { z } from "zod";

// ─── Auth ───
export const RegisterInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100),
  role: z.enum(["super_admin", "regional_officer", "monitoring_team", "industry_user", "citizen"]),
  regional_office_id: z.number().int().positive().optional(),
  industry_id: z.number().int().positive().optional(),
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginInput>;

// ─── Readings ───
export const ReadingInput = z.object({
  location_id: z.number().int().positive(),
  parameter_id: z.number().int().positive(),
  value: z.number(),
  unit_id: z.number().int().positive(),
  timestamp: z.string(),
  source: z.enum(["iot", "manual", "api"]),
});
export type ReadingInput = z.infer<typeof ReadingInput>;

export const ReadingBatch = z.object({
  readings: z.array(ReadingInput).min(1).max(1000),
});
export type ReadingBatch = z.infer<typeof ReadingBatch>;

// ─── Alert Rules ───
export const AlertRuleInput = z.object({
  parameter_id: z.number().int().positive(),
  location_id: z.number().int().positive().optional(),
  industry_id: z.number().int().positive().optional(),
  operator: z.enum([">", "<", ">=", "<=", "=="]),
  threshold: z.number(),
  severity: z.enum(["info", "warning", "critical"]),
});
export type AlertRuleInput = z.infer<typeof AlertRuleInput>;

// ─── Copilot ───
export const CopilotQuery = z.object({
  question: z.string().min(5).max(1000),
});
export type CopilotQuery = z.infer<typeof CopilotQuery>;

// ─── Industries ───
export const IndustryInput = z.object({
  name: z.string().min(2),
  type: z.string().min(2),
  regional_office_id: z.number().int().positive(),
  geo_lat: z.number(),
  geo_lng: z.number(),
  registration_no: z.string().optional(),
});
export type IndustryInput = z.infer<typeof IndustryInput>;

// ─── Monitoring Locations ───
export const LocationInput = z.object({
  name: z.string().min(2),
  type: z.enum(["air", "water", "noise"]),
  geo_lat: z.number(),
  geo_lng: z.number(),
  regional_office_id: z.number().int().positive(),
  industry_id: z.number().int().positive().optional(),
  cpcb_station_id: z.string().optional(),
  operating_agency: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});
export type LocationInput = z.infer<typeof LocationInput>;

// ─── Regional Offices ───
export const RegionInput = z.object({
  name: z.string().min(2),
  state: z.string().min(2),
  district: z.string().min(2),
  geo_lat: z.number(),
  geo_lng: z.number(),
  contact_email: z.string().email().optional(),
});
export type RegionInput = z.infer<typeof RegionInput>;

// ─── Compliance Reports ───
export const ComplianceInput = z.object({
  industry_id: z.number().int().positive(),
  period_type: z.enum(["monthly", "yearly"]),
  period_start: z.string(),
  period_end: z.string(),
});
export type ComplianceInput = z.infer<typeof ComplianceInput>;
