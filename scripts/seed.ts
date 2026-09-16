/**
 * Demo data.
 *
 *   npm run db:seed
 *
 * Creates demo@postwave.app / password123 with a trained Voice Fingerprint,
 * two sandbox accounts, and 20 posts published across the last 40 days with
 * metrics — enough history that the predictor actually trains and the
 * analytics page has a real shape on first load.
 */
import "dotenv/config";
import { db, writeJson } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { extractTraits } from "../src/lib/voice-stats";
import { scorePost } from "../src/lib/scoring";
import { fetchMetrics } from "../src/lib/platforms/metrics";
import { trainPredictor } from "../src/lib/predictor";
import { slugify } from "../src/lib/utils";
import type { PlatformId } from "../src/lib/platforms/types";

const EMAIL = "demo@postwave.app";
const PASSWORD = "postwave-demo-2026";

const VOICE_SAMPLES = [
  `We cut our posting volume by 60% and reach went up.

Turns out the algorithm was never the problem. We were publishing four mediocre posts a week because the calendar said to.

Now we publish two. Both get read.

What would you drop first?`,

  `The best hire I ever made failed the take-home.

She spent the whole 90 minutes questioning the brief instead of building it. Sent back three paragraphs on why the spec was wrong.

She was right. We shipped her version.

Take-homes measure compliance. Hire for the pushback.`,

  `Everyone wants a content strategy.

Nobody wants to read their last 40 posts and admit which ones worked.

That audit takes an afternoon. The strategy falls out of it for free.`,

  `A thing I got wrong for two years:

I thought "consistency" meant posting every day.

It means sounding like the same person every time you post.

One of those is a calendar problem. The other is a voice problem. Only one of them compounds.`,

  `We tracked every inbound lead back to its source last quarter.

47% came from six posts.

We published 180.

I'm not saying stop publishing. I'm saying find your six.`,

  `"Just be authentic" is the least actionable advice in this industry.

Here's what it actually means in practice:

Write the sentence you'd say out loud. Then delete the one you wrote to sound professional.

That's it. That's the whole thing.`,

  `Our best-performing post last year was 41 words.

Our worst was a 1,200-word breakdown I spent a full day on.

I still think the long one was better work. The audience disagreed, and they're the ones voting.`,

  `Stopped using hashtags in January. Reach didn't move.

Stopped tagging people who weren't in the story. Reach went up.

Stopped putting the link in the post. Reach went up a lot.

Three experiments, one afternoon each.`,

  `The question I ask before every post now:

Would I send this to one specific person I respect?

If the answer is no, it's not a post. It's noise with a schedule.`,

  `Content teams measure output because output is easy to count.

Nobody's dashboard has a column for "did this change anyone's mind."

That's the only column that matters.`,
];

