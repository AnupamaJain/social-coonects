"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Alert, Button, Card, Select } from "@/components/ui";
import { updateQueueSlots } from "../actions";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Slot { dayOfWeek: number; hour: number; minute: number }

const key = (s: Slot) => `${s.dayOfWeek}:${s.hour}:${s.minute}`;

export function QueueEditor({ slots: initial }: { slots: Slot[] }) {
  const [slots, setSlots] = useState<Slot[]>(initial);
  const [saved, setSaved] = useState(false);

  const byDay = DAYS.map((_, day) =>
    slots.filter((s) => s.dayOfWeek === day).sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute)),
  );

  function addSlot(day: number) {
    setSaved(false);
    setSlots((s) => {
      // Default new slots to 09:00, then 12:00, 15:00 … so repeated clicks
      // don't pile up on the same minute (which the unique index would reject).
      const used = new Set(s.filter((x) => x.dayOfWeek === day).map((x) => x.hour));
      const hour = [9, 12, 15, 17, 19, 7, 21].find((h) => !used.has(h)) ?? 10;
      return [...s, { dayOfWeek: day, hour, minute: 0 }];
    });
  }

  function update(target: Slot, patch: Partial<Slot>) {
    setSaved(false);
    setSlots((s) => s.map((x) => (key(x) === key(target) ? { ...x, ...patch } : x)));
  }

  return (
    <Card className="p-5">
      <h2 className="font-semibold tracking-tight">Posting cadence</h2>
      <p className="mt-1 text-sm text-muted">
        The queue drops each approved post into the next free slot, so you never
        pick a datetime by hand.
      </p>

      {saved ? <Alert tone="success" className="mt-4">Cadence saved.</Alert> : null}

      <form
        className="mt-5"
        action={async (fd) => {
          await updateQueueSlots(fd);
          setSaved(true);
        }}
      >
        {slots.map((s) => (
          <input key={key(s)} type="hidden" name="slot" value={key(s)} />
        ))}

        <div className="space-y-3">
          {DAYS.map((day, i) => (
            <div key={day} className="flex flex-wrap items-center gap-2 border-b pb-3 last:border-b-0">
              <span className="w-24 shrink-0 text-sm font-medium">{day}</span>

              <div className="flex flex-1 flex-wrap gap-2">
                {byDay[i].map((s) => (
                  <span
                    key={key(s)}
                    className="flex items-center gap-1 rounded-lg border bg-[var(--bg-subtle)] px-1.5 py-1"
                  >
                    <Select
                      value={s.hour}
                      onChange={(e) => update(s, { hour: Number(e.target.value) })}
                      className="h-7 w-16 border-0 bg-transparent px-1 text-xs"
                      aria-label={`${day} hour`}
                    >
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
                      ))}
                    </Select>
                    <span className="text-xs text-muted">:</span>
                    <Select
                      value={s.minute}
                      onChange={(e) => update(s, { minute: Number(e.target.value) })}
                      className="h-7 w-16 border-0 bg-transparent px-1 text-xs"
                      aria-label={`${day} minute`}
                    >
                      {[0, 15, 30, 45].map((m) => (
                        <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      aria-label="Remove slot"
                      onClick={() => {
                        setSaved(false);
                        setSlots((all) => all.filter((x) => key(x) !== key(s)));
                      }}
                      className="ml-0.5 text-muted hover:text-red-500"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}

                <button
                  type="button"
                  onClick={() => addSlot(i)}
                  className="flex items-center gap-1 rounded-lg border border-dashed px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-clay-500/50 hover:text-clay-500"
                >
                  <Plus className="size-3" /> Add
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button type="submit">Save cadence</Button>
          <span className="text-xs text-muted">
            {slots.length} slot{slots.length === 1 ? "" : "s"} a week
          </span>
        </div>
      </form>
    </Card>
  );
}
