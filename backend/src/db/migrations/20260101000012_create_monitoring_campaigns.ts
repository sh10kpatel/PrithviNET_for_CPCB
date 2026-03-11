import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("monitoring_campaigns", (t) => {
    t.increments("id").primary();
    t.string("name").notNullable();
    t.text("description");
    t.string("start_date").notNullable();
    t.string("end_date").notNullable();
    t.integer("created_by").notNullable().references("id").inTable("users");
    t.string("status").notNullable().defaultTo("planned");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("monitoring_campaigns");
}
