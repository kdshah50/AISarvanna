/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "imagedelivery.net" },
    ],
  },
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    if (isProd) {
      security.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }
    return [
      { source: "/:path*", headers: security },
      {
        source: "/auth/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
  async rewrites() {
    // Internal ML/listings API — protect upstream with INTERNAL_API_SECRET (FastAPI must verify).
    return [
      {
        source: "/api/fastapi/:path*",
        destination: `${process.env.FASTAPI_INTERNAL_URL || "http://localhost:8000"}/:path*`,
      },
    ];
  },
};
export default nextConfig;
