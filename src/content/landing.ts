/**
 * Landing-page copy and data, kept out of the components so it can be edited
 * without touching layout.
 *
 * Everything here is either a real product fact or a claim the product backs.
 * Nothing in this file describes a feature that doesn't exist.
 */
import type { PlatformId } from "@/lib/platforms/types";
import { DEMO_SCORE_AI, DEMO_SCORE_HUMAN } from "./demo-scores";

export const ANNOUNCEMENT = {
  label: "NEW",
  text: "Pre-flight scores now retrain on your own analytics",
  href: "#predict",
};

export const HERO = {
  eyebrow: "Social media scheduling with judgement",
  headline: ["Run your social media on autopilot,", "in your own voice."],
  sub: "Plan, write, score and schedule posts to every channel, then review everything in a visual calendar before it goes anywhere.",
  models: ["Claude", "GPT", "Gemini", "Llama", "Mistral"],
  modelsNote: "Bring your own model via AI Gateway, or run fully offline.",
  paths: [
    { label: "I want Autopilot", sub: "A week of drafts from one topic", href: "/signup?path=autopilot" },
    { label: "I just want scheduling", sub: "Compose, score, queue", href: "/signup" },
  ],
};

/** Product facts in the slot most sites fill with invented customer numbers. */
export const PROOF = [
  { big: `${DEMO_SCORE_AI.predicted} → ${DEMO_SCORE_HUMAN.predicted}`, small: "one rewrite, same idea" },
  { big: "6", small: "signals scored per platform" },
  { big: "0", small: "posts publish without approval" },
  { big: "10", small: "samples to train your voice" },
  { big: "8", small: "posts until the predictor is yours" },
  { big: "5 min", small: "to your first queued post" },
  { big: "6", small: "channels, one composer" },
  { big: "0 keys", small: "needed to try every feature" },
];

export const AUDIENCES: {
  title: string;
  body: string;
  icon: "briefcase" | "pen" | "users";
}[] = [
  {
    title: "Agencies",
    body: "Run every client as its own brand, each with its own voice, queue and approval gate. Nothing posts on a client's account without a human.",
    icon: "briefcase",
  },
  {
    title: "Founders & creators",
    body: "Post less, land harder. Train it on ten of your posts and every draft comes back sounding like you, with a score before you hit publish.",
    icon: "pen",
  },
  {
    title: "Content teams",
    body: "A shared queue, a visual calendar, and analytics that show which posts actually worked so the next week is planned on evidence.",
    icon: "users",
  },
];

export const AI_FEATURES = [
  {
    title: "Variations, on a different angle each",
    body: "Three takes on one brief, none of them the same post rewritten. Story, contrarian claim, concrete list.",
  },
  {
    title: "Make it sound like me",
    body: "One click rewrites a draft against your Voice Fingerprint: sentence rhythm, line breaks, the words you actually use.",
  },
  {
    title: "A week from one topic",
    body: "Seven drafts with an arc. The opinionated opener, the how-it-works, the story, the contrarian take, the short close.",
  },
  {
    title: "Any model, or none",
    body: "Point it at Claude, GPT or Gemini through AI Gateway. With no key at all, scoring and voice matching still run.",
  },
];

export const TOOLS = [
  {
    key: "schedule",
    kicker: "planning",
    title: "Queue-first scheduling",
    body: "Set a cadence once. Approve a draft and it drops into the next free slot. Drag nothing, pick no datetimes, see it all on the calendar.",
  },
  {
    key: "voice",
    kicker: "voice",
    title: "Voice Fingerprint",
    body: "Paste posts you're proud of. It measures how you write and grades every draft with a Voice Match score and a per-signal breakdown.",
  },
  {
    key: "score",
    kicker: "pre-flight",
    title: "A score before you publish",
    body: "Hook, readability, call to action, length for the platform, algorithm risk, voice. Six numbers, and exactly what to fix.",
  },
  {
    key: "autopilot",
    kicker: "autopilot",
    title: "Autopilot that waits for you",
    body: "It plans the week, writes in your voice, scores every draft and queues it for approval. Nothing goes out without a human.",
  },
  {
    key: "preview",
    kicker: "preview",
    title: "Per-platform preview",
    body: "See the post the way LinkedIn truncates it, the way X counts it, the way Instagram needs an image. Customise per channel.",
  },
  {
    key: "analytics",
    kicker: "analytics",
    title: "Analytics that learn",
    body: "Reach and engagement per platform, plus a calibration chart that shows whether the score is predicting your audience or just guessing.",
  },
];

