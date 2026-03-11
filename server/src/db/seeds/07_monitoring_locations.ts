import type { Knex } from "knex";

/**
 * Seed monitoring locations:
 * - 50 priority CPCB air stations (metros + pollution hotspots)
 * - 10 water quality stations (simulated)
 * - 10 noise monitoring stations (simulated)
 *
 * Full 588 stations can be fetched via POST /api/cpcb/sync
 */
export async function seed(knex: Knex): Promise<void> {
  await knex("monitoring_locations").del();

  // State → regional_office_id mapping
  const STATE_OFFICE: Record<string, number> = {
    "Delhi": 2,
    "Maharashtra": 3,
    "Tamil Nadu": 4,
    "West Bengal": 5,
    "Karnataka": 6,
    "Telangana": 7,
    "Uttar Pradesh": 8,
    "Odisha": 10,
    "Gujarat": 11,
    "Rajasthan": 12,
    "Madhya Pradesh": 13,
    "Punjab": 14,
    "Bihar": 15,
    "Haryana": 2,
    "Jharkhand": 10,
    "Chhattisgarh": 13,
    "Andhra Pradesh": 7,
    "Kerala": 4,
    "Assam": 1,
    "Chandigarh": 14,
  };

  // ─── CPCB Air Stations (50 priority stations) ───
  const airStations = [
    // Delhi (8 stations)
    { name: "Anand Vihar, Delhi - DPCC", cpcb_station_id: "site_1", geo_lat: 28.6468, geo_lng: 77.3160, city: "Delhi", state: "Delhi", operating_agency: "DPCC", is_live: 1 },
    { name: "RK Puram, Delhi - DPCC", cpcb_station_id: "site_2", geo_lat: 28.5634, geo_lng: 77.1723, city: "Delhi", state: "Delhi", operating_agency: "DPCC", is_live: 1 },
    { name: "ITO, Delhi - CPCB", cpcb_station_id: "site_3", geo_lat: 28.6289, geo_lng: 77.2414, city: "Delhi", state: "Delhi", operating_agency: "CPCB", is_live: 1 },
    { name: "Punjabi Bagh, Delhi - DPCC", cpcb_station_id: "site_5", geo_lat: 28.6681, geo_lng: 77.1250, city: "Delhi", state: "Delhi", operating_agency: "DPCC", is_live: 1 },
    { name: "DTU, Delhi - CPCB", cpcb_station_id: "site_6", geo_lat: 28.7500, geo_lng: 77.1114, city: "Delhi", state: "Delhi", operating_agency: "CPCB", is_live: 1 },
    { name: "IGI Airport T3, Delhi - IMD", cpcb_station_id: "site_7", geo_lat: 28.5625, geo_lng: 77.1181, city: "Delhi", state: "Delhi", operating_agency: "IMD", is_live: 1 },
    { name: "Lodhi Road, Delhi - IMD", cpcb_station_id: "site_8", geo_lat: 28.5919, geo_lng: 77.2273, city: "Delhi", state: "Delhi", operating_agency: "IMD", is_live: 1 },
    { name: "Dwarka Sector 8, Delhi - DPCC", cpcb_station_id: "site_9", geo_lat: 28.5708, geo_lng: 77.0686, city: "Delhi", state: "Delhi", operating_agency: "DPCC", is_live: 1 },

    // Mumbai (5 stations)
    { name: "Bandra, Mumbai - MPCB", cpcb_station_id: "site_301", geo_lat: 19.0600, geo_lng: 72.8400, city: "Mumbai", state: "Maharashtra", operating_agency: "MPCB", is_live: 1 },
    { name: "Chembur, Mumbai - MPCB", cpcb_station_id: "site_302", geo_lat: 19.0622, geo_lng: 72.8978, city: "Mumbai", state: "Maharashtra", operating_agency: "MPCB", is_live: 1 },
    { name: "Mazgaon, Mumbai - MPCB", cpcb_station_id: "site_303", geo_lat: 18.9685, geo_lng: 72.8448, city: "Mumbai", state: "Maharashtra", operating_agency: "MPCB", is_live: 1 },
    { name: "Worli, Mumbai - MPCB", cpcb_station_id: "site_304", geo_lat: 19.0178, geo_lng: 72.8150, city: "Mumbai", state: "Maharashtra", operating_agency: "MPCB", is_live: 1 },
    { name: "Borivali East, Mumbai - MPCB", cpcb_station_id: "site_305", geo_lat: 19.2310, geo_lng: 72.8567, city: "Mumbai", state: "Maharashtra", operating_agency: "MPCB", is_live: 1 },

    // Kolkata (3 stations)
    { name: "Victoria, Kolkata - WBPCB", cpcb_station_id: "site_103", geo_lat: 22.5448, geo_lng: 88.3426, city: "Kolkata", state: "West Bengal", operating_agency: "WBPCB", is_live: 1 },
    { name: "Rabindra Bharati University, Kolkata - WBPCB", cpcb_station_id: "site_104", geo_lat: 22.5900, geo_lng: 88.3780, city: "Kolkata", state: "West Bengal", operating_agency: "WBPCB", is_live: 1 },
    { name: "Jadavpur, Kolkata - WBPCB", cpcb_station_id: "site_105", geo_lat: 22.4960, geo_lng: 88.3698, city: "Kolkata", state: "West Bengal", operating_agency: "WBPCB", is_live: 1 },

    // Chennai (3 stations)
    { name: "Alandur Bus Depot, Chennai - TNPCB", cpcb_station_id: "site_119", geo_lat: 13.0023, geo_lng: 80.2095, city: "Chennai", state: "Tamil Nadu", operating_agency: "TNPCB", is_live: 1 },
    { name: "Manali, Chennai - TNPCB", cpcb_station_id: "site_120", geo_lat: 13.1600, geo_lng: 80.2600, city: "Chennai", state: "Tamil Nadu", operating_agency: "TNPCB", is_live: 1 },
    { name: "Velachery Res Area, Chennai - TNPCB", cpcb_station_id: "site_121", geo_lat: 12.9795, geo_lng: 80.2204, city: "Chennai", state: "Tamil Nadu", operating_agency: "TNPCB", is_live: 1 },

    // Bangalore (3 stations)
    { name: "BTM Layout, Bangalore - KSPCB", cpcb_station_id: "site_132", geo_lat: 12.9165, geo_lng: 77.6101, city: "Bengaluru", state: "Karnataka", operating_agency: "KSPCB", is_live: 1 },
    { name: "Peenya, Bangalore - KSPCB", cpcb_station_id: "site_133", geo_lat: 13.0302, geo_lng: 77.5191, city: "Bengaluru", state: "Karnataka", operating_agency: "KSPCB", is_live: 1 },
    { name: "Silk Board, Bangalore - KSPCB", cpcb_station_id: "site_134", geo_lat: 12.9170, geo_lng: 77.6230, city: "Bengaluru", state: "Karnataka", operating_agency: "KSPCB", is_live: 1 },

    // Hyderabad (3 stations)
    { name: "Bollaram Industrial Area, Hyderabad - TSPCB", cpcb_station_id: "site_157", geo_lat: 17.5400, geo_lng: 78.3500, city: "Hyderabad", state: "Telangana", operating_agency: "TSPCB", is_live: 1 },
    { name: "Central University, Hyderabad - TSPCB", cpcb_station_id: "site_158", geo_lat: 17.4607, geo_lng: 78.3340, city: "Hyderabad", state: "Telangana", operating_agency: "TSPCB", is_live: 1 },
    { name: "Zoo Park, Hyderabad - TSPCB", cpcb_station_id: "site_159", geo_lat: 17.3497, geo_lng: 78.4513, city: "Hyderabad", state: "Telangana", operating_agency: "TSPCB", is_live: 1 },

    // UP pollution hotspots (5 stations)
    { name: "Nehru Nagar, Kanpur - UPPCB", cpcb_station_id: "site_67", geo_lat: 26.4706, geo_lng: 80.3147, city: "Kanpur", state: "Uttar Pradesh", operating_agency: "UPPCB", is_live: 1 },
    { name: "Lalbagh, Lucknow - UPPCB", cpcb_station_id: "site_68", geo_lat: 26.8512, geo_lng: 80.9379, city: "Lucknow", state: "Uttar Pradesh", operating_agency: "UPPCB", is_live: 1 },
    { name: "Sanjay Palace, Agra - UPPCB", cpcb_station_id: "site_69", geo_lat: 27.1960, geo_lng: 78.0025, city: "Agra", state: "Uttar Pradesh", operating_agency: "UPPCB", is_live: 1 },
    { name: "Loni, Ghaziabad - UPPCB", cpcb_station_id: "site_70", geo_lat: 28.7322, geo_lng: 77.2901, city: "Ghaziabad", state: "Uttar Pradesh", operating_agency: "UPPCB", is_live: 1 },
    { name: "Sector 125, Noida - UPPCB", cpcb_station_id: "site_71", geo_lat: 28.5444, geo_lng: 77.3230, city: "Noida", state: "Uttar Pradesh", operating_agency: "UPPCB", is_live: 1 },

    // Pune (2 stations)
    { name: "Karve Road, Pune - MPCB", cpcb_station_id: "site_277", geo_lat: 18.5074, geo_lng: 73.8251, city: "Pune", state: "Maharashtra", operating_agency: "MPCB", is_live: 1 },
    { name: "Nigdi, Pune - MPCB", cpcb_station_id: "site_278", geo_lat: 18.6519, geo_lng: 73.7693, city: "Pune", state: "Maharashtra", operating_agency: "MPCB", is_live: 1 },

    // Ahmedabad (2 stations)
    { name: "Maninagar, Ahmedabad - GSPCB", cpcb_station_id: "site_45", geo_lat: 23.0035, geo_lng: 72.6000, city: "Ahmedabad", state: "Gujarat", operating_agency: "GSPCB", is_live: 1 },
    { name: "Chandkheda, Ahmedabad - GSPCB", cpcb_station_id: "site_46", geo_lat: 23.1070, geo_lng: 72.5900, city: "Ahmedabad", state: "Gujarat", operating_agency: "GSPCB", is_live: 1 },

    // Jaipur (2 stations)
    { name: "Adarsh Nagar, Jaipur - RSPCB", cpcb_station_id: "site_200", geo_lat: 26.9325, geo_lng: 75.7885, city: "Jaipur", state: "Rajasthan", operating_agency: "RSPCB", is_live: 1 },
    { name: "Police Commissionerate, Jaipur - RSPCB", cpcb_station_id: "site_201", geo_lat: 26.9096, geo_lng: 75.7855, city: "Jaipur", state: "Rajasthan", operating_agency: "RSPCB", is_live: 1 },

    // Patna (2 stations)
    { name: "IGSC Planetarium, Patna - BSPCB", cpcb_station_id: "site_250", geo_lat: 25.6145, geo_lng: 85.1560, city: "Patna", state: "Bihar", operating_agency: "BSPCB", is_live: 1 },
    { name: "Muradpur, Patna - BSPCB", cpcb_station_id: "site_251", geo_lat: 25.6244, geo_lng: 85.1391, city: "Patna", state: "Bihar", operating_agency: "BSPCB", is_live: 1 },

    // Other important cities (6 stations)
    { name: "Talkatora, Bhopal - MPPCB", cpcb_station_id: "site_180", geo_lat: 23.2497, geo_lng: 77.4091, city: "Bhopal", state: "Madhya Pradesh", operating_agency: "MPPCB", is_live: 1 },
    { name: "Civil Lines, Varanasi - UPPCB", cpcb_station_id: "site_72", geo_lat: 25.3176, geo_lng: 83.0100, city: "Varanasi", state: "Uttar Pradesh", operating_agency: "UPPCB", is_live: 1 },
    { name: "Sector 25, Chandigarh - CPCC", cpcb_station_id: "site_400", geo_lat: 30.7250, geo_lng: 76.7599, city: "Chandigarh", state: "Chandigarh", operating_agency: "CPCC", is_live: 1 },
    { name: "Guwahati Railway, Guwahati - PCBA", cpcb_station_id: "site_420", geo_lat: 26.1851, geo_lng: 91.7553, city: "Guwahati", state: "Assam", operating_agency: "PCBA", is_live: 1 },
    { name: "Visakhapatnam, AP - APPCB", cpcb_station_id: "site_350", geo_lat: 17.6868, geo_lng: 83.2185, city: "Visakhapatnam", state: "Andhra Pradesh", operating_agency: "APPCB", is_live: 1 },
    { name: "Bhubaneswar, Odisha - OSPCB", cpcb_station_id: "site_440", geo_lat: 20.2961, geo_lng: 85.8245, city: "Bhubaneswar", state: "Odisha", operating_agency: "OSPCB", is_live: 1 },
  ];

  // Insert air stations with regional_office_id mapping
  const airRows = airStations.map((s) => ({
    ...s,
    type: "air" as const,
    regional_office_id: STATE_OFFICE[s.state] || 1,
    industry_id: null,
  }));

  await knex("monitoring_locations").insert(airRows);

  // ─── Water Quality Stations (simulated) ───
  const waterStations = [
    { name: "Yamuna at Wazirabad, Delhi", geo_lat: 28.7078, geo_lng: 77.2247, city: "Delhi", state: "Delhi", industry_id: null },
    { name: "Yamuna at Okhla, Delhi", geo_lat: 28.5285, geo_lng: 77.2734, city: "Delhi", state: "Delhi", industry_id: null },
    { name: "Ganga at Kanpur", geo_lat: 26.4666, geo_lng: 80.3340, city: "Kanpur", state: "Uttar Pradesh", industry_id: null },
    { name: "Ganga at Varanasi", geo_lat: 25.2816, geo_lng: 83.0076, city: "Varanasi", state: "Uttar Pradesh", industry_id: null },
    { name: "Hooghly at Kolkata", geo_lat: 22.5668, geo_lng: 88.3117, city: "Kolkata", state: "West Bengal", industry_id: null },
    { name: "Mithi River, Mumbai", geo_lat: 19.0715, geo_lng: 72.8780, city: "Mumbai", state: "Maharashtra", industry_id: null },
    { name: "Cooum River, Chennai", geo_lat: 13.0670, geo_lng: 80.2790, city: "Chennai", state: "Tamil Nadu", industry_id: null },
    { name: "Sabarmati at Ahmedabad", geo_lat: 23.0225, geo_lng: 72.5714, city: "Ahmedabad", state: "Gujarat", industry_id: null },
    // Industry effluent discharge points
    { name: "Tata Steel Effluent Outfall", geo_lat: 22.7900, geo_lng: 86.2050, city: "Jamshedpur", state: "Jharkhand", industry_id: 1 },
    { name: "IOCL Mathura Effluent", geo_lat: 27.4940, geo_lng: 77.6750, city: "Mathura", state: "Uttar Pradesh", industry_id: 6 },
  ];

  const waterRows = waterStations.map((s) => ({
    ...s,
    type: "water" as const,
    regional_office_id: STATE_OFFICE[s.state] || 1,
    cpcb_station_id: null,
    operating_agency: s.industry_id ? "Industry" : "CPCB",
    is_live: 1,
  }));

  await knex("monitoring_locations").insert(waterRows);

  // ─── Noise Monitoring Stations (simulated) ───
  const noiseStations = [
    { name: "Connaught Place, Delhi (Commercial)", geo_lat: 28.6315, geo_lng: 77.2167, city: "Delhi", state: "Delhi" },
    { name: "Karol Bagh, Delhi (Residential)", geo_lat: 28.6519, geo_lng: 77.1905, city: "Delhi", state: "Delhi" },
    { name: "AIIMS, Delhi (Silence Zone)", geo_lat: 28.5672, geo_lng: 77.2100, city: "Delhi", state: "Delhi" },
    { name: "Andheri East, Mumbai (Commercial)", geo_lat: 19.1190, geo_lng: 72.8550, city: "Mumbai", state: "Maharashtra" },
    { name: "T. Nagar, Chennai (Commercial)", geo_lat: 13.0418, geo_lng: 80.2341, city: "Chennai", state: "Tamil Nadu" },
    { name: "MG Road, Bangalore (Commercial)", geo_lat: 12.9758, geo_lng: 77.6045, city: "Bengaluru", state: "Karnataka" },
    { name: "Salt Lake, Kolkata (Residential)", geo_lat: 22.5810, geo_lng: 88.4120, city: "Kolkata", state: "West Bengal" },
    // Industrial noise near factories
    { name: "Near Tata Steel Plant, Jamshedpur (Industrial)", geo_lat: 22.7880, geo_lng: 86.2035, city: "Jamshedpur", state: "Jharkhand" },
    { name: "Near NTPC Singrauli (Industrial)", geo_lat: 24.0810, geo_lng: 82.6690, city: "Singrauli", state: "Madhya Pradesh" },
    { name: "Near IOCL Refinery, Mathura (Industrial)", geo_lat: 27.4930, geo_lng: 77.6740, city: "Mathura", state: "Uttar Pradesh" },
  ];

  const noiseRows = noiseStations.map((s) => ({
    ...s,
    type: "noise" as const,
    regional_office_id: STATE_OFFICE[s.state] || 1,
    industry_id: null,
    cpcb_station_id: null,
    operating_agency: "CPCB",
    is_live: 1,
  }));

  await knex("monitoring_locations").insert(noiseRows);
}
