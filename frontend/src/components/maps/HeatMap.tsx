"use client";

import dynamic from "next/dynamic";

export interface HeatMapProps {
  points: { lat: number; lng: number; intensity: number }[];
  center?: [number, number];
  zoom?: number;
}

const HeatMapInner = dynamic(() => import("./HeatMapInner"), { ssr: false });

export function HeatMap(props: HeatMapProps) {
  return <HeatMapInner {...props} />;
}
