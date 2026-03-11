import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("monitoring_locations", (t) => {
    t.increments("id").primary();
    t.string("name").notNullable();
    t.string("type").notNullable();
    t.float("geo_lat").notNullable();
    t.float("geo_lng").notNullable();
    t.integer("regional_office_id").notNullable().references("id").inTable("regional_offices");
    t.integer("industry_id").references("id").inTable("industries");
    t.string("cpcb_station_id").unique();
    t.string("operating_agency");
    t.integer("is_live").defaultTo(1);
    t.string("city");
    t.string("state");
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });

  // Index for CPCB station lookups
  await knex.schema.raw(
    "CREATE INDEX IF NOT EXISTS idx_locations_cpcb ON monitoring_locations(cpcb_station_id)",
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("monitoring_locations");
}
