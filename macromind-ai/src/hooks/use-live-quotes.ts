"use client";

import { useState, useEffect, useCallback } from "react";
import type { LiveQuotes } from "@/types";
import { QUOTE_POLL_INTERVAL_MS } from "@/lib/constants";

export function useLiveQuotes() {
  const [quotes, setQuotes] = useState<LiveQuotes | null>(null);

  const fetchQuotes = useCallback(async () => {
    try {
      const res = await fetch("/api/quotes");
      if (!res.ok) return;
      const json = (await res.json()) as LiveQuotes;
      setQuotes(json);
    } catch {
      // Silently fail — stale quote data is acceptable
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
    const interval = setInterval(fetchQuotes, QUOTE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchQuotes]);

  return quotes;
}
