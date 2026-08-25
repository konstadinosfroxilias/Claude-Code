import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Static export — the app is 100% client-side (mock data in localStorage),
   * so it builds to a plain `out/` folder with no server. Drag `out/` (or the
   * zip of it) straight into Netlify / any static host.
   *
   * To later attach a real backend, remove `output: "export"` and deploy on a
   * Next-aware host (Vercel, or Netlify's Next runtime).
   */
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  /* The dev-only badge defaults to bottom-left, on top of the mobile tab bar. */
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
