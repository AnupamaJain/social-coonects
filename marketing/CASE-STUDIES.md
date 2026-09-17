# Case studies

The landing page carries a **modelled** business case at `#case`: the visitor
enters their own numbers and watches the arithmetic build. That exists because
Sixfold has no customers yet, and a case study with an invented company on it is
a specific, checkable claim about someone who doesn't exist.

This file is how you replace it with the real thing.

---

## Why not just write a few

Three reasons, in increasing order of how much they'll cost you.

1. **They're checkable.** "Acme cut posting 60% and doubled inbound" invites a
   prospect to look Acme up. Testimonials are vague; case studies have names,
   numbers and dates.
2. **The FTC rule.** Since 2024, fabricated reviews and testimonials carry civil
   penalties per violation in the US. A fake case study is the aggravated
   version of a fake review.
3. **It poisons the real ones.** The first genuine case study you publish will
   sit next to the invented ones and inherit their credibility.

The modelled case converts *better* than a fake one anyway, because the numbers
on screen are the reader's own.

---

## Getting the first three

You need three, not one. One is an anecdote.

**Who to ask.** The first users who stay past week four. Not the loudest — the
ones whose queue is still full in month two. You can find them: workspaces with
a trained predictor (`PredictorWeights.samples >= 8`) and posts published in the
last 14 days.

**When to ask.** Right after something good happens — a post outperforms their
average, or the predictor finishes training. Not on a calendar reminder.

**What to ask for.** Fifteen minutes, recorded, with permission to quote. Not a
form. The usable material is in the tangents.

---

## The interview

Six questions. Ask them in this order; the order is doing work.

1. **What were you doing before, concretely?** Get the actual cadence, the
   actual tool, the actual person doing it. "We posted a lot" is not an answer —
   push until you have a number.
2. **What was the moment you knew it wasn't working?** This is the story's
   opening. There's always a specific moment.
3. **What did you try first that didn't work?** Credibility. A case study where
   the first thing tried was your product reads as an advertisement.
4. **What changed in the first two weeks?** Early, small, specific. Bigger
   claims come later and are less believable.
5. **What number moved, and how do you know?** Make them name the source —
   their analytics, their CRM, their inbox. If they can't source it, it doesn't
   go in.
6. **What would you tell someone who's sceptical?** This is your pull quote,
   nearly every time.

---

## The shape

Keep it to one screen. The three acts mirror the modelled case on the site, so
a real study can drop into the same slot.

```
[Company] · [industry] · [size]

BEFORE          One paragraph. The cadence, the cost, the moment it broke.
                One number, sourced.

WHAT CHANGED    What they actually did — not a feature list. Which parts of
                the product, in what order, and what they ignored.

AFTER           Two or three numbers with a time window and a source.
                One quote that would survive being read aloud by a sceptic.
```

**Rules for the numbers.**

- Always a window: "over 90 days", never "since switching".
- Always a source: "their LinkedIn analytics", "their CRM".
- Always the base: "from 2 to 5 inbound calls a month" beats "150% more calls".
- If it's a range, publish the low end.
- If they won't let you name the company, publish the industry and size and say
  why it's anonymous. An unexplained anonymous case study reads as invented.

---

## Publishing them

Once you have real quotes, they go in through the product, not a code change:

1. The submitter uses the form in the **What people say** section on the landing
   page, or you enter it on their behalf.
2. It lands unapproved.
3. Whoever `ADMIN_EMAIL` is set to approves it at `/app/settings`.
4. It appears on the landing page with a star rating and is emitted as `Review`
   and `AggregateRating` structured data — which is what earns review stars in
   search results.

Longer case studies need a page each. When you have three, add `/customers`
and `/customers/[slug]`, and give each one `Article` structured data. Then swap
the `#case` section's subheading from "we don't have one yet" to a link to them.

---

## Keeping yourself honest

Before publishing, check every one of these:

- [ ] Every number has a window and a source
- [ ] The customer has seen the final text and approved it in writing
- [ ] Nothing is attributed to a person who didn't say it
- [ ] The failure or the thing that didn't work is still in there
- [ ] It would survive that customer's competitor reading it
- [ ] A prospect could contact them and hear the same story
