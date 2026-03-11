import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("regional_offices", (t) => {
    t.increments("id").primary();
    t.string("name").notNullable();
    t.string("state").notNullable();
    t.string("district").notNullable();
    t.float("geo_lat").notNullable();
    t.float("geo_lng").notNullable();
    t.string("contact_email");
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("regional_offices");
}
