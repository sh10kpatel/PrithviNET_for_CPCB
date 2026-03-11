import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("forecasts", (t) => {
    t.increments("id").primary();
    t.integer("location_id").notNullable().references("id").inTable("monitoring_locations");
    t.integer("parameter_id").notNullable().references("id").inTable("env_parameters");
    t.string("forecast_timestamp").notNullable();
    t.float("predicted_value").notNullable();
    t.float("lower_bound").notNullable();
    t.float("upper_bound").notNullable();
    t.float("confidence_level").notNullable().defaultTo(0.95);
    t.string("model_version").notNullable();
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.raw(
    "CREATE INDEX IF NOT EXISTS idx_forecasts_loc ON forecasts(location_id, parameter_id, created_at)",
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("forecasts");
}
