import { Router } from "express";
import { db } from "../db/connection";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";
import { asyncHandler } from "../utils/asyncHandler";
import { fetchAllStations, fetchStationReadings } from "../services/cpcbClient";

const router = Router();

// GET /api/cpcb/stations — list all CPCB stations from DB
router.get(
  "/stations",
  authenticate,
  asyncHandler(async (req, res) => {
    const { state, city, is_live } = req.query;
    let query = db("monitoring_locations")
      .whereNotNull("cpcb_station_id")
      .select("*")
      .orderBy("state")
      .orderBy("city")
      .orderBy("name");

    if (state) query = query.where("state", state as string);
    if (city) query = query.where("city", city as string);
    if (is_live !== undefined) query = query.where("is_live", Number(is_live));

    const stations = await query;
    res.json(stations);
  }),
);

// GET /api/cpcb/stations/:id/readings — get latest cached readings
router.get(
  "/stations/:id/readings",
  authenticate,
  asyncHandler(async (req, res) => {
    const station = await db("monitoring_locations")
      .where({ id: req.params.id })
      .whereNotNull("cpcb_station_id")
      .first();

    if (!station) {
      res.status(404).json({ error: "CPCB station not found", code: "NOT_FOUND" });
      return;
    }

    // Check cache first
    const cached = await db("cpcb_cache")
      .where({ station_id: station.cpcb_station_id, endpoint: "readings" })
      .where("expires_at", ">", new Date().toISOString())
      .orderBy("fetched_at", "desc")
      .first();

    if (cached) {
      res.json(JSON.parse(cached.response));
      return;
    }

    // Fetch fresh data from CPCB
    try {
      const readings = await fetchStationReadings(station.cpcb_station_id);

      // Cache it
      const now = new Date();
      const expires = new Date(now.getTime() + 15 * 60 * 1000); // 15 min TTL
      await db("cpcb_cache").insert({
        station_id: station.cpcb_station_id,
        endpoint: "readings",
        response: JSON.stringify(readings),
        fetched_at: now.toISOString(),
        expires_at: expires.toISOString(),
      });

      res.json(readings);
    } catch (err) {
      const message = (err as Error).message;
      if (message === "CPCB_CAPTCHA_TRIGGERED") {
        res.status(429).json({ error: "CPCB rate limited (CAPTCHA)", code: "CPCB_RATE_LIMITED" });
      } else {
        res.status(502).json({ error: "CPCB API error", code: "CPCB_ERROR", details: message });
      }
    }
  }),
);

// POST /api/cpcb/sync — force re-fetch all stations
router.post(
  "/sync",
  authenticate,
  authorize("super_admin"),
  asyncHandler(async (_req, res) => {
    try {
      const data = await fetchAllStations();

      // Build a flat list of all stations
      const stateMap = new Map<string, string>();
      for (const s of data.states) stateMap.set(s.id, s.name);

      const cityMap = new Map<string, string>();
      for (const c of data.cities) {
        for (const city of c.citiesInState) cityMap.set(city.id, city.name);
      }

      let upserted = 0;
      for (const group of data.stations) {
        for (const station of group.stationsInCity) {
          const existing = await db("monitoring_locations")
            .where({ cpcb_station_id: station.id })
            .first();

          const row = {
            name: station.name,
            type: "air" as const,
            geo_lat: parseFloat(station.latitude),
            geo_lng: parseFloat(station.longitude),
            regional_office_id: 1, // default; should map by state
            cpcb_station_id: station.id,
            is_live: station.live ? 1 : 0,
            city: cityMap.get(station.cityID) || null,
            state: stateMap.get(station.stateID) || null,
          };

          if (existing) {
            await db("monitoring_locations").where({ id: existing.id }).update(row);
          } else {
            await db("monitoring_locations").insert(row);
          }
          upserted++;
        }
      }

      res.json({ message: "Sync complete", stations_upserted: upserted });
    } catch (err) {
      const message = (err as Error).message;
      if (message === "CPCB_CAPTCHA_TRIGGERED") {
        res.status(429).json({ error: "CPCB rate limited", code: "CPCB_RATE_LIMITED" });
      } else {
        res.status(502).json({ error: "CPCB sync failed", code: "CPCB_ERROR", details: message });
      }
    }
  }),
);

export { router as cpcbRouter };
