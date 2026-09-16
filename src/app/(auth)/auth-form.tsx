"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert, Button, Input, Label } from "@/components/ui";
import { loginAction, signupAction, type AuthState } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "One moment…" : label}
    </Button>
  );
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "signup" ? signupAction : loginAction;
  const [state, formAction] = useActionState<AuthState, FormData>(action, {});

  return (
    <form action={formAction} className="mt-8 space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      {mode === "signup" && (
        <>
          <div>
            <Label htmlFor="name">Your name</Label>
            <Input id="name" name="name" autoComplete="name" placeholder="Alex Rivera" />
          </div>
          <div>
            <Label htmlFor="workspace">Brand or client name</Label>
            <Input id="workspace" name="workspace" placeholder="Acme Studio" />
          </div>
        </>
      )}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email" name="email" type="email" required
          autoComplete="email" placeholder="you@company.com"
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password" name="password" type="password" required minLength={10}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder={mode === "signup" ? "At least 10 characters" : "••••••••"}
        />
      </div>

      <SubmitButton label={mode === "signup" ? "Create account" : "Log in"} />
    </form>
  );
}
