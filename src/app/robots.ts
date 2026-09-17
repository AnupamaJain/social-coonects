import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/signup", "/llms.txt"],
        // The product itself and auth flows have no business in an index.
        disallow: ["/app", "/api", "/login"],
      },
      // Answer engines get the same access as search; llms.txt is for them.
      { userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"], allow: ["/", "/llms.txt"], disallow: ["/app", "/api"] },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
