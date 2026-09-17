import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { PLANS } from "@/lib/plans";
import { SITE, siteUrl } from "@/lib/site";
import { HOW_IT_WORKS } from "@/content/landing";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Display face for headlines only. A serif with real optical sizing is the
// cheapest way to stop a page reading as a generic SaaS template.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: SITE.title, template: `%s · ${SITE.name}` },
  description: SITE.description,
  keywords: [...SITE.keywords],
  applicationName: SITE.name,
  category: "technology",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    url: "/",
    title: SITE.shortTitle,
    description: SITE.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.shortTitle,
    description: SITE.description,
  },
  // Search Console / Webmaster Tools tokens, only when present.
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
    ...(process.env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } : {}),
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

/**
 * Structured data that answer engines and rich results actually read.
 * Organization + WebSite for identity, SoftwareApplication with real offers for
 * the product. Nothing here claims a rating or review count we don't have.
 */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: SITE.name,
      url: siteUrl,
      logo: { "@type": "ImageObject", url: `${siteUrl}/icon` },
      foundingDate: SITE.founded,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: SITE.name,
      publisher: { "@id": `${siteUrl}/#organization` },
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#app`,
      name: SITE.name,
      url: siteUrl,
      description: SITE.description,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: SITE.category,
      operatingSystem: "Web",
      offers: Object.values(PLANS).map((p) => ({
        "@type": "Offer",
        name: p.name,
        price: p.price,
        priceCurrency: SITE.pricing.currency,
        ...(p.price ? { billingIncrement: "P1M" } : {}),
        availability: "https://schema.org/InStock",
        url: `${siteUrl}/signup`,
      })),
      featureList: [
        "Voice Fingerprint: measures how you write and scores drafts for voice match",
        "Pre-flight score: six signals per platform before publishing, retrained on your engagement",
        "Autopilot queue: a week of pre-scored drafts, human approval required",
        "Schedule to X, LinkedIn, Instagram, Facebook, Threads and Mastodon",
        "Calendar and queue scheduling with per-platform previews",
        "Per-platform analytics with a predictor calibration chart",
      ],
      publisher: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "HowTo",
      "@id": `${siteUrl}/#how-it-works`,
      name: "How to schedule social media posts in your own voice with Sixfold",
      totalTime: "PT5M",
      step: HOW_IT_WORKS.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.name,
        text: s.text,
        url: `${siteUrl}/#how-it-works`,
      })),
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The font variables go on <html>, not <body>: Tailwind resolves its theme
    // tokens (--font-sans, --font-serif) at :root, and a var() that references
    // a custom property defined lower in the tree is invalid there — every
    // heading silently fell back to the UA font stack until this moved.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}
    >
      <body className="antialiased">
        {children}
        <script
          type="application/ld+json"
          // Escape "<" so a value can never close the script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
      </body>
    </html>
  );
}
