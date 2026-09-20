export type PlatformId =
  | "x"
  | "linkedin"
  | "instagram"
  | "facebook"
  | "threads"
  | "mastodon";

export interface OAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  /** X requires PKCE; Meta and LinkedIn do not. */
  usePkce: boolean;
  clientIdEnv: string;
  clientSecretEnv: string;
  /** Extra query params appended to the authorize URL. */
  extraAuthParams?: Record<string, string>;
  /** Some providers want client creds in the body rather than Basic auth. */
  credentialsIn: "basic" | "body";
}

export interface PlatformDef {
  id: PlatformId;
  name: string;
  /** Tailwind classes for the brand chip. */
  accent: string;
  charLimit: number;
  /** Instagram cannot publish without media. */
  requiresMedia: boolean;
  maxMedia: number;
  /** Rough ideal length used by the length-fit score. */
  sweetSpot: [number, number];
  /** Platforms that demote posts carrying outbound links. */
  penalisesLinks: boolean;
  idealHashtags: [number, number];
  oauth: OAuthConfig | null;
  docs: string;
}

export interface PublishInput {
  text: string;
  media: import("@/lib/media").PostMedia[];
}

export interface PublishResult {
  remoteId: string;
  remoteUrl: string | null;
}

export interface RemoteProfile {
  platformUserId: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  meta?: Record<string, unknown>;
}

export interface MetricsResult {
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
}
