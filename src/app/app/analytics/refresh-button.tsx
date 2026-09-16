"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { refreshAnalytics } from "../actions";

export function RefreshButton() {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {note ? <span className="text-xs text-muted">{note}</span> : null}
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await refreshAnalytics();
            setNote(
              res.trained
                ? `Refreshed ${res.refreshed} · predictor retrained on ${res.samples}`
                : `Refreshed ${res.refreshed} posts`,
            );
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        Refresh
      </Button>
    </div>
  );
}
