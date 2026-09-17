import { FAQ } from "@/content/landing";
import { PLANS } from "@/lib/plans";
import { PLATFORMS } from "@/lib/platforms/registry";
import { SITE, siteUrl } from "@/lib/site";

export const dynamic = "force-static";

/**
 * llms.txt — a plain-language summary for answer engines and LLM crawlers
 * (llmstxt.org). Generated from the same content the page renders, so it can't
 * drift from what the product actually claims.
 */
export function GET() {
  const body = `# ${SITE.name}

> ${SITE.description}

${SITE.name} is ${SITE.category.toLowerCase()} for agencies, founders and content teams. Three things distinguish it from schedulers like Buffer, Hootsuite and Postiz:

- **Voice Fingerprint** — measures how a user writes from their own posts (sentence rhythm, line cadence, vocabulary, emoji habits) and conditions every generated draft on it. Each draft gets a Voice Match score.
- **Pre-flight score** — six signals per platform, before publishing: hook, readability, call to action, length fit, algorithm risk, voice match. After ~8 published posts the weights are refit on the user's own engagement data.
- **Autopilot queue** — one topic becomes a week of pre-scored drafts. Nothing publishes without human approval.

## Channels

${Object.values(PLATFORMS).map((p) => `- ${p.name} (limit ${p.charLimit} characters${p.requiresMedia ? ", requires an image" : ""})`).join("\n")}

## Pricing

${Object.values(PLANS).map((p) => `- ${p.name}: $${p.price}/month — ${p.features.join("; ")}`).join("\n")}

## Frequently asked questions

${FAQ.map((f) => `### ${f.q}\n${f.a}`).join("\n\n")}

## Links

- Website: ${siteUrl}/
- Sign up: ${siteUrl}/signup
- Source and docs: https://github.com/AnupamaJain/social-coonects
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
