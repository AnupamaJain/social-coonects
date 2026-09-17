"use client";

import { useTransition } from "react";
import { Check, Loader2, Star, Trash2, Undo2 } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { moderateTestimonial } from "../actions";

interface T { id: string; quote: string; name: string; role: string; handle: string | null; rating: number; approved: boolean; createdAt: string }

export function TestimonialsAdmin({ items }: { items: T[] }) {
  const [pending, start] = useTransition();
  const waiting = items.filter((t) => !t.approved);
  const live = items.filter((t) => t.approved);

  const Row = ({ t }: { t: T }) => (
    <li className="flex items-start gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
        <p className="mt-1.5 text-xs text-muted">
          {t.name} · {t.role}{t.handle ? ` · ${t.handle}` : ""} ·{" "}
          <span className="inline-flex items-center gap-0.5">{t.rating}<Star className="size-3 fill-current" /></span> ·{" "}
          {new Date(t.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button size="sm" variant={t.approved ? "ghost" : "primary"} disabled={pending}
          onClick={() => start(async () => { await moderateTestimonial(t.id, t.approved ? "unapprove" : "approve"); })}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : t.approved ? <Undo2 className="size-3.5" /> : <Check className="size-3.5" />}
          {t.approved ? "Hide" : "Approve"}
        </Button>
        <Button size="sm" variant="ghost" aria-label="Delete" disabled={pending}
          onClick={() => { if (confirm("Delete this testimonial permanently?")) start(async () => { await moderateTestimonial(t.id, "delete"); }); }}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </li>
  );

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between p-5 pb-3">
        <div>
          <h2 className="font-semibold tracking-tight">Testimonials</h2>
          <p className="mt-1 text-sm text-muted">Submitted from the landing page. Nothing shows publicly until you approve it.</p>
        </div>
        <Badge tone={waiting.length ? "brand" : "neutral"}>{waiting.length} waiting</Badge>
      </div>
      {items.length === 0 ? (
        <p className="border-t px-5 py-8 text-center text-sm text-muted">No submissions yet.</p>
      ) : (
        <>
          {waiting.length ? <ul className="divide-y border-t">{waiting.map((t) => <Row key={t.id} t={t} />)}</ul> : null}
          {live.length ? (
            <>
              <p className="border-t bg-[var(--bg-subtle)] px-5 py-2 font-mono text-[11px] uppercase tracking-wider text-muted">Live on the site</p>
              <ul className="divide-y border-t">{live.map((t) => <Row key={t.id} t={t} />)}</ul>
            </>
          ) : null}
        </>
      )}
    </Card>
  );
}
