"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS_STYLE = { fontSize: 12, fill: "#64748b" };

export function BreakdownChart({
  data,
}: {
  data: { label: string; score: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" domain={[0, 100]} tick={AXIS_STYLE} />
        <YAxis type="category" dataKey="label" width={160} tick={AXIS_STYLE} />
        <Tooltip />
        <Bar dataKey="score" fill="#f59e0b" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ScoreHistoryChart({
  data,
}: {
  data: { date: string; score: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={AXIS_STYLE} />
        <YAxis domain={[0, 100]} tick={AXIS_STYLE} />
        <Tooltip />
        <Line type="monotone" dataKey="score" stroke="#0f172a" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
