import type { CPCBStationsResponse, CPCBReadingsResponse } from "../types";

const CPCB_BASE = "https://airquality.cpcb.gov.in";

function makeAccessToken(): string {
  return Buffer.from(
    JSON.stringify({
      time: Date.now(),
      timeZoneOffset: new Date().getTimezoneOffset(),
    }),
  ).toString("base64");
}

function encodeBody(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function decodeResponse(encoded: string): unknown {
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
}

export async function fetchAllStations(): Promise<CPCBStationsResponse> {
  const res = await fetch(`${CPCB_BASE}/aqi_dashboard/aqi_station_all_india`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      accessToken: makeAccessToken(),
    },
    body: encodeBody({}),
  });

  if (res.status === 400) throw new Error("CPCB_CAPTCHA_TRIGGERED");
  if (!res.ok) throw new Error(`CPCB stations fetch failed: ${res.status}`);

  return decodeResponse(await res.text()) as CPCBStationsResponse;
}

export async function fetchStationReadings(
  stationId: string,
  date?: Date,
): Promise<CPCBReadingsResponse> {
  const payload = {
    station_id: stationId,
    date: (date || new Date()).toISOString(),
  };

  const res = await fetch(`${CPCB_BASE}/aqi_dashboard/aqi_all_Parameters`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      accessToken: makeAccessToken(),
    },
    body: encodeBody(payload),
  });

  if (res.status === 400) throw new Error("CPCB_CAPTCHA_TRIGGERED");
  if (!res.ok) throw new Error(`CPCB readings fetch failed: ${res.status}`);

  return decodeResponse(await res.text()) as CPCBReadingsResponse;
}
