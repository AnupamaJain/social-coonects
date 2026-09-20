"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Film, ImageIcon, Link2, Loader2, Plus, X } from "lucide-react";
import { Alert, Button, Input } from "@/components/ui";
import {
  ACCEPTED_TYPES, formatBytes, formatDuration, kindFromContentType,
  kindFromUrl, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, type PostMedia,
} from "@/lib/media";

/** Reads duration and dimensions client-side so validation can run before upload. */
function probe(file: File): Promise<Partial<PostMedia>> {
  return new Promise((resolve) => {
    const kind = kindFromContentType(file.type);
    if (kind !== "video") {
      const img = new window.Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({});
      img.src = URL.createObjectURL(file);
      return;
    }
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () =>
      resolve({ durationSec: v.duration, width: v.videoWidth, height: v.videoHeight });
    v.onerror = () => resolve({});
    v.src = URL.createObjectURL(file);
  });
}

export function MediaUploader({
  media,
  onChange,
  uploadsEnabled,
}: {
  media: PostMedia[];
  onChange: (next: PostMedia[]) => void;
  uploadsEnabled: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlMode, setUrlMode] = useState(!uploadsEnabled);
  const [url, setUrl] = useState("");

  async function onPick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);

    const kind = kindFromContentType(file.type);
    if (!kind) {
      setError("Use a JPEG, PNG, WebP, MP4 or MOV file.");
      return;
    }
    const cap = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > cap) {
      setError(`That ${kind} is ${formatBytes(file.size)}. The limit is ${formatBytes(cap)}.`);
      return;
    }

    setBusy(true);
    try {
      const meta = await probe(file);
      // The pathname shapes the public URL; keep the extension so the
      // platforms (and our own kindFromUrl fallback) can read the type off it.
      const safeName = file.name.replace(/[^\w.-]+/g, "-").toLowerCase();
      const blob = await upload(`posts/${safeName}`, file, {
        access: "public",
        handleUploadUrl: "/api/media/upload",
        multipart: file.size > 8 * 1024 * 1024,
      });
      onChange([...media, { url: blob.url, type: kind, bytes: file.size, ...meta }]);
    } catch (err) {
      setError((err as Error).message || "Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function addUrl() {
    const trimmed = url.trim();
    if (!/^https:\/\//i.test(trimmed)) {
      setError("Use a public https:// URL — the platforms fetch the file themselves.");
      return;
    }
    onChange([...media, { url: trimmed, type: kindFromUrl(trimmed) }]);
    setUrl("");
    setError(null);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Media {media.length ? `· ${media.length}` : ""}
        </p>
        {uploadsEnabled ? (
          <button
            type="button"
            onClick={() => { setUrlMode((v) => !v); setError(null); }}
            className="text-xs text-muted underline-offset-4 hover:text-[var(--fg)] hover:underline"
          >
            {urlMode ? "Upload a file instead" : "Paste a URL instead"}
          </button>
        ) : null}
      </div>

      {media.length > 0 ? (
        <ul className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {media.map((m, i) => (
            <li key={m.url} className="group relative overflow-hidden rounded-lg border">
              {m.type === "video" ? (
                <video src={m.url} className="aspect-square w-full object-cover" muted playsInline preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className="aspect-square w-full object-cover" />
              )}
              <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-ink-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                {m.type === "video" ? <Film className="size-3" /> : <ImageIcon className="size-3" />}
                {m.durationSec ? formatDuration(m.durationSec) : m.type}
              </span>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => onChange(media.filter((_, n) => n !== i))}
                className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded bg-ink-900/80 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <Alert tone="danger" className="mb-2">{error}</Alert> : null}

      {urlMode ? (
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
            placeholder="https://… public image or video URL"
          />
          <Button type="button" variant="outline" onClick={addUrl}>
            <Link2 className="size-4" /> Add
          </Button>
        </div>
      ) : (
        <>
          <input
            ref={input}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="sr-only"
            onChange={(e) => onPick(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="w-full"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {busy ? "Uploading…" : "Add image or video"}
          </Button>
        </>
      )}

      <p className="mt-2 text-xs text-muted">
        {urlMode
          ? "Must be publicly reachable — Instagram and Threads fetch the file themselves."
          : "JPEG, PNG, WebP, MP4 or MOV. A single video posts to Instagram as a Reel."}
      </p>
    </div>
  );
}
