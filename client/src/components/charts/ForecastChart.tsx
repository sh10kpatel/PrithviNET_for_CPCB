"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import type { ForecastPoint } from "@/types";

export function ForecastChart({
  data,
  unit,
}: {
  data: ForecastPoint[];
  unit: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <XAxis
          dataKey="timestamp"
          tickFormatter={(t) =>
            new Date(t).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          }
          fontSize={12}
        />
        <YAxis unit={` ${unit}`} fontSize={12} />
        <Tooltip
          labelFormatter={(t) => new Date(t as string).toLocaleString()}
        />
        <Area
          dataKey="upper"
          stroke="none"
          fill="#3b82f6"
          fillOpacity={0.15}
          name="Upper bound"
        />
        <Area
          dataKey="lower"
          stroke="none"
          fill="#ffffff"
          fillOpacity={1}
          name="Lower bound"
        />
        <Line
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          name="Predicted"
        />
        {data[0]?.actual !== undefined && (
          <Line
            dataKey="actual"
            stroke="#10b981"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
            name="Actual"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
