import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("monitoring_units", (t) => {
    t.increments("id").primary();
    t.string("name").notNullable();
    t.string("symbol").notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("monitoring_units");
}
