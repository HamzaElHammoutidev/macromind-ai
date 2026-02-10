import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

export function LoadingCard() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-16 rounded bg-muted" />
            <div className="h-3 w-32 rounded bg-muted" />
          </div>
          <div className="h-8 w-20 rounded-md bg-muted" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="h-3 w-full rounded-full bg-muted" />
        </div>
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-5/6 rounded bg-muted" />
          <div className="h-3 w-4/6 rounded bg-muted" />
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between pt-3 border-t border-border">
        <div className="h-3 w-28 rounded bg-muted" />
        <div className="h-6 w-20 rounded bg-muted" />
      </CardFooter>
    </Card>
  );
}
