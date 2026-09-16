import "server-only";

/**
 * Model resolution, in priority order:
 *   1. AI_GATEWAY_API_KEY  -> plain "provider/model" strings through Vercel AI
 *      Gateway (observability, fallbacks, one key for every provider).
 *   2. ANTHROPIC_API_KEY   -> direct Anthropic provider.
 *   3. neither             -> `aiEnabled` is false and callers fall back to the
 *      deterministic template writer, so the product still runs end to end.
 */
export const DEFAULT_MODEL = process.env.AI_MODEL ?? "anthropic/claude-sonnet-5";

export const aiEnabled = () =>
  Boolean(process.env.AI_GATEWAY_API_KEY || process.env.ANTHROPIC_API_KEY);

export async function resolveModel() {
  if (process.env.AI_GATEWAY_API_KEY) return DEFAULT_MODEL;
  if (process.env.ANTHROPIC_API_KEY) {
    const { anthropic } = await import("@ai-sdk/anthropic");
    const id = DEFAULT_MODEL.includes("/")
      ? DEFAULT_MODEL.split("/").slice(1).join("/")
      : DEFAULT_MODEL;
    return anthropic(id);
  }
  throw new Error("No AI credentials configured.");
}

export const AI_DISABLED_NOTE =
  "AI is running in offline mode. Set AI_GATEWAY_API_KEY or ANTHROPIC_API_KEY in .env.local for model-written drafts.";
