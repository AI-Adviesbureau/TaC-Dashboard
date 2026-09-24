"use client";

import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtEuro, fmtEuroKort } from "@/lib/format";

interface Punt {
  label: string;
  cumulatief: number | null;
  prognose: number | null;
  cumulatiefVorig: number | null;
}

/** Cumulatieve realisatie per maand vs. budget, met lineaire prognose — zoals het gemeentedashboard. */
export function CumulatiefChart({
  data,
  plafond,
  jaar,
  vorigJaar,
}: {
  data: Punt[];
  plafond: number | null;
  jaar: number;
  vorigJaar: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 12, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--muted)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => fmtEuroKort(Number(v))}
          width={70}
        />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12, boxShadow: "var(--shadow-soft)" }}
          formatter={(value, name) => [fmtEuro(Number(value)), String(name)]}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="plainline" />
        {plafond != null && plafond > 0 && (
          <ReferenceLine
            y={plafond}
            stroke="var(--warn)"
            strokeDasharray="6 4"
            label={{ value: `Budget ${fmtEuroKort(plafond)}`, position: "insideTopLeft", fontSize: 11, fill: "var(--warn)" }}
          />
        )}
        <Line
          type="monotone"
          dataKey="cumulatiefVorig"
          name={`Realisatie ${vorigJaar}`}
          stroke="var(--muted)"
          strokeWidth={1.5}
          strokeDasharray="2 4"
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="cumulatief"
          name={`Realisatie ${jaar}`}
          stroke="var(--brand-blue)"
          strokeWidth={2.5}
          dot={{ r: 3 }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="prognose"
          name={`Prognose ${jaar}`}
          stroke="var(--brand-green)"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
