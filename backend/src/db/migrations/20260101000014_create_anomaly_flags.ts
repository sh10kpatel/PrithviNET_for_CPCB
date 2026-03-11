import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("anomaly_flags", (t) => {
    t.increments("id").primary();
    t.integer("reading_id").notNullable().references("id").inTable("readings");
    t.float("anomaly_score").notNullable();
    t.string("method").notNullable();
    t.timestamp("flagged_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("anomaly_flags");
}
