import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
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
  title: {
    default: "Sixfold — post in your voice, know how it'll do",
    template: "%s · Sixfold",
  },
  description:
    "Schedule to every platform from one composer. Sixfold learns how you actually write, scores every draft before you publish, and keeps a week of approved content in the queue.",
  openGraph: {
    title: "Sixfold",
    description:
      "The social scheduler that writes in your voice and predicts performance before you publish.",
    type: "website",
  },
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
      </body>
    </html>
  );
}
