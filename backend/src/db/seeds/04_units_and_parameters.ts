import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  await knex("monitoring_units").del();

  await knex("monitoring_units").insert([
    { id: 1, name: "Micrograms per cubic meter", symbol: "µg/m³" },
    { id: 2, name: "Milligrams per cubic meter", symbol: "mg/m³" },
    { id: 3, name: "Milligrams per liter", symbol: "mg/L" },
    { id: 4, name: "Decibels A-weighted", symbol: "dB(A)" },
    { id: 5, name: "pH units", symbol: "pH" },
    { id: 6, name: "MPN per 100 mL", symbol: "MPN/100mL" },
    { id: 7, name: "Parts per million", symbol: "ppm" },
  ]);
}
