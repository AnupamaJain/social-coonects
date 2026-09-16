"use client";

import { useState, useTransition } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { createWorkspace, switchWorkspace } from "./actions";
import { Button, Input } from "@/components/ui";
import { initials } from "@/lib/utils";

interface Ws {
  id: string;
  name: string;
}

export function WorkspaceSwitcher({
  current,
  workspaces,
  canAdd,
}: {
  current: Ws;
  workspaces: Ws[];
  canAdd: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="surface flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-[var(--bg-subtle)]"
        aria-expanded={open}
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-brand-600 text-xs font-semibold text-white">
          {initials(current.name)}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{current.name}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted" />
      </button>

      {open ? (
        <div className="surface absolute left-0 right-0 top-full z-50 mt-1 rounded-lg p-1 shadow-xl">
          {workspaces.map((w) => (
            <button
              key={w.id}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await switchWorkspace(w.id);
                  setOpen(false);
                })
              }
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-[var(--bg-subtle)]"
            >
              <span className="flex-1 truncate">{w.name}</span>
              {w.id === current.id ? <Check className="size-3.5 text-brand-500" /> : null}
            </button>
          ))}

          <div className="my-1 border-t" />

          {adding ? (
            <form
              action={async (fd) => {
                await createWorkspace(fd);
                setAdding(false);
                setOpen(false);
              }}
              className="space-y-2 p-1.5"
            >
              <Input name="name" placeholder="Brand name" autoFocus required />
              <Button type="submit" size="sm" className="w-full">Create</Button>
            </form>
          ) : (
            <button
              onClick={() => (canAdd ? setAdding(true) : undefined)}
              disabled={!canAdd}
              title={canAdd ? undefined : "Multiple brands are a Pro feature"}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-muted hover:bg-[var(--bg-subtle)] disabled:opacity-50"
            >
              <Plus className="size-3.5" />
              Add brand
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
