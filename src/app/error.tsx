"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, ButtonLink, Card } from "@/components/ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only handle on the server-side stack, which Next
    // deliberately withholds from the client in production.
    console.error("Unhandled error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <Card className="max-w-md p-8 text-center">
        <AlertTriangle className="mx-auto size-8 text-amber-500" />
        <h1 className="mt-4 text-lg font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted">
          That page failed to load. Nothing you had queued has been lost.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-muted">ref {error.digest}</p>
        ) : null}
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/app" variant="outline">Back to dashboard</ButtonLink>
        </div>
      </Card>
    </div>
  );
}
