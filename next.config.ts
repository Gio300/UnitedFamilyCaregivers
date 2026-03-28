import type { NextConfig } from "next";

/** GitHub Pages needs a repo base path in production builds only; local dev uses site root. */
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? "/UnitedFamilyCaregivers" : "",
  assetPrefix: isProd ? "/UnitedFamilyCaregivers/" : undefined,
  reactCompiler: true,
};

export default nextConfig;
