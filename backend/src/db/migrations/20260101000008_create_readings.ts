import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("readings", (t) => {
    t.increments("id").primary();
    t.integer("location_id").notNullable().references("id").inTable("monitoring_locations");
    t.integer("parameter_id").notNullable().references("id").inTable("env_parameters");
    t.float("value").notNullable();
    t.integer("unit_id").notNullable().references("id").inTable("monitoring_units");
    t.string("timestamp").notNullable();
    t.string("source").notNullable();
    t.integer("submitted_by").references("id").inTable("users");
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.raw(
    "CREATE INDEX IF NOT EXISTS idx_readings_loc_ts ON readings(location_id, timestamp)",
  );
  await knex.schema.raw(
    "CREATE INDEX IF NOT EXISTS idx_readings_param ON readings(parameter_id)",
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("readings");
}
