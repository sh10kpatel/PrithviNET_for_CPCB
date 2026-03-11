import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("industries", (t) => {
    t.increments("id").primary();
    t.string("name").notNullable();
    t.string("type").notNullable();
    t.integer("regional_office_id").notNullable().references("id").inTable("regional_offices");
    t.float("geo_lat").notNullable();
    t.float("geo_lng").notNullable();
    t.string("registration_no").unique();
    t.string("status").notNullable().defaultTo("active");
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("industries");
}
