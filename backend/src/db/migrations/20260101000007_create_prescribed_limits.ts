import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("prescribed_limits", (t) => {
    t.increments("id").primary();
    t.integer("parameter_id").notNullable().references("id").inTable("env_parameters");
    t.string("industry_type");
    t.string("zone_type");
    t.float("min_value");
    t.float("max_value").notNullable();
    t.string("effective_from").notNullable();
    t.string("effective_to");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("prescribed_limits");
}
