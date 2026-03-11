import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  await knex("env_parameters").del();

  await knex("env_parameters").insert([
    // Air parameters
    { id: 1, name: "PM2.5", category: "air", unit_id: 1 },
    { id: 2, name: "PM10", category: "air", unit_id: 1 },
    { id: 3, name: "SO2", category: "air", unit_id: 1 },
    { id: 4, name: "NO2", category: "air", unit_id: 1 },
    { id: 5, name: "CO", category: "air", unit_id: 2 },
    { id: 6, name: "O3", category: "air", unit_id: 1 },
    { id: 7, name: "NH3", category: "air", unit_id: 1 },
    { id: 8, name: "Pb", category: "air", unit_id: 1 },
    // Water parameters
    { id: 9, name: "pH", category: "water", unit_id: 5 },
    { id: 10, name: "BOD", category: "water", unit_id: 3 },
    { id: 11, name: "COD", category: "water", unit_id: 3 },
    { id: 12, name: "DO", category: "water", unit_id: 3 },
    { id: 13, name: "TDS", category: "water", unit_id: 3 },
    { id: 14, name: "Fecal Coliform", category: "water", unit_id: 6 },
    // Noise parameters
    { id: 15, name: "Leq(day)", category: "noise", unit_id: 4 },
    { id: 16, name: "Leq(night)", category: "noise", unit_id: 4 },
  ]);
}
