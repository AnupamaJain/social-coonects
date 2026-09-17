#!/usr/bin/env node
/**
 * Captures real product screenshots for the landing page.
 *
 *   npm run db:reset && npm run dev        # seeded app, in another terminal
 *   npm run screenshots
 *
 * These are the actual running app, not mockups — which is the point. Re-run
 * whenever the UI changes so the marketing site can't drift from the product.
 * Output lands in public/product/ and is committed, so the build never needs
 * Playwright.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const BASE = process.env.APP_URL ?? "http://localhost:3002";
const OUT = "public/product";
const EMAIL = process.env.DEMO_EMAIL ?? "demo@sixfold.app";

const SHOTS = [
  { name: "compose", path: "/app/compose", h: 980, prep: async (p) => {
      await p.fill("#editor", "We cut our posting volume by 60% and reach went up.\n\nTurns out the algorithm was never the problem. We were publishing four mediocre posts a week because the calendar said to.\n\nNow we publish two. Both get scored before they go out.\n\nWhat would you drop first?");
      await p.waitForTimeout(1800);
    } },
  { name: "analytics", path: "/app/analytics", h: 980 },
  { name: "calendar", path: "/app/calendar", h: 900 },
  { name: "voice", path: "/app/voice", h: 900 },
  { name: "autopilot", path: "/app/autopilot", h: 900 },
];

// A session for the demo account, minted the same way the smoke tests do.
const sid = execFileSync("npx", ["tsx", "scripts/dev-session.ts", EMAIL], { encoding: "utf8" })
  .trim().split("\n").pop();

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: "light",
});
await ctx.addCookies([{ name: "pw_session", value: sid, domain: new URL(BASE).hostname, path: "/" }]);

const page = await ctx.newPage();
// Next's dev indicator would appear in every shot.
await page.addStyleTag({ content: "nextjs-portal,[data-nextjs-toast]{display:none!important}" }).catch(() => {});

for (const shot of SHOTS) {
  await page.setViewportSize({ width: 1440, height: shot.h });
  await page.goto(BASE + shot.path, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "nextjs-portal,[data-nextjs-toast]{display:none!important}" }).catch(() => {});
  if (shot.prep) await shot.prep(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${shot.name}.png` });
  console.log(`  ${OUT}/${shot.name}.png`);
}

await browser.close();
console.log(`\nCaptured ${SHOTS.length} screenshots. Commit them.`);