const DEMO_POSTS = [
  `Most content calendars are a compliance document.\n\nThey exist so somebody can prove work happened, not so anybody reads anything.\n\nWe replaced ours with two rules: nothing ships under 70 on the score, and nothing ships that doesn't sound like us.\n\nOutput halved. Inbound doubled.`,
  `A client asked me to audit 8 months of their LinkedIn.\n\n230 posts. 11 of them drove every single inbound conversation.\n\nAll 11 had the same shape: a specific number, a thing that went wrong, and no link.\n\nThey'd been optimising for the other 219.`,
  `Unpopular opinion: your engagement rate is a vanity metric too.\n\nA post with 400 likes from people who'll never buy is worse than one with 30 from people who will.\n\nSegment your engagement or stop reporting it.`,
  `I used to rewrite every post three times.\n\nNow I write it once and check whether it sounds like me.\n\nSame quality. A third of the time. The difference was having something to check against.`,
  `The gap between "I know what to post" and "I posted it" is where most content strategies die.\n\nIt isn't a knowledge problem. It's a queue problem.`,
  `Six months ago we started scoring posts before publishing.\n\nThe surprise wasn't which posts scored badly.\n\nIt was how many of the bad ones I'd have published anyway, because it was Tuesday and Tuesday is a posting day.`,
  `Every agency pitch says "we'll find your voice."\n\nAlmost none of them can tell you what your average sentence length is, which words you overuse, or how you open a post.\n\nVoice is measurable. Ask them to measure it.`,
  `We A/B tested the same post with and without an external link.\n\nWith link: 340 impressions.\nWithout, link in the first comment: 4,100.\n\nSame words. Twelve times the reach.`,
  `Writing for an audience you can't picture produces writing nobody can picture.\n\nName one person. Write to them. Publish it to everyone.`,
  `The hardest part of content isn't writing.\n\nIt's deciding what you actually believe, on the record, in public, where people who disagree can see it.\n\nEverything downstream of that is formatting.`,
  `Three things I stopped doing this year:\n\n1. Posting because the calendar said so\n2. Rewriting in "professional" voice\n3. Measuring output instead of outcomes\n\nAll three were habits, not decisions.`,
  `A founder told me last week that content "didn't work" for them.\n\nThey'd published 14 posts. Over 9 months. With three different people writing.\n\nThat isn't a content programme. That's a rounding error.`,
  `The reason your posts sound like AI isn't the AI.\n\nIt's that you gave it nothing to imitate.\n\nFeed it ten of your real posts and the problem mostly disappears.`,
  `We don't publish anything that scores under 70.\n\nIt sounds rigid. In practice it just means the weak draft goes back in the queue instead of going out on a Tuesday.\n\nNothing gets lost. Everything gets better.`,
  `Reach is a supply problem until it's a quality problem.\n\nMost teams are still on the first one and treating it like the second.`,
  `I keep a file of every post that outperformed by 3x.\n\nIt's 23 posts over two years. They have almost nothing in common topically.\n\nStructurally they're nearly identical.`,
  `"How often should we post?"\n\nWrong question.\n\n"How many posts a week can we make good?"\n\nThat number is your cadence. It's usually smaller than you want it to be.`,
  `An honest content report has a column most don't:\n\nPosts we published that we shouldn't have.\n\nIf that number is zero, you're not being honest.`,
  `The first line does 80% of the work.\n\nWe spend 80% of our time on everything else.`,
  `Everything I know about content in one line:\n\nSay something specific, in a voice people recognise, more often than feels comfortable but less often than feels productive.`,
];

