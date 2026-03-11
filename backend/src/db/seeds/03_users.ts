import type { Knex } from "knex";
import bcrypt from "bcryptjs";

export async function seed(knex: Knex): Promise<void> {
  await knex("users").del();

  const hash = await bcrypt.hash("password123", 12);

  await knex("users").insert([
    // Super Admin
    { id: 1, email: "admin@prithvinet.gov.in", password_hash: hash, name: "System Admin", role: "super_admin", regional_office_id: 1, industry_id: null },
    // Regional Officers
    { id: 2, email: "officer.delhi@prithvinet.gov.in", password_hash: hash, name: "Rajesh Kumar", role: "regional_officer", regional_office_id: 2, industry_id: null },
    { id: 3, email: "officer.mumbai@prithvinet.gov.in", password_hash: hash, name: "Priya Sharma", role: "regional_officer", regional_office_id: 3, industry_id: null },
    { id: 4, email: "officer.chennai@prithvinet.gov.in", password_hash: hash, name: "Suresh Iyer", role: "regional_officer", regional_office_id: 4, industry_id: null },
    // Monitoring Team
    { id: 5, email: "monitor.delhi@prithvinet.gov.in", password_hash: hash, name: "Anil Verma", role: "monitoring_team", regional_office_id: 2, industry_id: null },
    { id: 6, email: "monitor.mumbai@prithvinet.gov.in", password_hash: hash, name: "Sneha Patil", role: "monitoring_team", regional_office_id: 3, industry_id: null },
    // Industry Users
    { id: 7, email: "env.tata@tatasteel.com", password_hash: hash, name: "Vikram Singh", role: "industry_user", regional_office_id: 10, industry_id: 1 },
    { id: 8, email: "env.jsw@jswsteel.com", password_hash: hash, name: "Mahesh Rao", role: "industry_user", regional_office_id: 6, industry_id: 2 },
    { id: 9, email: "env.ntpc@ntpc.co.in", password_hash: hash, name: "Amit Pandey", role: "industry_user", regional_office_id: 13, industry_id: 8 },
    // Citizens
    { id: 10, email: "citizen@example.com", password_hash: hash, name: "Ravi Citizen", role: "citizen", regional_office_id: null, industry_id: null },
    { id: 11, email: "activist@greenindia.org", password_hash: hash, name: "Meera Nair", role: "citizen", regional_office_id: null, industry_id: null },
  ]);
}
