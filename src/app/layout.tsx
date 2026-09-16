import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Postwave — post in your voice, know how it'll do",
    template: "%s · Postwave",
  },
  description:
    "Schedule to every platform from one composer. Postwave learns how you actually write, scores every draft before you publish, and keeps a week of approved content in the queue.",
  openGraph: {
    title: "Postwave",
    description:
      "The social scheduler that writes in your voice and predicts performance before you publish.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
