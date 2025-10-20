import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import TelemetryCard from "../components/dashboard/TelemetryCard";
import { formatROI } from "../adapters/roi";

export default function ModelAnalyticsView() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
    if (!url || !key) {
      console.error("Supabase credentials missing");
      setLoading(false);
      return;
    }
    const client = createClient(url, key);

    async function fetchData() {
      const { data, error } = await client
        .from("run_metrics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) {
        console.error(error);
      } else {
        setRows(data || []);
      }
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-gray-400 animate-pulse">
        Loading telemetry metrics...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-neutral-900 text-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold tracking-tight">Model Analytics</h1>
      <p className="text-gray-400 text-sm">
        Latest telemetry entries from Supabase (run_metrics table)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.length === 0 && (
          <div className="text-gray-500 col-span-full">
            No telemetry data available.
          </div>
        )}
        {rows.map((row) => (
          <TelemetryCard key={row.id} row={row} roi={formatROI(row)} />
        ))}
      </div>
    </div>
  );
}
