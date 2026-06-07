"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtEuroKort } from "@/lib/format";

interface Punt {
  label: string;
  instroom: number;
  uitstroom: number;
  omzet: number;
}

export function TrendChart({ data }: { data: Punt[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="g-in" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-green)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--brand-green)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="g-uit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-blue)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--brand-blue)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "var(--muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 12, fill: "var(--muted)" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid var(--border)",
            fontSize: 12,
            boxShadow: "var(--shadow-soft)",
          }}
          formatter={(value, name) =>
            name === "Omzet" ? [fmtEuroKort(value as number), name] : [value as number, name]
          }
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="instroom"
          name="Instroom"
          stroke="var(--brand-green)"
          strokeWidth={2.5}
          fill="url(#g-in)"
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="uitstroom"
          name="Uitstroom"
          stroke="var(--brand-blue)"
          strokeWidth={2.5}
          fill="url(#g-uit)"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
