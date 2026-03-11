"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useAppStore } from "@/store";
import { fetchStations, fetchHeatmap } from "@/lib/api";
import type { StationWithLatest } from "@/types";
import StationDetailPanel from "@/components/station/detail-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Layers, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AQI_COLORS, type AqiCategory } from "@/types";

const StationMap = dynamic(() => import("@/components/map/station-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-muted">
      <p className="text-muted-foreground">Loading map...</p>
    </div>
  ),
});

export default function HomePage() {
  const {
    stations,
    setStations,
    selectedStationId,
    setSelectedStationId,
    mapCenter,
    mapZoom,
    heatmapVisible,
    toggleHeatmap,
    heatmapParameter,
    setHeatmapParameter,
    stateFilter,
    setStateFilter,
    zoneFilter,
    setZoneFilter,
    detailPanelOpen,
    setDetailPanelOpen,
  } = useAppStore();

  const [search, setSearch] = useState("");
  const [heatmapData, setHeatmapData] = useState<[number, number, number][] | null>(null);
  const [loading, setLoading] = useState(true);

  // Load stations on mount
  useEffect(() => {
    setLoading(true);
    fetchStations()
      .then((data) => {
        setStations(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [setStations]);

  // Load heatmap data when toggled
  useEffect(() => {
    if (heatmapVisible) {
      fetchHeatmap(heatmapParameter).then((resp) => {
        const maxVal = resp.max_value || 1;
        const points: [number, number, number][] = resp.points.map((p) => [
          p.lat,
          p.lng,
          p.value / maxVal,
        ]);
        setHeatmapData(points);
      }).catch(() => setHeatmapData(null));
    } else {
      setHeatmapData(null);
    }
  }, [heatmapVisible, heatmapParameter]);

  // Filter stations
  const filteredStations = useMemo(() => {
    let filtered = stations;
    if (stateFilter) {
      filtered = filtered.filter((s) => s.state === stateFilter);
    }
    if (zoneFilter) {
      filtered = filtered.filter((s) => s.zone_type === zoneFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.station_name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.station_id.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [stations, stateFilter, zoneFilter, search]);

  // Unique states for filter
  const states = useMemo(
    () => [...new Set(stations.map((s) => s.state))].sort(),
    [stations]
  );

  const handleStationClick = useCallback(
    (stationId: string) => {
      setSelectedStationId(stationId);
      setDetailPanelOpen(true);
    },
    [setSelectedStationId, setDetailPanelOpen]
  );

  const handleCloseDetail = useCallback(() => {
    setDetailPanelOpen(false);
    setSelectedStationId(null);
  }, [setDetailPanelOpen, setSelectedStationId]);

  // Stats
  const stats = useMemo(() => {
    const active = filteredStations.filter((s) => s.latest_aqi !== null);
    const categories: Record<string, number> = {};
    active.forEach((s) => {
      const cat = s.aqi_category || "Unknown";
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return { total: filteredStations.length, active: active.length, categories };
  }, [filteredStations]);

  return (
    <div className="relative flex h-full">
      {/* Map Area */}
      <div className="flex-1 relative">
        {/* Controls overlay */}
        <div className="absolute left-3 top-3 z-[1000] flex flex-col gap-2">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-lg bg-card p-2 shadow-md">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-48 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
            />
            {search && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSearch("")}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-card p-2 shadow-md">
            <Select value={stateFilter || "all"} onValueChange={(v) => setStateFilter(!v || v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={zoneFilter || "all"} onValueChange={(v) => setZoneFilter(!v || v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder="All Zones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                <SelectItem value="Industrial">Industrial</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
                <SelectItem value="Residential">Residential</SelectItem>
                <SelectItem value="Silence">Silence</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Heatmap toggle */}
          <div className="flex items-center gap-2 rounded-lg bg-card p-2 shadow-md">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="heatmap" className="text-xs">
              Heatmap
            </Label>
            <Switch
              id="heatmap"
              checked={heatmapVisible}
              onCheckedChange={toggleHeatmap}
            />
            {heatmapVisible && (
              <Select value={heatmapParameter} onValueChange={(v) => v && setHeatmapParameter(v)}>
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aqi_pm25">PM2.5</SelectItem>
                  <SelectItem value="aqi_pm10">PM10</SelectItem>
                  <SelectItem value="noise_leq">Noise</SelectItem>
                  <SelectItem value="water_ph">Water pH</SelectItem>
                  <SelectItem value="weather_temp">Temperature</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Stats overlay */}
        <div className="absolute right-3 top-3 z-[1000] rounded-lg bg-card p-3 shadow-md">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {stats.total} stations ({stats.active} reporting)
          </p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(AQI_COLORS).map(([cat, color]) => {
              const count = stats.categories[cat] || 0;
              if (count === 0) return null;
              return (
                <Badge
                  key={cat}
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: color, color }}
                >
                  {cat}: {count}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* AQI Legend */}
        <div className="absolute bottom-6 left-3 z-[1000] rounded-lg bg-card p-2 shadow-md">
          <p className="mb-1 text-xs font-medium">AQI Scale</p>
          <div className="flex gap-1">
            {(Object.entries(AQI_COLORS) as [AqiCategory, string][]).map(([cat, color]) => (
              <div
                key={cat}
                className="flex flex-col items-center"
                title={cat}
              >
                <div
                  className="h-3 w-6 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[9px] text-muted-foreground">{cat.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex h-full items-center justify-center bg-muted">
            <p className="text-muted-foreground">Loading stations...</p>
          </div>
        ) : (
          <StationMap
            stations={filteredStations}
            center={mapCenter}
            zoom={mapZoom}
            onStationClick={handleStationClick}
            heatmapData={heatmapData}
            showHeatmap={heatmapVisible}
          />
        )}
      </div>

      {/* Station Detail Panel */}
      {detailPanelOpen && selectedStationId && (
        <div className="w-96 shrink-0 border-l bg-card overflow-hidden">
          <StationDetailPanel
            stationId={selectedStationId}
            onClose={handleCloseDetail}
          />
        </div>
      )}
    </div>
  );
}
