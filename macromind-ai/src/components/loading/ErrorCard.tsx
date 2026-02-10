import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface ErrorCardProps {
  ticker: string;
  onRetry: () => void;
}

export function ErrorCard({ ticker, onRetry }: ErrorCardProps) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <div className="text-center">
          <p className="font-mono font-bold">{ticker}</p>
          <p className="text-sm text-muted-foreground">
            Failed to load analysis
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCcw className="h-3 w-3 mr-2" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}
