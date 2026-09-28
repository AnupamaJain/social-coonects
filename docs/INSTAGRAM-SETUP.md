# Connecting Instagram

Publishing a Reel from Sixfold needs two things: an Instagram account the API
is allowed to post to, and a Meta app to post through. Both require a browser
and your login, so they can't be scripted — but the whole path is below, and
none of it needs App Review.

**Time:** about 15 minutes. **Cost:** nothing.

---

## The good news about App Review

The Instagram Content Publishing API normally needs Meta's App Review. It does
**not** when the target account has a role on your own app.

So for posting to **your own** `@learnwithanu.ai`, you stay in Development Mode
and skip review entirely. Review is only needed the day you let *customers*
connect their accounts.

---

## Step 1 — Make the Instagram account Professional

In the Instagram mobile app:

1. Profile → ☰ → **Settings and privacy**
2. **Account type and tools** → **Switch to professional account**
3. Choose **Business** (Creator also works, but Business is the documented path)
4. When asked, **connect it to a Facebook Page**

> This is the step people skip. The API cannot publish to a personal account,
> and it cannot publish to a professional account with no Page attached. If you
> have no Page, create an empty one — it never has to be used.

Confirm: Instagram → Settings → **Account type and tools** should now show
*Professional* and name a linked Page.

## Step 2 — Create the Meta app

At [developers.facebook.com/apps](https://developers.facebook.com/apps):

1. **Create App**
2. Use case: **Other** → type: **Business**
3. Name it anything (`Sixfold`), and attach your Business Portfolio if prompted
4. On the dashboard: **Add product** → **Instagram** → *Set up*
5. Under Instagram, open **API setup with Facebook login**

## Step 3 — Permissions and redirect

Still under Instagram → **API setup with Facebook login**:

**Permissions** — add all five:

```
instagram_basic
instagram_content_publish
pages_show_list
pages_read_engagement
business_management
```

**Valid OAuth Redirect URI** — exactly this, no trailing slash:

```
https://social-coonects.vercel.app/api/oauth/instagram/callback
```

If you also test locally, add:

```
http://localhost:3002/api/oauth/instagram/callback
```

## Step 4 — Give your own account a role

**App roles** → **Roles** → add yourself as **Administrator** (you usually are
already), and make sure the Instagram account from step 1 is reachable from
that user. This is what lets you publish without App Review.

## Step 5 — Copy the credentials

**App settings** → **Basic**:

- **App ID** → this is `META_CLIENT_ID`
- **App secret** → *Show* → this is `META_CLIENT_SECRET`

Treat the secret like a password. Don't paste it into chat — put it straight
into Vercel:

```bash
vercel env add META_CLIENT_ID production
vercel env add META_CLIENT_SECRET production
vercel --prod
```

## Step 6 — Connect and publish

1. Open **Accounts** in Sixfold. Instagram now shows *OAuth app ready* instead
   of *Sandbox only*.
2. **Connect** → Meta's consent screen → pick the Page and the Instagram
   account.
3. **Compose** → paste a public video URL → it detects a Reel → **Publish now**.

The three finished reels are already on a public CDN, so you can paste one
straight in:

```
https://cdn.jsdelivr.net/gh/AnupamaJain/social-coonects@main/marketing/reels/01-ai-slop.mp4
https://cdn.jsdelivr.net/gh/AnupamaJain/social-coonects@main/marketing/reels/02-three-faults.mp4
https://cdn.jsdelivr.net/gh/AnupamaJain/social-coonects@main/marketing/reels/03-queue.mp4
```

---

## When it goes wrong

| What you see | What it means |
|---|---|
| *No Instagram Business account is linked to your Facebook Pages* | Step 1 didn't finish. The account is personal, or has no Page attached. |
| `redirect_uri` mismatch | Step 3. It must match character for character, including `https` and no trailing slash. |
| `(#200) Requires instagram_content_publish` | The permission wasn't added, or you approved the dialog before adding it — disconnect in Sixfold and reconnect. |
| Publish returns `(#9007)` or media-processing `ERROR` | Meta rejected the video. Reels want MP4/MOV, H.264, AAC or no audio, 3s–15min. Our reels are H.264 with no audio and pass. |
| Container never leaves `IN_PROGRESS` | Transcoding is slow, or the URL isn't publicly fetchable. `curl -I` it and check for `content-type: video/mp4`. |

## A note on audio

The generated reels are silent. Instagram accepts that, but silent video is
suppressed in the feed. Add trending audio in the Instagram app after posting,
or mux a track in before uploading — Sixfold passes the file through untouched.
