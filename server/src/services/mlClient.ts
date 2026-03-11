const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export async function getForecast(
  locationId: number,
  paramId: number,
  hours: number,
): Promise<unknown> {
  const res = await fetch(
    `${ML_URL}/ml/forecast?location_id=${locationId}&parameter_id=${paramId}&hours=${hours}`,
  );
  if (!res.ok) throw new Error(`ML forecast failed: ${res.status}`);
  return res.json();
}

export async function detectAnomalies(
  readings: { value: number; timestamp: string }[],
): Promise<unknown> {
  const res = await fetch(`${ML_URL}/ml/anomaly/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ readings }),
  });
  if (!res.ok) throw new Error(`ML anomaly detection failed: ${res.status}`);
  return res.json();
}

export async function queryCopilot(
  question: string,
  context: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(`${ML_URL}/ml/copilot/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, context }),
  });
  if (!res.ok) throw new Error(`ML copilot query failed: ${res.status}`);
  return res.json();
}