async function main() {
  console.log("Seeding…");

  await db.user.deleteMany({ where: { email: EMAIL } });

  const user = await db.user.create({
    data: {
      email: EMAIL,
      passwordHash: await hashPassword(PASSWORD),
      name: "Demo User",
      plan: "pro", // so every feature is visible in the demo
    },
  });

  const workspace = await db.workspace.create({
    data: {
      ownerId: user.id,
      name: "Northwind Studio",
      slug: `${slugify("Northwind Studio")}-${user.id.slice(-4)}`,
      queueSlots: {
        create: [1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
          { dayOfWeek, hour: 9, minute: 15 },
          { dayOfWeek, hour: 16, minute: 30 },
        ]),
      },
    },
  });

  // --- Voice fingerprint ---------------------------------------------------
  const traits = extractTraits(VOICE_SAMPLES);
  const profile = await db.voiceProfile.create({
    data: {
      workspaceId: workspace.id,
      name: "Default voice",
      isDefault: true,
      sampleCount: VOICE_SAMPLES.length,
      traits: writeJson(traits),
      summary:
        "You write in short, declarative sentences with a lot of white space. You open with a concrete number or a flat claim, never a windup. You argue against received wisdom but back it with something that actually happened to you. You close on a question or a single short line, never a summary.",
      doList: writeJson([
        "Open with a number or a claim someone could argue with",
        "Use a real example with real figures",
        "Break lines aggressively — most paragraphs are one sentence",
        "Close on a question or one short line",
      ]),
      dontList: writeJson([
        "delve",
        "in today's fast-paced world",
        "game changer",
        "unlock",
        "supercharge",
        "it's no secret",
      ]),
      samples: {
        create: VOICE_SAMPLES.map((text) => ({ text, platform: "linkedin", source: "paste" })),
      },
    },
  });
  console.log(`  voice profile: ${profile.sampleCount} samples`);

  // --- Sandbox accounts ----------------------------------------------------
  const accounts = await Promise.all(
    (["linkedin", "x"] as PlatformId[]).map((platform) =>
      db.socialAccount.create({
        data: {
          workspaceId: workspace.id,
          platform,
          platformUserId: `sandbox-${workspace.id}-${platform}`,
          handle: platform === "x" ? "@northwind" : "Northwind Studio",
          displayName: "Northwind Studio",
          isSandbox: true,
        },
      }),
    ),
  );

  // --- Published history ---------------------------------------------------
  let published = 0;
  for (let i = 0; i < DEMO_POSTS.length; i++) {
    const body = DEMO_POSTS[i];
    // Spread backwards over ~40 days, two days apart.
    const publishedAt = new Date(Date.now() - (i * 2 + 1) * 86_400_000);
    const account = accounts[i % accounts.length];
    const platform = account.platform as PlatformId;

    const score = scorePost(body, platform, {
      traits,
      dontList: ["delve", "game changer", "unlock"],
    });

    const post = await db.post.create({
      data: {
        workspaceId: workspace.id,
        body,
        status: "published",
        publishedAt,
        source: i % 3 === 0 ? "ai" : "manual",
        targets: {
          create: {
            accountId: account.id,
            status: "published",
            remoteId: `seed-${i}`,
            remoteUrl: `https://sandbox.local/${platform}/northwind/seed-${i}`,
            publishedAt,
          },
        },
        scores: {
          create: {
            platform,
            hook: score.hook,
            readability: score.readability,
            cta: score.cta,
            lengthFit: score.lengthFit,
            algoRisk: score.algoRisk,
            voiceMatch: score.voiceMatch,
            predicted: score.predicted,
            rationale: writeJson({ signals: score.signals, suggestions: score.suggestions }),
          },
        },
      },
      include: { targets: { include: { account: true } } },
    });

    const target = post.targets[0];
    const metrics = await fetchMetrics({
      id: target.id,
      remoteId: target.remoteId,
      publishedAt: target.publishedAt,
      account: target.account,
    });
    await db.postMetric.create({ data: { postTargetId: target.id, ...metrics } });
    published++;
  }
  console.log(`  published: ${published} posts with metrics`);

  // --- A few drafts waiting on approval ------------------------------------
  const campaign = await db.campaign.create({
    data: {
      workspaceId: workspace.id,
      name: "Why volume is the wrong lever",
      topic: "Why posting volume is the wrong lever for B2B content teams",
    },
  });

  const drafts = [
    `Four posts a week is not a strategy. It's a shift rota.\n\nWe ran the numbers on 14 client accounts. Above roughly two good posts a week, every extra post cost reach on the ones either side of it.\n\nThe platforms are rationing attention. Volume just splits your own.\n\nWhat's your actual ceiling?`,
    `The first thing I check on any content audit isn't the posts.\n\nIt's how long the team spends per post.\n\nUnder 30 minutes and you're publishing drafts. Over three hours and you're publishing essays nobody finishes.\n\nThe window is narrower than anyone admits.`,
    `We killed our content calendar in March.\n\nReplaced it with a queue and one rule: nothing goes out under 70 on the score.\n\nSix months later we publish 40% less and get 2.3x the inbound.\n\nThe calendar was never scheduling content. It was scheduling obligation.`,
  ];

  for (const body of drafts) {
    const score = scorePost(body, "linkedin", { traits });
    await db.post.create({
      data: {
        workspaceId: workspace.id,
        campaignId: campaign.id,
        body,
        status: "needs_approval",
        source: "autopilot",
        targets: { create: { accountId: accounts[0].id } },
        scores: {
          create: {
            platform: "linkedin",
            hook: score.hook,
            readability: score.readability,
            cta: score.cta,
            lengthFit: score.lengthFit,
            algoRisk: score.algoRisk,
            voiceMatch: score.voiceMatch,
            predicted: score.predicted,
            rationale: writeJson({ signals: score.signals, suggestions: score.suggestions }),
          },
        },
      },
    });
  }
  console.log(`  autopilot drafts: ${drafts.length} awaiting approval`);

  const training = await trainPredictor(workspace.id);
  console.log(`  predictor: ${training.trained ? `trained on ${training.samples} posts` : `${training.samples} samples (needs more)`}`);

  console.log(`\nDone. Log in with:\n  ${EMAIL}\n  ${PASSWORD}\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
