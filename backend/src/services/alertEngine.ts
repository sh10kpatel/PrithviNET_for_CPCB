import { db } from "../db/connection";
import { io } from "../socket";

interface AlertCheck {
  reading_id: number;
  location_id: number;
  parameter_id: number;
  value: number;
}

export async function checkAlerts(readings: AlertCheck[]): Promise<void> {
  for (const reading of readings) {
    const rules = await db("alert_rules")
      .where({ parameter_id: reading.parameter_id, enabled: 1 })
      .andWhere((q) =>
        q.whereNull("location_id").orWhere({ location_id: reading.location_id }),
      );

    for (const rule of rules) {
      const breached = evaluateRule(reading.value, rule.operator, rule.threshold);
      if (breached) {
        const [eventId] = await db("alert_events").insert({
          alert_rule_id: rule.id,
          reading_id: reading.reading_id,
        });

        io.emit("alert:triggered", {
          eventId,
          ruleId: rule.id,
          severity: rule.severity,
          value: reading.value,
          threshold: rule.threshold,
          locationId: reading.location_id,
        });

        console.log(
          `[Alert] Rule ${rule.id} breached: ${reading.value} ${rule.operator} ${rule.threshold} (severity: ${rule.severity})`,
        );
      }
    }
  }
}

function evaluateRule(value: number, op: string, threshold: number): boolean {
  switch (op) {
    case ">":
      return value > threshold;
    case "<":
      return value < threshold;
    case ">=":
      return value >= threshold;
    case "<=":
      return value <= threshold;
    case "==":
      return value === threshold;
    default:
      return false;
  }
}
