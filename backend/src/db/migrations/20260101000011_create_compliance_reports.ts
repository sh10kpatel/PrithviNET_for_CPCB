import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("compliance_reports", (t) => {
    t.increments("id").primary();
    t.integer("industry_id").notNullable().references("id").inTable("industries");
    t.string("period_type").notNullable();
    t.string("period_start").notNullable();
    t.string("period_end").notNullable();
    t.string("status").notNullable().defaultTo("pending");
    t.timestamp("generated_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("compliance_reports");
}
