"use client";

import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { Alert, Button, Input, Label, Textarea } from "@/components/ui";

export function TestimonialForm() {
  const [rating, setRating] = useState(5);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("sending"); setError(null);
    const res = await fetch("/api/testimonials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"), role: fd.get("role"), handle: fd.get("handle"),
        quote: fd.get("quote"), rating,
      }),
    });
    if (res.ok) { setState("sent"); return; }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "Something went wrong."); setState("error");
  }

  if (state === "sent") {
    return (
      <div className="surface rounded-2xl p-8 text-center lift">
        <p className="font-serif text-2xl font-semibold">Thank you.</p>
        <p className="mt-2 text-sm text-muted">It shows up here once we&apos;ve read it. Every quote on this page is a real one.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="surface rounded-2xl p-6 sm:p-8 lift">
      <p className="font-serif text-xl font-semibold">Used Sixfold? Say what changed.</p>
      <p className="mt-1 text-sm text-muted">Real quotes only, read by a human before they appear.</p>

      {error ? <Alert tone="danger" className="mt-4">{error}</Alert> : null}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div><Label htmlFor="t-name">Name</Label><Input id="t-name" name="name" required maxLength={80} placeholder="Alex Rivera" /></div>
        <div><Label htmlFor="t-role">Role or company</Label><Input id="t-role" name="role" required maxLength={80} placeholder="Founder, Acme Studio" /></div>
        <div className="sm:col-span-2"><Label htmlFor="t-handle">Handle <span className="text-muted">(optional)</span></Label><Input id="t-handle" name="handle" maxLength={60} placeholder="@alex" /></div>
        <div className="sm:col-span-2">
          <Label htmlFor="t-quote">What changed?</Label>
          <Textarea id="t-quote" name="quote" required minLength={40} maxLength={600} rows={4} placeholder="Be specific. Numbers beat adjectives." />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => setRating(n)}
              className="rounded p-0.5 transition-transform hover:scale-125 active:scale-95"
            >
              <Star className={`size-5 ${n <= rating ? "fill-clay-500 text-clay-500" : "text-ink-300"}`} />
            </button>
          ))}
        </div>
        <Button type="submit" disabled={state === "sending"}>
          {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : null}
          Submit
        </Button>
      </div>
    </form>
  );
}
