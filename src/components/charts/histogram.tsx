"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Bucket {
  bucket: string;
  aantal: number;
}

export function Histogram({ data, norm }: { data: Bucket[]; norm?: number }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="bucket"
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--muted)" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid var(--border)",
            fontSize: 12,
            boxShadow: "var(--shadow-soft)",
          }}
          formatter={(v) => [v as number, "Trajecten"]}
          labelFormatter={(l) => `${l} maanden`}
        />
        <Bar dataKey="aantal" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => {
            const lower = i * 2;
            const overNorm = norm !== undefined && lower >= norm;
            return (
              <Cell
                key={d.bucket}
                fill={overNorm ? "var(--brand-yellow)" : "var(--brand-green)"}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
