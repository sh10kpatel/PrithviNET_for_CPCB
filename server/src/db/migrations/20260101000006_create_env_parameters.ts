import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("env_parameters", (t) => {
    t.increments("id").primary();
    t.string("name").notNullable();
    t.string("category").notNullable();
    t.integer("unit_id").notNullable().references("id").inTable("monitoring_units");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("env_parameters");
}
