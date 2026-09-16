import { ButtonLink } from "@/components/ui";
import { Logo } from "@/components/marketing/logo";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <div className="flex justify-center"><Logo /></div>
        <p className="mt-8 font-mono text-sm text-muted">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          That page doesn&apos;t exist
        </h1>
        <p className="mt-2 text-sm text-muted">
          The link may be old, or the post may have been deleted.
        </p>
        <ButtonLink href="/" className="mt-6">Back to home</ButtonLink>
      </div>
    </div>
  );
}
