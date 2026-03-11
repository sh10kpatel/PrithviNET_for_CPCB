import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  await knex("regional_offices").del();

  await knex("regional_offices").insert([
    { id: 1, name: "CPCB Delhi", state: "Delhi", district: "New Delhi", geo_lat: 28.6139, geo_lng: 77.2090, contact_email: "cpcb@nic.in" },
    { id: 2, name: "DPCC Delhi", state: "Delhi", district: "New Delhi", geo_lat: 28.6353, geo_lng: 77.2250, contact_email: "dpcc@delhi.gov.in" },
    { id: 3, name: "MPCB Mumbai", state: "Maharashtra", district: "Mumbai", geo_lat: 19.0760, geo_lng: 72.8777, contact_email: "mpcb@maharashtra.gov.in" },
    { id: 4, name: "TNPCB Chennai", state: "Tamil Nadu", district: "Chennai", geo_lat: 13.0827, geo_lng: 80.2707, contact_email: "tnpcb@tn.gov.in" },
    { id: 5, name: "WBPCB Kolkata", state: "West Bengal", district: "Kolkata", geo_lat: 22.5726, geo_lng: 88.3639, contact_email: "wbpcb@wb.gov.in" },
    { id: 6, name: "KSPCB Bangalore", state: "Karnataka", district: "Bangalore Urban", geo_lat: 12.9716, geo_lng: 77.5946, contact_email: "kspcb@karnataka.gov.in" },
    { id: 7, name: "TSPCB Hyderabad", state: "Telangana", district: "Hyderabad", geo_lat: 17.3850, geo_lng: 78.4867, contact_email: "tspcb@telangana.gov.in" },
    { id: 8, name: "UPPCB Kanpur", state: "Uttar Pradesh", district: "Kanpur", geo_lat: 26.4499, geo_lng: 80.3319, contact_email: "uppcb@up.gov.in" },
    { id: 9, name: "UPPCB Lucknow", state: "Uttar Pradesh", district: "Lucknow", geo_lat: 26.8467, geo_lng: 80.9462, contact_email: "uppcb-lko@up.gov.in" },
    { id: 10, name: "OSPCB Bhubaneswar", state: "Odisha", district: "Khordha", geo_lat: 20.2961, geo_lng: 85.8245, contact_email: "ospcb@odisha.gov.in" },
    { id: 11, name: "GSPCB Gandhinagar", state: "Gujarat", district: "Ahmedabad", geo_lat: 23.0225, geo_lng: 72.5714, contact_email: "gspcb@gujarat.gov.in" },
    { id: 12, name: "RSPCB Jaipur", state: "Rajasthan", district: "Jaipur", geo_lat: 26.9124, geo_lng: 75.7873, contact_email: "rspcb@rajasthan.gov.in" },
    { id: 13, name: "MPPCB Bhopal", state: "Madhya Pradesh", district: "Bhopal", geo_lat: 23.2599, geo_lng: 77.4126, contact_email: "mppcb@mp.gov.in" },
    { id: 14, name: "PPCB Chandigarh", state: "Punjab", district: "Chandigarh", geo_lat: 30.7333, geo_lng: 76.7794, contact_email: "ppcb@punjab.gov.in" },
    { id: 15, name: "BSPCB Patna", state: "Bihar", district: "Patna", geo_lat: 25.6093, geo_lng: 85.1376, contact_email: "bspcb@bihar.gov.in" },
  ]);
}
