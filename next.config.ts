import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * The CSP is deliberately strict on framing and object embedding. `unsafe-inline`
 * on script-src is required by Next's inline bootstrap; tightening it further
 * means adopting nonces via middleware, which is the right next step once the
 * surface stops changing.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // Remote avatars come from whichever CDN each platform uses.
  "img-src 'self' data: blob: https:",
  // Dev needs the HMR websocket; production must not allow it.
  process.env.NODE_ENV === "production"
    ? "connect-src 'self' https://api.stripe.com"
    : "connect-src 'self' https://api.stripe.com ws: wss:",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Never let a proxy or browser cache an authenticated response.
      {
        source: "/app/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
