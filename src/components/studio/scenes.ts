/**
 * Scene metadata, deliberately in its own module with no "use client".
 *
 * A server component that imports a value from a client module receives a
 * client-reference proxy, not the value — so `"ai-slop" in SCENE_DURATIONS`
 * was false and the route 404'd. Shared constants have to live somewhere
 * neutral that both sides can import.
 */
export type SceneId = "ai-slop" | "three-faults" | "queue";

export const SCENE_DURATIONS: Record<SceneId, number> = {
  "ai-slop": 19_000,
  "three-faults": 17_000,
  queue: 13_000,
};

export const isSceneId = (v: string): v is SceneId => v in SCENE_DURATIONS;
