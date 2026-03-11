import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("alert_rules", (t) => {
    t.increments("id").primary();
    t.integer("parameter_id").notNullable().references("id").inTable("env_parameters");
    t.integer("location_id").references("id").inTable("monitoring_locations");
    t.integer("industry_id").references("id").inTable("industries");
    t.string("operator").notNullable();
    t.float("threshold").notNullable();
    t.string("severity").notNullable();
    t.integer("enabled").notNullable().defaultTo(1);
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("alert_rules");
}
