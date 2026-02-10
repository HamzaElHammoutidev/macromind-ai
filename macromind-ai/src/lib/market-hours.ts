import type { MarketStatus } from "@/types";

export function getMarketStatus(): MarketStatus {
  const now = new Date();
  const et = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const day = et.getDay();
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const time = hours * 60 + minutes;

  // Weekend
  if (day === 0 || day === 6) return "Closed";

  // Pre-market: 4:00 AM - 9:30 AM ET
  if (time >= 240 && time < 570) return "Pre-Market";

  // Regular hours: 9:30 AM - 4:00 PM ET
  if (time >= 570 && time < 960) return "Open";

  // After hours: 4:00 PM - 8:00 PM ET
  if (time >= 960 && time < 1200) return "After-Hours";

  return "Closed";
}
