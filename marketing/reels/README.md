# Reels

Three vertical videos, 1080×1920 H.264 MP4, no audio. Regenerate any time:

```bash
npm run dev      # in another terminal
npm run reels
```

They are recordings of the real product. Every score on screen is
`scorePost()` run against the demo Voice Fingerprint — nothing is mocked, so
they can't drift from what Sixfold actually does. Source:
`src/components/studio/reel-scene.tsx`, recorder: `scripts/record-reels.mjs`.

| File | Length | The turn |
|---|---|---|
| `01-ai-slop.mp4` | 21s | AI-written post scores 37. Trained on ten real posts, the same idea scores 83. |
| `02-three-faults.mp4` | 19s | Remove the link, the bait and the hashtags — it's still only 40. The opener was the problem. |
| `03-queue.mp4` | 15s | One topic becomes a week of scored drafts. |

---

## Before posting

**Add audio.** They're silent by design — pick trending audio in the app you're
posting from. Silent video gets throttled on every platform.

**Check the first frame.** It's the thumbnail. All three open on the caption,
which is what you want.

**Don't add a caption overlay in the app.** The captions are burned in and
positioned to clear Instagram's UI. A second layer will collide.

---

## Captions

### 01 — AI slop

> I asked an AI to write a LinkedIn post. It scored 37 out of 100.
>
> Then I trained the same tool on ten posts I'd actually written. Same idea, my
> words: 83.
>
> What's the worst AI-written post you've seen this week?

`#linkedintips #b2bmarketing #contentstrategy #aiwriting`

### 02 — Three faults

> Three things quietly killing your reach: a link in the post, engagement bait,
> and hashtag soup.
>
> Fix all three and this post still only scores 40 — because none of them were
> the real problem. The first line was.
>
> Which one are you still doing?

`#linkedinalgorithm #socialmediatips #contentmarketing`

### 03 — Queue

> One topic in. A week of drafts out, every one scored before it goes near the
> queue.
>
> I approve the good ones. The weak ones just don't run.
>
> How far ahead is your content planned?

`#contentcalendar #socialmediamanager #marketingautomation`

---

## Posting them

Sixfold can publish these itself once Instagram is connected — a single video
on a post publishes as a Reel. Two things are still needed:

1. **Instagram connected via OAuth.** Needs a Meta Developer app and your
   account converted to a Business account linked to a Facebook Page. See
   [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md).
2. **The video on a public URL.** Instagram fetches media rather than accepting
   an upload. Any public host works, or enable Vercel Blob and upload from the
   composer.

Until then, post them from the Instagram app directly — the files are ready.

## What these won't do

They won't make a launch go viral on their own. They're three good assets; the
variables that decide reach are posting cadence, hook testing, and replying to
every comment in the first hour. [../VIDEO-SCRIPTS.md](../VIDEO-SCRIPTS.md) has
five more scripts, [../HOOKS.md](../HOOKS.md) a hook bank to test against, and
[../CAPTIONS.md](../CAPTIONS.md) the cadence to run.
