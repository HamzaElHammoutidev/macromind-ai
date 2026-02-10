"use client";

import { useState, useEffect, useCallback } from "react";
import type { DashboardResponse } from "@/types";

export function useDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as DashboardResponse;
      setData(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    // Re-fetch every 2 minutes to pick up pipeline updates faster
    const interval = setInterval(fetchDashboard, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  return { data, isLoading, error, refetch: fetchDashboard };
}
