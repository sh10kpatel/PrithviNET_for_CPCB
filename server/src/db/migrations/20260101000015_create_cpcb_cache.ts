import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("cpcb_cache", (t) => {
    t.increments("id").primary();
    t.string("station_id").notNullable();
    t.string("endpoint").notNullable();
    t.text("response").notNullable();
    t.timestamp("fetched_at").defaultTo(knex.fn.now());
    t.string("expires_at").notNullable();
  });

  await knex.schema.raw(
    "CREATE INDEX IF NOT EXISTS idx_cpcb_cache_station ON cpcb_cache(station_id, endpoint, expires_at)",
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("cpcb_cache");
}
