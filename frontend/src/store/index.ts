import { create } from "zustand";
import type {
  StationWithLatest,
  StationDetail,
  UserResponse,
} from "@/types";

interface AppState {
  // Stations
  stations: StationWithLatest[];
  setStations: (stations: StationWithLatest[]) => void;
  selectedStationId: string | null;
  setSelectedStationId: (id: string | null) => void;
  selectedStationDetail: StationDetail | null;
  setSelectedStationDetail: (detail: StationDetail | null) => void;

  // Map
  mapCenter: [number, number];
  setMapCenter: (center: [number, number]) => void;
  mapZoom: number;
  setMapZoom: (zoom: number) => void;
  heatmapVisible: boolean;
  toggleHeatmap: () => void;
  heatmapParameter: string;
  setHeatmapParameter: (param: string) => void;

  // Filters
  stateFilter: string;
  setStateFilter: (state: string) => void;
  cityFilter: string;
  setCityFilter: (city: string) => void;
  zoneFilter: string;
  setZoneFilter: (zone: string) => void;

  // UI
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  detailPanelOpen: boolean;
  setDetailPanelOpen: (open: boolean) => void;

  // Auth
  user: UserResponse | null;
  setUser: (user: UserResponse | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Stations
  stations: [],
  setStations: (stations) => set({ stations }),
  selectedStationId: null,
  setSelectedStationId: (id) => set({ selectedStationId: id }),
  selectedStationDetail: null,
  setSelectedStationDetail: (detail) => set({ selectedStationDetail: detail }),

  // Map - centered on India
  mapCenter: [22.5, 78.9],
  setMapCenter: (center) => set({ mapCenter: center }),
  mapZoom: 5,
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  heatmapVisible: false,
  toggleHeatmap: () => set((s) => ({ heatmapVisible: !s.heatmapVisible })),
  heatmapParameter: "aqi_pm25",
  setHeatmapParameter: (param) => set({ heatmapParameter: param }),

  // Filters
  stateFilter: "",
  setStateFilter: (state) => set({ stateFilter: state }),
  cityFilter: "",
  setCityFilter: (city) => set({ cityFilter: city }),
  zoneFilter: "",
  setZoneFilter: (zone) => set({ zoneFilter: zone }),

  // UI
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  detailPanelOpen: false,
  setDetailPanelOpen: (open) => set({ detailPanelOpen: open }),

  // Auth
  user: null,
  setUser: (user) => set({ user }),
  token: null,
  setToken: (token) => set({ token }),
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
    }
    set({ user: null, token: null });
  },
}));
