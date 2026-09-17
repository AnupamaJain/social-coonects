# Recording setup

Get the app into the exact state the shots need, once, then record everything
in a single session.

---

## 1. Clean state

```bash
npm run db:reset     # wipes and reseeds: 40 days of history, trained predictor
npm run dev
```

Log in as `demo@sixfold.app` / `sixfold-demo-2026`.

The seed is built for filming. It already has:

- A **trained Voice Fingerprint** (10 samples) — so Voice Match shows real numbers
- **20 published posts** with metrics spread over 40 days — so analytics isn't empty
- A **trained predictor** (20 samples) — so "What your audience rewards" shows
  learned deltas, not defaults
- **3 Autopilot drafts** awaiting approval — so the queue shot works immediately

> Turn off the AI key for filming (`AI_GATEWAY_API_KEY=""`) **only** if you want
> deterministic rewrites. Otherwise leave it on — real model output looks better
> on camera than the offline template writer.

## 2. Browser

- **Hide the Next.js dev indicator.** It's the dark circle bottom-left and it
  screams "localhost". Either run a production build (`npm run build:local &&
  npm start`) or click it and disable it.
- Window at **1280×800**, browser zoom **125%**. UI text has to be legible
  cropped to 9:16 on a phone.
- Hide bookmarks, use a clean profile, no extensions in the toolbar.
- **Light mode.** It crops better and reads more clearly on small screens.
- Record at 60fps if your capture tool allows — the score animation is the one
  thing that benefits.

## 3. The script inputs

Keep these in a scratch file and paste from it. Typing live wastes takes.

**The bad post** (scores **28** on LinkedIn — hook 5, algorithm risk 76):

```
In today's fast-paced world, it is no secret that social media is a game changer
for businesses looking to unlock growth and supercharge their results. Check out
https://example.com/blog/post to learn more! Like and share!
#marketing #growth #socialmedia #business #ai #content #b2b
```

**The good post** (scores **87**, voice match **89%**):

```
We cut our posting volume by 60% and reach went up.

Turns out the algorithm was never the problem. We were publishing four mediocre
posts a week because the calendar said to.

Now we publish two. Both get scored before they go out.

What would you drop first?
```

These two numbers — **28** and **87** — are the entire payoff of script 1. Verify
you're getting them before you record anything; they move by a point or two as
the predictor retrains, so check rather than assume.

For script 3 you also need the middle state. Removing the link, the hashtags and
the engagement bait but leaving the opener takes it to **40**, not to a good
score — that's the twist the script depends on, so don't "fix" it.

## 4. Shot checklist

Record all of these in one pass. Every script cuts from this footage.

- [ ] Compose, empty → paste the bad post → score resolves at 28
- [ ] Slow scroll of the six signals on the bad post
- [ ] Click **Make it sound like me** → rewrite → score climbs to 86
- [ ] Typing the good post from scratch, score updating live as you type
- [ ] Deleting the link from a post, algorithm-risk meter recovering
- [ ] Deleting hashtags, meter recovering further — score settles at 40
- [ ] Rewriting only the first line → hook 5 → 81, score jumps to ~82
- [ ] Voice page: fingerprint strength, "What we measured", vocabulary chips
- [ ] Analytics: the reach chart, hovering a few points
- [ ] Analytics: the calibration scatter
- [ ] Analytics: "What your audience rewards", green deltas visible
- [ ] Autopilot: the three pending drafts with their scores
- [ ] Autopilot: approving one → it lands in a queue slot
- [ ] Calendar: the month grid with posts and scores
- [ ] Composer: platform preview tabs, switching X ↔ LinkedIn

## 5. Getting a clean 28 → 87

The rewrite is a live model call, so output varies between takes. If a take
lands below ~80:

1. Undo, run it again. Two or three takes usually gets a clean one.
2. Check the Voice page still shows 10 samples — an untrained fingerprint caps
   the achievable score.
3. Confirm the platform tab is **LinkedIn**. The bad post scores differently on
   X because the length penalty differs.

Record three good takes of this moment. It's the single most important four
seconds in the whole set.

## 6. Export

| Platform | Ratio | Length | Notes |
|---|---|---|---|
| TikTok | 9:16 | 15–30s | Hook must land by 0:02 |
| Reels | 9:16 | 15–30s | Same cut as TikTok |
| Shorts | 9:16 | under 60s | Slightly longer tolerated |
| X | 16:9 or 1:1 | under 45s | Autoplays muted — captions are mandatory |
| LinkedIn | 1:1 | 30–60s | Squarer crop; more tolerance for talking head |

Export once at 9:16 1080×1920, then crop to 1:1 and 16:9 from that master.
