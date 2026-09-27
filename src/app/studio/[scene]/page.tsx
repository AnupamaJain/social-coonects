import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ReelScene } from "@/components/studio/reel-scene";
import { isSceneId } from "@/components/studio/scenes";

// An internal recording surface, not part of the product.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function StudioScene({
  params,
}: {
  params: Promise<{ scene: string }>;
}) {
  // Never reachable in production — it exists only for the local recorder.
  if (process.env.NODE_ENV === "production") notFound();

  const { scene } = await params;
  if (!isSceneId(scene)) notFound();

  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-900">
      <ReelScene scene={scene} />
    </main>
  );
}
