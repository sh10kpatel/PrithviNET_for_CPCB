import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  await knex("prescribed_limits").del();

  const EFFECTIVE_FROM = "2024-01-01";

  await knex("prescribed_limits").insert([
    // ─── Air Quality — NAAQS Limits (24-hour average) ───

    // PM2.5
    { parameter_id: 1, industry_type: null, zone_type: "industrial", min_value: null, max_value: 60, effective_from: EFFECTIVE_FROM },
    { parameter_id: 1, industry_type: null, zone_type: "residential", min_value: null, max_value: 40, effective_from: EFFECTIVE_FROM },
    { parameter_id: 1, industry_type: null, zone_type: "sensitive", min_value: null, max_value: 40, effective_from: EFFECTIVE_FROM },

    // PM10
    { parameter_id: 2, industry_type: null, zone_type: "industrial", min_value: null, max_value: 100, effective_from: EFFECTIVE_FROM },
    { parameter_id: 2, industry_type: null, zone_type: "residential", min_value: null, max_value: 60, effective_from: EFFECTIVE_FROM },
    { parameter_id: 2, industry_type: null, zone_type: "sensitive", min_value: null, max_value: 60, effective_from: EFFECTIVE_FROM },

    // SO2
    { parameter_id: 3, industry_type: null, zone_type: "industrial", min_value: null, max_value: 80, effective_from: EFFECTIVE_FROM },
    { parameter_id: 3, industry_type: null, zone_type: "residential", min_value: null, max_value: 50, effective_from: EFFECTIVE_FROM },
    { parameter_id: 3, industry_type: null, zone_type: "sensitive", min_value: null, max_value: 20, effective_from: EFFECTIVE_FROM },

    // NO2
    { parameter_id: 4, industry_type: null, zone_type: "industrial", min_value: null, max_value: 80, effective_from: EFFECTIVE_FROM },
    { parameter_id: 4, industry_type: null, zone_type: "residential", min_value: null, max_value: 40, effective_from: EFFECTIVE_FROM },
    { parameter_id: 4, industry_type: null, zone_type: "sensitive", min_value: null, max_value: 30, effective_from: EFFECTIVE_FROM },

    // CO
    { parameter_id: 5, industry_type: null, zone_type: "industrial", min_value: null, max_value: 4.0, effective_from: EFFECTIVE_FROM },
    { parameter_id: 5, industry_type: null, zone_type: "residential", min_value: null, max_value: 2.0, effective_from: EFFECTIVE_FROM },
    { parameter_id: 5, industry_type: null, zone_type: "sensitive", min_value: null, max_value: 2.0, effective_from: EFFECTIVE_FROM },

    // O3
    { parameter_id: 6, industry_type: null, zone_type: "industrial", min_value: null, max_value: 180, effective_from: EFFECTIVE_FROM },
    { parameter_id: 6, industry_type: null, zone_type: "residential", min_value: null, max_value: 100, effective_from: EFFECTIVE_FROM },
    { parameter_id: 6, industry_type: null, zone_type: "sensitive", min_value: null, max_value: 100, effective_from: EFFECTIVE_FROM },

    // NH3
    { parameter_id: 7, industry_type: null, zone_type: "industrial", min_value: null, max_value: 400, effective_from: EFFECTIVE_FROM },
    { parameter_id: 7, industry_type: null, zone_type: "residential", min_value: null, max_value: 200, effective_from: EFFECTIVE_FROM },
    { parameter_id: 7, industry_type: null, zone_type: "sensitive", min_value: null, max_value: 100, effective_from: EFFECTIVE_FROM },

    // Pb
    { parameter_id: 8, industry_type: null, zone_type: "industrial", min_value: null, max_value: 1.0, effective_from: EFFECTIVE_FROM },
    { parameter_id: 8, industry_type: null, zone_type: "residential", min_value: null, max_value: 0.5, effective_from: EFFECTIVE_FROM },
    { parameter_id: 8, industry_type: null, zone_type: "sensitive", min_value: null, max_value: 0.5, effective_from: EFFECTIVE_FROM },

    // ─── Water Quality Limits (general discharge standards) ───

    // pH (min and max)
    { parameter_id: 9, industry_type: null, zone_type: null, min_value: 6.5, max_value: 8.5, effective_from: EFFECTIVE_FROM },

    // BOD
    { parameter_id: 10, industry_type: null, zone_type: null, min_value: null, max_value: 30, effective_from: EFFECTIVE_FROM },
    { parameter_id: 10, industry_type: "steel", zone_type: null, min_value: null, max_value: 20, effective_from: EFFECTIVE_FROM },
    { parameter_id: 10, industry_type: "chemical", zone_type: null, min_value: null, max_value: 15, effective_from: EFFECTIVE_FROM },

    // COD
    { parameter_id: 11, industry_type: null, zone_type: null, min_value: null, max_value: 250, effective_from: EFFECTIVE_FROM },
    { parameter_id: 11, industry_type: "steel", zone_type: null, min_value: null, max_value: 150, effective_from: EFFECTIVE_FROM },
    { parameter_id: 11, industry_type: "chemical", zone_type: null, min_value: null, max_value: 100, effective_from: EFFECTIVE_FROM },

    // DO (minimum — using min_value, max_value as a large number for "at least")
    { parameter_id: 12, industry_type: null, zone_type: null, min_value: 5.0, max_value: 14.0, effective_from: EFFECTIVE_FROM },

    // TDS
    { parameter_id: 13, industry_type: null, zone_type: null, min_value: null, max_value: 2100, effective_from: EFFECTIVE_FROM },

    // Fecal Coliform
    { parameter_id: 14, industry_type: null, zone_type: null, min_value: null, max_value: 1000, effective_from: EFFECTIVE_FROM },

    // ─── Noise Limits (dB(A) Leq) ───

    // Leq(day)
    { parameter_id: 15, industry_type: null, zone_type: "industrial", min_value: null, max_value: 75, effective_from: EFFECTIVE_FROM },
    { parameter_id: 15, industry_type: null, zone_type: "commercial", min_value: null, max_value: 65, effective_from: EFFECTIVE_FROM },
    { parameter_id: 15, industry_type: null, zone_type: "residential", min_value: null, max_value: 55, effective_from: EFFECTIVE_FROM },
    { parameter_id: 15, industry_type: null, zone_type: "silence", min_value: null, max_value: 50, effective_from: EFFECTIVE_FROM },

    // Leq(night)
    { parameter_id: 16, industry_type: null, zone_type: "industrial", min_value: null, max_value: 70, effective_from: EFFECTIVE_FROM },
    { parameter_id: 16, industry_type: null, zone_type: "commercial", min_value: null, max_value: 55, effective_from: EFFECTIVE_FROM },
    { parameter_id: 16, industry_type: null, zone_type: "residential", min_value: null, max_value: 45, effective_from: EFFECTIVE_FROM },
    { parameter_id: 16, industry_type: null, zone_type: "silence", min_value: null, max_value: 40, effective_from: EFFECTIVE_FROM },
  ]);
}
