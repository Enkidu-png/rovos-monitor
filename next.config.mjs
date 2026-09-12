/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  },
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
};

export default nextConfig;
