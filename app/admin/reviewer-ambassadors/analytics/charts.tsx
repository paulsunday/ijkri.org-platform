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

import type { MonthlyPoint } from "@/lib/ambassador/analytics-queries";

const AXIS_STYLE = { fontSize: 12, fill: "#64748b" };

export function MonthlyTrendChart({
  data,
  color = "#0f172a",
  label,
}: {
  data: MonthlyPoint[];
  color?: string;
  label: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={AXIS_STYLE} />
        <YAxis allowDecimals={false} tick={AXIS_STYLE} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="count"
          name={label}
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TopAmbassadorsChart({
  data,
}: {
  data: { name: string; publishedReferrals: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" allowDecimals={false} tick={AXIS_STYLE} />
        <YAxis type="category" dataKey="name" width={140} tick={AXIS_STYLE} />
        <Tooltip />
        <Bar dataKey="publishedReferrals" name="Published Referrals" fill="#f59e0b" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopInstitutionsChart({
  data,
}: {
  data: { institution: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" allowDecimals={false} tick={AXIS_STYLE} />
        <YAxis type="category" dataKey="institution" width={160} tick={AXIS_STYLE} />
        <Tooltip />
        <Bar dataKey="count" name="Referred Authors" fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  );
}
