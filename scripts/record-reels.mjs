#!/usr/bin/env node
/**
 * Records the /studio scenes into 9:16 MP4s ready to upload.
 *
 *   npm run dev            # in another terminal
 *   npm run reels
 *
 * Playwright records the page at 1080×1920 to WebM; ffmpeg transcodes to the
 * H.264 / yuv420p / 30fps MP4 that Instagram, TikTok and YouTube all accept.
 * The scenes render the real scorer, so the numbers on screen are the numbers
 * the product produces — see src/components/studio/reel-scene.tsx.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.APP_URL ?? "http://localhost:3002";
const OUT = "marketing/reels";
const RAW = join(OUT, ".raw");

// Durations mirror SCENE_DURATIONS; a second of padding avoids clipping the end.
const SCENES = [
  { id: "ai-slop", ms: 19_000, name: "01-ai-slop" },
  { id: "three-faults", ms: 17_000, name: "02-three-faults" },
  { id: "queue", ms: 13_000, name: "03-queue" },
];

const W = 1080, H = 1920;

rmSync(RAW, { recursive: true, force: true });
mkdirSync(RAW, { recursive: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });

for (const scene of SCENES) {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    colorScheme: "light",
    recordVideo: { dir: RAW, size: { width: W, height: H } },
  });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/studio/${scene.id}`, { waitUntil: "networkidle" });
  // The dev-mode indicator would otherwise sit in the corner of every frame.
  await page.addStyleTag({
    content: "nextjs-portal,[data-nextjs-toast],[data-nextjs-dev-tools-button]{display:none!important}",
  }).catch(() => {});
  // Re-mount so the scene clock starts after the style is applied.
  await page.reload({ waitUntil: "networkidle" });
  await page.addStyleTag({
    content: "nextjs-portal,[data-nextjs-toast],[data-nextjs-dev-tools-button]{display:none!important}",
  }).catch(() => {});
  // The scene's clock starts on mount, so record from here.
  await page.waitForTimeout(scene.ms + 900);

  await page.close();
  await ctx.close(); // flushes the WebM

  const webm = readdirSync(RAW).filter((f) => f.endsWith(".webm")).map((f) => join(RAW, f))[0];
  const mp4 = join(OUT, `${scene.name}.mp4`);

  execFileSync("ffmpeg", [
    "-y", "-i", webm,
    "-r", "30",
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "20",
    // yuv420p is what every social platform's decoder expects.
    "-pix_fmt", "yuv420p",
    "-vf", `scale=${W}:${H}:flags=lanczos`,
    "-movflags", "+faststart",
    "-an",
    mp4,
  ], { stdio: "pipe" });

  rmSync(webm, { force: true });

  const probe = JSON.parse(execFileSync("ffprobe", [
    "-v", "quiet", "-print_format", "json",
    "-show_entries", "format=duration,size:stream=width,height,codec_name",
    mp4,
  ], { encoding: "utf8" }));
  const v = probe.streams[0];
  const mb = (Number(probe.format.size) / 1024 / 1024).toFixed(1);
  console.log(`  ${mp4}  ${v.width}x${v.height} ${v.codec_name}  ${Number(probe.format.duration).toFixed(1)}s  ${mb} MB`);
}

await browser.close();
rmSync(RAW, { recursive: true, force: true });
console.log(`\n${SCENES.length} reels written to ${OUT}/`);