export const CHANNELS: PlatformId[] = ["x", "linkedin", "instagram", "facebook", "threads", "mastodon"];

/**
 * Real quotes only. The section stays hidden until this array has entries —
 * fabricated social proof is the fastest way to lose the trust the product
 * is built on. Shape: { quote, name, role, handle?, href? }.
 */
export const TESTIMONIALS: {
  quote: string;
  name: string;
  role: string;
  handle?: string;
  href?: string;
}[] = [];

export const HOW_IT_WORKS = [
  { name: "Connect a channel", text: "Link X, LinkedIn, Instagram, Facebook, Threads or Mastodon — or a sandbox account to try the whole loop with no keys." },
  { name: "Train your voice", text: "Paste five to ten posts you're proud of. Sixfold measures how you write and builds your Voice Fingerprint in seconds." },
  { name: "Write and score", text: "Compose once. Six signals score the draft per platform as you type, and one click rewrites it in your voice." },
  { name: "Approve into the queue", text: "Set a cadence once. Approved posts take the next free slot; nothing publishes without you." },
];

export const FAQ = [
  {
    q: "Does it post anything without me?",
    a: "No. Autopilot drafts land in an approval queue, and only what you approve is scheduled. That's a product guarantee, not a setting.",
  },
  {
    q: "What does the score actually measure?",
    a: "Six signals, per platform: hook strength, readability, call to action, length fit, algorithm risk (links, hashtag overload, engagement bait), and voice match against your fingerprint. Each comes with a plain-English reason and a fix.",
  },
  {
    q: "How does it learn my audience?",
    a: "After around eight published posts with analytics, it refits the weights of those six signals against your real engagement. The score stays on the same 0–100 scale; what changes is which signals your audience rewards.",
  },
  {
    q: "Do I need an AI key?",
    a: "Not to try it. Scoring, the Voice Fingerprint and voice matching are pure computation. Add a key (Anthropic, or any provider via AI Gateway) when you want model-written drafts.",
  },
  {
    q: "Which channels are supported?",
    a: "X, LinkedIn, Instagram, Facebook, Threads and Mastodon. Any channel without OAuth credentials connects as a sandbox account so you can test the whole loop first.",
  },
  {
    q: "Can I manage multiple brands or clients?",
    a: "Yes, on Pro. Each brand has its own accounts, voice, cadence and queue. Switch between them from the sidebar.",
  },
  {
    q: "Can I customise a post per platform?",
    a: "Yes. Write once, then override the text for any channel. The preview shows how each one renders, and each is scored separately.",
  },
  {
    q: "What does it cost?",
    a: "Starter is free: two accounts, ten scheduled posts, the fingerprint and scoring. Pro is $29/month: 25 accounts, unlimited scheduling, full Autopilot, multiple brands.",
  },
];

export const FOOTER = {
  tagline: "Scheduling with judgement.",
  columns: [
    {
      heading: "Product",
      links: [
        { label: "Voice Fingerprint", href: "#voice" },
        { label: "Pre-flight score", href: "#predict" },
        { label: "Autopilot", href: "#autopilot" },
        { label: "Channels", href: "#channels" },
        { label: "Pricing", href: "#pricing" },
      ],
    },
    {
      heading: "Resources",
      links: [
        { label: "Docs", href: "https://github.com/AnupamaJain/social-coonects#readme" },
        { label: "Architecture", href: "https://github.com/AnupamaJain/social-coonects/blob/main/docs/ARCHITECTURE.md" },
        { label: "Deployment", href: "https://github.com/AnupamaJain/social-coonects/blob/main/docs/DEPLOYMENT.md" },
        { label: "GitHub", href: "https://github.com/AnupamaJain/social-coonects" },
      ],
    },
    {
      heading: "Account",
      links: [
        { label: "Log in", href: "/login" },
        { label: "Start free", href: "/signup" },
        { label: "Status", href: "/api/health" },
      ],
    },
  ],
};
