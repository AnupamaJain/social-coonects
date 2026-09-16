"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Alert, Button } from "@/components/ui";

export function BillingActions({
  plan,
  hasCustomer,
  enabled,
}: {
  plan: string;
  hasCustomer: boolean;
  enabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(path: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="flex flex-wrap gap-3">
        {plan !== "pro" ? (
          <Button
            type="button"
            size="lg"
            disabled={busy || !enabled}
            onClick={() => go("/api/stripe/checkout")}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Upgrade to Pro
          </Button>
        ) : null}

        {hasCustomer ? (
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={busy || !enabled}
            onClick={() => go("/api/stripe/portal")}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Manage subscription
          </Button>
        ) : null}
      </div>
    </div>
  );
}
