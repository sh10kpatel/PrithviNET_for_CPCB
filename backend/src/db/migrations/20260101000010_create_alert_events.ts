import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("alert_events", (t) => {
    t.increments("id").primary();
    t.integer("alert_rule_id").notNullable().references("id").inTable("alert_rules");
    t.integer("reading_id").notNullable().references("id").inTable("readings");
    t.timestamp("triggered_at").defaultTo(knex.fn.now());
    t.integer("acknowledged").notNullable().defaultTo(0);
    t.integer("escalated_to").references("id").inTable("users");
    t.text("resolution_notes");
  });

  await knex.schema.raw(
    "CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alert_events(triggered_at)",
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("alert_events");
}
