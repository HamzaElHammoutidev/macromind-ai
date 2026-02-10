import { AlertTriangle, CheckCircle } from "lucide-react";
import type { SanityCheck } from "@/types";

interface SanityCheckListProps {
  checks: SanityCheck[];
  needsReview?: boolean;
}

export function SanityCheckList({ checks, needsReview }: SanityCheckListProps) {
  if (!checks || checks.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span>All sanity checks passed - data is consistent</span>
      </div>
    );
  }

  const highSeverityCount = checks.filter(c => c.severity === "high").length;

  return (
    <div className="space-y-3">
      {needsReview && (
        <div className="flex items-center gap-2 text-sm font-medium text-amber-600 bg-amber-50 p-2 rounded">
          <AlertTriangle className="h-4 w-4" />
          <span>This analysis may need human review - multiple inconsistencies detected</span>
        </div>
      )}

      <div className="space-y-2">
        {checks.map((check, index) => (
          <div
            key={index}
            className={`p-3 rounded-md text-sm border-l-4 ${
              check.severity === "high"
                ? "bg-red-50 border-red-400 text-red-800"
                : check.severity === "medium"
                ? "bg-yellow-50 border-yellow-400 text-yellow-800"
                : "bg-blue-50 border-blue-400 text-blue-800"
            }`}
          >
            <div className="flex items-center gap-2 font-medium mb-1">
              <AlertTriangle className="h-3 w-3" />
              {check.message}
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                check.severity === "high"
                  ? "bg-red-200 text-red-900"
                  : check.severity === "medium"
                  ? "bg-yellow-200 text-yellow-900"
                  : "bg-blue-200 text-blue-900"
              }`}>
                {check.severity}
              </span>
            </div>
            <p className="text-xs opacity-90">{check.details}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
