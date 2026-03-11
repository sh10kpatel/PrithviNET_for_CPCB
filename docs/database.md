# Database Schema — PrithviNET

> Priority: **P0** — migrate and seed before any API work.

## Overview

15 tables in SQLite, managed by Knex migrations. All timestamps stored as ISO 8601 strings.
Column naming: `snake_case`. All tables have `id INTEGER PRIMARY KEY AUTOINCREMENT`.

Includes the original 14 domain tables plus `cpcb_cache` for CPCB API response caching.

## Complete Schema

### users

```sql
CREATE TABLE users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT    NOT NULL UNIQUE,
  password_hash   TEXT    NOT NULL,
  name            TEXT    NOT NULL,
  role            TEXT    NOT NULL CHECK(role IN (
                    'super_admin','regional_officer','monitoring_team',
                    'industry_user','citizen')),
  regional_office_id INTEGER REFERENCES regional_offices(id),
  industry_id     INTEGER REFERENCES industries(id),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

### regional_offices

```sql
CREATE TABLE regional_offices (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  state         TEXT    NOT NULL,
  district      TEXT    NOT NULL,
  geo_lat       REAL    NOT NULL,
  geo_lng       REAL    NOT NULL,
  contact_email TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

### industries

```sql
CREATE TABLE industries (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT    NOT NULL,
  type              TEXT    NOT NULL, -- steel, cement, chemical, power, textile, etc.
  regional_office_id INTEGER NOT NULL REFERENCES regional_offices(id),
  geo_lat           REAL    NOT NULL,
  geo_lng           REAL    NOT NULL,
  registration_no   TEXT    UNIQUE,
  status            TEXT    NOT NULL DEFAULT 'active'
                      CHECK(status IN ('active','suspended','closed')),
  created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

### monitoring_locations

```sql
CREATE TABLE monitoring_locations (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  name               TEXT    NOT NULL,
  type               TEXT    NOT NULL CHECK(type IN ('air','water','noise')),
  geo_lat            REAL    NOT NULL,
  geo_lng            REAL    NOT NULL,
  regional_office_id INTEGER NOT NULL REFERENCES regional_offices(id),
  industry_id        INTEGER REFERENCES industries(id),  -- NULL = ambient station
  cpcb_station_id    TEXT    UNIQUE,       -- e.g. "site_301" — NULL for non-CPCB stations
  operating_agency   TEXT,                 -- e.g. "CPCB", "DPCC", "MPCB", "IMD"
  is_live            INTEGER DEFAULT 1,    -- 1 = currently reporting, 0 = offline/future
  city               TEXT,                 -- city name from CPCB hierarchy
  state              TEXT,                 -- state name from CPCB hierarchy
  created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_locations_cpcb ON monitoring_locations(cpcb_station_id);
```

### cpcb_cache

Stores raw CPCB API responses for rate-limit-friendly caching:

```sql
CREATE TABLE cpcb_cache (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id  TEXT    NOT NULL,            -- CPCB station_id e.g. "site_301"
  endpoint    TEXT    NOT NULL,            -- "stations" | "readings"
  response    TEXT    NOT NULL,            -- full JSON response (decoded from base64)
  fetched_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT    NOT NULL             -- fetched_at + TTL (15 min for readings, 24h for stations)
);
CREATE INDEX idx_cpcb_cache_station ON cpcb_cache(station_id, endpoint, expires_at);
```

### env_parameters

```sql
CREATE TABLE env_parameters (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL, -- PM2.5, SO2, pH, BOD, Leq(day), etc.
  category  TEXT    NOT NULL CHECK(category IN ('air','water','noise')),
  unit_id   INTEGER NOT NULL REFERENCES monitoring_units(id)
);
```

### monitoring_units

```sql
CREATE TABLE monitoring_units (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  name   TEXT NOT NULL, -- "Micrograms per cubic meter"
  symbol TEXT NOT NULL  -- "µg/m³", "ppm", "dB(A)", "mg/L"
);
```

### prescribed_limits

```sql
CREATE TABLE prescribed_limits (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  parameter_id   INTEGER NOT NULL REFERENCES env_parameters(id),
  industry_type  TEXT,    -- NULL = applies to all
  zone_type      TEXT,    -- industrial, commercial, residential, silence
  min_value      REAL,
  max_value      REAL    NOT NULL,
  effective_from TEXT    NOT NULL,
  effective_to   TEXT
);
```

### readings

```sql
CREATE TABLE readings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id   INTEGER NOT NULL REFERENCES monitoring_locations(id),
  parameter_id  INTEGER NOT NULL REFERENCES env_parameters(id),
  value         REAL    NOT NULL,
  unit_id       INTEGER NOT NULL REFERENCES monitoring_units(id),
  timestamp     TEXT    NOT NULL,
  source        TEXT    NOT NULL CHECK(source IN ('iot','manual','api')),
  submitted_by  INTEGER REFERENCES users(id),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_readings_loc_ts ON readings(location_id, timestamp);
CREATE INDEX idx_readings_param  ON readings(parameter_id);
```

### alert_rules

```sql
CREATE TABLE alert_rules (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  parameter_id INTEGER NOT NULL REFERENCES env_parameters(id),
  location_id  INTEGER REFERENCES monitoring_locations(id),
  industry_id  INTEGER REFERENCES industries(id),
  operator     TEXT    NOT NULL CHECK(operator IN ('>','<','>=','<=','==')),
  threshold    REAL    NOT NULL,
  severity     TEXT    NOT NULL CHECK(severity IN ('info','warning','critical')),
  enabled      INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

### alert_events

```sql
CREATE TABLE alert_events (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_rule_id    INTEGER NOT NULL REFERENCES alert_rules(id),
  reading_id       INTEGER NOT NULL REFERENCES readings(id),
  triggered_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  acknowledged     INTEGER NOT NULL DEFAULT 0,
  escalated_to     INTEGER REFERENCES users(id),
  resolution_notes TEXT
);
CREATE INDEX idx_alerts_severity ON alert_events(triggered_at);
```

### compliance_reports

```sql
CREATE TABLE compliance_reports (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  industry_id  INTEGER NOT NULL REFERENCES industries(id),
  period_type  TEXT    NOT NULL CHECK(period_type IN ('monthly','yearly')),
  period_start TEXT    NOT NULL,
  period_end   TEXT    NOT NULL,
  status       TEXT    NOT NULL CHECK(status IN ('compliant','non_compliant','pending')),
  generated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

### monitoring_campaigns

```sql
CREATE TABLE monitoring_campaigns (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  description TEXT,
  start_date  TEXT    NOT NULL,
  end_date    TEXT    NOT NULL,
  created_by  INTEGER NOT NULL REFERENCES users(id),
  status      TEXT    NOT NULL DEFAULT 'planned'
                CHECK(status IN ('planned','active','completed','cancelled'))
);
```

### forecasts

```sql
CREATE TABLE forecasts (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id        INTEGER NOT NULL REFERENCES monitoring_locations(id),
  parameter_id       INTEGER NOT NULL REFERENCES env_parameters(id),
  forecast_timestamp TEXT    NOT NULL, -- the future time being predicted
  predicted_value    REAL    NOT NULL,
  lower_bound        REAL    NOT NULL, -- 95% CI lower
  upper_bound        REAL    NOT NULL, -- 95% CI upper
  confidence_level   REAL    NOT NULL DEFAULT 0.95,
  model_version      TEXT    NOT NULL,
  created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_forecasts_loc ON forecasts(location_id, parameter_id, created_at);
```

### anomaly_flags

```sql
CREATE TABLE anomaly_flags (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  reading_id    INTEGER NOT NULL REFERENCES readings(id),
  anomaly_score REAL    NOT NULL, -- 0.0 (normal) to 1.0 (extreme anomaly)
  method        TEXT    NOT NULL, -- 'isolation_forest' | 'zscore'
  flagged_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

## Knex Migration Conventions

- File naming: `YYYYMMDDHHMMSS_descriptive_name.ts` (Knex auto-generates timestamp prefix)
- One migration per logical unit (e.g., `create_users_table`, `create_readings_indexes`)
- Always implement both `up()` and `down()`
- Run: `cd backend && npm run migrate`

```typescript
// Example: backend/src/db/migrations/20260101000001_create_users.ts
import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("users", (t) => {
    t.increments("id").primary();
    t.string("email").notNullable().unique();
    t.string("password_hash").notNullable();
    t.string("name").notNullable();
    t.string("role").notNullable();
    t.integer("regional_office_id").references("id").inTable("regional_offices");
    t.integer("industry_id").references("id").inTable("industries");
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("users");
}
```

## Seed Data — CPCB Standards (India)

Seeds must include realistic Indian environmental data. Run: `cd backend && npm run seed`

### Regional Offices (sample)

| Name | State | District | Lat | Lng |
|---|---|---|---|---|
| SPCB Delhi | Delhi | New Delhi | 28.6139 | 77.2090 |
| MPCB Mumbai | Maharashtra | Mumbai | 19.0760 | 72.8777 |
| TNPCB Chennai | Tamil Nadu | Chennai | 13.0827 | 80.2707 |
| UPPCB Kanpur | Uttar Pradesh | Kanpur | 26.4499 | 80.3319 |
| OSPCB Bhubaneswar | Odisha | Khordha | 20.2961 | 85.8245 |

### Air Quality Parameters & NAAQS Limits

| Parameter | Unit | Industrial | Residential | Sensitive |
|---|---|---|---|---|
| PM2.5 | µg/m³ | 60 | 40 | 40 |
| PM10 | µg/m³ | 100 | 60 | 60 |
| SO2 | µg/m³ | 80 | 50 | 20 |
| NO2 | µg/m³ | 80 | 40 | 30 |
| CO | mg/m³ | 4.0 | 2.0 | 2.0 |
| O3 | µg/m³ | 180 | 100 | 100 |
| NH3 | µg/m³ | 400 | 200 | 100 |
| Pb | µg/m³ | 1.0 | 0.5 | 0.5 |

### Water Quality Parameters

| Parameter | Unit | Limit |
|---|---|---|
| pH | - | 6.5–8.5 |
| BOD | mg/L | 30 |
| COD | mg/L | 250 |
| DO | mg/L | ≥ 5.0 (min) |
| TDS | mg/L | 2100 |
| Fecal Coliform | MPN/100mL | 1000 |

### Noise Limits (dB(A) Leq)

| Zone | Day (6am-10pm) | Night (10pm-6am) |
|---|---|---|
| Industrial | 75 | 70 |
| Commercial | 65 | 55 |
| Residential | 55 | 45 |
| Silence | 50 | 40 |

### CPCB Station Seed Data

The 588 CAAQM air monitoring stations are seeded from the CPCB `/aqi_station_all_india` endpoint.
Each station maps to a `monitoring_locations` row with `type = 'air'` and a populated `cpcb_station_id`.

Seed data includes:
- All station `id`, `name`, `latitude`, `longitude`, `live` values
- State and city names from the hierarchical response
- Operating agency parsed from station name patterns (e.g., "CPCB", "DPCC", "IMD", "IITM", etc.)
- Regional office assignments based on state mapping

**Note:** Water and noise stations are NOT from CPCB — they are simulated via the IoT simulator
and seeded separately with representative Indian locations.

### Priority Stations for Live Polling

Not all 588 stations need real-time data. Priority stations (~30-50) are selected based on:
- Population density (metros: Delhi, Mumbai, Kolkata, Chennai, Bangalore, Hyderabad)
- Known pollution hotspots (Kanpur, Varanasi, Ghaziabad, Noida, Lucknow)
- Diversity (at least one per major state)

These are the stations polled every 15 minutes; remaining stations are updated every 1-6 hours.

## Common Query Patterns

```typescript
// Latest reading per location
db("readings")
  .select("location_id", "parameter_id", "value", "timestamp")
  .whereIn("id", db("readings").max("id").groupBy("location_id", "parameter_id"));

// Readings exceeding prescribed limits
db("readings as r")
  .join("prescribed_limits as pl", "r.parameter_id", "pl.parameter_id")
  .where("r.value", ">", db.ref("pl.max_value"))
  .select("r.*", "pl.max_value");

// Time-series for charting (last 24h for a station)
db("readings")
  .where({ location_id: locationId, parameter_id: paramId })
  .where("timestamp", ">=", twentyFourHoursAgo)
  .orderBy("timestamp", "asc");
```
