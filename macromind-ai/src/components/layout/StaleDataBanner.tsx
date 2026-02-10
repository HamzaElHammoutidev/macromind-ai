import { AlertTriangle } from "lucide-react";

export function StaleDataBanner() {
  return (
    <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-500">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <p className="text-sm">
        Data may be outdated. The analysis pipeline has not updated in over 2
        hours.
      </p>
    </div>
  );
}
