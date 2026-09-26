import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sites keeps its existing Worker build; GitHub Pages opts into static export.
  ...(process.env.NEXT_STATIC_EXPORT === "1" ? {
    output: "export",
    trailingSlash: true,
    basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
    images: { unoptimized: true },
  } : {}),
};

export default nextConfig;
