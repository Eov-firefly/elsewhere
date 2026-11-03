"use client";
import { useEffect } from "react";
import { sendEvent } from "@/lib/local";
export function DailyVisit() {
  useEffect(() => {
    void sendEvent("daily_view").catch(() => {});
  }, []);
  return null;
}
