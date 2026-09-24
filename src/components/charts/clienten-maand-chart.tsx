"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Punt {
  label: string;
  toegewezen: number | null;
  gedeclareerd: number | null;
  toegewezenVorig: number | null;
  gedeclareerdVorig: number | null;
}

/** Actieve cliënten per maand: toegewezen (lopend traject) vs. gedeclareerd — zoals het gemeentedashboard. */
export function ClientenMaandChart({
  data,
  jaar,
  vorigJaar,
}: {
  data: Punt[];
  jaar: number;
  vorigJaar: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 12, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12, boxShadow: "var(--shadow-soft)" }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="plainline" />
        <Line type="monotone" dataKey="toegewezenVorig" name={`Toegewezen ${vorigJaar}`} stroke="var(--brand-yellow)" strokeWidth={1.5} strokeDasharray="2 4" dot={false} connectNulls />
        <Line type="monotone" dataKey="gedeclareerdVorig" name={`Gedeclareerd ${vorigJaar}`} stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="2 4" dot={false} connectNulls />
        <Line type="monotone" dataKey="toegewezen" name={`Toegewezen ${jaar}`} stroke="var(--brand-yellow)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
        <Line type="monotone" dataKey="gedeclareerd" name={`Gedeclareerd ${jaar}`} stroke="var(--brand-blue)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
