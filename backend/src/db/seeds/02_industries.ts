import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  await knex("industries").del();

  await knex("industries").insert([
    // Steel plants
    { id: 1, name: "Tata Steel Jamshedpur", type: "steel", regional_office_id: 10, geo_lat: 22.7876, geo_lng: 86.2029, registration_no: "TSJ-2024-001", status: "active" },
    { id: 2, name: "JSW Steel Vijayanagar", type: "steel", regional_office_id: 6, geo_lat: 15.3131, geo_lng: 76.3942, registration_no: "JSW-2024-002", status: "active" },
    { id: 3, name: "SAIL Bhilai", type: "steel", regional_office_id: 13, geo_lat: 21.1938, geo_lng: 81.3509, registration_no: "SAIL-2024-003", status: "active" },
    // Cement plants
    { id: 4, name: "UltraTech Cement Rajasthan", type: "cement", regional_office_id: 12, geo_lat: 25.1758, geo_lng: 75.8553, registration_no: "UTC-2024-004", status: "active" },
    { id: 5, name: "ACC Cement Kymore", type: "cement", regional_office_id: 13, geo_lat: 24.0601, geo_lng: 80.5774, registration_no: "ACC-2024-005", status: "active" },
    // Chemical plants
    { id: 6, name: "IOCL Refinery Mathura", type: "chemical", regional_office_id: 8, geo_lat: 27.4924, geo_lng: 77.6737, registration_no: "IOCL-2024-006", status: "active" },
    { id: 7, name: "Reliance Jamnagar Refinery", type: "chemical", regional_office_id: 11, geo_lat: 22.2350, geo_lng: 69.6669, registration_no: "RIL-2024-007", status: "active" },
    // Power plants
    { id: 8, name: "NTPC Singrauli", type: "power", regional_office_id: 13, geo_lat: 24.0803, geo_lng: 82.6684, registration_no: "NTPC-2024-008", status: "active" },
    { id: 9, name: "NTPC Dadri", type: "power", regional_office_id: 9, geo_lat: 28.5617, geo_lng: 77.5643, registration_no: "NTPC-2024-009", status: "active" },
    // Textile
    { id: 10, name: "Arvind Mills Ahmedabad", type: "textile", regional_office_id: 11, geo_lat: 23.0225, geo_lng: 72.5714, registration_no: "AMA-2024-010", status: "active" },
    // Pharmaceutical
    { id: 11, name: "Dr Reddys Hyderabad", type: "pharmaceutical", regional_office_id: 7, geo_lat: 17.4700, geo_lng: 78.3477, registration_no: "DRL-2024-011", status: "active" },
    // Suspended industry for demo
    { id: 12, name: "Beta Chemicals Kanpur", type: "chemical", regional_office_id: 8, geo_lat: 26.4632, geo_lng: 80.3420, registration_no: "BCK-2024-012", status: "suspended" },
  ]);
}
