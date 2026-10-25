import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, "");
  const now = new Date();

  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/features", priority: 0.9, changeFrequency: "monthly" },
    { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
    { path: "/download", priority: 0.9, changeFrequency: "weekly" },
    { path: "/docs", priority: 0.8, changeFrequency: "monthly" },
    { path: "/support", priority: 0.6, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/refunds", priority: 0.3, changeFrequency: "yearly" },
    { path: "/login", priority: 0.4, changeFrequency: "yearly" },
    { path: "/register", priority: 0.4, changeFrequency: "yearly" },
  ];

  return routes.map((route) => ({
    url: `${base}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
